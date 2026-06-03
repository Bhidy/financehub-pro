#!/usr/bin/env python3
"""
TradingView Shadow Diff  (Phase 1 validation gate)
==================================================
Read-only. Pulls EGX prices from TradingView and compares them against the
current market_tickers values WITHOUT writing anything. Emits a diff report so
we can validate TV before flipping it to primary.

Pass criterion (Plan 9): price diff < 0.5% on > 95% of overlapping tickers AND
universe >= 285.

Usage:  DATABASE_URL=... python scripts/tv_shadow_diff.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend-core"))
import asyncpg  # noqa: E402
from data_pipeline.tradingview_client import TradingViewEGXClient  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL")
TOL = 0.5  # percent


async def main():
    if not DATABASE_URL:
        sys.exit("DATABASE_URL not set")
    tv = {s["symbol"]: s for s in await TradingViewEGXClient().get_egx_stocks()}
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        cur = {r["symbol"]: float(r["last_price"]) for r in await conn.fetch(
            "SELECT symbol, last_price FROM market_tickers WHERE market_code='EGX' AND last_price IS NOT NULL")}
    finally:
        await conn.close()

    overlap = sorted(set(tv) & set(cur))
    within, breaches = 0, []
    for s in overlap:
        a, b = tv[s]["last_price"], cur[s]
        if b == 0:
            continue
        diff = abs(a - b) / b * 100
        if diff < TOL:
            within += 1
        else:
            breaches.append((s, round(a, 2), round(b, 2), round(diff, 2)))

    pct = 100 * within / len(overlap) if overlap else 0
    print(f"TV universe:      {len(tv)}")
    print(f"DB universe:      {len(cur)}")
    print(f"Overlap:          {len(overlap)}")
    print(f"TV-only (new):    {sorted(set(tv) - set(cur))[:20]}")
    print(f"DB-only (missing in TV): {sorted(set(cur) - set(tv))[:20]}")
    print(f"Within {TOL}%:     {within}/{len(overlap)}  ({pct:.1f}%)")
    if breaches:
        print(f"\nBreaches (>{TOL}%), first 25:  symbol  tv  db  diff%")
        for row in breaches[:25]:
            print("  ", *row)

    ok_universe = len(tv) >= 285
    ok_match = pct > 95
    print(f"\nGATE: universe>=285 {'PASS' if ok_universe else 'FAIL'} | "
          f">95% within tol {'PASS' if ok_match else 'FAIL'}")
    sys.exit(0 if (ok_universe and ok_match) else 1)


if __name__ == "__main__":
    asyncio.run(main())
