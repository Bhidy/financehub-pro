-- ================================================
-- EGX Watchlist Schema Update - Full 52 Column Support
-- Based on complete Rubix Mubasher watchlist extraction
-- ================================================

-- First, drop and recreate with comprehensive schema
DROP TABLE IF EXISTS egx_watchlist_full;

CREATE TABLE egx_watchlist_full (
    id SERIAL PRIMARY KEY,
    
    -- Core identifiers (col-id: 0, 40, 32, 31)
    symbol VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    symbol_code VARCHAR(50),
    exchange VARCHAR(20) DEFAULT 'EGX',
    market VARCHAR(50),
    
    -- Price & Change (col-id: 1, 2, 3, 4, 34, 42)
    last_price DECIMAL(12,4),
    open_price DECIMAL(12,4),
    change DECIMAL(12,4),
    change_percent DECIMAL(8,4),
    lt_price DECIMAL(12,4),  -- Last Traded Price
    prev_close DECIMAL(12,4),
    
    -- Bid/Ask (col-id: 5, 6, 9, 10, 17, 23, 24)
    bid DECIMAL(12,4),
    ask DECIMAL(12,4),
    bid_qty BIGINT,
    ask_qty BIGINT,
    bid_ask_spread DECIMAL(12,4),
    total_bid_qty BIGINT,
    total_ask_qty BIGINT,
    
    -- Trading activity (col-id: 14, 15, 16, 46, 47, 48, 49)
    volume BIGINT,
    turnover DECIMAL(18,2),
    trades INTEGER,
    daily_value DECIMAL(18,2),
    daily_volume BIGINT,
    open_quantity BIGINT,
    orders INTEGER,
    
    -- Range data (col-id: 18, 19, 21, 22, 30)
    day_high DECIMAL(12,4),
    day_low DECIMAL(12,4),
    limit_min DECIMAL(12,4),
    limit_max DECIMAL(12,4),
    week_52_range VARCHAR(50),
    
    -- Advanced indicators (col-id: 38, 39, 41, 45, 50, 51)
    theo_open DECIMAL(12,4),
    theo_close DECIMAL(12,4),
    vwap DECIMAL(12,4),
    unadjusted_prev_price DECIMAL(12,4),
    last_auction_price DECIMAL(12,4),
    change_cb_ref_price DECIMAL(12,4),
    
    -- Close auction data (col-id: 52, 53, 54, 55)
    close_bid_price DECIMAL(12,4),
    close_bid_depth BIGINT,
    close_ask_price DECIMAL(12,4),
    close_ask_depth BIGINT,
    
    -- Short selling data (col-id: 57, 58, 59, 60)
    short_sell_enabled BOOLEAN DEFAULT FALSE,
    short_sell_qty_limit BIGINT,
    short_sell_status VARCHAR(50),
    max_sell_t0_qty_per_day BIGINT,
    
    -- Session & Metadata (col-id: 11, 33, 43, 44)
    currency VARCHAR(10) DEFAULT 'EGP',
    last_trade_time TIMESTAMPTZ,
    cb_symbol_state VARCHAR(50),
    session_name VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_egx_full_symbol ON egx_watchlist_full(symbol);
CREATE INDEX idx_egx_full_updated ON egx_watchlist_full(updated_at DESC);
CREATE INDEX idx_egx_full_volume ON egx_watchlist_full(volume DESC NULLS LAST);
CREATE INDEX idx_egx_full_change_pct ON egx_watchlist_full(change_percent DESC NULLS LAST);
CREATE INDEX idx_egx_full_turnover ON egx_watchlist_full(turnover DESC NULLS LAST);
CREATE INDEX idx_egx_full_trades ON egx_watchlist_full(trades DESC NULLS LAST);

-- Add comment explaining column source
COMMENT ON TABLE egx_watchlist_full IS 'Comprehensive EGX watchlist data extracted from Rubix Mubasher with all 52 columns';

-- Column to Mubasher ID mapping comment
COMMENT ON COLUMN egx_watchlist_full.symbol IS 'col-id: 0 - Stock symbol';
COMMENT ON COLUMN egx_watchlist_full.description IS 'col-id: 40 - Full company name';
COMMENT ON COLUMN egx_watchlist_full.last_price IS 'col-id: 1 - Last traded price';
COMMENT ON COLUMN egx_watchlist_full.open_price IS 'col-id: 2 - Opening price';
COMMENT ON COLUMN egx_watchlist_full.change IS 'col-id: 3 - Price change';
COMMENT ON COLUMN egx_watchlist_full.change_percent IS 'col-id: 4 - Percentage change';
COMMENT ON COLUMN egx_watchlist_full.bid IS 'col-id: 5 - Best bid price';
COMMENT ON COLUMN egx_watchlist_full.ask IS 'col-id: 6 - Best ask price';
COMMENT ON COLUMN egx_watchlist_full.bid_qty IS 'col-id: 9 - Bid quantity';
COMMENT ON COLUMN egx_watchlist_full.ask_qty IS 'col-id: 10 - Ask quantity';
COMMENT ON COLUMN egx_watchlist_full.volume IS 'col-id: 14 - Trading volume';
COMMENT ON COLUMN egx_watchlist_full.turnover IS 'col-id: 15 - Turnover value';
COMMENT ON COLUMN egx_watchlist_full.trades IS 'col-id: 16 - Number of trades';
COMMENT ON COLUMN egx_watchlist_full.day_high IS 'col-id: 18 - Day high price';
COMMENT ON COLUMN egx_watchlist_full.day_low IS 'col-id: 19 - Day low price';
COMMENT ON COLUMN egx_watchlist_full.vwap IS 'col-id: 41 - Volume Weighted Average Price';
COMMENT ON COLUMN egx_watchlist_full.prev_close IS 'col-id: 42 - Previous closing price';

SELECT 'EGX Watchlist Full schema created successfully' as status;
