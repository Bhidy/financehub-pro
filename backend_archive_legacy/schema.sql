-- MUBASHER-DEEP-EXTRACT Schema
-- Target: PostgreSQL 14+ / TimescaleDB

-- 1. Enable TimescaleDB extension if not exists
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Market Tickers (Asset Identity)
-- Stores the fundamental identity of each asset.
CREATE TABLE IF NOT EXISTS market_tickers (
    symbol VARCHAR(20) PRIMARY KEY,
    name_ar TEXT,
    name_en TEXT,
    market_code VARCHAR(10) NOT NULL, -- e.g., 'TDWL'
    sector_name TEXT,
    currency VARCHAR(5) DEFAULT 'SAR',
    
    -- Live Snapshot Data
    last_price DECIMAL(12, 4),
    change DECIMAL(12, 4),
    change_percent DECIMAL(12, 4),
    volume BIGINT,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. OHLC History (Time-Series Data)
-- Stores historical price and volume data.
-- Converted to a Hypertable for efficient time-series queries.
CREATE TABLE IF NOT EXISTS ohlc_history (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    turnover DECIMAL(18, 4),
    transactions INT,
    
    -- Composite primary key (time + symbol) for TimescaleDB
    PRIMARY KEY (time, symbol)
);

-- Convert to TimescaleDB Hypertable
-- SELECT create_hypertable('ohlc_history', 'time', if_not_exists => TRUE);

-- 4. Corporate Actions (Events)
-- Stores dividends, splits, and other events.
CREATE TABLE IF NOT EXISTS corporate_actions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    event_type VARCHAR(50), -- 'DIVIDEND', 'SPLIT', 'EARNINGS'
    event_date DATE NOT NULL,
    description TEXT,
    value DECIMAL(12, 4), -- e.g., Dividend amount
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ohlc_symbol ON ohlc_history (symbol, time DESC);
CREATE INDEX IF NOT EXISTS idx_actions_symbol ON corporate_actions (symbol, event_date);
