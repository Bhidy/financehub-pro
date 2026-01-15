-- ============================================================================
-- YAHOO TAKEOVER SCHEMA (Rubix Decommission)
-- ============================================================================

-- 1. CLEANUP (Drop Legacy Tables)
DROP TABLE IF EXISTS egx_watchlist_full CASCADE;
DROP TABLE IF EXISTS egx_watchlist CASCADE;

-- 2. YAHOO UNIVERSE (The Static Backbone)
-- Stores the ISIN-based identity and profile of every stock.
CREATE TABLE yahoo_universe (
    isin VARCHAR(50) PRIMARY KEY, -- e.g., 'EGS48031C016.CA'
    symbol VARCHAR(20),           -- Short symbol if needed (e.g., COMI)
    name_en VARCHAR(255),
    name_ar VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    description TEXT,
    website VARCHAR(255),
    employees INTEGER,
    headquarters_city VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LIVE MARKET DATA (Hot Table)
-- Optimized for high-frequency updates (every 15 mins).
CREATE TABLE yahoo_realtime (
    isin VARCHAR(50) PRIMARY KEY REFERENCES yahoo_universe(isin) ON DELETE CASCADE,
    last_price DECIMAL(12,4),
    open DECIMAL(12,4),
    day_high DECIMAL(12,4),
    day_low DECIMAL(12,4),
    prev_close DECIMAL(12,4),
    change DECIMAL(12,4),
    change_pct DECIMAL(10,4),
    volume BIGINT,
    avg_volume_10d BIGINT,
    avg_volume_3m BIGINT,
    market_cap BIGINT,
    bid DECIMAL(12,4),
    ask DECIMAL(12,4),
    currency VARCHAR(10) DEFAULT 'EGP',
    market_state VARCHAR(20), -- 'OPEN', 'CLOSED'
    last_trade_time TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRICE HISTORY (Time Series)
-- Stores daily candles for charting.
CREATE TABLE yahoo_history (
    isin VARCHAR(50) REFERENCES yahoo_universe(isin) ON DELETE CASCADE,
    date DATE NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    volume BIGINT,
    PRIMARY KEY (isin, date)
);

-- 5. DEEP FUNDAMENTALS (Strategic Data)
-- Stores key ratios and stats.
CREATE TABLE yahoo_fundamentals (
    isin VARCHAR(50) REFERENCES yahoo_universe(isin) ON DELETE CASCADE,
    pe_ratio DECIMAL(10,2),
    forward_pe DECIMAL(10,2),
    peg_ratio DECIMAL(10,2),
    price_to_book DECIMAL(10,2),
    price_to_sales DECIMAL(10,2),
    dividend_yield DECIMAL(10,4),
    payout_ratio DECIMAL(10,4),
    profit_margin DECIMAL(10,4),
    operating_margin DECIMAL(10,4),
    return_on_equity DECIMAL(10,4),
    return_on_assets DECIMAL(10,4),
    revenue DECIMAL(20,2),
    net_income DECIMAL(20,2),
    total_cash DECIMAL(20,2),
    total_debt DECIMAL(20,2),
    current_ratio DECIMAL(10,2),
    quick_ratio DECIMAL(10,2),
    beta DECIMAL(10,4),
    trailing_eps DECIMAL(10,4),
    forward_eps DECIMAL(10,4),
    shares_outstanding BIGINT,
    float_shares BIGINT,
    insider_ownership DECIMAL(10,4),
    institution_ownership DECIMAL(10,4),
    short_ratio DECIMAL(10,2),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (isin)
);

-- Indexes for Speed
CREATE INDEX idx_realtime_change ON yahoo_realtime(change_pct DESC);
CREATE INDEX idx_realtime_volume ON yahoo_realtime(volume DESC);
CREATE INDEX idx_history_date ON yahoo_history(date DESC);
CREATE INDEX idx_universe_sector ON yahoo_universe(sector);

COMMENT ON TABLE yahoo_universe IS 'Core identity table for EGX stocks using Yahoo ISINs';
COMMENT ON TABLE yahoo_realtime IS 'Live market data feed updated every 15 minutes';
