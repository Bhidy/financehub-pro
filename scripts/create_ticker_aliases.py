#!/usr/bin/env python3
"""
Create ticker_aliases table for Arabic + English symbol resolution.
This table maps common names, nicknames, and abbreviations to stock symbols.
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ticker_aliases (
    id SERIAL PRIMARY KEY,
    alias_text TEXT NOT NULL,
    alias_text_norm TEXT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    market_code VARCHAR(10) NOT NULL,
    priority INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alias_text_norm, market_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_alias_text_norm ON ticker_aliases(alias_text_norm);
CREATE INDEX IF NOT EXISTS idx_alias_symbol ON ticker_aliases(symbol);
"""

async def create_table():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not set")
        return False
    
    try:
        conn = await asyncpg.connect(database_url, statement_cache_size=0)
        print("📦 Creating ticker_aliases table...")
        
        await conn.execute(CREATE_TABLE_SQL)
        
        # Verify
        count = await conn.fetchval("SELECT COUNT(*) FROM ticker_aliases")
        print(f"✅ ticker_aliases table created! Current rows: {count}")
        
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(create_table())
