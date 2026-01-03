#!/usr/bin/env python3
"""
Add performance indexes for chatbot queries.
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

INDEXES_SQL = """
-- OHLC data: fast lookup by symbol + date range
CREATE INDEX IF NOT EXISTS idx_ohlc_symbol_date ON ohlc_data(symbol, date DESC);

-- Dividend history: fast lookup by symbol + date
CREATE INDEX IF NOT EXISTS idx_div_symbol_date ON dividend_history(symbol, ex_date DESC);

-- Financial statements: fast lookup for latest by symbol
CREATE INDEX IF NOT EXISTS idx_fin_symbol_period ON financial_statements(symbol, period_type, fiscal_year DESC);

-- Market tickers: sector queries and top movers
CREATE INDEX IF NOT EXISTS idx_tickers_sector ON market_tickers(sector_name);
CREATE INDEX IF NOT EXISTS idx_tickers_change ON market_tickers(change_percent DESC);
CREATE INDEX IF NOT EXISTS idx_tickers_market ON market_tickers(market_code);

-- Company profiles
CREATE INDEX IF NOT EXISTS idx_profiles_symbol ON company_profiles(symbol);

-- Stock statistics
CREATE INDEX IF NOT EXISTS idx_stats_symbol ON stock_statistics(symbol);
"""

async def add_indexes():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not set")
        return False
    
    try:
        conn = await asyncpg.connect(database_url, statement_cache_size=0)
        print("📇 Adding chatbot performance indexes...")
        
        # Execute each index separately to handle if some already exist
        for line in INDEXES_SQL.strip().split('\n'):
            line = line.strip()
            if line and not line.startswith('--'):
                try:
                    await conn.execute(line)
                    index_name = line.split('INDEX IF NOT EXISTS ')[1].split(' ')[0] if 'INDEX IF NOT EXISTS' in line else 'unknown'
                    print(f"  ✅ {index_name}")
                except Exception as e:
                    print(f"  ⚠️ {line[:50]}... ({e})")
        
        # Verify indexes exist
        indexes = await conn.fetch("""
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_%'
            ORDER BY indexname
        """)
        print(f"\n📋 Total indexes with 'idx_' prefix: {len(indexes)}")
        
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(add_indexes())
