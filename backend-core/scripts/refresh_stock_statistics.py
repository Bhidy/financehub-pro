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
import argparse, asyncio, os, re, sys
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

# stock_stats_view, corrected to use the DAILY (1D) technicals timeframe.
VIEW = """
DROP VIEW IF EXISTS stock_stats_view;
CREATE VIEW stock_stats_view AS
SELECT mt.symbol, mt.market_code, mt.name_en, mt.name_ar, mt.sector_name, mt.currency,
       mt.last_price, mt.pe_ratio, mt.pb_ratio, mt.dividend_yield, mt.market_cap,
       mt.beta AS beta_5y, t.rsi AS rsi_14, t.sma50 AS ma_50d, t.sma200 AS ma_200d,
       i.gross_margin, i.operating_margin, i.net_margin AS profit_margin,
       i.revenue_growth, i.net_income_growth AS profit_growth, i.eps_growth,
       i.eps AS eps_ttm, i.net_income AS net_income_ttm,
       CASE WHEN b.total_equity>0 THEN ROUND((i.net_income/b.total_equity*100)::numeric,2) END AS roe,
       CASE WHEN b.total_assets>0 THEN ROUND((i.net_income/b.total_assets*100)::numeric,2) END AS roa,
       b.total_debt, b.total_equity AS book_value,
       'tradingview+yahoo' AS source
FROM market_tickers mt
LEFT JOIN LATERAL (SELECT rsi,sma50,sma200,updated_at FROM egx_technicals
                   WHERE symbol=mt.symbol AND timeframe='1D' ORDER BY updated_at DESC LIMIT 1) t ON true
LEFT JOIN LATERAL (SELECT * FROM income_statements WHERE symbol=mt.symbol AND period_type='annual' ORDER BY fiscal_year DESC LIMIT 1) i ON true
LEFT JOIN LATERAL (SELECT total_equity,total_assets,total_debt FROM balance_sheets WHERE symbol=mt.symbol AND period_type='annual' ORDER BY fiscal_year DESC LIMIT 1) b ON true
WHERE mt.market_code='EGX';
"""

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
        await c.execute(VIEW)
        print("[stock_stats_view] refreshed (timeframe='1D')")
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
