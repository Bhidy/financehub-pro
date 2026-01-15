-- ENTERPRISE DATA PIPELINE SCHEMA EXTENSIONS
-- =============================================
-- Additional tables for yfinance/yahooquery data
-- NO OVERWRITE POLICY: All tables use ON CONFLICT DO NOTHING

-- 1. Valuation History (from yahooquery.valuation_measures)
-- Tracks P/E, P/B, EV/EBITDA over time
CREATE TABLE IF NOT EXISTS valuation_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    as_of_date DATE NOT NULL,
    pe_ratio DECIMAL(12, 4),
    pb_ratio DECIMAL(12, 4),
    ps_ratio DECIMAL(12, 4),
    ev_ebitda DECIMAL(12, 4),
    market_cap BIGINT,
    enterprise_value BIGINT,
    forward_pe DECIMAL(12, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, as_of_date)
);

-- 2. Corporate Events (from yahooquery.corporate_events)
-- Tracks dividends, splits, spinoffs, etc.
CREATE TABLE IF NOT EXISTS corporate_events (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    event_date DATE,
    event_type VARCHAR(50),
    event_headline TEXT,
    event_description TEXT,
    source VARCHAR(100) DEFAULT 'yahooquery',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Financial History Extended (from yahooquery.all_financial_data)
-- More comprehensive than financial_statements
CREATE TABLE IF NOT EXISTS financial_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    period_type VARCHAR(10),  -- 'annual' or 'quarterly'
    as_of_date DATE NOT NULL,
    total_revenue BIGINT,
    net_income BIGINT,
    gross_profit BIGINT,
    operating_income BIGINT,
    ebitda BIGINT,
    total_assets BIGINT,
    total_liabilities BIGINT,
    total_equity BIGINT,
    free_cash_flow BIGINT,
    eps DECIMAL(10, 4),
    raw_data JSONB,  -- Store full data for future use
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, period_type, as_of_date)
);

-- 4. Dividend History (from yfinance.dividends)
CREATE TABLE IF NOT EXISTS dividend_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    ex_date DATE NOT NULL,
    dividend_amount DECIMAL(12, 4),
    currency VARCHAR(5) DEFAULT 'SAR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, ex_date)
);

-- 5. Stock Splits History (from yfinance.splits)
CREATE TABLE IF NOT EXISTS split_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    split_date DATE NOT NULL,
    split_ratio DECIMAL(10, 4),  -- e.g., 2.0 for 2:1 split
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, split_date)
);

-- 6. Earnings History (from yfinance.earnings_dates)
CREATE TABLE IF NOT EXISTS earnings_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    earnings_date TIMESTAMP WITH TIME ZONE NOT NULL,
    eps_estimate DECIMAL(10, 4),
    eps_actual DECIMAL(10, 4),
    surprise_percent DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, earnings_date)
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_valuation_symbol_date ON valuation_history(symbol, as_of_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_history_symbol ON financial_history(symbol, as_of_date DESC);
CREATE INDEX IF NOT EXISTS idx_dividend_history_symbol ON dividend_history(symbol, ex_date DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_history_symbol ON earnings_history(symbol, earnings_date DESC);
CREATE INDEX IF NOT EXISTS idx_corporate_events_symbol ON corporate_events(symbol, event_date DESC);

-- Verify existing tables have required columns
-- These are NOOPs if columns already exist
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS pe_ratio DECIMAL(12, 4);
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS pb_ratio DECIMAL(12, 4);
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS dividend_yield DECIMAL(10, 4);
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS beta DECIMAL(10, 4);
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS high_52w DECIMAL(12, 4);
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS low_52w DECIMAL(12, 4);
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS target_price DECIMAL(12, 4);
ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS market_cap BIGINT;
