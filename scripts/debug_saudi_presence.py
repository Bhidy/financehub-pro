
import asyncio
import os
import sys
from dotenv import load_dotenv
import asyncpg

async def main():
    load_dotenv()
    dsn = os.getenv("DATABASE_URL")
    
    # FIX: Disable statement cache to avoid pgbouncer errors
    pool = await asyncpg.create_pool(dsn, statement_cache_size=0)
    
    print("--- Checking for 4340 in market_tickers ---")
    rows = await pool.fetch("SELECT * FROM market_tickers WHERE symbol = '4340' OR symbol LIKE '%4340%'")
    for r in rows:
        print(f"Found: {r['symbol']} | Market: {r['market_code']} | Name: {r['name_en']}")

    print("\n--- Checking ticker_aliases for Al Rajhi ---")
    rows = await pool.fetch("SELECT * FROM ticker_aliases WHERE alias_text ILIKE '%Rajhi%'")
    for r in rows:
        print(f"Alias: {r['alias_text']} -> Symbol: {r['symbol']}")
        
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
