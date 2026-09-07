"""The gap-driven re-read: what it selects, and what it must never chase.

The resume guard is why the only source that can read a fund's FULL chart
history has been running daily and re-reading nothing: it skips any fund with
more than ten points that was touched today, which is every fund, because the
list-API sync writes today's price to all of them each morning.
"""
import pathlib
import re

SRC = (pathlib.Path(__file__).parent.parent / "scripts" / "scrape_mubasher.py").read_text()


def test_gap_mode_turns_the_resume_guard_off():
    """A fund is in this list precisely because its history is incomplete, so
    'we already have history' is not a reason to skip it."""
    assert "if gaps_only:" in SRC
    m = re.search(r"if gaps_only:\s*\n\s*print\([^\n]*\)\s*\n\s*elif history_count > 10 and is_fresh:", SRC)
    assert m, "gap mode must short-circuit the resume guard, not sit after it"


def test_the_2011_market_closure_is_never_chased():
    """The EGX was genuinely shut 2011-01-27 -> 2011-03-23. Re-scraping for it
    would be chasing a hole that is supposed to be there."""
    assert "2011-03-23" in SRC and "2011-01-27" in SRC
    assert re.search(r"NOT \(prev < DATE '2011-03-23' AND date > DATE '2011-01-27'\)", SRC)


def test_the_threshold_is_wider_than_any_real_cadence():
    """The widest genuine publication rhythm in the book is monthly."""
    m = re.search(r"GAP_DAYS = (\d+)", SRC)
    assert m and int(m.group(1)) >= 60, "a threshold under two months would chase monthly funds"


def test_only_the_ingested_universe_is_considered():
    """Shadow rows keyed by an ISIN-like code are duplicates the site never
    publishes and the NAV updater never writes to."""
    assert "fund_id ~ '^[0-9]+$'" in SRC


def test_scraped_rows_carry_their_provenance():
    """This writer used to insert with no source at all, so its rows were
    indistinguishable from the vendor's own."""
    assert "'mubasher_page'" in SRC
    assert "ON CONFLICT (fund_id, date) DO NOTHING" in SRC, "must never overwrite a held value"


def test_credentials_are_required_and_never_defaulted():
    """A hardcoded fallback in a public repo is a live credential leak."""
    assert 'os.environ.get("MUBASHER_USER", "")' in SRC
    assert 'os.environ.get("MUBASHER_PASS", "")' in SRC
    assert "FATAL" in SRC, "it must fail closed when they are absent"


def test_gap_mode_does_not_depend_on_the_census():
    """The census walks Mubasher's paginated list page and clicks through it, so
    it breaks whenever they touch that UI. On the first live run login succeeded
    and then ElementHandle.click timed out after 30s, taking the whole job down.
    The database already knows every fund id and the page URL is derivable."""
    assert re.search(r"if gaps_only:\s*\n\s*all_funds = await get_existing_funds_from_db\(conn\)", SRC)


def test_a_census_failure_never_ends_the_run():
    assert re.search(r"try:\s*\n\s*all_funds = await scrape_census\(page\)\s*\n\s*except Exception", SRC)


def test_the_fund_page_url_is_derived_from_the_id():
    assert 'countries/EG/funds/{r[\'fund_id\']}' in SRC or "countries/EG/funds/" in SRC
