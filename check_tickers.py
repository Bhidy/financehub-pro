
import asyncio
import os
import asyncpg

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        count = await conn.fetchval("SELECT count(*) FROM market_tickers WHERE market_code = 'EGX'")
        print(f"EGX Tickers Count: {count}")
        
        # Sample
        rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code = 'EGX' LIMIT 5")
        print("Samples:", [r['symbol'] for r in rows])
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
