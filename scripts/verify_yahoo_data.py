import asyncio
import asyncpg
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def main():
    print(f"🔌 Connecting to {DB_URL}...")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        counts = {}
        for table in ['yahoo_universe', 'yahoo_realtime', 'yahoo_fundamentals']:
            val = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            counts[table] = val
            print(f"📊 {table}: {val} rows")
        
        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
