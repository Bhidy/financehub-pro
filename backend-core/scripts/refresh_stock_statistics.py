#!/usr/bin/env python3
"""
Refresh the stale stockanalysis-sourced `stock_statistics` table from FRESH
TradingView + Yahoo data, and fix `stock_stats_view` to use the DAILY timeframe.

WHY: stockanalysis.com is Cloudflare-blocked, so `stock_statistics` froze (May-28).
The AI chat reads it 15x. We can't rewrite 11 backend handlers + redeploy here, so
instead we keep the table itself fresh — the chat's existing `SELECT ... FROM
stock_statistics` queries then return fresh data with NO code change, NO redeploy.

UNIT-SAFE: only the fields whose units are IDENTICAL between stock_statistics and
the fresh sources are refreshed (raw technicals/valuation, % dividend yield). The
fraction-convention fields (roe/margins/forward_pe/peg) are intentionally NOT
touched here (stock_statistics stores fractions; income_statements stores % — a
100x mismatch), so we never inject wrong numbers. Those need the handler-level
unit-aware cutover on a redeployable backend.

TIMEFRAME-SAFE: technicals come from egx_technicals timeframe='1D' (daily RSI/MA),
verified to match ohlc-computed MAs.

  python refresh_stock_statistics.py            # refresh + verify
  python refresh_stock_statistics.py --view-only  # only (re)create the view
Reads DATABASE_URL from env/.env.
"""
import argparse, asyncio, glob, os, re, sys
import asyncpg
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.pg_resilient import connect_resilient  # noqa: E402

def load_db_url():
    u = os.environ.get("DATABASE_URL")
    if u: return u.strip()
    for c in ("~/Documents/startamarkets/.env", ".env", "../.env"):
        p = os.path.expanduser(c)
        if os.path.exists(p):
            for line in open(p):
                m = re.match(r'\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
                if m: return m.group(1).strip()
    raise SystemExit("no DATABASE_URL")

# The old inline VIEW copy was DELETED (June-2026): every embedded copy of the
# view eventually forks from the canonical migration and silently reverts it on
# the next scheduled run. The ONLY view source is the latest migration file.

# Unit-identical refresh: raw technicals (1D) + raw valuation + % yield. NOTHING
# with a fraction/percentage ambiguity is touched.
REFRESH = """
UPDATE stock_statistics ss SET
    rsi_14 = t.rsi,
    ma_50d = t.sma50,
    ma_200d = t.sma200,
    pe_ratio = COALESCE(mt.pe_ratio, ss.pe_ratio),
    pb_ratio = COALESCE(mt.pb_ratio, ss.pb_ratio),
    dividend_yield = COALESCE(mt.dividend_yield, ss.dividend_yield),
    beta_5y = COALESCE(mt.beta, ss.beta_5y),
    updated_at = NOW()
FROM market_tickers mt
LEFT JOIN LATERAL (SELECT rsi, sma50, sma200 FROM egx_technicals
                   WHERE symbol = mt.symbol AND timeframe='1D' ORDER BY updated_at DESC LIMIT 1) t ON true
WHERE ss.symbol = mt.symbol AND mt.market_code = 'EGX';
"""

async def main(view_only):
    c = await connect_resilient(load_db_url())
    try:
        # Apply the LATEST canonical view migration (single source of truth).
        # NEVER pin a specific file: the old hardcoded 0007 pin silently REVERTED
        # migration 0009 (honest-TTM view) twice a day until the TV reconcile
        # gate caught it (June-2026). Glob + take the highest-numbered so future
        # view migrations are picked up automatically; fail LOUD if none found.
        _mig_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "migrations")
        _cands = sorted(glob.glob(os.path.join(_mig_dir, "0*stock_stats_view*.sql")))
        if not _cands:
            raise SystemExit("FAIL: no stock_stats_view migration file found — "
                             "refusing to apply any inline/stale view definition")
        _vm = _cands[-1]
        with open(_vm) as _f:
            await c.execute(_f.read())
        print(f"[stock_stats_view] applied LATEST migration {os.path.basename(_vm)}")
        if not view_only:
            res = await c.execute(REFRESH)
            print(f"[stock_statistics] refreshed: {res}")
            r = await c.fetchrow("SELECT updated_at, rsi_14, ma_50d, ma_200d, pe_ratio, dividend_yield FROM stock_statistics WHERE symbol='COMI'")
            print("  COMI now:", dict(r) if r else None)
            stale = await c.fetchval("SELECT COUNT(*) FROM stock_statistics WHERE updated_at < NOW() - INTERVAL '2 days'")
            print(f"  stock_statistics rows still >2d stale: {stale}")
    finally:
        await c.close()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--view-only", action="store_true")
    a = ap.parse_args()
    asyncio.run(main(a.view_only))
