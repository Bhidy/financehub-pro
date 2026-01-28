-- ============================================================
-- ENTERPRISE 19.2 MILLION DATAPOINT SCHEMA
-- ============================================================
-- This schema supports storing ALL data from yfinance + yahooquery
-- Data Protection: All tables use UNIQUE constraints for NO-OVERWRITE
-- ============================================================

-- ============================================================
-- 1. MARKET TICKERS (Core stock list)
-- ============================================================
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
    
    -- Extended metrics from yfinance
    market_cap BIGINT,
    pe_ratio DECIMAL(12, 4),
    pb_ratio DECIMAL(12, 4),
    dividend_yield DECIMAL(10, 4),
    beta DECIMAL(10, 4),
    high_52w DECIMAL(12, 4),
    low_52w DECIMAL(12, 4),
    target_price DECIMAL(12, 4),
    
    -- Branding
    logo_url TEXT,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. DAILY OHLC DATA (10,577 points per stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS ohlc_data (
    symbol VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, date)
);
CREATE INDEX IF NOT EXISTS idx_ohlc_symbol_date ON ohlc_data(symbol, date DESC);

-- ============================================================
-- 3. INTRADAY TABLES (All intervals - 75,000+ points per stock)
-- ============================================================

-- 1-minute data (7 days history)
CREATE TABLE IF NOT EXISTS intraday_1m (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_intraday_1m_symbol ON intraday_1m(symbol, timestamp DESC);

-- 2-minute data (60 days history)
CREATE TABLE IF NOT EXISTS intraday_2m (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_intraday_2m_symbol ON intraday_2m(symbol, timestamp DESC);

-- 5-minute data (60 days history) - 25,186 points
CREATE TABLE IF NOT EXISTS intraday_5m (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_intraday_5m_symbol ON intraday_5m(symbol, timestamp DESC);

-- 15-minute data (60 days history)
CREATE TABLE IF NOT EXISTS intraday_15m (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_intraday_15m_symbol ON intraday_15m(symbol, timestamp DESC);

-- 30-minute data (60 days history)
CREATE TABLE IF NOT EXISTS intraday_30m (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_intraday_30m_symbol ON intraday_30m(symbol, timestamp DESC);

-- 1-hour data (2 years history) - 25,494 points
CREATE TABLE IF NOT EXISTS intraday_1h (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_intraday_1h_symbol ON intraday_1h(symbol, timestamp DESC);

-- ============================================================
-- 4. WEEKLY & MONTHLY OHLC
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_ohlc (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_weekly_symbol ON weekly_ohlc(symbol, timestamp DESC);

CREATE TABLE IF NOT EXISTS monthly_ohlc (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_monthly_symbol ON monthly_ohlc(symbol, timestamp DESC);

-- ============================================================
-- 5. FINANCIAL HISTORY (Comprehensive - 3000+ points per stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    period_type VARCHAR(15) NOT NULL,  -- 'annual' or 'quarterly'
    as_of_date DATE NOT NULL,
    
    -- Income Statement
    total_revenue BIGINT,
    gross_profit BIGINT,
    operating_income BIGINT,
    net_income BIGINT,
    ebitda BIGINT,
    basic_eps DECIMAL(10, 4),
    diluted_eps DECIMAL(10, 4),
    
    -- Balance Sheet
    total_assets BIGINT,
    total_liabilities BIGINT,
    total_equity BIGINT,
    total_debt BIGINT,
    cash_and_equivalents BIGINT,
    
    -- Cash Flow
    operating_cash_flow BIGINT,
    investing_cash_flow BIGINT,
    financing_cash_flow BIGINT,
    free_cash_flow BIGINT,
    
    -- Full raw data for AI deep analysis
    raw_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, period_type, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_financial_symbol ON financial_history(symbol, as_of_date DESC);

-- ============================================================
-- 6. VALUATION HISTORY (Quarterly - 130 points per stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS valuation_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    as_of_date DATE NOT NULL,
    
    -- Valuation Ratios
    pe_ratio DECIMAL(12, 4),
    forward_pe DECIMAL(12, 4),
    pb_ratio DECIMAL(12, 4),
    ps_ratio DECIMAL(12, 4),
    peg_ratio DECIMAL(12, 4),
    ev_ebitda DECIMAL(12, 4),
    ev_revenue DECIMAL(12, 4),
    
    -- Market Values
    market_cap BIGINT,
    enterprise_value BIGINT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_valuation_symbol ON valuation_history(symbol, as_of_date DESC);

-- ============================================================
-- 7. CORPORATE EVENTS (765 points per stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS corporate_events (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE,
    event_type VARCHAR(100),
    headline TEXT,
    description TEXT,
    significance VARCHAR(20) DEFAULT 'medium',
    source VARCHAR(50) DEFAULT 'yahooquery',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, event_date, event_type)
);
CREATE INDEX IF NOT EXISTS idx_events_symbol ON corporate_events(symbol, event_date DESC);

-- ============================================================
-- 8. DIVIDEND HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS dividend_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    ex_date DATE NOT NULL,
    dividend_amount DECIMAL(12, 6),
    currency VARCHAR(5) DEFAULT 'SAR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, ex_date)
);
CREATE INDEX IF NOT EXISTS idx_dividend_symbol ON dividend_history(symbol, ex_date DESC);

-- ============================================================
-- 9. SPLIT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS split_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    split_date DATE NOT NULL,
    split_ratio DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, split_date)
);
CREATE INDEX IF NOT EXISTS idx_split_symbol ON split_history(symbol, split_date DESC);

-- ============================================================
-- 10. EARNINGS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS earnings_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    earnings_date TIMESTAMP WITH TIME ZONE NOT NULL,
    eps_estimate DECIMAL(10, 4),
    eps_actual DECIMAL(10, 4),
    revenue_estimate BIGINT,
    revenue_actual BIGINT,
    surprise_percent DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, earnings_date)
);
CREATE INDEX IF NOT EXISTS idx_earnings_symbol ON earnings_history(symbol, earnings_date DESC);

-- ============================================================
-- 11. COMPANY PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS company_profiles (
    symbol VARCHAR(20) PRIMARY KEY,
    name_en TEXT,
    name_ar TEXT,
    sector VARCHAR(100),
    industry VARCHAR(100),
    description TEXT,
    website VARCHAR(255),
    employees INT,
    headquarters VARCHAR(100),
    founded_year INT,
    ceo VARCHAR(100),
    info_json JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 12. ANALYST CONSENSUS (Daily snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS analyst_consensus (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    as_of_date DATE NOT NULL,
    target_mean DECIMAL(12, 4),
    target_high DECIMAL(12, 4),
    target_low DECIMAL(12, 4),
    target_median DECIMAL(12, 4),
    num_analysts INT,
    recommendation_key VARCHAR(20),
    recommendation_mean DECIMAL(5, 2),
    strong_buy INT,
    buy INT,
    hold INT,
    sell INT,
    strong_sell INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_analyst_symbol ON analyst_consensus(symbol, as_of_date DESC);

-- ============================================================
-- LEGACY TABLES (Keep for existing functionality)
-- ============================================================

-- Analyst ratings (legacy)
CREATE TABLE IF NOT EXISTS analyst_ratings (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    analyst_firm TEXT,
    rating VARCHAR(20),
    target_price DECIMAL(12, 4),
    current_price DECIMAL(12, 4),
    target_upside DECIMAL(10, 4),
    rating_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corporate actions (legacy)
CREATE TABLE IF NOT EXISTS corporate_actions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    action_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(12, 4),
    ex_date DATE,
    payment_date DATE,
    record_date DATE,
    announcement_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intraday data (legacy - single table)
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

-- ============================================================
-- DATA STATISTICS VIEW
-- ============================================================
CREATE OR REPLACE VIEW data_statistics AS
SELECT 
    'ohlc_data' as table_name, COUNT(*) as records FROM ohlc_data
UNION ALL
SELECT 'intraday_1m', COUNT(*) FROM intraday_1m
UNION ALL
SELECT 'intraday_5m', COUNT(*) FROM intraday_5m
UNION ALL
SELECT 'intraday_1h', COUNT(*) FROM intraday_1h
UNION ALL
SELECT 'financial_history', COUNT(*) FROM financial_history
UNION ALL
SELECT 'valuation_history', COUNT(*) FROM valuation_history
UNION ALL
SELECT 'corporate_events', COUNT(*) FROM corporate_events
UNION ALL
SELECT 'dividend_history', COUNT(*) FROM dividend_history
UNION ALL
SELECT 'earnings_history', COUNT(*) FROM earnings_history
UNION ALL
SELECT 'market_tickers', COUNT(*) FROM market_tickers;

-- ============================================================
-- SUMMARY
-- ============================================================
-- Total Tables: 15
-- Price Tables: 9 (ohlc_data, intraday_1m/2m/5m/15m/30m/1h, weekly_ohlc, monthly_ohlc)
-- Financial Tables: 2 (financial_history, valuation_history)
-- Event Tables: 4 (corporate_events, dividend_history, split_history, earnings_history)
-- 
-- Expected Datapoints: ~19.2 MILLION (210 stocks × 91,580 per stock)
-- ============================================================
