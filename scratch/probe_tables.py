import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="/Users/home/Documents/Info Site/mubasher-deep-extract/.env")

async def main():
    db_url = os.environ.get("DATABASE_URL")
    print(f"DATABASE_URL is set: {bool(db_url)}")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        # Check both ohlc_data and ohlc_history
        count_data = await conn.fetchval("SELECT COUNT(*) FROM ohlc_data WHERE symbol = 'COMI'")
        print(f"COMI count in ohlc_data: {count_data}")
        
        try:
            count_hist = await conn.fetchval("SELECT COUNT(*) FROM ohlc_history WHERE symbol = 'COMI'")
            print(f"COMI count in ohlc_history: {count_hist}")
        except Exception as e:
            print(f"Error checking ohlc_history: {e}")
            
        # Let's check a few records of ohlc_data to see columns
        row = await conn.fetchrow("SELECT * FROM ohlc_data LIMIT 1")
        if row:
            print(f"ohlc_data keys: {dict(row).keys()}")
            
        try:
            row_hist = await conn.fetchrow("SELECT * FROM ohlc_history LIMIT 1")
            if row_hist:
                print(f"ohlc_history keys: {dict(row_hist).keys()}")
        except Exception as e:
            print(f"ohlc_history table access error: {e}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
