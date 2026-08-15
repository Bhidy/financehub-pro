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


def pts(pairs):
    return [{"date": date.fromisoformat(d), "nav": v, "derived": True} for d, v in pairs]


# Real NAVs from our nav_history for Wethaq / Misr Money Market.
EXISTING = {
    date(2024, 6, 4): 14.6337,
    date(2023, 6, 4): 12.0447,
    date(2026, 1, 1): 20.7200,
}


def test_a_correct_mapping_is_accepted():
    v = eb.reconcile(pts([("2024-06-04", 14.5964),
                          ("2023-06-04", 12.0398),
                          ("2026-01-01", 20.7293)]), EXISTING)
    assert v["ok"], v["reason"]


def test_a_wrong_fund_is_rejected():
    # The failure mode that matters: a plausible name, a completely different fund.
    v = eb.reconcile(pts([("2024-06-04", 900.0),
                          ("2023-06-04", 800.0),
                          ("2026-01-01", 1000.0)]), EXISTING)
    assert not v["ok"]
    assert "exceeds" in v["reason"]


def test_a_redenomination_is_named_not_mistaken_for_a_bad_match():
    # Egyptian funds redenominate (2:1, 100:1). The derived series is then a
    # clean multiple of ours — that is a corporate action, and saying "wrong
    # fund" would send someone hunting a mapping bug that does not exist.
    ex = {date(2024, 6, 4): 1922.12, date(2023, 6, 4): 1610.23, date(2025, 6, 4): 2357.78}
    v = eb.reconcile(pts([("2024-06-04", 960.0),
                          ("2023-06-04", 804.76),
                          ("2025-06-04", 1176.93)]), ex)
    assert not v["ok"]
    assert "redenomination" in v["reason"], v["reason"]


def test_too_little_overlap_is_skipped_not_guessed():
    v = eb.reconcile(pts([("2024-06-04", 14.59)]), EXISTING)
    assert not v["ok"]
    assert "overlapping" in v["reason"]


def test_no_overlap_at_all_is_skipped():
    v = eb.reconcile(pts([("2019-06-04", 5.0)]), EXISTING)
    assert not v["ok"]


def test_one_wild_point_rejects_the_whole_fund():
    # Median stays tiny, so only the worst-case bound catches this.
    v = eb.reconcile(pts([("2024-06-04", 14.5964),
                          ("2023-06-04", 12.0398),
                          ("2026-01-01", 25.0)]), EXISTING)
    assert not v["ok"]
    assert "worst" in v["reason"]


def test_a_near_miss_date_still_counts_as_overlap():
    # NAV is published weekly by EIMA and daily by us; the anchor rarely lands
    # exactly on one of our rows, so a few days either side must still match.
    ex = {date(2024, 6, 6): 14.6337, date(2023, 6, 2): 12.0447, date(2025, 12, 30): 20.72}
    v = eb.reconcile(pts([("2024-06-04", 14.5964),
                          ("2023-06-04", 12.0398),
                          ("2026-01-01", 20.7293)]), ex)
    assert v["ok"], v["reason"]


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
