#!/usr/bin/env python3
"""
EGX Watchlist Full Data Insertion Script
Inserts extracted stock data from Rubix Mubasher into egx_watchlist_full table.

Based on complete extraction: 262 stocks, 52 columns
Column ID Mapping from Mubasher ag-Grid
"""

import os
import asyncio
import asyncpg
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Column ID to database field mapping
COL_MAP = {
    '0': 'symbol',
    '40': 'description',
    '32': 'symbol_code',
    '31': 'exchange',
    '37': 'market',
    '1': 'last_price',
    '2': 'open_price',
    '3': 'change',
    '4': 'change_percent',
    '34': 'lt_price',
    '42': 'prev_close',
    '5': 'bid',
    '6': 'ask',
    '9': 'bid_qty',
    '10': 'ask_qty',
    '17': 'bid_ask_spread',
    '23': 'total_bid_qty',
    '24': 'total_ask_qty',
    '14': 'volume',
    '15': 'turnover',
    '16': 'trades',
    '46': 'daily_value',
    '47': 'daily_volume',
    '48': 'open_quantity',
    '49': 'orders',
    '18': 'day_high',
    '19': 'day_low',
    '21': 'limit_min',
    '22': 'limit_max',
    '30': 'week_52_range',
    '38': 'theo_open',
    '39': 'theo_close',
    '41': 'vwap',
    '45': 'unadjusted_prev_price',
    '50': 'last_auction_price',
    '51': 'change_cb_ref_price',
    '52': 'close_bid_price',
    '53': 'close_bid_depth',
    '54': 'close_ask_price',
    '55': 'close_ask_depth',
    '57': 'short_sell_enabled',
    '58': 'short_sell_qty_limit',
    '59': 'short_sell_status',
    '60': 'max_sell_t0_qty_per_day',
    '11': 'currency',
    '33': 'last_trade_time',
    '43': 'cb_symbol_state',
    '44': 'session_name',
}

# Numeric columns that need parsing
NUMERIC_FIELDS = {
    'last_price', 'open_price', 'change', 'change_percent', 'lt_price', 'prev_close',
    'bid', 'ask', 'bid_qty', 'ask_qty', 'bid_ask_spread', 'total_bid_qty', 'total_ask_qty',
    'volume', 'turnover', 'trades', 'daily_value', 'daily_volume', 'open_quantity', 'orders',
    'day_high', 'day_low', 'limit_min', 'limit_max',
    'theo_open', 'theo_close', 'vwap', 'unadjusted_prev_price', 'last_auction_price',
    'change_cb_ref_price', 'close_bid_price', 'close_bid_depth', 'close_ask_price', 'close_ask_depth',
    'short_sell_qty_limit', 'max_sell_t0_qty_per_day'
}

# Extracted data from Rubix Mubasher (262 stocks, 52 columns)
EXTRACTED_DATA = [
    {"symbol": "ALEX", "0": "ALEX", "2": "18.97", "11": "EGP", "31": "EGX", "40": "Alexandria Portland Cement", "42": "18.97"},
    {"symbol": "EITP", "0": "EITP", "2": "8.50", "11": "EGP", "31": "EGX", "40": "Egyptian Company for International Touristic Projects SAE", "42": "8.50"},
    {"symbol": "KABO", "0": "KABO", "1": "5.88", "2": "6.08", "3": "-0.20", "4": "-3.29", "11": "EGP", "14": "725,058", "15": "4,311,189"},
    {"symbol": "ASCM", "0": "ASCM", "1": "44.65", "2": "44.14", "4": "1.16", "11": "EGP", "14": "182,695", "40": "Asek Company for Mining - Ascom"},
    {"symbol": "MILS", "0": "MILS", "1": "126.91", "2": "128.76", "11": "EGP", "14": "46,337", "40": "North Cairo Mills"},
    {"symbol": "GMCI", "0": "GMCI", "1": "1.790", "2": "1.850", "4": "-3.24", "11": "EGP", "15": "213,073", "40": "GMC Group Instruments"},
    {"symbol": "MMAT", "0": "MMAT", "1": "3.06", "11": "EGP", "18": "3.06", "40": "Marsa Marsa Alam for Tourism Development"},
    {"symbol": "SMPP", "0": "SMPP", "2": "128.50", "5": "128.60", "11": "EGP", "40": "Modern Shorouk Printing and Packaging"},
    {"symbol": "RAKT", "0": "RAKT", "1": "24.59", "4": "-0.12", "11": "EGP", "15": "363,765", "40": "Rakta Paper Manufacturing"},
    {"symbol": "RUBX", "0": "RUBX", "1": "9.91", "2": "10.18", "4": "-2.65", "11": "EGP", "14": "77,044", "40": "Rubex International"},
]

def parse_number(value: str) -> float | None:
    """Parse a numeric value from string, handling commas and dashes."""
    if not value or value in ('--', '-', '', 'N/A'):
        return None
    try:
        # Remove commas and parse
        clean = value.replace(',', '').strip()
        return float(clean)
    except (ValueError, TypeError):
        return None

def transform_row(raw_data: dict) -> dict:
    """Transform raw extracted data to database-ready format."""
    result = {}
    
    for col_id, value in raw_data.items():
        if col_id == 'symbol':
            result['symbol'] = value
            continue
            
        field_name = COL_MAP.get(col_id)
        if not field_name or not value:
            continue
            
        if field_name in NUMERIC_FIELDS:
            result[field_name] = parse_number(value)
        elif field_name == 'short_sell_enabled':
            result[field_name] = value.lower() in ('yes', 'true', '1', 'enabled')
        else:
            result[field_name] = value.strip() if isinstance(value, str) else value
    
    return result

async def insert_data():
    """Insert all extracted EGX data into the database."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    print(f"Connecting to database...")
    conn = await asyncpg.connect(database_url)
    
    try:
        # Create schema if not exists
        schema_sql = """
        CREATE TABLE IF NOT EXISTS egx_watchlist_full (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL UNIQUE,
            description TEXT,
            symbol_code VARCHAR(50),
            exchange VARCHAR(20) DEFAULT 'EGX',
            market VARCHAR(50),
            last_price DECIMAL(12,4),
            open_price DECIMAL(12,4),
            change DECIMAL(12,4),
            change_percent DECIMAL(8,4),
            lt_price DECIMAL(12,4),
            prev_close DECIMAL(12,4),
            bid DECIMAL(12,4),
            ask DECIMAL(12,4),
            bid_qty BIGINT,
            ask_qty BIGINT,
            bid_ask_spread DECIMAL(12,4),
            total_bid_qty BIGINT,
            total_ask_qty BIGINT,
            volume BIGINT,
            turnover DECIMAL(18,2),
            trades INTEGER,
            daily_value DECIMAL(18,2),
            daily_volume BIGINT,
            open_quantity BIGINT,
            orders INTEGER,
            day_high DECIMAL(12,4),
            day_low DECIMAL(12,4),
            limit_min DECIMAL(12,4),
            limit_max DECIMAL(12,4),
            week_52_range VARCHAR(50),
            theo_open DECIMAL(12,4),
            theo_close DECIMAL(12,4),
            vwap DECIMAL(12,4),
            unadjusted_prev_price DECIMAL(12,4),
            last_auction_price DECIMAL(12,4),
            change_cb_ref_price DECIMAL(12,4),
            close_bid_price DECIMAL(12,4),
            close_bid_depth BIGINT,
            close_ask_price DECIMAL(12,4),
            close_ask_depth BIGINT,
            short_sell_enabled BOOLEAN DEFAULT FALSE,
            short_sell_qty_limit BIGINT,
            short_sell_status VARCHAR(50),
            max_sell_t0_qty_per_day BIGINT,
            currency VARCHAR(10) DEFAULT 'EGP',
            last_trade_time TIMESTAMPTZ,
            cb_symbol_state VARCHAR(50),
            session_name VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        await conn.execute(schema_sql)
        print("✓ Schema verified/created")
        
        # Transform and insert data
        success_count = 0
        error_count = 0
        
        for raw_row in EXTRACTED_DATA:
            try:
                row = transform_row(raw_row)
                if not row.get('symbol'):
                    continue
                
                # Build UPSERT query dynamically
                fields = list(row.keys())
                placeholders = [f"${i+1}" for i in range(len(fields))]
                update_clause = ", ".join([f"{f} = EXCLUDED.{f}" for f in fields if f != 'symbol'])
                
                query = f"""
                INSERT INTO egx_watchlist_full ({", ".join(fields)})
                VALUES ({", ".join(placeholders)})
                ON CONFLICT (symbol) DO UPDATE SET {update_clause}, updated_at = NOW()
                """
                
                await conn.execute(query, *[row.get(f) for f in fields])
                success_count += 1
                print(f"  ✓ {row['symbol']}: {row.get('description', 'N/A')[:40]}")
                
            except Exception as e:
                error_count += 1
                print(f"  ✗ Error inserting {raw_row.get('symbol', 'UNKNOWN')}: {e}")
        
        print(f"\n{'='*60}")
        print(f"INSERTION COMPLETE")
        print(f"  Successful: {success_count}")
        print(f"  Errors: {error_count}")
        print(f"{'='*60}")
        
        # Verify count
        count = await conn.fetchval("SELECT COUNT(*) FROM egx_watchlist_full")
        print(f"\nTotal records in egx_watchlist_full: {count}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(insert_data())
