-- ===========================================================================
-- 0003_egx_dividends.sql  -  TradingView dividend snapshot (incl. forward calendar)
-- Additive, idempotent. One row per symbol (PRIMARY KEY = dedup).
-- ===========================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS egx_dividends (
    symbol               TEXT PRIMARY KEY,
    div_yield            NUMERIC,
    amount_recent        NUMERIC,
    ex_date_recent       BIGINT,          -- unix
    payment_date_recent  BIGINT,          -- unix
    amount_upcoming      NUMERIC,
    ex_date_upcoming     BIGINT,          -- unix (forward-looking)
    payment_date_upcoming BIGINT,         -- unix (forward-looking)
    frequency            TEXT,
    payout_ratio_ttm     NUMERIC,
    continuous_growth    NUMERIC,
    source               TEXT DEFAULT 'tradingview',
    updated_at           TIMESTAMPTZ DEFAULT now()
);

COMMIT;
