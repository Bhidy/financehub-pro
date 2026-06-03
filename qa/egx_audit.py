#!/usr/bin/env python3
"""
EGX Data Audit Harness  (Plan Phase 7 / section 14)
===================================================
Aggressive, automated, repeatable QA + institutional audit. Gates every
promotion to primary. ANY single RED => non-zero exit => no-go.

Three audit families:
  14.1  data-quality   (completeness, zero-dup, sanity, integrity, freshness)
  14.2  resilience     (fault injection -> assert graceful degradation)
  14.3  reconciliation (TV vs yfinance / DB cross-check)

Usage:
    DATABASE_URL=... python qa/egx_audit.py                 # full
    python qa/egx_audit.py --suite resilience               # no DB needed
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend-core"))
from data_pipeline.tradingview_client import TradingViewEGXClient, FeedDegraded  # noqa: E402
from data_pipeline.egx_feed_router import EGXFeedRouter, AllSourcesFailed  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL")
RED = "\033[91mRED\033[0m"
GREEN = "\033[92mGREEN\033[0m"
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    print(f"  [{GREEN if ok else RED}] {name}{('  - ' + detail) if detail else ''}")


# --------------------------------------------------------------------------- #
# 14.2  RESILIENCE / CHAOS (no DB required) — prove "never fail"
# --------------------------------------------------------------------------- #
async def suite_resilience():
    print("\n14.2 RESILIENCE / CHAOS")

    # invariant: router always >= 2 sources
    r = EGXFeedRouter(fallback_symbols=["COMI"])
    check("never-single-source invariant (>=2 providers)", len(r.sources) >= 2,
          f"{[n for n,_ in r.sources]}")

    # kill primary -> assert fallback path is reached (mock TV to raise)
    class _DeadTV:
        async def get_egx_stocks(self):
            raise FeedDegraded("simulated TV outage")

    class _GoodFallback:
        name = "yfinance"
        async def get_egx_stocks(self):
            return [{"symbol": f"S{i}", "last_price": 1.0, "market_code": "EGX",
                     "currency": "EGP"} for i in range(289)]

    r.sources = [("tradingview", _DeadTV()), ("yfinance", _GoodFallback())]
    try:
        stocks = await r.get_egx_stocks()
        check("primary down -> serves fallback", r.last_source == "yfinance" and len(stocks) == 289,
              f"source={r.last_source}, rows={len(stocks)}")
        check("fallback rows source-tagged", all(s.get("source") == "yfinance" for s in stocks))
    except Exception as e:  # noqa: BLE001
        check("primary down -> serves fallback", False, str(e))

    # kill ALL sources -> assert loud AllSourcesFailed (never silent)
    r.sources = [("tradingview", _DeadTV()), ("yfinance", _DeadTV())]
    try:
        await r.get_egx_stocks()
        check("all sources dead -> raises loudly (no silent empty)", False, "did not raise")
    except AllSourcesFailed:
        check("all sources dead -> raises loudly (no silent empty)", True)
    except Exception as e:  # noqa: BLE001
        check("all sources dead -> raises loudly (no silent empty)", False, type(e).__name__)

    # poison payload -> degraded too-small universe rejected
    class _TinyTV:
        async def get_egx_stocks(self):
            return [{"symbol": "ONLY", "last_price": 1.0, "market_code": "EGX", "currency": "EGP"}]
    r.sources = [("tradingview", _TinyTV()), ("yfinance", _GoodFallback())]
    stocks = await r.get_egx_stocks()
    check("under-sized primary payload -> falls through", r.last_source == "yfinance",
          f"source={r.last_source}")


# --------------------------------------------------------------------------- #
# 14.1 / live: validate the real TV client's own gates
# --------------------------------------------------------------------------- #
async def suite_live():
    print("\n14.1b LIVE SOURCE INTEGRITY (TradingView)")
    c = TradingViewEGXClient()
    stocks = await c.get_egx_stocks()
    check("universe >= 285", len({s['symbol'] for s in stocks}) >= 285, f"{len(stocks)}")
    check("zero duplicate symbols (source layer)",
          len({s['symbol'] for s in stocks}) == len(stocks))
    check("all prices > 0", all(s['last_price'] > 0 for s in stocks))
    check("no NaN/Inf leaked", all(
        s['last_price'] == s['last_price'] and abs(s['last_price']) != float('inf') for s in stocks))
    check("all EGP", all(s['currency'] == 'EGP' for s in stocks))
    check("change% within sanity (|x|<=40)",
          all(s.get('change_percent') is None or abs(s['change_percent']) <= 40 for s in stocks))


# --------------------------------------------------------------------------- #
# 14.1  DATA-QUALITY (requires DATABASE_URL)
# --------------------------------------------------------------------------- #
async def suite_dataquality():
    if not DATABASE_URL:
        print("\n14.1 DATA-QUALITY: skipped (no DATABASE_URL)")
        return
    import asyncpg
    print("\n14.1 DATA-QUALITY (Supabase)")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        dup_tables = [
            ("market_tickers", "symbol, market_code"),
            ("ohlc_data", "symbol, date"),
            ("egx_technicals", "symbol, timeframe"),
            ("egx_estimates", "symbol"),
        ]
        for tbl, key in dup_tables:
            try:
                row = await conn.fetchrow(
                    f"SELECT COUNT(*) c FROM (SELECT {key} FROM {tbl} GROUP BY {key} "
                    f"HAVING COUNT(*)>1) d")
                check(f"zero duplicates: {tbl}", row["c"] == 0, f"{row['c']} dup keys")
            except Exception as e:  # table may not exist yet pre-migration
                check(f"zero duplicates: {tbl}", False, f"table check failed: {e}")

        bad = await conn.fetchrow(
            "SELECT COUNT(*) c FROM market_tickers WHERE market_code='EGX' "
            "AND (last_price<=0 OR last_price IS NULL)")
        check("market_tickers: no non-positive prices", bad["c"] == 0, f"{bad['c']}")

        orphans = await conn.fetchrow(
            "SELECT COUNT(*) c FROM egx_technicals t LEFT JOIN symbol_map m "
            "ON t.symbol=m.internal_symbol WHERE m.internal_symbol IS NULL")
        check("referential integrity: technicals -> symbol_map", orphans["c"] == 0, f"{orphans['c']}")

        dl = await conn.fetchrow("SELECT COUNT(*) c FROM egx_ingest_deadletter "
                                 "WHERE created_at > now() - interval '1 day'")
        check("dead-letter queue empty (24h)", dl["c"] == 0, f"{dl['c']} failed rows")
    finally:
        await conn.close()


async def main(suite: str):
    print("=" * 60)
    print("EGX DATA AUDIT  -  institutional go/no-go gate")
    print("=" * 60)
    if suite in ("all", "resilience"):
        await suite_resilience()
    if suite in ("all", "live"):
        await suite_live()
    if suite in ("all", "dataquality"):
        await suite_dataquality()

    reds = [r for r in results if not r[1]]
    print("\n" + "=" * 60)
    print(f"RESULT: {len(results)-len(reds)}/{len(results)} GREEN")
    if reds:
        print(f"NO-GO  - {len(reds)} RED:")
        for n, _, d in reds:
            print(f"   - {n} {d}")
        sys.exit(1)
    print("GO  - all checks GREEN")
    sys.exit(0)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--suite", default="all",
                    choices=["all", "resilience", "live", "dataquality"])
    asyncio.run(main(ap.parse_args().suite))
