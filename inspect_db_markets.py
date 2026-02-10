
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

async def inspect_db():
    print("Connecting to DB...")
    # Use robust connection params from environment or defaults if needed
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        print("Error: DATABASE_URL not set")
        return

    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    try:
        print("\n--- Market Codes ---")
        rows = await conn.fetch("SELECT DISTINCT market_code FROM market_tickers")
        for r in rows:
            print(f"Code: {r['market_code']}")

        print("\n--- Sample Stocks (EGX) ---")
        rows = await conn.fetch("SELECT symbol, name_en, sector_name FROM market_tickers WHERE market_code = 'EGX' LIMIT 5")
        for r in rows:
            print(f"{r['symbol']}: {r['name_en']} ({r['sector_name']})")

        print("\n--- Sample Stocks (Non-EGX) ---")
        rows = await conn.fetch("SELECT symbol, name_en, market_code FROM market_tickers WHERE market_code != 'EGX' LIMIT 5")
        for r in rows:
            print(f"{r['symbol']} ({r['market_code']})")

        print("\n--- Checking for Specific Saudi Stocks ---")
        # Check common Saudi tickers like 1120 (Al Rajhi) or 2222 (Aramco)
        rows = await conn.fetch("SELECT symbol, name_en, market_code FROM market_tickers WHERE symbol IN ('1120', '2222', '1120.SR', '2222.SR')")
        for r in rows:
            print(f"Found: {r['symbol']} ({r['market_code']}) - {r['name_en']}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(inspect_db())
