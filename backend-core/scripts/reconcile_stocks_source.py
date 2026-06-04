#!/usr/bin/env python3
"""
Stocks single-source COMPLETENESS + COHERENCE + FRESHNESS gate.

Mirror of reconcile_funds_source.py for the stock domain. Proves the canonical
single source for stocks is sound BEFORE retiring any legacy reader:
  * market_tickers (LIVE quote source, TradingView) — every EGX stock has a price,
    data is fresh.
  * ohlc_data (EOD chart history) — coverage + freshness.
  * stocks_view coherence (last_ohlc_date present).

  python reconcile_stocks_source.py            # full report
  python reconcile_stocks_source.py --monitor  # GH-output mode for the monitor workflow
  python reconcile_stocks_source.py --strict   # exit non-zero if the gate fails

Reads DATABASE_URL from env / repo .env. Read-only.
"""
from __future__ import annotations
import argparse, asyncio, os, re, sys
import asyncpg


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


async def main(strict: bool, monitor: bool):
    conn = await asyncpg.connect(load_db_url(), statement_cache_size=0)

    total = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE market_code='EGX'")
    have_price = await conn.fetchval(
        "SELECT COUNT(*) FROM market_tickers WHERE market_code='EGX' AND last_price IS NOT NULL AND last_price > 0")
    newest_q = await conn.fetchval("SELECT MAX(updated_at) FROM market_tickers WHERE market_code='EGX'")
    price_age_min = None
    if newest_q:
        price_age_min = await conn.fetchval(
            "SELECT EXTRACT(EPOCH FROM (NOW() - $1))/60", newest_q)
        price_age_min = int(price_age_min)

    # ohlc coverage: EGX tickers that have any ohlc history + freshness
    ohlc_syms = await conn.fetchval(
        """SELECT COUNT(DISTINCT o.symbol) FROM ohlc_data o
           JOIN market_tickers t ON t.symbol=o.symbol AND t.market_code='EGX'""")
    ohlc_newest = await conn.fetchval(
        """SELECT MAX(o.date) FROM ohlc_data o
           JOIN market_tickers t ON t.symbol=o.symbol AND t.market_code='EGX'""")
    ohlc_age_days = await conn.fetchval(
        "SELECT (CURRENT_DATE - $1)", ohlc_newest) if ohlc_newest else None
    # coherence via stocks_view
    view_coh = await conn.fetchval(
        "SELECT COUNT(*) FROM stocks_view WHERE market_code='EGX' AND last_ohlc_date IS NOT NULL")

    def pct(n):
        return f"{100.0*n/total:.1f}%" if total else "n/a"

    stale, reasons = 0, []
    if total == 0:
        stale = 1; reasons.append("no EGX tickers")
    if have_price < total:
        if have_price < int(0.98 * total):
            stale = 1; reasons.append(f"{total-have_price} tickers missing price")
    if price_age_min is not None and price_age_min > 24 * 60:
        stale = 1; reasons.append(f"prices {price_age_min}m old (>24h)")
    if ohlc_age_days is not None and ohlc_age_days > 5:
        stale = 1; reasons.append(f"ohlc {ohlc_age_days}d old (>5)")
    if ohlc_syms < int(0.5 * total):
        stale = 1; reasons.append(f"only {ohlc_syms} tickers have ohlc history")
    reason = "; ".join(reasons)

    if monitor:
        gho = os.environ.get("GITHUB_OUTPUT")
        lines = [f"total={total}", f"have_price={have_price}",
                 f"price_age_min={price_age_min}", f"ohlc_newest={ohlc_newest}",
                 f"ohlc_age_days={ohlc_age_days}", f"stale={stale}", f"reason={reason}"]
        if gho:
            with open(gho, "a") as fh:
                fh.write("\n".join(lines) + "\n")
        if stale:
            print(f"::warning::STOCKS DATA ISSUE — {reason}")
        else:
            print(f"✅ Stocks fresh — {total} tickers, prices {price_age_min}m old, "
                  f"ohlc newest {ohlc_newest}")
        await conn.close()
        return 0  # monitor stays green; pages Discord via the workflow

    # full report
    print("=== STOCKS SINGLE-SOURCE RECONCILIATION GATE ===\n")
    print(f"[1] market_tickers (LIVE quotes) — EGX tickers: {total}")
    print(f"    with last_price : {have_price}/{total} ({pct(have_price)})")
    print(f"    newest updated_at: {newest_q}  (age {price_age_min} min)")
    print(f"\n[2] ohlc_data (EOD charts)")
    print(f"    tickers with history: {ohlc_syms}/{total} ({pct(ohlc_syms)})")
    print(f"    newest date         : {ohlc_newest}  (age {ohlc_age_days} days)")
    print(f"\n[3] stocks_view coherence — tickers w/ last_ohlc_date: {view_coh}/{total} ({pct(view_coh)})")

    gate_ok = (stale == 0)
    print(f"\n=== GATE: {'PASS ✅' if gate_ok else 'FAIL ❌ — ' + reason} ===")
    print("(Old sources stay running until this gate is green and signed off.)")
    if strict and not gate_ok:
        await conn.close(); sys.exit(2)
    await conn.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--monitor", action="store_true")
    a = ap.parse_args()
    asyncio.run(main(a.strict, a.monitor))
