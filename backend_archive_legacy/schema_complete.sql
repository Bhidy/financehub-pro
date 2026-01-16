-- COMPLETE PRODUCTION DATABASE SCHEMA
-- For real mubasher.info data - ZERO simulated data

-- 1. Market Tickers
CREATE TABLE IF NOT EXISTS market_tickers (
    symbol VARCHAR(20) PRIMARY KEY,
    name_en TEXT,
    name_ar TEXT,
    market_code VARCHAR(10) DEFAULT 'TDWL',
    sector_name TEXT,
    
    -- Live price data
    last_price DECIMAL(12, 4),
    change DECIMAL(12, 4),
    change_percent DECIMAL(12, 4),
    volume BIGINT,
    open_price DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    prev_close DECIMAL(12, 4),
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. OHLC Historical Data
CREATE TABLE IF NOT EXISTS ohlc_data (
    symbol VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    PRIMARY KEY (symbol, date)
);

-- 3. Mutual Funds
CREATE TABLE IF NOT EXISTS mutual_funds (
    fund_id VARCHAR(50) PRIMARY KEY,
    fund_name TEXT NOT NULL,
    manager_name TEXT,
    inception_date DATE,
    currency VARCHAR(5) DEFAULT 'SAR',
    latest_nav DECIMAL(12, 4),
    aum DECIMAL(18, 4),
    ytd_return DECIMAL(10, 4),
    one_year_return DECIMAL(10, 4),
    three_year_return DECIMAL(10, 4),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. NAV History
CREATE TABLE IF NOT EXISTS nav_history (
    fund_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    nav DECIMAL(12, 4) NOT NULL,
    PRIMARY KEY (fund_id, date),
    FOREIGN KEY (fund_id) REFERENCES mutual_funds(fund_id)
);

-- 5. ETFs
CREATE TABLE IF NOT EXISTS etfs (
    symbol VARCHAR(20) PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    underlying_index TEXT,
    expense_ratio DECIMAL(5, 4),
    aum DECIMAL(18, 4),
    nav DECIMAL(12, 4),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Corporate Actions
CREATE TABLE IF NOT EXISTS corporate_actions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    action_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(12, 4),
    ex_date DATE NOT NULL,
    payment_date DATE,
    record_date DATE,
    announcement_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Insider Trading
CREATE TABLE IF NOT EXISTS insider_trading (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    insider_name TEXT NOT NULL,
    insider_role TEXT,
    transaction_type VARCHAR(10),
    shares INT,
    price_per_share DECIMAL(12, 4),
    value DECIMAL(18, 4),
    holdings_after BIGINT,
    transaction_date DATE,
    filing_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Analyst Ratings
CREATE TABLE IF NOT EXISTS analyst_ratings (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    analyst_firm TEXT NOT NULL,
    rating VARCHAR(20),
    target_price DECIMAL(12, 4),
    current_price DECIMAL(12, 4),
    target_upside DECIMAL(10, 4),
    rating_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Intraday Data
CREATE TABLE IF NOT EXISTS intraday_data (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    PRIMARY KEY (symbol, timestamp)
);

-- 10. Market Breadth
CREATE TABLE IF NOT EXISTS market_breadth (
    date DATE PRIMARY KEY,
    total_stocks INT,
    advancing INT,
    declining INT,
    unchanged INT,
    new_highs INT,
    new_lows INT,
    up_volume BIGINT,
    down_volume BIGINT
);

-- 11. Economic Indicators
CREATE TABLE IF NOT EXISTS economic_indicators (
    id SERIAL PRIMARY KEY,
    indicator_code VARCHAR(50) NOT NULL,
    indicator_name TEXT NOT NULL,
    value DECIMAL(12, 4),
    unit VARCHAR(20),
    date DATE NOT NULL,
    source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(indicator_code, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ohlc_symbol_date ON ohlc_data(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_nav_fund_date ON nav_history(fund_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_actions_symbol_date ON corporate_actions(symbol, ex_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_symbol_date ON insider_trading(symbol, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_symbol_date ON analyst_ratings(symbol, rating_date DESC);
CREATE INDEX IF NOT EXISTS idx_intraday_symbol_time ON intraday_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tickers_updated ON market_tickers(last_updated DESC);
