import asyncio
import os
import asyncpg

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set")
        return

    try:
        conn = await asyncpg.connect(db_url)
        rows = await conn.fetch("SELECT DISTINCT sector_name FROM market_tickers WHERE market_code = 'EGX' ORDER BY sector_name")
        print("\n--- EGX SECTORS ---")
        for r in rows:
            print(f"'{r['sector_name']}'")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
