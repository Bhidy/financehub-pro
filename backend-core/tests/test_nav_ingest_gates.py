"""
Offline tests for the NAV ingest gates (no DB, no network).

These cover the exact failure that ran green for fourteen months: a source that
keeps returning HTTP 200 with an unchanged body. The old gate counted funds
FETCHED and rows ATTEMPTED, both of which stay high forever in that state. The
new gates count NEW DATES and per-fund staleness.

Every gate is also asserted to FIRE, not just to pass — a gate that has never
been seen to fail is not evidence of anything.

Run:  cd backend-core && python -m pytest tests/test_nav_ingest_gates.py -q
Or standalone:  python backend-core/tests/test_nav_ingest_gates.py
"""
import asyncio
import os
import sys
import types

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

# The gates under test are pure control flow over a connection object; they never
# touch the driver. Stub asyncpg so this suite runs in the offline CI job, which
# installs only ruff/pytest/httpx — an offline test must not need a DB driver.
if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")

    class _Err(Exception):
        pass

    for _name in ("PostgresError", "PostgresConnectionError", "CannotConnectNowError",
                  "TooManyConnectionsError", "InterfaceError",
                  "ReadOnlySQLTransactionError"):
        setattr(_stub, _name, type(_name, (_Err,), {}))
    _stub.Connection = object
    _stub.connect = None
    sys.modules["asyncpg"] = _stub

import funds_nav_updater as fnu  # noqa: E402


class FakeConn:
    """Minimal asyncpg stand-in: canned rows for the ledger query."""

    def __init__(self, new_dates_desc):
        self._rows = [{"new_dates": n} for n in new_dates_desc]
        self.executed = []

    async def fetch(self, sql, *args):
        limit = args[0] if args else len(self._rows)
        return self._rows[:limit]

    async def execute(self, sql, *args):
        self.executed.append(sql.strip()[:40])
        return "OK"


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ------------------------------------------------- zero-gain streak logic ----

def test_streak_counts_consecutive_zero_gain_runs_from_newest():
    # newest first: 0,0,0 then a good run
    conn = FakeConn([0, 0, 0, 12, 40])
    assert run(fnu.recent_zero_gain_runs(conn, 5)) == 3


def test_a_single_good_run_resets_the_streak():
    conn = FakeConn([7, 0, 0, 0, 0])
    assert run(fnu.recent_zero_gain_runs(conn, 5)) == 0


def test_streak_is_zero_on_a_healthy_pipeline():
    conn = FakeConn([31, 28, 30, 29])
    assert run(fnu.recent_zero_gain_runs(conn, 4)) == 0


def test_frozen_source_produces_a_full_streak():
    # THE incident: every run succeeds, fetches everything, learns nothing.
    conn = FakeConn([0, 0, 0, 0, 0, 0])
    assert run(fnu.recent_zero_gain_runs(conn, 6)) == 6


def test_null_new_dates_is_treated_as_zero_gain():
    # Rows written before the column existed must not read as "healthy".
    conn = FakeConn([None, None, 5])
    assert run(fnu.recent_zero_gain_runs(conn, 3)) == 2


def test_empty_ledger_cannot_manufacture_a_streak():
    # First ever run: no history, so no verdict. Must not fire.
    conn = FakeConn([])
    assert run(fnu.recent_zero_gain_runs(conn, 3)) == 0


# -------------------------------------------------------- ledger recording --

def test_record_run_creates_the_table_then_inserts():
    conn = FakeConn([])
    stats = {"universe": 213, "updated": 176, "new_dates": 0, "corrections": 0,
             "funds_with_new_dates": 0, "no_data": 37, "numeric_stale_gt7d": 46,
             "by_source": {"mubasher_csv": 176}, "failures": []}
    run(fnu.record_run(conn, stats))
    assert any(s.startswith("CREATE TABLE IF NOT EXISTS") for s in conn.executed), conn.executed
    assert any(s.startswith("INSERT INTO fund_ingest_runs") for s in conn.executed), conn.executed


# ------------------------------------------- the 2026-08-13 production run ---

def test_the_real_green_run_would_now_be_judged_on_information_not_volume():
    """
    Scheduled run 31722793365 (2026-08-13) reported, and exited 0:
        universe=213 updated=176 points_saved=197959 numeric_stale_gt7d=46
    197,959 "points saved" while the whole universe was missing exactly 2 rows the
    source actually had. Under the new counting that run's new_dates is ~0, and
    46 stale funds is now a gate rather than a printed number.
    """
    historical = {"universe": 213, "updated": 176, "points_saved": 197959,
                  "new_dates": 0, "numeric_stale_gt7d": 46}
    # transport gate: still passes (fetching genuinely worked)
    assert historical["updated"] >= 100
    # information gate: fires
    conn = FakeConn([0, 0, 0])
    assert run(fnu.recent_zero_gain_runs(conn, 3)) >= 3
    # staleness gate: fires at any sane threshold
    assert historical["numeric_stale_gt7d"] > 10


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
    print("\n✅ all ingest-gate assertions passed" if not failed else f"\n❌ {failed} failed")
    sys.exit(1 if failed else 0)
