
# performance/indexes.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_tickers_symbol ON market_tickers (symbol);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_tickers_sector ON market_tickers (sector_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ohlc_history_symbol_time ON ohlc_history (symbol, time DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_news_symbol ON market_news (symbol);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_news_published ON market_news (published_at DESC);
