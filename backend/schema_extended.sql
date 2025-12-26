-- MUBASHER-DEEP-EXTRACT: Extended Schema for Rich Data
-- Senior Expert Recommendation: Additional Tables for World-Class Database
-- Created: 2025-12-25

-- =====================================================
-- 1. DIVIDENDS & CORPORATE ACTIONS (Historical)
-- =====================================================
CREATE TABLE IF NOT EXISTS corporate_actions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    action_type VARCHAR(50) NOT NULL, -- 'DIVIDEND', 'SPLIT', 'RIGHTS', 'BONUS', 'IPO'
    announcement_date DATE,
    ex_date DATE,
    record_date DATE,
    payment_date DATE,
    
    -- Dividend Specific
    dividend_amount DECIMAL(10, 4),
    dividend_currency VARCHAR(10) DEFAULT 'SAR',
    dividend_yield DECIMAL(8, 4),
    
    -- Split/Bonus Specific
    split_ratio VARCHAR(20), -- e.g., '2:1', '1:10'
    
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, action_type, ex_date)
);

-- =====================================================
-- 2. OWNERSHIP STRUCTURE (Major Shareholders)
-- =====================================================
CREATE TABLE IF NOT EXISTS major_shareholders (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    shareholder_name TEXT NOT NULL,
    shareholder_name_en TEXT,
    ownership_percent DECIMAL(8, 4),
    shares_held BIGINT,
    shareholder_type VARCHAR(50), -- 'GOVERNMENT', 'INSTITUTION', 'INSIDER', 'FUND', 'INDIVIDUAL'
    as_of_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, shareholder_name, as_of_date)
);

-- =====================================================
-- 3. ANALYST RATINGS & FAIR VALUES
-- =====================================================
CREATE TABLE IF NOT EXISTS analyst_ratings (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    analyst_firm VARCHAR(200),
    rating VARCHAR(50), -- 'BUY', 'HOLD', 'SELL', 'OVERWEIGHT', 'UNDERWEIGHT'
    target_price DECIMAL(12, 4),
    current_price DECIMAL(12, 4),
    upside_potential DECIMAL(8, 4),
    rating_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, analyst_firm, rating_date)
);

CREATE TABLE IF NOT EXISTS fair_values (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    valuation_model VARCHAR(100), -- 'DCF', 'PE_MULTIPLE', 'PB_MULTIPLE', 'DDM'
    fair_value DECIMAL(12, 4),
    current_price DECIMAL(12, 4),
    upside_percent DECIMAL(8, 4),
    valuation_date DATE,
    assumptions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, valuation_model, valuation_date)
);

-- =====================================================
-- 4. TECHNICAL INDICATORS (Support/Resistance)
-- =====================================================
CREATE TABLE IF NOT EXISTS technical_levels (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    calc_date DATE NOT NULL,
    
    -- Support Levels
    support_1 DECIMAL(12, 4),
    support_2 DECIMAL(12, 4),
    support_3 DECIMAL(12, 4),
    
    -- Resistance Levels
    resistance_1 DECIMAL(12, 4),
    resistance_2 DECIMAL(12, 4),
    resistance_3 DECIMAL(12, 4),
    
    -- Pivot Points
    pivot_point DECIMAL(12, 4),
    
    -- Moving Averages
    sma_20 DECIMAL(12, 4),
    sma_50 DECIMAL(12, 4),
    sma_200 DECIMAL(12, 4),
    ema_12 DECIMAL(12, 4),
    ema_26 DECIMAL(12, 4),
    
    -- RSI & MACD
    rsi_14 DECIMAL(8, 4),
    macd_line DECIMAL(12, 4),
    macd_signal DECIMAL(12, 4),
    macd_histogram DECIMAL(12, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, calc_date)
);

-- =====================================================
-- 5. EARNINGS CALENDAR & ANNOUNCEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS earnings_calendar (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    fiscal_quarter VARCHAR(10), -- 'Q1 2025', 'FY 2024'
    announcement_date DATE,
    
    -- Earnings Data
    eps_actual DECIMAL(10, 4),
    eps_estimate DECIMAL(10, 4),
    eps_surprise DECIMAL(10, 4),
    eps_surprise_percent DECIMAL(8, 4),
    
    revenue_actual DECIMAL(18, 4),
    revenue_estimate DECIMAL(18, 4),
    revenue_surprise_percent DECIMAL(8, 4),
    
    -- YoY Comparison
    eps_yoy_change DECIMAL(8, 4),
    revenue_yoy_change DECIMAL(8, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, fiscal_quarter)
);

-- =====================================================
-- 6. VOLUME STATISTICS (Trading Activity)
-- =====================================================
CREATE TABLE IF NOT EXISTS volume_statistics (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    stat_date DATE NOT NULL,
    
    avg_volume_10d BIGINT,
    avg_volume_30d BIGINT,
    avg_volume_90d BIGINT,
    
    avg_turnover_10d DECIMAL(18, 4),
    avg_turnover_30d DECIMAL(18, 4),
    
    -- Relative Volume
    relative_volume DECIMAL(8, 4), -- Today's volume / Avg volume
    
    -- Trade Count
    trade_count INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, stat_date)
);

-- =====================================================
-- 7. FINANCIAL RATIOS (Expanded)
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_ratios_extended (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    fiscal_year INT NOT NULL,
    period_type VARCHAR(10) DEFAULT 'FY',
    
    -- Valuation Ratios
    pe_ratio DECIMAL(10, 4),
    pb_ratio DECIMAL(10, 4),
    ps_ratio DECIMAL(10, 4),
    ev_ebitda DECIMAL(10, 4),
    price_to_fcf DECIMAL(10, 4),
    
    -- Profitability Ratios
    gross_margin DECIMAL(8, 4),
    operating_margin DECIMAL(8, 4),
    net_margin DECIMAL(8, 4),
    roe DECIMAL(8, 4),
    roa DECIMAL(8, 4),
    roic DECIMAL(8, 4),
    
    -- Liquidity Ratios
    current_ratio DECIMAL(8, 4),
    quick_ratio DECIMAL(8, 4),
    cash_ratio DECIMAL(8, 4),
    
    -- Leverage Ratios
    debt_to_equity DECIMAL(10, 4),
    debt_to_assets DECIMAL(8, 4),
    interest_coverage DECIMAL(10, 4),
    
    -- Efficiency Ratios
    asset_turnover DECIMAL(8, 4),
    inventory_turnover DECIMAL(8, 4),
    receivables_turnover DECIMAL(8, 4),
    
    -- Per Share Metrics
    book_value_per_share DECIMAL(12, 4),
    tangible_book_per_share DECIMAL(12, 4),
    fcf_per_share DECIMAL(12, 4),
    dividend_per_share DECIMAL(10, 4),
    
    -- Growth Rates
    revenue_growth_yoy DECIMAL(8, 4),
    earnings_growth_yoy DECIMAL(8, 4),
    dividend_growth_yoy DECIMAL(8, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, fiscal_year, period_type)
);

-- =====================================================
-- 8. IPO DATA
-- =====================================================
CREATE TABLE IF NOT EXISTS ipo_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) REFERENCES market_tickers(symbol),
    company_name TEXT NOT NULL,
    ipo_date DATE,
    offer_price DECIMAL(12, 4),
    first_day_close DECIMAL(12, 4),
    first_day_return DECIMAL(8, 4),
    shares_offered BIGINT,
    funds_raised DECIMAL(18, 4),
    subscription_multiple DECIMAL(10, 4), -- Oversubscription ratio
    sector VARCHAR(100),
    underwriter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol)
);

-- =====================================================
-- 9. SECTOR & INDUSTRY CLASSIFICATION
-- =====================================================
CREATE TABLE IF NOT EXISTS sector_classification (
    symbol VARCHAR(20) PRIMARY KEY REFERENCES market_tickers(symbol),
    sector_ar TEXT,
    sector_en TEXT,
    industry_ar TEXT,
    industry_en TEXT,
    sub_industry TEXT,
    gics_code VARCHAR(20),
    market_cap_category VARCHAR(20), -- 'LARGE', 'MID', 'SMALL', 'MICRO'
    is_sharia_compliant BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. MARKET INDICES HISTORICAL DATA
-- =====================================================
CREATE TABLE IF NOT EXISTS index_history (
    id SERIAL PRIMARY KEY,
    index_code VARCHAR(50) NOT NULL, -- 'TASI', 'NOMU', 'MT30'
    index_name_ar TEXT,
    index_name_en TEXT,
    date DATE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    turnover DECIMAL(18, 4),
    change_percent DECIMAL(8, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(index_code, date)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_corp_actions_symbol ON corporate_actions (symbol, ex_date DESC);
CREATE INDEX IF NOT EXISTS idx_shareholders_symbol ON major_shareholders (symbol, ownership_percent DESC);
CREATE INDEX IF NOT EXISTS idx_analyst_symbol ON analyst_ratings (symbol, rating_date DESC);
CREATE INDEX IF NOT EXISTS idx_technicals_symbol ON technical_levels (symbol, calc_date DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_symbol ON earnings_calendar (symbol, announcement_date DESC);
CREATE INDEX IF NOT EXISTS idx_volume_symbol ON volume_statistics (symbol, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_ratios_ext_symbol ON financial_ratios_extended (symbol, fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_index_history ON index_history (index_code, date DESC);

-- =====================================================
-- 11. AUTHENTICATION & SECURITY
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'subscriber'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(key_hash)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
