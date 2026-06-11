-- ===========================================================================
-- 0002_egx_financials.sql  -  TradingView 20-year statement history
-- Additive, idempotent. Dedup by natural key (symbol, period_type, fiscal_year).
-- ===========================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS egx_financials (
    symbol          TEXT NOT NULL,
    period_type     TEXT NOT NULL,          -- 'annual' | 'quarterly'
    fiscal_year     INTEGER NOT NULL,       -- e.g. 2025 (annual) or YYYYQ (quarterly index)
    revenue         NUMERIC,
    gross_profit    NUMERIC,
    ebitda          NUMERIC,
    net_income      NUMERIC,
    eps_diluted     NUMERIC,
    free_cash_flow  NUMERIC,
    total_assets    NUMERIC,
    total_debt      NUMERIC,
    dps             NUMERIC,
    source          TEXT DEFAULT 'tradingview',
    updated_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (symbol, period_type, fiscal_year)
);
CREATE INDEX IF NOT EXISTS ix_egx_financials_symbol ON egx_financials (symbol);

COMMIT;
