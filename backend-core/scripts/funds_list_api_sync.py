#!/usr/bin/env python3
"""
Mubasher LIST-API NAV augment — the "fresher pipeline" layer.

WHY
---
The primary funds engine (funds_nav_updater.py) reads Mubasher's per-fund static
CSV, which lags the market by ~1-2 days. Mubasher's LIST API
(english.mubasher.info/api/1/funds?country=eg) returns EVERY EG fund's CURRENT
price + as-of date in ONE call, ~1 day AHEAD of the CSV. This layer upserts that
fresh current point so our headline NAV matches the freshest source and stale
funds re-cross the freshness gate.

SCOPE / SAFETY
--------------
  * Upserts a NAV point ONLY for funds that ALREADY exist in mutual_funds — it
    never invents partial fund records (thin auto-created funds are worse than
    absent; new-fund discovery with full metadata stays with scrape_mubasher.py).
  * Idempotent ON CONFLICT (fund_id, date) — re-running only adds/corrects.
  * Reports funds present in the API but missing from our DB (the true coverage
    gap) WITHOUT inserting them.
  * connect_resilient + read-only preflight (skip clean on a Supabase read-only
    incident) + never-false-green (exit 2 if < --min-updated).

The row parser is pure (parse_list_rows) and unit-tested offline.

USAGE
  python funds_list_api_sync.py                # augment all known EG funds
  python funds_list_api_sync.py --dry-run
  python funds_list_api_sync.py --min-updated 50
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import re
import sys
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    import httpx
except ModuleNotFoundError:  # pragma: no cover
    httpx = None
# NOTE: data_pipeline.pg_resilient (which imports asyncpg) is imported lazily
# inside run() so the pure parser (parse_list_rows) stays importable — and
# unit-testable — in environments without asyncpg installed.

LIST_URL = "https://english.mubasher.info/api/1/funds?country=eg&size=500"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

MIN_NAV = 1e-6
MAX_NAV = 1e9
MIN_DATE = date(1990, 1, 1)


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _parse_nav(raw):
    try:
        v = float(str(raw).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v) or v < MIN_NAV or v > MAX_NAV:
        return None
    return round(v, 6)


def _parse_date(raw):
    """Mubasher list-API date is like '30 June 2026'; tolerate ISO too."""
    s = str(raw or "").strip()
    if not s:
        return None
    for fmt in ("%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            d = datetime.strptime(s, fmt).date()
            if MIN_DATE <= d <= _today():
                return d
            return None
        except ValueError:
            continue
    return None


def parse_list_rows(payload) -> list[tuple[str, date, float]]:
    """PURE: Mubasher list-API JSON -> validated [(fund_id, date, nav)]. Drops
    rows with a missing/invalid id, price, or date. Unit-tested offline."""
    rows = payload.get("rows") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        return []
    out: list[tuple[str, date, float]] = []
    for r in rows:
        if not isinstance(r, dict):
            continue
        fid = r.get("fundId")
        nav = _parse_nav(r.get("price"))
        d = _parse_date(r.get("date"))
        if fid is None or nav is None or d is None:
            continue
        out.append((str(fid), d, nav))
    return out


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


async def fetch_list() -> list[tuple[str, date, float]]:
    if httpx is None:
        raise SystemExit("FATAL: httpx not installed")
    timeout = httpx.Timeout(25.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True,
                                 headers={"User-Agent": UA}) as client:
        r = await client.get(LIST_URL)
        r.raise_for_status()
        return parse_list_rows(r.json())


async def run(dry_run=False, min_updated=1):
    from data_pipeline.pg_resilient import (  # lazy: keeps parser asyncpg-free
        connect_resilient, database_is_read_only, is_read_only_error)
    points = await fetch_list()
    print(f"[funds-list-api] fetched {len(points)} priced funds from Mubasher list API",
          flush=True)
    conn = await connect_resilient(load_db_url())
    try:
        if not dry_run and await database_is_read_only(conn):
            print("[skip] database is READ-ONLY (Supabase platform incident or standby) — "
                  "skipping list-API augment this cycle; resumes automatically. Not an error.",
                  flush=True)
            return 0

        known = {r["fund_id"] for r in await conn.fetch("SELECT fund_id FROM mutual_funds")}
        stats = {"fetched": len(points), "updated": 0, "missing_from_db": 0,
                 "missing_ids": [], "failures": []}

        for fund_id, d, nav in points:
            if fund_id not in known:
                stats["missing_from_db"] += 1
                if len(stats["missing_ids"]) < 50:
                    stats["missing_ids"].append(fund_id)
                continue
            if dry_run:
                stats["updated"] += 1
                continue
            try:
                await conn.execute(
                    """INSERT INTO nav_history (fund_id, date, nav) VALUES ($1, $2, $3)
                       ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav""",
                    fund_id, d, nav)
                await conn.execute(
                    """UPDATE mutual_funds f SET latest_nav = nh.nav,
                           last_update_date = nh.date, updated_at = NOW()
                       FROM (SELECT nav, date FROM nav_history WHERE fund_id = $1
                             ORDER BY date DESC LIMIT 1) nh
                       WHERE f.fund_id = $1""", fund_id)
                stats["updated"] += 1
            except Exception as e:  # noqa: BLE001 - per-fund isolation
                if is_read_only_error(e):
                    stats["read_only"] = True
                    break
                stats["failures"].append(f"{fund_id}:{type(e).__name__}")

        print("[funds-list-api] RESULT " + json.dumps(stats, default=str), flush=True)
        if stats["missing_from_db"]:
            print(f"::notice::{stats['missing_from_db']} funds priced by Mubasher are NOT in "
                  f"mutual_funds (coverage gap; add via scrape_mubasher.py with full metadata).",
                  flush=True)
        if stats.get("read_only"):
            print("[skip] database went READ-ONLY mid-run — skipping remainder (not an error).",
                  flush=True)
            return 0
        if stats["updated"] < min_updated:
            print(f"::error::funds-list-api updated {stats['updated']} funds (< {min_updated}). "
                  f"Treating as FAILURE (kills false-green).", flush=True)
            return 2
        return 0
    finally:
        await conn.close()


def main():
    ap = argparse.ArgumentParser(description="Mubasher list-API NAV augment (fresher pipeline)")
    ap.add_argument("--dry-run", action="store_true", help="fetch+parse only, no DB writes")
    ap.add_argument("--min-updated", type=int, default=1,
                    help="exit non-zero if fewer than this many funds updated")
    args = ap.parse_args()
    sys.exit(asyncio.run(run(dry_run=args.dry_run, min_updated=args.min_updated)))


if __name__ == "__main__":
    main()
