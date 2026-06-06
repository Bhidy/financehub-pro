-- 0004_egx_fundamentals.sql
-- ============================================================================
-- TradingView latest-annual fundamentals snapshot (one row per EGX symbol).
-- This is the TV-NATIVE replacement for the audited income_statements /
-- balance_sheets / cashflow_statements derived metrics, which had no live
-- writer after the StockAnalysis scraper was removed and would have gone stale.
--
-- ALL monetary values are ABSOLUTE EGP (NOT millions) — TradingView native —
-- so NO x1e6 scaling is ever applied to these.  Banks legitimately have NULL
-- gross_profit / ebitda / gross_margin (sector-structural).
--
-- Refreshed weekly by tv_egx_harvester.py --cycle fundamentals.
-- ============================================================================

CREATE TABLE IF NOT EXISTS egx_fundamentals (
    symbol              TEXT PRIMARY KEY,
    fiscal_year         INTEGER,
    revenue             NUMERIC,
    gross_profit        NUMERIC,
    operating_income    NUMERIC,
    ebitda              NUMERIC,
    net_income          NUMERIC,
    total_assets        NUMERIC,
    total_equity        NUMERIC,
    total_liabilities   NUMERIC,
    total_debt          NUMERIC,
    free_cash_flow      NUMERIC,
    eps_diluted         NUMERIC,
    bvps                NUMERIC,
    shares_outstanding  NUMERIC,
    dps                 NUMERIC,
    gross_margin        NUMERIC,
    operating_margin    NUMERIC,
    roe                 NUMERIC,
    roa                 NUMERIC,
    source              TEXT DEFAULT 'tradingview',
    updated_at          TIMESTAMPTZ DEFAULT now()
);
