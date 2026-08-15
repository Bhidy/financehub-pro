"""
Offline tests for EIMA report parsing + NAV reconstruction (no PDF lib, no DB).

The fixture is the real 2026-06-04 report, text-extracted once and committed, so
this suite pins the parser against actual production input rather than a mock.

Run:  cd backend-core && python -m pytest tests/test_eima_report.py -q
Or standalone:  python backend-core/tests/test_eima_report.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_pipeline.eima_report import (  # noqa: E402
    derive_navs, parse_report, parse_report_date, parse_rows, split_managers,
)

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures",
                       "eima_performance_2026-06-04.txt")


def _text():
    with open(FIXTURE, encoding="utf-8") as fh:
        return fh.read()


def _row(rows, name):
    for r in rows:
        if r["name"] == name:
            return r
    raise AssertionError(f"row not found: {name}")


# ------------------------------------------------------------- parsing ------

def test_report_date_is_read_from_the_document():
    assert parse_report_date(_text()) == date(2026, 6, 4)


def test_every_fund_row_is_parsed():
    # 186 EGP rows plus the 11 USD/EUR funds the first regex silently dropped —
    # the $ prefix on Initial Value broke the match with no counter, so every
    # foreign-currency fund vanished from every report.
    rows = parse_rows(_text())
    assert len(rows) == 197, len(rows)
    assert all(r["nav"] > 0 for r in rows)
    cur = {r["currency"] for r in rows}
    assert cur == {"EGP", "USD", "EUR"}, cur
    assert sum(1 for r in rows if r["currency"] == "EGP") == 186


def test_sections_are_tracked():
    rows = parse_rows(_text())
    sections = {r["section"] for r in rows}
    assert any("Money Market" in s for s in sections if s)
    assert any("Equity" in s for s in sections if s)


def test_manager_is_split_off_the_fund_name():
    rows = split_managers(parse_rows(_text()))
    w = _row(rows, "Wethaq")
    assert w["manager"] == "Al Ahly Financial Investments Management"
    assert w["nav"] == 22.51201
    assert w["inception"] == "Dec-21"


def test_a_series_numeral_is_not_eaten_by_the_manager():
    # "Credit Agricole Egypt Fund I" + "Hermes ..." renders as one run of text.
    # The numeral repeats as often as the manager, so a naive longest-match
    # produced manager="I Hermes Portfolio and Fund Management".
    rows = split_managers(parse_rows(_text()))
    r = _row(rows, "Credit Agricole Egypt Fund I")
    assert r["manager"] == "Hermes Portfolio and Fund Management"


def test_a_disclaimer_marker_is_not_left_on_the_fund_name():
    rows = split_managers(parse_rows(_text()))
    r = _row(rows, "GIG Insurance")
    assert r["manager"] == "PFI Asset Management"


def test_returns_are_fractions_in_column_order():
    rows = split_managers(parse_rows(_text()))
    w = _row(rows, "Wethaq")
    assert w["returns"]["ytd"] == 0.086
    assert w["returns"]["y1"] == 0.2299
    assert w["returns"]["y2"] == 0.5423
    assert w["returns"]["y3"] == 0.8698


def test_absent_columns_are_missing_not_zero():
    # Wethaq (Dec-21) has no 4/5/6-year history. Treating "N/A" as 0% would
    # fabricate a flat NAV four years back.
    rows = split_managers(parse_rows(_text()))
    w = _row(rows, "Wethaq")
    for col in ("y4", "y5", "y6"):
        assert col not in w["returns"], col


# ---------------------------------------------------------- derivation ------

def test_derivation_inverts_the_return():
    rows = split_managers(parse_rows(_text()))
    w = _row(rows, "Wethaq")
    got = {d["column"]: d for d in derive_navs(w, date(2026, 6, 4))}
    # 22.51201 / 1.2299 = 18.3039...
    assert abs(got["y1"]["nav"] - 18.303935) < 1e-5
    assert got["y1"]["date"] == date(2025, 6, 4)
    assert got["ytd"]["date"] == date(2026, 1, 1)
    assert all(d["derived"] is True for d in got.values())


def test_derivation_reproduces_our_own_stored_nav():
    """
    The claim this whole backfill rests on. These are real NAVs from our
    nav_history, captured 2026-08-15, at dates the report can reach.
    """
    rows = split_managers(parse_rows(_text()))
    known = [
        # fund,                anchor col, our stored NAV, tolerance %
        ("Misr Money Market",  "ytd", 102.1752, 0.10),
        ("Misr Money Market",  "y1",   91.8987, 0.60),
        ("Misr Money Market",  "y3",   62.5143, 0.10),
        ("Wethaq",             "y3",   12.0447, 0.10),
        ("Wethaq",             "y2",   14.6337, 0.40),
    ]
    for name, col, actual, tol in known:
        d = {x["column"]: x for x in derive_navs(_row(rows, name), date(2026, 6, 4))}
        got = d[col]["nav"]
        err = abs(got - actual) / actual * 100
        assert err <= tol, f"{name}/{col}: derived {got} vs actual {actual} = {err:.2f}% (> {tol}%)"


def test_an_anchor_before_inception_is_dropped():
    rows = split_managers(parse_rows(_text()))
    w = _row(rows, "Wethaq")                       # inception Dec-21
    for d in derive_navs(w, date(2026, 6, 4)):
        assert d["date"] >= date(2021, 12, 1), d


def test_a_total_loss_return_cannot_divide_by_zero():
    row = {"name": "X", "nav": 10.0, "inception": "Jan-20",
           "returns": {"y1": -1.0, "y2": -0.9999999}}
    assert derive_navs(row, date(2026, 1, 1)) == []


def test_whole_report_parses_end_to_end():
    rep = parse_report(_text())
    assert rep["report_date"] == date(2026, 6, 4)
    assert len(rep["published"]) == 197
    assert len(rep["derived"]) > 500
    assert all(p["derived"] is False for p in rep["published"])
    assert all(d["date"] < rep["report_date"] for d in rep["derived"])


def test_degenerate_input_does_not_raise():
    assert parse_rows("") == []
    assert parse_report_date("nothing here") is None
    assert parse_report("")["published"] == []


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_") or not callable(fn):
            continue
        try:
            fn()
            print(f"  ok   {name}")
        except AssertionError as exc:
            failed += 1
            print(f"  FAIL {name}: {exc}")
    print("\n✅ all EIMA report assertions passed" if not failed else f"\n❌ {failed} failed")
    sys.exit(1 if failed else 0)
