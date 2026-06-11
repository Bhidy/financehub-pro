-- ===========================================================================
-- 0001_tradingview_egx.sql  -  TradingView EGX Nuclear Data Feed
-- Additive, idempotent, NON-destructive. Safe to run multiple times.
-- Implements the dedup/idempotency architecture (Plan section 5.5):
-- every table has a DB-enforced UNIQUE natural key so duplicates are impossible.
-- Run:  psql "$DATABASE_URL" -f migrations/0001_tradingview_egx.sql
-- ===========================================================================

BEGIN;

-- --- 1. Extend market_tickers (identity / provenance) ----------------------
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS isin          TEXT;
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS logo_url      TEXT;
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS beta          NUMERIC;
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS recommend_all NUMERIC;
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS source        TEXT;      -- which feed wrote the row
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT now();

-- dedup guarantee for the price table
CREATE UNIQUE INDEX IF NOT EXISTS uq_market_tickers_symbol_market
    ON market_tickers (symbol, market_code);

-- --- 2. symbol_map (ISIN-keyed canonical identity) -------------------------
CREATE TABLE IF NOT EXISTS symbol_map (
    internal_symbol TEXT PRIMARY KEY,
    tv_symbol       TEXT,
    yahoo_symbol    TEXT,
    isin            TEXT,
    logoid          TEXT,
    logo_url        TEXT,
    is_primary      BOOLEAN,
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_symbol_map_isin ON symbol_map (isin) WHERE isin IS NOT NULL;

-- --- 3. ohlc_data provenance + dedup (symbol, date) ------------------------
ALTER TABLE ohlc_data ADD COLUMN IF NOT EXISTS source TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ohlc_symbol_date ON ohlc_data (symbol, date);

-- --- 4. egx_technicals (one row per symbol+timeframe) ----------------------
CREATE TABLE IF NOT EXISTS egx_technicals (
    symbol          TEXT NOT NULL,
    timeframe       TEXT NOT NULL,             -- '1D','60','240','1W'
    rsi             NUMERIC,
    macd_macd       NUMERIC,
    macd_signal     NUMERIC,
    stoch_k         NUMERIC,
    stoch_d         NUMERIC,
    cci20           NUMERIC,
    adx             NUMERIC,
    mom             NUMERIC,
    recommend_all   NUMERIC,
    recommend_ma    NUMERIC,
    recommend_other NUMERIC,
    ema50           NUMERIC,
    ema200          NUMERIC,
    sma50           NUMERIC,
    sma200          NUMERIC,
    source          TEXT DEFAULT 'tradingview',
    updated_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (symbol, timeframe)
);

-- --- 5. egx_estimates (one row per symbol; analyst-covered names only) -----
CREATE TABLE IF NOT EXISTS egx_estimates (
    symbol            TEXT PRIMARY KEY,
    target_average    NUMERIC,
    target_high       NUMERIC,
    target_low        NUMERIC,
    target_median     NUMERIC,
    rec_buy           INTEGER,
    rec_over          INTEGER,
    rec_hold          INTEGER,
    rec_under         INTEGER,
    rec_sell          INTEGER,
    rec_total         INTEGER,
    eps_fcst_next_fq  NUMERIC,
    rev_fcst_next_fq  NUMERIC,
    eps_fcst_next_fy  NUMERIC,
    source            TEXT DEFAULT 'tradingview',
    updated_at        TIMESTAMPTZ DEFAULT now()
);

-- --- 6. egx_news (dedup by TV story id + content hash) ---------------------
CREATE TABLE IF NOT EXISTS egx_news (
    id               TEXT PRIMARY KEY,         -- TradingView story id
    content_hash     TEXT,
    title            TEXT,
    provider         TEXT,
    source           TEXT,
    published_at     BIGINT,                   -- unix
    story_path       TEXT,
    related_symbols  JSONB,
    created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_egx_news_hash ON egx_news (content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_egx_news_published ON egx_news (published_at DESC);

-- --- 7. dividend_history dedup (symbol, ex_date) ---------------------------
-- (table assumed to exist; add the dedup key if columns are present)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='dividend_history' AND column_name='ex_date') THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_dividend_symbol_exdate
            ON dividend_history (symbol, ex_date);
    END IF;
END$$;

-- --- 8. dead-letter queue (never silently drop a failed row) ---------------
CREATE TABLE IF NOT EXISTS egx_ingest_deadletter (
    id          BIGSERIAL PRIMARY KEY,
    cycle       TEXT,
    symbol      TEXT,
    payload     JSONB,
    error       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

COMMIT;

-- Enable Supabase Realtime on the hot tables (run in Supabase SQL editor;
-- harmless if the publication already includes them):
--   ALTER PUBLICATION supabase_realtime ADD TABLE market_tickers;
--   ALTER PUBLICATION supabase_realtime ADD TABLE ohlc_data;
--   ALTER PUBLICATION supabase_realtime ADD TABLE egx_technicals;
