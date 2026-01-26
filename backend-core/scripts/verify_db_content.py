import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not set")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    # Check HRHO specifically
    print("\n--- HRHO Check ---")
    row = await conn.fetchrow("SELECT symbol, name_en, sector_name, market_code FROM market_tickers WHERE symbol = 'HRHO'")
    if row:
        print(f"Symbol: {row['symbol']}")
        print(f"Name: {row['name_en']}")
        print(f"Sector: '{row['sector_name']}'")  # Quotes to see spaces
        print(f"Market Code: {row['market_code']}")
    else:
        print("HRHO not found")

    # Check Sector Counts
    print("\n--- Sector Counts ---")
    rows = await conn.fetch("SELECT sector_name, COUNT(*) as count FROM market_tickers GROUP BY sector_name ORDER BY count DESC")
    for r in rows:
        print(f"'{r['sector_name']}': {r['count']}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
