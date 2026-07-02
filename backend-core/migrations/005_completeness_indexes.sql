-- 005_completeness_indexes.sql
-- Indexes added during the 2026-07-02 data-completeness pass. Idempotent.
-- NOTE: market_tickers(market_code) already exists as idx_tickers_market, so it
-- is intentionally NOT recreated here (the audit's "missing" flag was a false
-- positive). These two were the genuinely-absent ones.
--
-- Also recorded here for provenance (data cleanups run live, not via this file):
--   * removed 408 legacy Saudi tickers (market_code IS NULL AND symbol ~ '^[0-9]+$')
--     plus their ohlc_data (480,621), intraday_1h (164,941), intraday_5m (129,530)
--     rows — Saudi market was dropped (see docs/CANONICAL_STATE.md).
--   * purged 650 stale egx_ingest_deadletter rows (>7d old; all from the
--     2026-06-07 incident, symbols since re-ingested).

-- JSONB symbol lookups on news (WHERE related_symbols @> '["COMI"]') — a btree
-- can't serve these; GIN can.
CREATE INDEX IF NOT EXISTS idx_egx_news_related_symbols
    ON egx_news USING GIN (related_symbols);

-- Fund listings filter by market_code.
CREATE INDEX IF NOT EXISTS idx_mutual_funds_market_code
    ON mutual_funds (market_code);
