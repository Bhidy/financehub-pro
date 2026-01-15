import asyncio
import asyncpg
import os

# DB_URL env var or default
DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def main():
    print(f"🔌 Connecting to {DB_URL}...")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        with open("hf-space/scripts/yahoo_schema.sql", "r") as f:
            sql = f.read()
            
        print("⚡ Executing Schema Update...")
        await conn.execute(sql)
        print("✅ Yahoo Core Schema Applied Successfully.")
        
        await conn.close()
    except Exception as e:
        print(f"❌ Schema Update Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
