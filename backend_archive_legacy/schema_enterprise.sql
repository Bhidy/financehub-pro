-- MUBASHER-DEEP-EXTRACT: Enterprise Schema Extension
-- Adds support for deep fundamentals, news, and rich profiles.

-- 5. Company Profile (Deep Metadata)
CREATE TABLE IF NOT EXISTS company_profiles (
    symbol VARCHAR(20) PRIMARY KEY REFERENCES market_tickers(symbol),
    description TEXT,
    website VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    logo_url TEXT,
    
    -- JSON blobs for flexible schema (Officers, Peers)
    officers JSONB DEFAULT '[]', 
    peers JSONB DEFAULT '[]',
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Financial Statements (The Core Data)
-- Supports Income, Balance, Cash Flow
CREATE TABLE IF NOT EXISTS financial_statements (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    period_type VARCHAR(10) NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'FY'
    fiscal_year INT NOT NULL,
    end_date DATE NOT NULL,
    
    -- Core Metrics (Standardized)
    revenue DECIMAL(18, 4),
    gross_profit DECIMAL(18, 4),
    operating_income DECIMAL(18, 4),
    net_income DECIMAL(18, 4),
    eps DECIMAL(10, 4),
    
    total_assets DECIMAL(18, 4),
    total_liabilities DECIMAL(18, 4),
    total_equity DECIMAL(18, 4),
    cash_flow_operating DECIMAL(18, 4),
    
    -- Full Raw Data (for audit/re-parsing)
    raw_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, fiscal_year, period_type)
);

-- 7. Market Indices & Sectors
CREATE TABLE IF NOT EXISTS sector_performance (
    sector_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    change_percent DECIMAL(10, 4),
    volume BIGINT,
    turnover DECIMAL(18, 4),
    PRIMARY KEY (sector_name, date)
);

-- 8. Market News
CREATE TABLE IF NOT EXISTS market_news (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) REFERENCES market_tickers(symbol), -- Can be NULL for general market news
    headline TEXT NOT NULL,
    source VARCHAR(100),
    url TEXT UNIQUE,
    published_at TIMESTAMP WITH TIME ZONE,
    sentiment_score DECIMAL(5, 4), -- -1.0 to 1.0 (NLP)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_symbol ON market_news (symbol, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_financials_symbol ON financial_statements (symbol, fiscal_year DESC);

-- 9. Portfolio Management (Paper Trading)
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL, -- 'demo'
    cash_balance DECIMAL(18, 4) DEFAULT 100000.00, -- Simulated 1M SAR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolios(id),
    symbol VARCHAR(20) REFERENCES market_tickers(symbol),
    quantity INT NOT NULL,
    average_price DECIMAL(18, 4) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, symbol)
);

CREATE TABLE IF NOT EXISTS trade_history (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolios(id),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(4) NOT NULL, -- 'BUY' or 'SELL'
    quantity INT NOT NULL,
    price DECIMAL(18, 4) NOT NULL,
    total_value DECIMAL(18, 4) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio ON portfolio_holdings (portfolio_id);
