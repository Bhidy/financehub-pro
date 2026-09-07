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


def test_too_little_overlap_is_never_written_hopefully():
    held = {"2025-01-01": 10.0, "2025-01-02": 10.1}
    assert not reconcile({d: v for d, v in held.items()}, held)["ok"]


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
