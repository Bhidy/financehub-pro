-- ================================================
-- Egypt Funds Schema Updates
-- Run this script to add all required columns and tables
-- ================================================

-- ================================================
-- PHASE 1: Core Updates to mutual_funds table
-- ================================================

-- Header section fields
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS isin VARCHAR(20);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS as_of_date DATE;

-- Performance returns
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS returns_1m DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS returns_3m DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS returns_3y DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS returns_5y DECIMAL(10,5);

-- 52-week range
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS nav_52w_high DECIMAL(12,4);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS nav_52w_low DECIMAL(12,4);

-- ================================================
-- PHASE 2: Fund Ratios columns
-- ================================================

ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS sharpe_ratio DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS alpha DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS beta DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS r_squared DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS treynor_ratio DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS information_ratio DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS volatility_monthly DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS volatility_annual DECIMAL(10,5);
ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS correlation DECIMAL(10,5);

-- ================================================
-- NEW TABLE: Fund Disclosures
-- ================================================

CREATE TABLE IF NOT EXISTS fund_disclosures (
    id SERIAL PRIMARY KEY,
    fund_id VARCHAR(50) NOT NULL,
    disclosure_date DATE,
    title TEXT,
    sub_category VARCHAR(50),
    file_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_disclosures_fund ON fund_disclosures(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_disclosures_date ON fund_disclosures(disclosure_date DESC);

-- ================================================
-- NEW TABLE: Fund Actions (Dividends, Splits)
-- ================================================

CREATE TABLE IF NOT EXISTS fund_actions (
    id SERIAL PRIMARY KEY,
    fund_id VARCHAR(50) NOT NULL,
    action_date DATE,
    action_type VARCHAR(20),  -- DIVIDEND, SPLIT, CONSOLIDATION, CAPITAL_INCREASE
    action_value DECIMAL(12,4),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_actions_fund ON fund_actions(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_actions_date ON fund_actions(action_date DESC);

-- ================================================
-- Ensure nav_history table exists with correct schema
-- ================================================

CREATE TABLE IF NOT EXISTS nav_history (
    fund_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    nav DECIMAL(12, 4) NOT NULL,
    PRIMARY KEY (fund_id, date)
);

CREATE INDEX IF NOT EXISTS idx_nav_fund_date ON nav_history(fund_id, date DESC);

-- ================================================
-- Done
-- ================================================
SELECT 'Schema updates completed successfully' as status;

-- ================================================
-- NEW TABLE: Fund Investments (Holdings & Allocation)
-- ================================================

CREATE TABLE IF NOT EXISTS fund_investments (
    id SERIAL PRIMARY KEY,
    fund_id VARCHAR(50) NOT NULL,
    as_of_date DATE DEFAULT CURRENT_DATE,
    investment_type VARCHAR(50), -- 'Asset Class', 'Top Holding', 'Sector'
    name TEXT,
    symbol VARCHAR(50),
    percentage DECIMAL(10,5),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_investments_fund ON fund_investments(fund_id);
-- Unique constraint to prevent duplicate entries for the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_fund_inv_unique ON fund_investments(fund_id, investment_type, name, as_of_date);

-- ================================================
-- NEW TABLE: Fund Peers (Comparative Analysis)
-- ================================================

CREATE TABLE IF NOT EXISTS fund_peers (
    id SERIAL PRIMARY KEY,
    fund_id VARCHAR(50) NOT NULL,
    peer_fund_name TEXT,
    peer_symbol VARCHAR(50),
    peer_rank INTEGER,
    comparison_metric VARCHAR(50), -- e.g., '1Y Return', 'AUM'
    metric_value DECIMAL(16,4),
    as_of_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_peers_fund ON fund_peers(fund_id);

-- ================================================
-- NEW TABLE: Historical NAV (Chart Data) - Updated Schema
-- ================================================
-- This table replaces the previous nav_history definition with a SERIAL PRIMARY KEY,
-- a foreign key reference, and a created_at timestamp.
CREATE TABLE IF NOT EXISTS nav_history_new (
    id SERIAL PRIMARY KEY,
    fund_id VARCHAR(50) REFERENCES mutual_funds(fund_id),
    date DATE NOT NULL,
    nav DECIMAL(12,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fund_id, date)
);

-- ================================================
-- Mutual Funds Table: Mubasher-specific fields
-- ================================================
ALTER TABLE mutual_funds
ADD COLUMN IF NOT EXISTS market VARCHAR(50),
ADD COLUMN IF NOT EXISTS owner VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_update_date DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ================================================
-- NEW TABLE: EGX Watchlist (Real-time Stock Data)
-- ================================================

CREATE TABLE IF NOT EXISTS egx_watchlist (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    last_price DECIMAL(12,4),
    change DECIMAL(12,4),
    change_percent DECIMAL(8,4),
    bid DECIMAL(12,4),
    ask DECIMAL(12,4),
    bid_qty INTEGER,
    ask_qty INTEGER,
    volume BIGINT,
    trades INTEGER,
    turnover DECIMAL(18,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egx_watchlist_symbol ON egx_watchlist(symbol);
CREATE INDEX IF NOT EXISTS idx_egx_watchlist_updated ON egx_watchlist(updated_at);
CREATE INDEX IF NOT EXISTS idx_egx_watchlist_volume ON egx_watchlist(volume DESC NULLS LAST);

-- Market summary data (EGX30 index, overall stats)
CREATE TABLE IF NOT EXISTS egx_market_summary (
    id SERIAL PRIMARY KEY,
    index_name VARCHAR(50) DEFAULT 'EGX30',
    index_value DECIMAL(12,4),
    index_change DECIMAL(12,4),
    index_change_percent DECIMAL(8,4),
    market_cap DECIMAL(18,2),
    turnover DECIMAL(18,2),
    volume BIGINT,
    total_trades INTEGER,
    up_count INTEGER,
    unchanged_count INTEGER,
    down_count INTEGER,
    session_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egx_market_summary_date ON egx_market_summary(session_date DESC);

