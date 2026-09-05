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

# Per-observation provenance (audit 2026-09-05): the list API is a secondary
# source, tagged as such with the URL it was read from. Columns are created by
# funds_nav_updater.NAV_DDL (self-migrating); exported for the CI write-contract.
SQL_UPSERT_NAV_LIST = """INSERT INTO nav_history (fund_id, date, nav, source, source_url, ingested_at)
   VALUES ($1, $2, $3, 'mubasher_list_api', $4, NOW())
   ON CONFLICT (fund_id, date) DO UPDATE
     SET nav = EXCLUDED.nav, source = EXCLUDED.source, source_url = EXCLUDED.source_url, ingested_at = NOW()
     WHERE nav_history.nav IS DISTINCT FROM EXCLUDED.nav"""
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


ARABIC_LIST_URL = "https://www.mubasher.info/api/1/funds?country=eg&size=500"

_INSERT_FUND = """
INSERT INTO mutual_funds
    (fund_id, fund_name_en, fund_name, market_code, market, currency,
     manager_name, owner, latest_nav, last_update_date, updated_at)
VALUES ($1, $2, $3, 'EGX', 'Egyptian Stock Exchange', $4, $5, $6, $7, $8, NOW())
ON CONFLICT (fund_id) DO UPDATE SET
    fund_name_en = COALESCE(NULLIF(mutual_funds.fund_name_en, ''), EXCLUDED.fund_name_en),
    fund_name    = COALESCE(NULLIF(mutual_funds.fund_name, ''), EXCLUDED.fund_name),
    manager_name = COALESCE(NULLIF(mutual_funds.manager_name, ''), EXCLUDED.manager_name),
    owner        = COALESCE(NULLIF(mutual_funds.owner, ''), EXCLUDED.owner),
    updated_at   = NOW()
"""


#: Fund names that end with / contain an explicit currency marker. The Mubasher
#: list API frequently omits `currency`, and blindly defaulting to EGP printed
#: "EGP 1.01" on USD-denominated funds — a misleading financial figure. The name
#: is the issuer's own denomination label, so it is authoritative when present.
_CURRENCY_MARKERS = (
    ("USD", ("usd", "dollar", "دولار")),
    ("EUR", ("eur", "euro", "يورو")),
    ("SAR", ("sar", "riyal", "ريال")),
    ("AED", ("aed", "dirham", "درهم")),
    ("GBP", ("gbp", "sterling", "استرليني", "إسترليني")),
)


def _derive_currency(en, name_en, ar_name=None) -> str:
    """Resolve a fund's denomination.

    Order: the API's own `currency` → an explicit currency marker in the English
    or Arabic fund name → EGP. Never default a fund whose name says "USD" to EGP.
    """
    explicit = (en.get("currency") or "").strip().upper()
    if explicit:
        return explicit
    hay = f"{name_en or ''} {ar_name or ''}".lower()
    for code, needles in _CURRENCY_MARKERS:
        if any(n in hay for n in needles):
            return code
    return "EGP"


def _fund_insert_row(en, ar_name=None):
    """PURE: map a Mubasher english list-API row (+ optional Arabic name) to the arg
    tuple for _INSERT_FUND, or None if the fund lacks the data to render a real page
    (no positive price, or no English name). This is what prevents empty stubs — a
    fund Mubasher lists but has no NAV for (price 0, e.g. an unlaunched target-maturity
    fund) is never inserted. fund_name_en is always set, so new funds are visible."""
    if not isinstance(en, dict):
        return None
    fid = en.get("fundId")
    nav = _parse_nav(en.get("price"))          # None when price is 0 / missing
    name_en = (en.get("name") or "").strip()
    if fid is None or nav is None or not name_en:
        return None
    managers = en.get("managers") or []
    manager = str((managers[0] if managers else None) or en.get("owner") or "").strip() or None
    return (
        str(fid),
        name_en,
        (ar_name or "").strip() or name_en,
        _derive_currency(en, name_en, ar_name),
        manager,
        (str(en.get("owner") or "").strip() or None),
        nav,
        _parse_date(en.get("date")),
    )


async def fetch_raw(client, url):
    """Fetch a Mubasher list-API URL and return its raw rows (list of dicts)."""
    r = await client.get(url)
    r.raise_for_status()
    data = r.json()
    rows = data.get("rows") if isinstance(data, dict) else None
    return rows if isinstance(rows, list) else []


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


async def run(dry_run=False, min_updated=1, discover=False):
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
                await conn.execute(SQL_UPSERT_NAV_LIST, fund_id, d, nav, LIST_URL)
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

        # --- Discovery: add funds Mubasher lists but we don't have, or that we have but
        # are HIDDEN because fund_name_en is blank (the funds API filters those out).
        # Only funds WITH data (positive price + English name) are inserted, so we never
        # create empty stub pages; fill-don't-null upsert never overwrites existing data.
        if discover and not dry_run and not stats.get("read_only"):
            try:
                timeout = httpx.Timeout(25.0, connect=10.0)
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True,
                                             headers={"User-Agent": UA}) as client:
                    en_rows = await fetch_raw(client, LIST_URL)
                    ar_rows = await fetch_raw(client, ARABIC_LIST_URL)
                ar_name = {str(r.get("fundId")): (r.get("name") or "")
                           for r in ar_rows if isinstance(r, dict)}
                invisible = {r["fund_id"] for r in await conn.fetch(
                    "SELECT fund_id FROM mutual_funds WHERE COALESCE(fund_name_en, '') = ''")}
                added = 0
                for en in en_rows:
                    fid = str(en.get("fundId")) if isinstance(en, dict) else ""
                    if fid in known and fid not in invisible:
                        continue  # already present and visible
                    row = _fund_insert_row(en, ar_name.get(fid))
                    if not row:
                        continue  # dataless (price 0) — never insert an empty stub
                    try:
                        await conn.execute(_INSERT_FUND, *row)
                        added += 1
                    except Exception as e:  # noqa: BLE001 - per-fund isolation
                        if is_read_only_error(e):
                            stats["read_only"] = True
                            break
                        stats["failures"].append(f"discover:{fid}:{type(e).__name__}")
                stats["discovered"] = added
            except Exception as e:  # noqa: BLE001 - discovery best-effort; never fail the run
                stats["failures"].append(f"discover:{type(e).__name__}")

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
    ap.add_argument("--discover", action="store_true",
                    help="also insert funds Mubasher lists that we lack/hide (with data only)")
    args = ap.parse_args()
    sys.exit(asyncio.run(run(dry_run=args.dry_run, min_updated=args.min_updated,
                             discover=args.discover)))


if __name__ == "__main__":
    main()
