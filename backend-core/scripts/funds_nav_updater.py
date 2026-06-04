#!/usr/bin/env python3
"""
Funds NAV Updater — Mubasher static-CSV primary engine (never-fail design).

WHY THIS EXISTS
---------------
The legacy funds refresh (`egypt_market_service.update_all_navs`, wired to the
GitHub Actions `/refresh/egypt-funds` job) depends on
`english.mubasher.info/api/1/funds/{id}/chart`, which now returns HTTP 500, and
on scraping the funds list page, which is JS-rendered (empty to a static fetch).
So it fetched 0 NAV points per fund yet reported `egypt_funds_success`
(false-green). NAVs silently froze (most funds 2026-05-20 or older; a large
cohort stuck at 2026-01-07) while CI stayed green and nothing alarmed.

Meanwhile Mubasher exposes a clean, **no-auth, always-fresh** per-fund CSV:
    https://static.mubasher.info/File.MubasherCharts/File.Mutual_Fund_Charts_Dir/priceChartFund_{fund_id}.csv
Each row is `YYYY/MM/DD/HH:MM:SS,nav`, full history to within ~2 days. This
script makes that CSV the PRIMARY engine.

LAYERS (defense-in-depth)
-------------------------
  Layer 1  PRIMARY  : static CSV endpoint (no auth, fresh, full history).
  Layer 2  FALLBACK : english.mubasher.info JSON chart API (best-effort; may be
                      down, coded defensively so its outage is a no-op).
  Layer 3  PRESERVE : idempotent ON CONFLICT upsert — a failed/empty fetch can
                      NEVER wipe an existing NAV (we only ever add/correct).
  (Layer 4, separate process: the Playwright scraper `scrape_mubasher.py`
   covers funds with no CSV — e.g. newer 64xx IDs — and discovers new funds.)

RESILIENCE
----------
  * per-fund isolation: one fund's failure never aborts the batch
  * bounded concurrency + per-request retries/timeouts
  * strict validation: drop NaN/Inf/<=0/absurd NAVs and out-of-range dates
  * structured JSON stats + NON-ZERO exit when 0 funds updated (kills false-green)
  * --dry-run performs no writes

USAGE
-----
  python funds_nav_updater.py                 # update all numeric-id funds
  python funds_nav_updater.py --dry-run        # fetch+parse only, no DB writes
  python funds_nav_updater.py --ids 2662,2663  # specific funds
  python funds_nav_updater.py --limit 10 --concurrency 8
"""
from __future__ import annotations

import argparse
import asyncio
import csv as _csv
import io
import json
import math
import os
import re
import sys
from datetime import date, datetime, timezone

import asyncpg
try:
    import httpx  # needed only for the updater (fetch) path; --monitor runs without it
except ModuleNotFoundError:  # pragma: no cover
    httpx = None

CSV_URL = ("https://static.mubasher.info/File.MubasherCharts/"
           "File.Mutual_Fund_Charts_Dir/priceChartFund_{fund_id}.csv")
API_URL = "https://english.mubasher.info/api/1/funds/{fund_id}/chart?type=all"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# Validation bounds
MIN_NAV = 1e-6
MAX_NAV = 1e9
MIN_DATE = date(1990, 1, 1)


def _today() -> date:
    return datetime.now(timezone.utc).date()


def load_db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url.strip()
    # Fallback: repo-root .env (local dev)
    for cand in ("~/Documents/startamarkets/.env", ".env", "../.env", "../../.env"):
        p = os.path.expanduser(cand)
        if os.path.exists(p):
            for line in open(p):
                m = re.match(r'\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
                if m:
                    return m.group(1).strip()
    raise SystemExit("FATAL: DATABASE_URL not set (env or .env)")


def _parse_nav(raw) -> float | None:
    try:
        v = float(str(raw).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):          # NaN / Inf  -> Postgres-poison, drop
        return None
    if v < MIN_NAV or v > MAX_NAV:     # zero / negative / absurd -> drop
        return None
    return round(v, 6)


def _parse_date(raw) -> date | None:
    s = str(raw).strip()
    if not s:
        return None
    # Mubasher CSV: 2026/06/02/00:00:00  ; also tolerate ISO / dd-mm-yyyy
    head = s.split(",")[0]
    for fmt in ("%Y/%m/%d/%H:%M:%S", "%Y/%m/%d", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            d = datetime.strptime(head, fmt).date()
            break
        except ValueError:
            d = None
    if d is None:
        return None
    if d < MIN_DATE or d > _today():   # reject pre-1990 and future-dated points
        return None
    return d


def parse_csv(text: str) -> list[tuple[date, float]]:
    """Parse Mubasher NAV CSV into validated, de-duplicated, sorted points."""
    out: dict[date, float] = {}
    reader = _csv.reader(io.StringIO(text))
    for row in reader:
        if len(row) < 2:
            continue
        d = _parse_date(row[0])
        nav = _parse_nav(row[1])
        if d is None or nav is None:
            continue
        out[d] = nav                   # last value wins on duplicate date
    return sorted(out.items())


async def fetch_csv(client: httpx.AsyncClient, fund_id: str, retries: int = 2):
    url = CSV_URL.format(fund_id=fund_id)
    for attempt in range(retries + 1):
        try:
            r = await client.get(url)
            if r.status_code == 200 and r.content and len(r.content) > 50:
                pts = parse_csv(r.text)
                if pts:
                    return pts, "mubasher_csv"
            if r.status_code == 404:
                return None, "csv_404"   # definitive: no CSV for this id
        except (httpx.HTTPError, httpx.TimeoutException):
            pass
        if attempt < retries:
            await asyncio.sleep(1.0 * (attempt + 1))
    return None, "csv_fail"


async def fetch_api(client: httpx.AsyncClient, fund_id: str):
    """Layer 2 fallback: english.mubasher.info JSON chart API (best-effort)."""
    try:
        r = await client.get(
            API_URL.format(fund_id=fund_id),
            headers={"X-Requested-With": "XMLHttpRequest",
                     "Accept": "application/json, text/plain, */*"},
        )
        if r.status_code != 200:
            return None, f"api_{r.status_code}"
        data = r.json()
        if not isinstance(data, list):
            return None, "api_shape"
        out: dict[date, float] = {}
        for p in data:
            if isinstance(p, list) and len(p) >= 2:
                ts, val = p[0], p[1]
            elif isinstance(p, dict):
                ts, val = p.get("x") or p.get("date"), p.get("y") or p.get("value")
            else:
                continue
            try:
                ts = float(ts)
                d = datetime.fromtimestamp(ts / 1000.0 if ts > 9999999999 else ts,
                                           tz=timezone.utc).date()
            except (TypeError, ValueError, OSError, OverflowError):
                continue
            nav = _parse_nav(val)
            if d and nav is not None and MIN_DATE <= d <= _today():
                out[d] = nav
        if out:
            return sorted(out.items()), "mubasher_api"
    except (httpx.HTTPError, ValueError):
        pass
    return None, "api_fail"


async def get_universe(conn, only_numeric: bool, ids: list[str] | None, limit: int | None):
    if ids:
        rows = await conn.fetch(
            "SELECT fund_id FROM mutual_funds WHERE fund_id = ANY($1::text[])", ids)
    elif only_numeric:
        rows = await conn.fetch(
            "SELECT fund_id FROM mutual_funds WHERE fund_id ~ '^[0-9]+$' ORDER BY fund_id")
    else:
        rows = await conn.fetch("SELECT fund_id FROM mutual_funds ORDER BY fund_id")
    fund_ids = [r["fund_id"] for r in rows]
    if limit:
        fund_ids = fund_ids[:limit]
    return fund_ids


async def fetch_one(client, sem, fund_id):
    """Fetch+parse a single fund through the layered sources. No DB access."""
    async with sem:
        pts, src = await fetch_csv(client, fund_id)
        if pts:
            return fund_id, pts, src
        # Layer 2 only if CSV didn't return a definitive 404-with-data scenario
        pts2, src2 = await fetch_api(client, fund_id)
        if pts2:
            return fund_id, pts2, src2
        return fund_id, None, src if src != "mubasher_csv" else src2


async def write_one(conn, fund_id, pts) -> int:
    """Idempotent upsert of NAV history + reconcile mutual_funds latest_nav.

    Layer 3 (preserve): ON CONFLICT updates the value (so corrections flow) but
    never deletes; an empty `pts` is filtered out by the caller, so existing data
    is never wiped.
    """
    records = [(fund_id, d, nav) for d, nav in pts]
    await conn.executemany(
        """INSERT INTO nav_history (fund_id, date, nav)
           VALUES ($1, $2, $3)
           ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav""",
        records,
    )
    # Reconcile latest_nav / last_update_date from the freshest row we now hold.
    # Uses only core columns that always exist, so this can never fail on a
    # minimal schema and wrongly mark a healthy fund as un-updated.
    await conn.execute(
        """UPDATE mutual_funds f SET
               latest_nav       = nh.nav,
               last_update_date = nh.date,
               updated_at       = NOW()
           FROM (SELECT nav, date FROM nav_history
                 WHERE fund_id = $1 ORDER BY date DESC LIMIT 1) nh
           WHERE f.fund_id = $1""",
        fund_id,
    )
    # Best-effort provenance tag. `source` is absent in minimal/migration-only
    # schemas; a failure here must NOT count the fund as un-updated (that would
    # wrongly trip the --min-updated gate and red every run). Isolate it.
    try:
        await conn.execute(
            "UPDATE mutual_funds SET source = 'mubasher_csv' WHERE fund_id = $1", fund_id)
    except Exception:  # noqa: BLE001 - provenance is cosmetic; never fail the write
        pass
    return len(records)


async def run(only_numeric=True, ids=None, limit=None, concurrency=8,
              dry_run=False, min_updated=1):
    db_url = load_db_url()
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        universe = await get_universe(conn, only_numeric, ids, limit)
        print(f"[funds-nav] universe={len(universe)} funds  dry_run={dry_run}", flush=True)

        sem = asyncio.Semaphore(concurrency)
        stats = {"universe": len(universe), "updated": 0, "points_saved": 0,
                 "no_data": 0, "by_source": {}, "failures": [], "stale_after": []}

        timeout = httpx.Timeout(25.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True,
                                     headers={"User-Agent": UA}) as client:
            tasks = [fetch_one(client, sem, fid) for fid in universe]
            for coro in asyncio.as_completed(tasks):
                fund_id, pts, src = await coro
                stats["by_source"][src] = stats["by_source"].get(src, 0) + 1
                if not pts:
                    stats["no_data"] += 1
                    if src not in ("csv_404",):  # 404 = expected (no CSV), not a failure
                        stats["failures"].append(fund_id)
                    continue
                latest = pts[-1][0]
                try:
                    if dry_run:
                        n = len(pts)
                    else:
                        n = await write_one(conn, fund_id, pts)
                    stats["updated"] += 1
                    stats["points_saved"] += n
                    if latest < _today().replace(day=1):  # informational: still old after update
                        pass
                except Exception as e:  # noqa: BLE001 - per-fund isolation
                    stats["failures"].append(f"{fund_id}:write:{type(e).__name__}")

        # Post-run freshness check (numeric universe only)
        try:
            stale = await conn.fetchval(
                """SELECT COUNT(*) FROM mutual_funds f WHERE f.fund_id ~ '^[0-9]+$'
                   AND COALESCE((SELECT MAX(date) FROM nav_history WHERE fund_id=f.fund_id),
                                '2000-01-01') < CURRENT_DATE - 7""")
            stats["numeric_stale_gt7d"] = stale
        except Exception:
            pass

        print("[funds-nav] RESULT " + json.dumps(stats, default=str), flush=True)

        if stats["updated"] < min_updated:
            print(f"::error::funds-nav updated {stats['updated']} funds "
                  f"(< {min_updated}). Treating as FAILURE (kills false-green).",
                  flush=True)
            return 2
        return 0
    finally:
        await conn.close()


async def monitor(stale_days: int = 5, min_fresh_10d: int = 30):
    """READ-ONLY freshness probe for the funds-freshness-monitor workflow.

    Emits GitHub `key=value` lines + a human summary. Never writes. Returns 0
    even when data is stale (the workflow pages Discord on stale=1 but stays
    GREEN, so a RED run means the monitor itself broke — DB unreachable, etc.).
    """
    db_url = load_db_url()
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        newest = await conn.fetchval(
            "SELECT MAX(date) FROM nav_history WHERE fund_id ~ '^[0-9]+$'")
        fresh10 = await conn.fetchval(
            """SELECT COUNT(*) FROM (SELECT fund_id FROM nav_history
               WHERE fund_id ~ '^[0-9]+$' GROUP BY fund_id
               HAVING MAX(date) >= CURRENT_DATE - 10) t""")
        age_days = (_today() - newest).days if newest else 9999
        stale, reasons = 0, []
        if age_days > stale_days:
            stale = 1
            reasons.append(f"newest fund NAV is {age_days}d old (>{stale_days})")
        if (fresh10 or 0) < min_fresh_10d:
            stale = 1
            reasons.append(f"only {fresh10} funds fresh within 10d (<{min_fresh_10d})")
        reason = "; ".join(reasons)
        gho = os.environ.get("GITHUB_OUTPUT")
        lines = [f"newest={newest}", f"age_days={age_days}",
                 f"fresh10={fresh10}", f"stale={stale}", f"reason={reason}"]
        if gho:
            with open(gho, "a") as fh:
                fh.write("\n".join(lines) + "\n")
        print("[funds-monitor] " + json.dumps(
            {"newest": str(newest), "age_days": age_days, "fresh_within_10d": fresh10,
             "stale": stale, "reason": reason}))
        if stale:
            print(f"::warning::FUNDS DATA STALE — {reason} — paging Discord")
        else:
            print(f"✅ Funds fresh — newest={newest} ({age_days}d), {fresh10} fresh within 10d")
        return 0
    finally:
        await conn.close()


def main():
    ap = argparse.ArgumentParser(description="Mubasher CSV-primary funds NAV updater")
    ap.add_argument("--monitor", action="store_true",
                    help="read-only freshness probe (for the monitor workflow); no writes")
    ap.add_argument("--stale-days", type=int, default=5,
                    help="[monitor] alert if the newest fund NAV is older than this")
    ap.add_argument("--dry-run", action="store_true", help="fetch+parse only, no DB writes")
    ap.add_argument("--all", action="store_true",
                    help="include alphanumeric (non-CSV) ids too (default: numeric only)")
    ap.add_argument("--ids", type=str, default=None, help="comma-separated fund_ids")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--min-updated", type=int, default=1,
                    help="exit non-zero if fewer than this many funds updated")
    args = ap.parse_args()
    if args.monitor:
        sys.exit(asyncio.run(monitor(stale_days=args.stale_days)))
    ids = [s.strip() for s in args.ids.split(",")] if args.ids else None
    rc = asyncio.run(run(only_numeric=not args.all, ids=ids, limit=args.limit,
                         concurrency=args.concurrency, dry_run=args.dry_run,
                         min_updated=args.min_updated))
    sys.exit(rc)


if __name__ == "__main__":
    main()
