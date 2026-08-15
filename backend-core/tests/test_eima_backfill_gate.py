"""
Offline tests for the EIMA backfill's reconciliation gate (no DB, no network).

This gate is the only thing standing between a fuzzy English-name match and
writing wrong NAVs into a fund's history. EIMA identifies funds by name; we key
on Mubasher ids. A name match is a HYPOTHESIS — the gate tests it against NAV we
already hold and refuses anything that disagrees.

So every case here asserts the gate REJECTS. A safety net only counts once it
has been seen to catch something.

Run:  cd backend-core && python -m pytest tests/test_eima_backfill_gate.py -q
Or standalone:  python backend-core/tests/test_eima_backfill_gate.py
"""
import os
import sys
import types
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

# The gate is pure arithmetic over a dict; stub the driver so this runs in the
# offline CI job, which installs no DB packages.
if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")

    class _Err(Exception):
        pass

    for _n in ("PostgresError", "PostgresConnectionError", "CannotConnectNowError",
               "TooManyConnectionsError", "InterfaceError", "ReadOnlySQLTransactionError"):
        setattr(_stub, _n, type(_n, (_Err,), {}))
    _stub.connect = None
    sys.modules["asyncpg"] = _stub

import eima_backfill as eb  # noqa: E402


def pts(pairs, column="y1"):
    return [{"date": date.fromisoformat(d), "nav": v, "derived": True, "column": column}
            for d, v in pairs]


def cols(rows):
    """rows of (iso_date, nav, column)."""
    return [{"date": date.fromisoformat(d), "nav": v, "derived": True, "column": c}
            for d, v, c in rows]


# Real NAVs from our nav_history for Wethaq / Misr Money Market.
EXISTING = {
    date(2024, 6, 4): 14.6337,
    date(2023, 6, 4): 12.0447,
    date(2026, 1, 1): 20.7200,
}


def test_a_correct_mapping_is_accepted():
    v = eb.reconcile(cols([("2024-06-04", 14.5964, "y2"), ("2024-06-06", 14.60, "y2"),
                           ("2023-06-04", 12.0398, "y3"), ("2023-06-02", 12.05, "y3")]),
                     {**EXISTING, date(2024, 6, 6): 14.6337, date(2023, 6, 2): 12.0447})
    assert v["ok"], v["reason"]


def test_a_wrong_fund_is_rejected():
    # The failure mode that matters: a plausible name, a completely different fund.
    ex = {**EXISTING, date(2024, 6, 6): 14.6337}
    v = eb.reconcile(cols([("2024-06-04", 900.0, "y2"), ("2024-06-06", 905.0, "y2"),
                           ("2023-06-04", 800.0, "y3")]), ex)
    assert not v["ok"], v["reason"]
    assert "no column agrees" in v["reason"] or "redenomination" in v["reason"]


def test_a_wholesale_redenomination_is_named_not_mistaken_for_a_bad_match():
    # Egyptian funds redenominate (2:1, 100:1). The derived series is then a
    # clean multiple of ours — that is a corporate action, and saying "wrong
    # fund" would send someone hunting a mapping bug that does not exist.
    ex = {date(2024, 6, 4): 1922.12, date(2023, 6, 4): 1610.23, date(2025, 6, 4): 2357.78}
    v = eb.reconcile(cols([("2024-06-04", 960.0, "y2"), ("2023-06-04", 804.76, "y3"),
                           ("2025-06-04", 1176.93, "y1")]), ex)
    assert not v["ok"]
    assert "redenomination" in v["reason"], v["reason"]


def test_too_little_overlap_is_skipped_not_guessed():
    v = eb.reconcile(pts([("2024-06-04", 14.59)]), EXISTING)
    assert not v["ok"]
    assert "overlapping" in v["reason"]


def test_no_overlap_at_all_is_skipped():
    v = eb.reconcile(pts([("2019-06-04", 5.0)]), EXISTING)
    assert not v["ok"]
    assert v["good_columns"] == set()


def test_a_broken_anchor_drops_only_that_column():
    """
    The first live run rejected two DEFINITELY-correct mappings (median error
    0.00% and 0.09%) because a single anchor was 4% and 37% out. That is a broken
    anchor, not a wrong fund — a redenomination corrupts every anchor older than
    the event and leaves newer ones exact. Judging per column keeps the good
    history instead of discarding the fund.
    """
    ex = {**EXISTING, date(2025, 6, 4): 18.30, date(2025, 6, 6): 18.29,
          date(2024, 6, 6): 14.6337, date(2023, 6, 2): 12.0447}
    v = eb.reconcile(cols([("2025-06-04", 18.303, "y1"), ("2025-06-06", 18.29, "y1"),
                           ("2024-06-04", 14.596, "y2"), ("2024-06-06", 14.60, "y2"),
                           ("2023-06-04", 12.57, "y3"), ("2023-06-02", 12.58, "y3")]), ex)
    assert v["ok"], v["reason"]
    assert "y1" in v["good_columns"] and "y2" in v["good_columns"]
    assert "y3" not in v["good_columns"], v["reason"]


def test_a_redenomination_spares_the_anchors_newer_than_it():
    ex = {**EXISTING, date(2025, 6, 4): 18.30, date(2025, 6, 6): 18.29,
          date(2023, 6, 2): 12.0447}
    v = eb.reconcile(cols([("2025-06-04", 18.303, "y1"), ("2025-06-06", 18.29, "y1"),
                           ("2023-06-04", 0.1205, "y3"), ("2023-06-02", 0.1205, "y3")]), ex)
    assert v["ok"]
    assert v["good_columns"] == {"y1"}, v["reason"]


def test_one_fund_id_cannot_be_claimed_twice():
    # Three EIMA names all scored best against fund 2703 in the first live run.
    cat = [("2703", "Agricultural Bank of Egypt Fund Al Wefak"),
           ("2718", "Agricultural Bank of Egypt Al Hasad Al Yaumy")]
    a = eb.assign_one_to_one(["Agricultural Bank of Egypt (Al Wefak)",
                              "Agricultural Bank of Egypt (Al Hasad Al Yaumy)",
                              "Agricultural Bank of Egypt Fund (Al Mahsoul)"], cat)
    assert len({fid for fid, _ in a.values()}) == len(a), a
    assert a["Agricultural Bank of Egypt (Al Wefak)"][0] == "2703"


def test_a_near_miss_date_still_counts_as_overlap():
    # NAV is published weekly by EIMA and daily by us; the anchor rarely lands
    # exactly on one of our rows, so a few days either side must still match.
    ex = {date(2024, 6, 6): 14.6337, date(2024, 6, 2): 14.62}
    v = eb.reconcile(cols([("2024-06-04", 14.5964, "y2"), ("2024-06-04", 14.60, "y2")]), ex)
    assert v["by_col"]["y2"], "near-miss dates did not match"


def test_name_normalisation_ignores_boilerplate():
    a = eb._norm("Wethaq Money Market Fund Cumulative and Periodic Income Fund Wethaq")
    assert "fund" not in a.split()
    assert "wethaq" in a


def test_best_match_prefers_the_right_fund():
    cat = [("5784", "Wethaq Money Market Fund Cumulative and Periodic Income Fund Wethaq"),
           ("2662", "Arab African International Bank Fixed Income Fund Gozoor"),
           ("5635", "Emirates NBD Money Market Fund Mazid")]
    fid, score = eb.best_match("Wethaq", cat)
    assert fid == "5784", (fid, score)
    fid, _ = eb.best_match("Emirates NBD (Mazid)", cat)
    assert fid == "5635"




# ----------------------------------------------- data-first assignment ------

def test_reconcile_reports_quality_for_ranking():
    ex = {**EXISTING, date(2024, 6, 6): 14.6337, date(2023, 6, 2): 12.0447}
    v = eb.reconcile(cols([("2024-06-04", 14.5964, "y2"), ("2024-06-06", 14.60, "y2"),
                           ("2023-06-04", 12.0398, "y3"), ("2023-06-02", 12.05, "y3")]), ex)
    assert v["ok"]
    assert v["overlap"] >= 3
    assert v["median_abs"] is not None and v["median_abs"] < 1.0


def test_data_decides_a_name_swap():
    """
    The production GIG case, in miniature. Two sibling funds with confusable
    names; the name scorer swaps them; the DATA cannot be swapped: the equity
    series reconciles only with the equity fund's history and vice versa. With
    data-first ranking, whichever candidate reconciles is the assignment —
    whatever any name score says.
    """
    equity_hist = {date(2026, 6, 4): 18.30, date(2026, 6, 11): 18.55,
                   date(2026, 6, 18): 18.20}
    mm_hist = {date(2026, 6, 4): 15.52, date(2026, 6, 11): 15.57,
               date(2026, 6, 18): 15.62}
    equity_pts = cols([("2026-06-04", 18.31, "nav"), ("2026-06-11", 18.54, "nav"),
                       ("2026-06-18", 18.21, "nav")])
    # equity data against the equity fund: agrees
    assert eb.reconcile(equity_pts, equity_hist)["ok"]
    # equity data against the money-market sibling: refused
    assert not eb.reconcile(equity_pts, mm_hist)["ok"]


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
    print("\n✅ all backfill-gate assertions passed" if not failed else f"\n❌ {failed} failed")
    sys.exit(1 if failed else 0)
