#!/usr/bin/env python3
"""
compute_fund_data_quality.py — populate the per-fund NAV quality ledger.

WHY THIS EXISTS (2026-08-15 audit)
----------------------------------
The funds pipeline failed for thirteen months with every alarm green, because
every alarm was AGGREGATE and the failure was PER-FUND. `MAX(date)` across the
universe is satisfied by one healthy fund; the fresh-within-10d count is
satisfied by the list-API trickle. Neither can see that fund 5784 has a 412-day
hole in the middle of its history.

This job writes one quality record per fund — cadence, coverage, defect gaps,
freshness, grade — so the monitor can alert on the DISTRIBUTION (how many funds
are unusable, which is worst) instead of on a universe maximum. It is the
structural answer to the incident, not a tuned threshold.

DESIGN
  * Reads nav_history, writes fund_data_quality. Never touches NAV data.
  * Self-migrating (CREATE TABLE IF NOT EXISTS on every run) — no separate
    migration step to forget, same pattern as fund_risk_metrics.
  * Read-only-safe: a Supabase read-only incident exits 0, not red.
  * Per-fund isolation: one bad series cannot abort the sweep.
  * All gap/grade logic lives in data_pipeline/fund_data_quality.py, which is
    pure, unit tested, and parity-tested against frontend/lib/nav-gaps.ts.

USAGE
  python compute_fund_data_quality.py                # all funds
  python compute_fund_data_quality.py --dry-run      # compute + report, no writes
  python compute_fund_data_quality.py --ids 5784,2662
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from collections import Counter
from datetime import date

import asyncpg

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.fund_data_quality import assess  # noqa: E402
from data_pipeline.pg_resilient import (  # noqa: E402
    connect_resilient, database_is_read_only, is_read_only_error)

DDL = """
CREATE TABLE IF NOT EXISTS fund_data_quality (
    fund_id              TEXT PRIMARY KEY,
    points               INTEGER,
    first_date           DATE,
    last_date            DATE,
    cadence              TEXT,
    median_interval_days NUMERIC,
    expected_points      INTEGER,
    coverage_pct         NUMERIC,
    gap_count            INTEGER,
    gap_days_total       INTEGER,
    worst_gap_days       INTEGER,
    worst_gap_from       DATE,
    worst_gap_to         DATE,
    age_days             INTEGER,
    grade                TEXT,
    computed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fund_data_quality_grade ON fund_data_quality (grade);
CREATE INDEX IF NOT EXISTS idx_fund_data_quality_worst_gap
    ON fund_data_quality (worst_gap_days DESC);

-- Snapshot per run, so the monitor can alert on REGRESSION rather than on a magic
-- absolute number. This matters here: the universe is knowingly degraded today
-- (61 funds carry a 13-month hole), so an absolute threshold would either sit red
-- until the P4 backfill lands — becoming noise everyone mutes — or be set so loose
-- it could never fire. Comparing against the previous snapshot detects NEW damage
-- immediately while the known backlog is worked down, and needs no tuning.
CREATE TABLE IF NOT EXISTS fund_quality_snapshots (
    id            BIGSERIAL PRIMARY KEY,
    taken_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scored        INTEGER,
    below_grade_c INTEGER,
    grade_counts  JSONB,
    worst_gap_days INTEGER
);
CREATE INDEX IF NOT EXISTS idx_fund_quality_snapshots_taken_at
    ON fund_quality_snapshots (taken_at DESC);
"""

UPSERT = """
INSERT INTO fund_data_quality
  (fund_id, points, first_date, last_date, cadence, median_interval_days,
   expected_points, coverage_pct, gap_count, gap_days_total, worst_gap_days,
   worst_gap_from, worst_gap_to, age_days, grade, computed_at)
VALUES ($1,$2,$3::date,$4::date,$5,$6,$7,$8,$9,$10,$11,$12::date,$13::date,$14,$15,NOW())
ON CONFLICT (fund_id) DO UPDATE SET
  points=EXCLUDED.points, first_date=EXCLUDED.first_date, last_date=EXCLUDED.last_date,
  cadence=EXCLUDED.cadence, median_interval_days=EXCLUDED.median_interval_days,
  expected_points=EXCLUDED.expected_points, coverage_pct=EXCLUDED.coverage_pct,
  gap_count=EXCLUDED.gap_count, gap_days_total=EXCLUDED.gap_days_total,
  worst_gap_days=EXCLUDED.worst_gap_days, worst_gap_from=EXCLUDED.worst_gap_from,
  worst_gap_to=EXCLUDED.worst_gap_to, age_days=EXCLUDED.age_days,
  grade=EXCLUDED.grade, computed_at=NOW()
"""


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


async def compute(ids=None, dry_run=False, min_scored=1) -> int:
    conn = await connect_resilient(load_db_url())
    try:
        if not dry_run and await database_is_read_only(conn):
            print("[fund-dq] database is READ-ONLY — skipping this cycle (not an error).",
                  flush=True)
            return 0

        await conn.execute(DDL) if not dry_run else None

        if ids:
            rows = await conn.fetch(
                "SELECT DISTINCT fund_id FROM nav_history WHERE fund_id = ANY($1::text[])",
                ids)
        else:
            rows = await conn.fetch("SELECT DISTINCT fund_id FROM nav_history")
        fund_ids = [r["fund_id"] for r in rows]
        print(f"[fund-dq] scoring {len(fund_ids)} funds  dry_run={dry_run}", flush=True)

        today = date.today()
        grades: Counter = Counter()
        cadences: Counter = Counter()
        scored, failures, worst = 0, [], []

        for fid in fund_ids:
            try:
                series = await conn.fetch(
                    "SELECT date, nav FROM nav_history WHERE fund_id=$1 ORDER BY date", fid)
                rec = assess(fid, [(r["date"], float(r["nav"])) for r in series],
                             as_of=today)
                grades[rec["grade"]] += 1
                if rec["cadence"]:
                    cadences[rec["cadence"]] += 1
                if rec["worst_gap_days"]:
                    worst.append((rec["worst_gap_days"], fid))
                if not dry_run:
                    await conn.execute(
                        UPSERT, rec["fund_id"], rec["points"], rec["first_date"],
                        rec["last_date"], rec["cadence"], rec["median_interval_days"],
                        rec["expected_points"], rec["coverage_pct"], rec["gap_count"],
                        rec["gap_days_total"], rec["worst_gap_days"],
                        rec["worst_gap_from"], rec["worst_gap_to"], rec["age_days"],
                        rec["grade"])
                scored += 1
            except Exception as e:  # noqa: BLE001 - per-fund isolation
                if is_read_only_error(e):
                    print("[fund-dq] database went READ-ONLY mid-run — stopping cleanly.",
                          flush=True)
                    return 0
                failures.append(f"{fid}:{type(e).__name__}")

        worst.sort(reverse=True)
        summary = {
            "scored": scored, "failures": len(failures),
            "grades": dict(sorted(grades.items())),
            "cadences": dict(cadences.most_common()),
            "below_grade_c": grades["D"] + grades["F"],
            "worst_gaps": [{"fund_id": f, "days": d} for d, f in worst[:10]],
        }
        if not dry_run:
            try:
                await conn.execute(
                    """INSERT INTO fund_quality_snapshots
                         (scored, below_grade_c, grade_counts, worst_gap_days)
                       VALUES ($1,$2,$3::jsonb,$4)""",
                    scored, summary["below_grade_c"], json.dumps(summary["grades"]),
                    worst[0][0] if worst else 0)
            except Exception as e:  # noqa: BLE001 - telemetry must not fail the job
                print(f"[fund-dq] WARN snapshot not recorded: {type(e).__name__}", flush=True)

        print("[fund-dq] RESULT " + json.dumps(summary, default=str), flush=True)
        if failures[:5]:
            print(f"[fund-dq] first failures: {failures[:5]}", flush=True)

        if scored < min_scored:
            print(f"::error::fund-dq scored {scored} funds (< {min_scored}).", flush=True)
            return 2
        return 0
    finally:
        await conn.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="Per-fund NAV data-quality ledger")
    ap.add_argument("--dry-run", action="store_true", help="compute + report, no writes")
    ap.add_argument("--ids", type=str, default=None, help="comma-separated fund_ids")
    ap.add_argument("--min-scored", type=int, default=1,
                    help="exit non-zero if fewer than this many funds were scored")
    args = ap.parse_args()
    ids = [s.strip() for s in args.ids.split(",")] if args.ids else None
    sys.exit(asyncio.run(compute(ids=ids, dry_run=args.dry_run,
                                 min_scored=args.min_scored)))


if __name__ == "__main__":
    main()
