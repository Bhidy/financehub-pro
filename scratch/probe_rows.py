import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="/Users/home/Documents/Info Site/mubasher-deep-extract/.env")

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        print("--- Rows with symbol 'COMI' ---")
        rows = await conn.fetch("SELECT symbol, date, close FROM ohlc_data WHERE symbol = 'COMI' ORDER BY date DESC LIMIT 10")
        for r in rows:
            print(dict(r))
            
        print("\n--- Rows with symbol 'COMI.CA' ---")
        rows_ca = await conn.fetch("SELECT symbol, date, close FROM ohlc_data WHERE symbol = 'COMI.CA' ORDER BY date DESC LIMIT 10")
        for r in rows_ca:
            print(dict(r))
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
