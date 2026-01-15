import asyncio
import asyncpg
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def main():
    try:
        conn = await asyncpg.connect(DB_URL)
        # Custom Debug Query
        r = await conn.fetch("SELECT isin, symbol FROM yahoo_universe LIMIT 5")
        for row in r:
            print(dict(row))
            
        r2 = await conn.fetchval("SELECT COUNT(*) FROM yahoo_universe WHERE symbol IS NOT NULL AND symbol != ''")
        print(f"Count with Symbol: {r2}")
        
        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
