#!/usr/bin/env python3
"""
Fund risk-metric compute job — deterministic, from our own nav_history.

Populates the companion table `fund_risk_metrics` (self-migrating) with
volatility, max_drawdown, 52w high/low, and returns computed from the fund NAV
series we already store fresh daily. No scraping, no external feed, no login —
so it cannot false-green on a dead upstream. This is how we ship a CORRECT
max-drawdown (a competitor publishes maxDrawdown=0 on funds that clearly fell).

Design mirrors funds_nav_updater.py:
  * connect_resilient + read-only preflight (skip clean during a Supabase
    platform incident instead of crashing RED on infra we don't own)
  * per-fund isolation (one fund's bad data never aborts the batch)
  * idempotent ON CONFLICT upsert into a side table (never touches funds_view or
    mutual_funds, so a schema issue here can never break the core fund payload)
  * never-false-green: exit non-zero when fewer than --min-updated funds compute
  * --dry-run performs no writes

USAGE
  python compute_fund_metrics.py                  # all funds with >=2 NAV points
  python compute_fund_metrics.py --dry-run
  python compute_fund_metrics.py --ids 2734,2662
  python compute_fund_metrics.py --min-updated 50
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.pg_resilient import (  # noqa: E402
    connect_resilient, database_is_read_only, is_read_only_error)
from data_pipeline.fund_metrics import compute_all  # noqa: E402

DDL = """
CREATE TABLE IF NOT EXISTS fund_risk_metrics (
    fund_id           TEXT PRIMARY KEY,
    points            INTEGER,
    latest_nav        NUMERIC,
    latest_date       DATE,
    return_1m         NUMERIC,
    return_3m         NUMERIC,
    return_6m         NUMERIC,
    return_ytd        NUMERIC,
    return_1y         NUMERIC,
    return_3y         NUMERIC,
    return_5y         NUMERIC,
    volatility_annual NUMERIC,
    max_drawdown      NUMERIC,
    nav_52w_high      NUMERIC,
    nav_52w_low       NUMERIC,
    computed_at       TIMESTAMPTZ DEFAULT NOW()
);
"""

_COLS = ("points", "latest_nav", "latest_date", "return_1m", "return_3m",
         "return_6m", "return_ytd", "return_1y", "return_3y", "return_5y",
         "volatility_annual", "max_drawdown", "nav_52w_high", "nav_52w_low")

_UPSERT = (
    "INSERT INTO fund_risk_metrics (fund_id, " + ", ".join(_COLS) + ", computed_at) "
    "VALUES ($1, " + ", ".join(f"${i + 2}" for i in range(len(_COLS))) + ", NOW()) "
    "ON CONFLICT (fund_id) DO UPDATE SET "
    + ", ".join(f"{c} = EXCLUDED.{c}" for c in _COLS) + ", computed_at = NOW()"
)


def load_db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url.strip()
    for cand in ("~/Documents/startamarkets/.env", ".env", "../.env", "../../.env"):
        p = os.path.expanduser(cand)
        if os.path.exists(p):
            for line in open(p):
                m = re.match(r'\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
                if m:
                    return m.group(1).strip()
    raise SystemExit("FATAL: DATABASE_URL not set (env or .env)")


# Money-market / fixed-income / daily funds physically cannot draw down more than a
# few percent; a larger figure is an unadjusted redenomination artifact in the raw
# NAV series. Detect them by name and suppress the risk metrics rather than show a
# false deep loss — tightening the split-adjust ratio band enough to catch every 2:1
# redenomination would risk hiding real equity drawdowns.
_MM_RE = re.compile(r"money market|fixed income|treasury|t-bill|liquid|daily|cash fund|nagm",
                    re.IGNORECASE)


async def get_universe(conn, ids, limit):
    if ids:
        rows = await conn.fetch(
            """SELECT nh.fund_id, COALESCE(mf.fund_name_en, mf.fund_name, '') AS name
               FROM (SELECT fund_id FROM nav_history WHERE fund_id = ANY($1::text[])
                     GROUP BY fund_id HAVING COUNT(*) >= 2) nh
               LEFT JOIN mutual_funds mf ON mf.fund_id = nh.fund_id
               ORDER BY nh.fund_id""", ids)
    else:
        rows = await conn.fetch(
            """SELECT nh.fund_id, COALESCE(mf.fund_name_en, mf.fund_name, '') AS name
               FROM (SELECT fund_id FROM nav_history GROUP BY fund_id HAVING COUNT(*) >= 2) nh
               LEFT JOIN mutual_funds mf ON mf.fund_id = nh.fund_id
               ORDER BY nh.fund_id""")
    out = [(r["fund_id"], r["name"] or "") for r in rows]
    return out[:limit] if limit else out


async def compute_one(conn, fund_id, name, dry_run) -> bool:
    rows = await conn.fetch(
        "SELECT date, nav FROM nav_history WHERE fund_id = $1 ORDER BY date", fund_id)
    series = [(r["date"], r["nav"]) for r in rows]
    m = compute_all(series)
    # Skip ONLY when the fund genuinely lacks data. A None max_drawdown can also mean
    # the output backstop suppressed an absurd value — in that case we STILL upsert
    # (with NULL metrics) so the fund's stale/garbage row is corrected, not left behind.
    if m["points"] < 2:
        return False
    # Type-aware sanity: a money-market / fixed-income / daily fund cannot really draw
    # down > ~10% or run > ~6% volatility — such a value is a redenomination artifact.
    if _MM_RE.search(name or ""):
        dd, vol = m.get("max_drawdown"), m.get("volatility_annual")
        if (dd is not None and dd < -10) or (vol is not None and vol > 6):
            m["max_drawdown"] = None
            m["volatility_annual"] = None
    if dry_run:
        return True
    await conn.execute(_UPSERT, fund_id, *[m[c] for c in _COLS])
    return True


async def run(ids=None, limit=None, dry_run=False, min_updated=1):
    conn = await connect_resilient(load_db_url())
    try:
        if not dry_run and await database_is_read_only(conn):
            print("[skip] database is READ-ONLY (Supabase platform incident or standby) — "
                  "skipping fund-metrics compute this cycle; resumes automatically when "
                  "writes are restored. Not an error.", flush=True)
            return 0
        if not dry_run:
            await conn.execute(DDL)  # self-migrating companion table (idempotent)

        universe = await get_universe(conn, ids, limit)
        stats = {"universe": len(universe), "updated": 0, "skipped": 0, "failures": []}
        print(f"[fund-metrics] universe={len(universe)} funds dry_run={dry_run}", flush=True)

        for fund_id, name in universe:
            try:
                if await compute_one(conn, fund_id, name, dry_run):
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            except Exception as e:  # noqa: BLE001 - per-fund isolation
                if is_read_only_error(e):
                    stats["read_only"] = True
                    break
                stats["failures"].append(f"{fund_id}:{type(e).__name__}")

        print("[fund-metrics] RESULT " + json.dumps(stats, default=str), flush=True)

        if stats.get("read_only"):
            print("[skip] database went READ-ONLY mid-run — skipping remainder of this "
                  "fund-metrics cycle (not an error; resumes when writable).", flush=True)
            return 0
        if stats["updated"] < min_updated:
            print(f"::error::fund-metrics computed {stats['updated']} funds "
                  f"(< {min_updated}). Treating as FAILURE (kills false-green).", flush=True)
            return 2
        return 0
    finally:
        await conn.close()


def main():
    ap = argparse.ArgumentParser(description="Compute fund risk metrics from nav_history")
    ap.add_argument("--dry-run", action="store_true", help="compute only, no DB writes")
    ap.add_argument("--ids", type=str, default=None, help="comma-separated fund_ids")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--min-updated", type=int, default=1,
                    help="exit non-zero if fewer than this many funds computed")
    args = ap.parse_args()
    ids = [s.strip() for s in args.ids.split(",")] if args.ids else None
    sys.exit(asyncio.run(run(ids=ids, limit=args.limit, dry_run=args.dry_run,
                             min_updated=args.min_updated)))


if __name__ == "__main__":
    main()
