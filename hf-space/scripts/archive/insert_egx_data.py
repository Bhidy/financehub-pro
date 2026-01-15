#!/usr/bin/env python3
"""
EGX Watchlist Data Insertion Script - Updated for 37-Column Structure
Inserts extracted stock data from Rubix Mubasher into database.

Updated Column Mapping (37 columns):
- 0: Symbol, 1: Last, 2: Open, 3: Chg, 4: %Chg
- 5: Bid, 6: Ask, 7: Day Range, 9: Bid Qty, 10: Ask Qty
- 11: Currency, 12: Last Qty, 13: Trend, 14: Volume, 15: Turnover
- 16: Trades, 17: Bid/Ask, 18: High, 19: Low, 21: Min, 22: Max
- 23: Total Bid Qty, 24: Total Ask Qty, 30: 52Wk Range, 33: Time
- 34: L.T. Price, 37: Market, 40: Description, 41: VWAP, 42: Prev Close
- 50: Last Auction Price
"""

import os
import sys
import json
import asyncio
import asyncpg
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Updated column mapping for 37-column structure
COL_MAP = {
    '0': 'symbol',
    '1': 'last_price',
    '2': 'open_price',
    '3': 'change',
    '4': 'change_percent',
    '5': 'bid',
    '6': 'ask',
    '7': 'day_range_pct',
    '9': 'bid_qty',
    '10': 'ask_qty',
    '11': 'currency',
    '12': 'last_qty',
    '14': 'volume',
    '15': 'turnover',
    '16': 'trades',
    '17': 'bid_ask_spread',
    '18': 'day_high',
    '19': 'day_low',
    '21': 'limit_min',
    '22': 'limit_max',
    '23': 'total_bid_qty',
    '24': 'total_ask_qty',
    '30': 'week_52_range',
    '33': 'last_trade_time',
    '34': 'lt_price',
    '37': 'market',
    '40': 'description',
    '41': 'vwap',
    '42': 'prev_close',
    '50': 'last_auction_price',
}

NUMERIC_FIELDS = {
    'last_price', 'open_price', 'change', 'change_percent', 'bid', 'ask',
    'bid_qty', 'ask_qty', 'last_qty', 'volume', 'turnover', 'trades',
    'bid_ask_spread', 'day_high', 'day_low', 'limit_min', 'limit_max',
    'total_bid_qty', 'total_ask_qty', 'lt_price', 'vwap', 'prev_close',
    'last_auction_price'
}

def parse_number(value: str) -> float | None:
    """Parse a numeric value from string, handling commas, percentages, and dashes."""
    if not value or value in ('--', '-', '', 'N/A'):
        return None
    try:
        clean = value.replace(',', '').replace('%', '').strip()
        return float(clean)
    except (ValueError, TypeError):
        return None

def transform_row(raw_data: dict) -> dict:
    """Transform raw extracted data to database-ready format."""
    result = {'symbol': raw_data.get('symbol')}
    
    for col_id, value in raw_data.items():
        if col_id == 'symbol':
            continue
            
        field_name = COL_MAP.get(col_id)
        if not field_name or not value or value in ('-', '--'):
            continue
            
        if field_name in NUMERIC_FIELDS:
            result[field_name] = parse_number(value)
        else:
            result[field_name] = value.strip() if isinstance(value, str) else value
    
    return result

async def create_schema(conn):
    """Create/update the egx_watchlist table schema."""
    schema_sql = """
    DROP TABLE IF EXISTS egx_watchlist CASCADE;
    
    CREATE TABLE egx_watchlist (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        description TEXT,
        last_price DECIMAL(12,4),
        open_price DECIMAL(12,4),
        change DECIMAL(12,4),
        change_percent DECIMAL(8,4),
        bid DECIMAL(12,4),
        ask DECIMAL(12,4),
        bid_qty BIGINT,
        ask_qty BIGINT,
        last_qty BIGINT,
        volume BIGINT,
        trades INTEGER,
        turnover DECIMAL(18,2),
        day_high DECIMAL(12,4),
        day_low DECIMAL(12,4),
        limit_min DECIMAL(12,4),
        limit_max DECIMAL(12,4),
        total_bid_qty BIGINT,
        total_ask_qty BIGINT,
        vwap DECIMAL(12,4),
        prev_close DECIMAL(12,4),
        lt_price DECIMAL(12,4),
        last_auction_price DECIMAL(12,4),
        bid_ask_spread DECIMAL(12,4),
        day_range_pct VARCHAR(20),
        week_52_range VARCHAR(50),
        last_trade_time VARCHAR(20),
        market VARCHAR(50),
        currency VARCHAR(10) DEFAULT 'EGP',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_egx_watchlist_symbol ON egx_watchlist(symbol);
    CREATE INDEX idx_egx_watchlist_volume ON egx_watchlist(volume DESC NULLS LAST);
    CREATE INDEX idx_egx_watchlist_change_pct ON egx_watchlist(change_percent DESC NULLS LAST);
    CREATE INDEX idx_egx_watchlist_updated ON egx_watchlist(updated_at DESC);
    """
    await conn.execute(schema_sql)
    print("✓ Schema recreated with updated 37-column structure")

async def insert_stock(conn, row: dict) -> bool:
    """Insert or update a single stock row."""
    try:
        await conn.execute("""
            INSERT INTO egx_watchlist (
                symbol, description, last_price, open_price, change, change_percent,
                bid, ask, bid_qty, ask_qty, last_qty, volume, trades, turnover,
                day_high, day_low, limit_min, limit_max, total_bid_qty, total_ask_qty,
                vwap, prev_close, lt_price, last_auction_price, bid_ask_spread,
                day_range_pct, week_52_range, last_trade_time, market, currency
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
            )
            ON CONFLICT (symbol) DO UPDATE SET
                description = COALESCE(EXCLUDED.description, egx_watchlist.description),
                last_price = COALESCE(EXCLUDED.last_price, egx_watchlist.last_price),
                open_price = COALESCE(EXCLUDED.open_price, egx_watchlist.open_price),
                change = COALESCE(EXCLUDED.change, egx_watchlist.change),
                change_percent = COALESCE(EXCLUDED.change_percent, egx_watchlist.change_percent),
                bid = COALESCE(EXCLUDED.bid, egx_watchlist.bid),
                ask = COALESCE(EXCLUDED.ask, egx_watchlist.ask),
                bid_qty = COALESCE(EXCLUDED.bid_qty, egx_watchlist.bid_qty),
                ask_qty = COALESCE(EXCLUDED.ask_qty, egx_watchlist.ask_qty),
                last_qty = COALESCE(EXCLUDED.last_qty, egx_watchlist.last_qty),
                volume = COALESCE(EXCLUDED.volume, egx_watchlist.volume),
                trades = COALESCE(EXCLUDED.trades, egx_watchlist.trades),
                turnover = COALESCE(EXCLUDED.turnover, egx_watchlist.turnover),
                day_high = COALESCE(EXCLUDED.day_high, egx_watchlist.day_high),
                day_low = COALESCE(EXCLUDED.day_low, egx_watchlist.day_low),
                limit_min = COALESCE(EXCLUDED.limit_min, egx_watchlist.limit_min),
                limit_max = COALESCE(EXCLUDED.limit_max, egx_watchlist.limit_max),
                total_bid_qty = COALESCE(EXCLUDED.total_bid_qty, egx_watchlist.total_bid_qty),
                total_ask_qty = COALESCE(EXCLUDED.total_ask_qty, egx_watchlist.total_ask_qty),
                vwap = COALESCE(EXCLUDED.vwap, egx_watchlist.vwap),
                prev_close = COALESCE(EXCLUDED.prev_close, egx_watchlist.prev_close),
                lt_price = COALESCE(EXCLUDED.lt_price, egx_watchlist.lt_price),
                last_auction_price = COALESCE(EXCLUDED.last_auction_price, egx_watchlist.last_auction_price),
                bid_ask_spread = COALESCE(EXCLUDED.bid_ask_spread, egx_watchlist.bid_ask_spread),
                day_range_pct = COALESCE(EXCLUDED.day_range_pct, egx_watchlist.day_range_pct),
                week_52_range = COALESCE(EXCLUDED.week_52_range, egx_watchlist.week_52_range),
                last_trade_time = COALESCE(EXCLUDED.last_trade_time, egx_watchlist.last_trade_time),
                market = COALESCE(EXCLUDED.market, egx_watchlist.market),
                currency = COALESCE(EXCLUDED.currency, egx_watchlist.currency),
                updated_at = NOW()
        """,
            row.get('symbol'),
            row.get('description'),
            row.get('last_price'),
            row.get('open_price'),
            row.get('change'),
            row.get('change_percent'),
            row.get('bid'),
            row.get('ask'),
            int(row['bid_qty']) if row.get('bid_qty') else None,
            int(row['ask_qty']) if row.get('ask_qty') else None,
            int(row['last_qty']) if row.get('last_qty') else None,
            int(row['volume']) if row.get('volume') else None,
            int(row['trades']) if row.get('trades') else None,
            row.get('turnover'),
            row.get('day_high'),
            row.get('day_low'),
            row.get('limit_min'),
            row.get('limit_max'),
            int(row['total_bid_qty']) if row.get('total_bid_qty') else None,
            int(row['total_ask_qty']) if row.get('total_ask_qty') else None,
            row.get('vwap'),
            row.get('prev_close'),
            row.get('lt_price'),
            row.get('last_auction_price'),
            row.get('bid_ask_spread'),
            row.get('day_range_pct'),
            row.get('week_52_range'),
            row.get('last_trade_time'),
            row.get('market'),
            row.get('currency', 'EGP')
        )
        return True
    except Exception as e:
        print(f"  ✗ Error inserting {row.get('symbol')}: {e}")
        return False

async def main():
    """Main entry point."""
    json_file = None
    recreate_schema = '--recreate' in sys.argv or '--fresh' in sys.argv
    
    for arg in sys.argv[1:]:
        if arg.endswith('.json'):
            json_file = arg
        elif arg.startswith('--json-file='):
            json_file = arg.split('=')[1]
    
    if not json_file:
        json_file = str(Path(__file__).parent.parent / 'data' / 'egx_batch1.json')
    
    if not os.path.exists(json_file):
        print(f"ERROR: JSON file not found: {json_file}")
        return
    
    print(f"Loading data from: {json_file}")
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    stocks = data.get('stocks', [])
    print(f"Found {len(stocks)} stocks to insert")
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    print("Connecting to database...")
    conn = await asyncpg.connect(database_url)
    
    try:
        if recreate_schema:
            await create_schema(conn)
        
        success_count = 0
        error_count = 0
        
        for raw_row in stocks:
            row = transform_row(raw_row)
            if not row.get('symbol'):
                continue
            
            if await insert_stock(conn, row):
                success_count += 1
                desc = row.get('description', 'N/A')[:40]
                print(f"  ✓ {row['symbol']}: {desc}")
            else:
                error_count += 1
        
        print(f"\n{'='*60}")
        print(f"INSERTION COMPLETE")
        print(f"  Successful: {success_count}")
        print(f"  Errors: {error_count}")
        print(f"{'='*60}")
        
        count = await conn.fetchval("SELECT COUNT(*) FROM egx_watchlist")
        print(f"\nTotal records in egx_watchlist: {count}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
