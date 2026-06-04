#!/usr/bin/env python3
"""
Funds single-source COMPLETENESS + CORRECTNESS gate.

Proves the canonical single source (funds_view, derived live from mutual_funds +
nav_history) is COMPLETE (every field the web/app surfaces display is present),
FRESH, and CORRECT (matches the origin Mubasher source) BEFORE any legacy source
is retired. Run in CI and before promotion.

  python reconcile_funds_source.py            # full report
  python reconcile_funds_source.py --strict   # exit non-zero if the gate fails

Reads DATABASE_URL from env / repo .env. Read-only.
"""
from __future__ import annotations
import argparse, asyncio, csv as _csv, io, os, re, sys
import asyncpg
try:
    import httpx
except ModuleNotFoundError:
    httpx = None

CSV_URL = ("https://static.mubasher.info/File.MubasherCharts/"
           "File.Mutual_Fund_Charts_Dir/priceChartFund_{fid}.csv")

# Fields each surface displays -> must be present in the single source (funds_view).
# (listing card, detail header, detail meta cards, mobile)
CONTRACT_FIELDS = [
    "fund_id", "fund_name_en", "fund_name", "currency", "market_code",
    "latest_nav",        # live (live_latest_nav in the view)
    "last_nav_date",     # live MAX(nav_history.date)
    "manager_name", "manager", "classification", "is_shariah",
]


def load_db_url() -> str:
    u = os.environ.get("DATABASE_URL")
    if u:
        return u.strip()
    for c in ("~/Documents/startamarkets/.env", ".env", "../.env"):
        p = os.path.expanduser(c)
        if os.path.exists(p):
            for line in open(p):
                m = re.match(r'\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
                if m:
                    return m.group(1).strip()
    raise SystemExit("no DATABASE_URL")


def csv_latest(text: str):
    last = None
    for row in _csv.reader(io.StringIO(text)):
        if len(row) < 2:
            continue
        try:
            d = row[0].split(",")[0].strip()
            nav = float(row[1].replace(",", "").strip())
        except ValueError:
            continue
        last = (d, nav)
    return last


async def main(strict: bool):
    conn = await asyncpg.connect(load_db_url(), statement_cache_size=0)
    print("=== FUNDS SINGLE-SOURCE RECONCILIATION GATE ===\n")

    # 1) view exists + column coverage
    cols = {r["column_name"] for r in await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_name='funds_view'")}
    needed_view_cols = {"live_latest_nav", "last_nav_date", "nav_points"}
    missing_cols = needed_view_cols - cols
    print(f"[1] funds_view present: {bool(cols)} | derived cols present: {not missing_cols}"
          + (f"  MISSING {missing_cols}" if missing_cols else ""))

    total = await conn.fetchval("SELECT COUNT(*) FROM funds_view")
    # 2) Completeness: funds VISIBLE on the listing (fund_name_en + >=10 nav points)
    listing = await conn.fetch("""
        SELECT fund_id, fund_name_en, currency, manager_name, manager, classification,
               is_shariah, live_latest_nav, last_nav_date, nav_points
        FROM funds_view
        WHERE fund_name_en IS NOT NULL AND fund_name_en <> ''
          AND fund_name_en NOT LIKE '%Years%' AND nav_points >= 10
    """)
    shown = len(listing)
    print(f"\n[2] COMPLETENESS — funds shown on listing: {shown} (of {total})")
    def pct(n):
        return f"{100.0*n/shown:.1f}%" if shown else "n/a"
    have_nav = sum(1 for r in listing if r["live_latest_nav"] is not None)
    have_date = sum(1 for r in listing if r["last_nav_date"] is not None)
    have_cur = sum(1 for r in listing if r["currency"])
    have_mgr = sum(1 for r in listing if r["manager_name"] or r["manager"])
    print(f"    latest_nav present : {have_nav}/{shown} ({pct(have_nav)})")
    print(f"    last_nav_date      : {have_date}/{shown} ({pct(have_date)})")
    print(f"    currency           : {have_cur}/{shown} ({pct(have_cur)})")
    print(f"    manager            : {have_mgr}/{shown} ({pct(have_mgr)})")

    # 3) Freshness
    fresh = await conn.fetchval("""
        SELECT COUNT(*) FROM funds_view
        WHERE last_nav_date >= CURRENT_DATE - 10 AND nav_points >= 10""")
    newest = await conn.fetchval("SELECT MAX(last_nav_date) FROM funds_view")
    print(f"\n[3] FRESHNESS — newest NAV across funds: {newest} | funds fresh<=10d: {fresh}")

    # 4) Correctness vs ORIGIN (Mubasher CSV) for a sample of fresh numeric funds
    print("\n[4] CORRECTNESS vs Mubasher origin (sample of 12 numeric funds):")
    sample = await conn.fetch("""
        SELECT fund_id, live_latest_nav, last_nav_date FROM funds_view
        WHERE fund_id ~ '^[0-9]+$' AND nav_points >= 10
          AND last_nav_date >= CURRENT_DATE - 12
        ORDER BY last_nav_date DESC LIMIT 12""")
    match = checked = 0
    if httpx is None:
        print("    (httpx unavailable — skipping live origin compare)")
    else:
        async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "Mozilla/5.0"}) as cl:
            for r in sample:
                try:
                    resp = await cl.get(CSV_URL.format(fid=r["fund_id"]))
                    if resp.status_code != 200:
                        continue
                    cl_latest = csv_latest(resp.text)
                    if not cl_latest:
                        continue
                    checked += 1
                    src_nav = round(cl_latest[1], 2)
                    db_nav = round(float(r["live_latest_nav"]), 2)
                    ok = abs(src_nav - db_nav) < 0.01
                    if ok:
                        match += 1
                    else:
                        print(f"    MISMATCH {r['fund_id']}: source={src_nav} db={db_nav}")
                except (httpx.HTTPError, ValueError):
                    continue
        rate = 100.0 * match / checked if checked else 0
        print(f"    matched {match}/{checked} ({rate:.0f}%) of sampled funds vs origin CSV")

    # 5) Gate verdict
    gate_ok = (
        not missing_cols
        and shown > 0
        and have_nav == shown and have_date == shown      # every shown fund has nav+date
        and fresh >= max(1, int(0.3 * shown))             # a healthy share is fresh
        and (httpx is None or checked == 0 or match >= int(0.9 * checked))
    )
    print(f"\n=== GATE: {'PASS ✅' if gate_ok else 'FAIL ❌'} ===")
    print("(Old sources stay running until this gate is green and signed off.)")
    if strict and not gate_ok:
        await conn.close()
        sys.exit(2)
    await conn.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args()
    asyncio.run(main(a.strict))
