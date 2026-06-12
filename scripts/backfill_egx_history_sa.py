#!/usr/bin/env python3
"""
Purge-and-backfill EGX daily candle history from StockAnalysis (audit C-03).

Why this exists: Yahoo silently re-assigned/froze symbols (ORAS.CA became a
MUTUALFUND stub frozen 2024-07-23) and the old un-gated reservoir wrote two
years of synthetic 71.05/vol=0 bars into ohlc_data — the table the public
Market Pulse chart reads. This script replaces a symbol's entire ohlc_data
series with the StockAnalysis daily series (EGP, matches the live exchange
tape), inside a transaction, with a sanity gate against the live TV price.

Usage:
    DATABASE_URL=postgres://... python scripts/backfill_egx_history_sa.py --symbols ORAS
    ... --symbols ORAS,COMI --min-bars 100 --max-live-deviation 0.20

Safe by construction:
    * refuses to write when StockAnalysis returns < --min-bars rows
    * refuses to write when the latest SA close deviates from the live
      market_tickers price by more than --max-live-deviation (default 20%)
    * DELETE + INSERT runs in one transaction per symbol — no partial states
"""
import argparse
import asyncio
import datetime as dt
import os
import sys

import asyncpg
import httpx

# NB: range=max silently falls back to 1Y on this endpoint; 10Y is the deepest
# supported window (verified 2026-06-12: ORAS max->243 bars, 10Y->2417 bars).
SA_URL = "https://stockanalysis.com/api/symbol/q/egx-{sym}/history?range=10Y&period=daily"
UA = {"User-Agent": "Mozilla/5.0 (StartaMarkets data service)"}
SOURCE_TAG = "stockanalysis"


async def fetch_sa_history(client: httpx.AsyncClient, symbol: str) -> list[dict]:
    r = await client.get(SA_URL.format(sym=symbol), headers=UA, timeout=60.0)
    r.raise_for_status()
    payload = r.json()
    if payload.get("status") != 200:
        raise RuntimeError(f"StockAnalysis status={payload.get('status')} for {symbol}")
    return payload.get("data") or []


def to_rows(symbol: str, data: list[dict]) -> list[tuple]:
    rows = []
    for b in data:
        try:
            d = dt.date.fromisoformat(str(b["t"])[:10])
            o, h, l, c = float(b["o"]), float(b["h"]), float(b["l"]), float(b["c"])
            adj = float(b.get("a") or c)
            v = int(b.get("v") or 0)
        except (KeyError, TypeError, ValueError):
            continue
        if c <= 0:
            continue
        # SA's EGX "open" is the PRIOR session's close (verified: o == prev c on
        # every violating row — root cause of audit H-05's impossible candles).
        # True opens aren't published. Trust hierarchy: close > high/low > open —
        # widen the range to contain the official close, then clamp the
        # prev-close 'open' into the session range (gap opens land on the edge).
        h = max(h, c)
        l = min(l, c)
        o = min(max(o, l), h)
        rows.append((symbol, d, o, h, l, c, adj, v, SOURCE_TAG))
    rows.sort(key=lambda r: r[1])
    return rows


async def backfill_symbol(conn: asyncpg.Connection, client: httpx.AsyncClient,
                          symbol: str, min_bars: int, max_dev: float) -> bool:
    data = await fetch_sa_history(client, symbol)
    rows = to_rows(symbol, data)
    if len(rows) < min_bars:
        print(f"[{symbol}] ABORT: StockAnalysis returned only {len(rows)} bars (< {min_bars})")
        return False

    latest_close = rows[-1][5]
    live = await conn.fetchval(
        "SELECT last_price FROM market_tickers WHERE symbol=$1 AND last_price > 0", symbol)
    if live:
        dev = abs(latest_close - float(live)) / float(live)
        if dev > max_dev:
            print(f"[{symbol}] ABORT: SA close {latest_close} vs live {live} "
                  f"deviates {dev:.1%} (> {max_dev:.0%}) — refusing to write")
            return False

    before = await conn.fetchrow(
        "SELECT count(*) n, min(date) lo, max(date) hi, "
        "count(*) FILTER (WHERE volume=0) zv FROM ohlc_data WHERE symbol=$1", symbol)

    async with conn.transaction():
        deleted = await conn.execute("DELETE FROM ohlc_data WHERE symbol=$1", symbol)
        await conn.executemany("""
            INSERT INTO ohlc_data (symbol, date, open, high, low, close, adj_close, volume, source)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (symbol, date) DO UPDATE SET
                open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
                close=EXCLUDED.close, adj_close=EXCLUDED.adj_close,
                volume=EXCLUDED.volume, source=EXCLUDED.source
        """, rows)

    after = await conn.fetchrow(
        "SELECT count(*) n, min(date) lo, max(date) hi FROM ohlc_data WHERE symbol=$1", symbol)
    print(f"[{symbol}] before: {before['n']} bars ({before['lo']}..{before['hi']}, {before['zv']} zero-vol) | "
          f"{deleted} | after: {after['n']} bars ({after['lo']}..{after['hi']}), "
          f"latest close {latest_close}, live {live}")
    return True


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--symbols", required=True, help="comma-separated EGX symbols, e.g. ORAS,COMI")
    ap.add_argument("--min-bars", type=int, default=100)
    ap.add_argument("--max-live-deviation", type=float, default=0.20)
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        return 2

    symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    # Supabase transaction-mode pooler (6543) breaks prepared statements
    conn = await asyncpg.connect(db_url, statement_cache_size=0, command_timeout=60)
    ok, bad = [], []
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            for sym in symbols:
                try:
                    (ok if await backfill_symbol(conn, client, sym, args.min_bars,
                                                 args.max_live_deviation) else bad).append(sym)
                except Exception as e:
                    print(f"[{sym}] ERROR: {type(e).__name__}: {e}")
                    bad.append(sym)
                await asyncio.sleep(1.0)
    finally:
        await conn.close()

    print(f"DONE. backfilled={ok} failed={bad}")
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
