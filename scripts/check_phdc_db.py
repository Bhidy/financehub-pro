
import asyncio
import os
import asyncpg
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DB_Check")

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("No DATABASE_URL")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        row = await conn.fetchrow("SELECT symbol, last_price, change, change_percent, last_updated FROM market_tickers WHERE symbol = 'PHDC'")
        if row:
            print(f"\n--- PHDC in DB ---")
            print(f"Symbol: {row['symbol']}")
            print(f"Price: {row['last_price']}")
            print(f"Change: {row['change']}")
            print(f"Pct: {row['change_percent']}")
            print(f"Updated: {row['last_updated']}")
        else:
            print("PHDC not found in DB")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
