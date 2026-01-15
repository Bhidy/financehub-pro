-- ============================================================
-- YAHOO CACHE LAYER
-- ============================================================
-- This table acts as a persistent reservoir for Yahoo Finance data.
-- It decouples user requests from live scraping, preventing 429 errors.

CREATE TABLE IF NOT EXISTS yahoo_cache (
    symbol VARCHAR(20) PRIMARY KEY,
    profile_data JSONB, -- Stores full 'y_prof' dict
    financial_data JSONB, -- Stores full 'y_fund' dict
    history_data JSONB,   -- Stores 'y_hist' list
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yahoo_cache_updated ON yahoo_cache(last_updated);
