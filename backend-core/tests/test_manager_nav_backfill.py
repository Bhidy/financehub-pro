"""The manager backfill writes real published NAV, so the only question that
matters is whether a series has been attached to the RIGHT fund.

Every case here is drawn from the live data the mapping was built against.
"""
import importlib.util
import pathlib

spec = importlib.util.spec_from_file_location(
    "mnb", pathlib.Path(__file__).parent.parent / "scripts" / "manager_nav_backfill.py")
mnb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mnb)
reconcile, token_score, parse = mnb.reconcile, mnb.token_score, mnb._parse_price_page


def series(pairs):
    return {d: v for d, v in pairs}


# ── the mapping gate ─────────────────────────────────────────────────────────

def test_the_same_fund_is_accepted():
    """Azimut #5 vs our 5729: 934 overlapping points, median error 0.026%."""
    held = {f"2025-01-{d:02d}": 100.0 for d in range(1, 29)}
    pts = {d: v * 1.0002 for d, v in held.items()}
    v = reconcile(pts, held)
    assert v["ok"] and v["overlap"] == 28 and v["median"] < 0.05


def test_a_different_fund_is_rejected():
    """Azimut's 'Menthum' vs our CI-managed Menthum USD: 41% median error.

    A human comparing names would have accepted this. The data refuses it.
    """
    held = {f"2025-01-{d:02d}": 1.11 for d in range(1, 29)}
    pts = {d: 1.83 for d in held}
    v = reconcile(pts, held)
    assert not v["ok"] and v["median"] > 40


def test_one_bad_day_in_hundreds_does_not_break_a_mapping():
    """Fund 5729 has ONE day in 934 that differs by 4% and 933 that agree to
    0.03%. An absolute max-error rule reads that as a different fund."""
    held = {f"2025-{m:02d}-{d:02d}": 100.0 for m in range(1, 13) for d in range(1, 26)}
    pts = {d: 100.02 for d in held}
    bad = sorted(held)[0]
    pts[bad] = 104.0
    v = reconcile(pts, held)
    assert v["ok"], v["why"]


def test_a_tail_of_genuinely_wrong_points_does_break_it():
    """One outlier is noise; a tenth of the series disagreeing is a wrong fund."""
    held = {f"2025-{m:02d}-{d:02d}": 100.0 for m in range(1, 13) for d in range(1, 26)}
    pts = {d: 100.02 for d in held}
    for d in sorted(held)[:40]:          # ~13% of 300
        pts[d] = 108.0
    assert not reconcile(pts, held)["ok"]


def test_too_little_overlap_and_only_approximate_is_refused():
    """Two loose matches prove nothing. Repetition is what makes a loose match
    mean something, which is why the ordinary floor is three."""
    held = {"2025-01-01": 10.0, "2025-01-02": 10.1}
    pts = {"2025-01-01": 10.02, "2025-01-02": 10.12}      # ~0.2% out
    v = reconcile(pts, held)
    assert not v["ok"] and v["overlap"] == 2


def test_no_overlap_at_all_is_refused():
    """The funds still holed have no vendor data inside the hole. A series that
    only covers the hole cannot be verified and must not be written."""
    held = {"2025-01-01": 10.0, "2025-01-02": 10.1, "2025-01-03": 10.2}
    pts = {"2025-09-01": 11.0, "2025-09-02": 11.1, "2025-10-01": 11.4}
    v = reconcile(pts, held)
    assert not v["ok"] and v["overlap"] == 0


def test_names_only_shortlist():
    assert token_score("az- ادخار [EGP]", "Azimut Fixed Income Fund Idkhar AZ") >= 0
    assert token_score("CI-ctor Building – First Issue1",
                       "CI Asset Management CI ctor Specialized Funds Issuance 1 Building") > 0.12


# ── the CI Capital price-page parser ─────────────────────────────────────────

PAGE = """
<p>Last update: Monday, August 25, 2025</p>
<table>
 <tr><td>Fund Type</td><td>Fund Name</td><td>Price</td></tr>
 <tr><td>Money Market</td><td>CIB Money Market Fund (Ossoul)</td><td>917.02</td></tr>
 <tr><td></td><td>Banque Misr Third Fund</td><td>2,230.97</td></tr>
 <tr><td>Equity Funds</td><td>CI-ctor Building &#8211; First Issue1</td><td>12.51</td></tr>
 <tr><td></td><td>CI-ctor Technology &#8211; Second Issue</td><td>13.18</td></tr>
 <tr><td></td><td>menthum Fixed Income Fund (USD)</td><td>1.05</td></tr>
</table>
"""


def test_the_capture_date_is_the_published_date():
    when, _ = parse(PAGE)
    assert when == "2025-08-25"


def test_prices_are_read_including_thousands_separators():
    _, prices = parse(PAGE)
    assert prices["CIB Money Market Fund (Ossoul)"] == 917.02
    assert prices["Banque Misr Third Fund"] == 2230.97
    assert prices["CI-ctor Building – First Issue1"] == 12.51
    assert prices["menthum Fixed Income Fund (USD)"] == 1.05


def test_headings_are_not_mistaken_for_funds():
    _, prices = parse(PAGE)
    for junk in ("Fund Type", "Fund Name", "Price", "Money Market", "Equity Funds"):
        assert junk not in prices


def test_a_page_without_a_date_yields_nothing_datable():
    when, prices = parse(PAGE.replace("Last update: Monday, August 25, 2025", "Prices"))
    assert when is None and prices


def test_adjacent_rows_share_a_separator():
    """Two bugs made this parser read the page's date and return zero funds, then
    return every OTHER fund. Both were silent; the CI sector family lost two of
    its five members to the second one."""
    page = ("<p>Last update: Sunday, June 28, 2025</p><table>"
            "<tr><td>A Fund</td><td>1.10</td></tr>"
            "<tr><td>B Fund</td><td>2.20</td></tr>"
            "<tr><td>C Fund</td><td>3.30</td></tr>"
            "<tr><td>D Fund</td><td>4.40</td></tr></table>")
    when, prices = parse(page)
    assert when == "2025-06-28"
    assert prices == {"A Fund": 1.10, "B Fund": 2.20, "C Fund": 3.30, "D Fund": 4.40}


def test_whitespace_between_cells_does_not_hide_a_row():
    page = ("<p>Last update: Monday, August 25, 2025</p>\n<table>\n"
            "  <tr>\n    <td>Spaced Fund</td>\n    <td>  12.51  </td>\n  </tr>\n"
            "  <tr>\n    <td>Next Fund</td>\n    <td>13.18</td>\n  </tr>\n</table>")
    _, prices = parse(page)
    assert prices["Spaced Fund"] == 12.51 and prices["Next Fund"] == 13.18


# ── the exact anchor ─────────────────────────────────────────────────────────

def test_one_six_figure_match_is_enough():
    """Mubasher's own table on 2025-04-06 vs NAV we hold, for the funds that
    later went dark. Six significant figures agreeing is not a coincidence."""
    held = {"2025-04-06": 10.8769}
    assert reconcile({"2025-04-06": 10.87693}, held)["ok"]


def test_the_five_ci_siblings_are_told_apart_by_value():
    """A swap inside the family must fail. Their published values differ."""
    family = {"6197": 10.8769, "6198": 10.0617, "6199": 10.1870,
              "6200": 11.6559, "6201": 10.7762}
    theirs = {"6197": 10.87693, "6198": 10.06175, "6199": 10.18701,
              "6200": 11.65593, "6201": 10.77616}
    for fid, v in theirs.items():
        assert reconcile({"2025-04-06": v}, {"2025-04-06": family[fid]})["ok"]
        for other, held in family.items():
            if other != fid:
                assert not reconcile({"2025-04-06": v}, {"2025-04-06": held})["ok"], \
                    f"{fid} must not validate against {other}"


def test_an_exact_match_contradicted_elsewhere_is_refused():
    """One agreeing date does not license a series that disagrees on another."""
    held = {"2025-04-06": 10.8769, "2025-04-07": 10.90}
    pts = {"2025-04-06": 10.87693, "2025-04-07": 12.50}
    assert not reconcile(pts, held)["ok"]


def test_a_near_miss_is_not_an_exact_anchor():
    """0.004% is the same number; 4% is a different fund. Maksab USD matched our
    6121 at 0.004% and our 6193 at 4.567% — only one of those is the fund."""
    assert reconcile({"2025-04-06": 1.05644}, {"2025-04-06": 1.0564})["ok"]
    assert not reconcile({"2025-04-06": 1.05644}, {"2025-04-06": 1.0103})["ok"]


# ── the year the article never states ────────────────────────────────────────

article_date = mnb._article_date


def test_the_as_of_year_comes_from_the_capture():
    text = "prices as of 14 October, compared to the previous prices"
    assert article_date(text, "20251029115735") == "2025-10-14"


def test_a_january_article_archived_in_january_does_not_slip_a_year():
    assert article_date("as of 3 January, compared", "20260108000000") == "2026-01-03"


def test_a_december_article_archived_in_january_takes_the_previous_year():
    assert article_date("as of 28 December, compared", "20260105000000") == "2025-12-28"


def test_an_explicit_year_is_used_verbatim():
    """89 of 114 articles were thrown away because this inferred the year inside
    a twenty-day window while the page said it outright. The archive often
    crawls months late."""
    assert article_date("as of 5 January 2026 compared with the previous prices",
                        "20260308140519") == "2026-01-05"
    assert article_date("as of 5 April 2025 compared with the previous prices",
                        "20250409024458") == "2025-04-05"


def test_a_late_crawl_no_longer_loses_the_article():
    assert article_date("as of 24 September, compared", "20251112093019") == "2025-09-24"


def test_a_date_in_the_capture_s_future_is_refused():
    """An article is archived after it is published, so this is wrong by
    construction — a mis-scraped year rather than a real one."""
    assert article_date("as of 5 January 2027 compared", "20260308140519") is None


def test_the_lede_wins_over_the_related_articles_rail():
    """Taking the first bare 'as of' in the document once picked a date out of
    the sidebar instead of the price table's own."""
    text = ("Prices of investment funds as of 14 October, compared to the previous "
            "prices . Fund Name: X . Related: something as of 3 March happened")
    assert article_date(text, "20251021063010") == "2025-10-14"


def test_no_as_of_line_means_no_date():
    assert article_date("Prices of investment funds", "20251029115735") is None


# ── the truncated price, which reached production ───────────────────────────

clean = mnb._clean_price
ROW = mnb._ROW


def test_a_price_split_by_markup_is_read_whole():
    """Newer articles render `19.<span>40456</span>`. Stripping tags to a space
    gives "19. 40456", and reading "19." wrote 19.0 into live fund pages."""
    text = "Fund Name: Azimut Idkhar AZ Price per Certificate (EGP): 19. 40456 Fund Name: Next"
    name, cur, val = ROW.findall(text)[0]
    assert clean(val) == 19.40456


def test_a_truncated_price_is_refused_outright():
    """The one shape that becomes plausible-looking garbage rather than an
    obvious error. Fund 6120 got 14.0 between two observations of 146."""
    assert clean("14.") is None
    assert clean("1.") is None
    assert clean("108.") is None


def test_thousands_separators_survive_the_split():
    assert clean("2,230. 97") == 2230.97
    assert clean("1,110.05") == 1110.05


def test_a_genuine_integer_price_is_kept():
    assert clean("149") == 149.0


def test_nonsense_is_refused():
    for junk in ("", "  ", "1.2.3", "abc", "12abc", "0", "1e12"):
        assert clean(junk) is None, junk


def test_purge_cannot_reach_another_pipeline_s_rows():
    """The source filter is what stops this becoming an accident."""
    import asyncio
    for forbidden in (["mubasher_csv"], ["eima_derived"], ["unrecorded"],
                      ["mubasher_news_archive", "mubasher_csv"]):
        try:
            asyncio.run(mnb.purge(forbidden))
            assert False, f"{forbidden} must be refused"
        except SystemExit as e:
            assert "refusing to purge" in str(e)


# ── ranking: agreement beats quantity of agreement ──────────────────────────

def test_a_perfect_match_outranks_a_loose_one_with_more_overlap():
    """Fund 5906 Horus and 5911 Makaseb are two money-market funds 0.08% apart.
    Mubasher's "Al Ahly (AFIM) and EgyptAir (Horus)" = 15.78626 on 2025-04-06
    matches 5906 at 0.0003% and 5911 at 0.0623%. 5911 overlapped on three dates
    and 5906 on one, so ranking by overlap gave the series to the wrong fund and
    left Horus with its 412-day hole."""
    horus = reconcile({"2025-04-06": 15.78626}, {"2025-04-06": 15.7863})
    makaseb = reconcile({"2025-04-06": 15.78626, "2025-04-05": 15.78626,
                         "2025-04-07": 15.78626},
                        {"2025-04-06": 15.7961, "2025-04-05": 15.7869,
                         "2025-04-07": 15.8052})
    assert horus["ok"] and horus["exact"]
    assert not makaseb["exact"]

    key = lambda v: (0 if v.get("exact") else 1,
                     v["median"] if v["median"] is not None else 9e9,
                     -(v["overlap"] or 0))
    assert key(horus) < key(makaseb), "the exact match must win"
