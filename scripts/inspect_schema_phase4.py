
import asyncio
import asyncpg
import os

# Connect to local DB (mubasher_db)
DB_URL = "postgresql://home@localhost:5432/mubasher_db"

async def inspect():
    try:
        conn = await asyncpg.connect(DB_URL)
        print("✅ Connected to mubasher_db")
        
        # 1. Check Extensions (pgvector)
        print("\n🧩 Checking Extensions:")
        exts = await conn.fetch("SELECT extname FROM pg_extension")
        for ext in exts:
            print(f"- {ext['extname']}")
            
        # 2. Check Tables
        print("\n📋 Checking Tables:")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        for t in tables:
            print(f"- {t['table_name']}")
            
        # 3. Check 'users' columns if exists
        if any(t['table_name'] == 'users' for t in tables):
            print("\n👤 Checking 'users' columns:")
            cols = await conn.fetch("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users'
            """)
            for c in cols:
                print(f"- {c['column_name']} ({c['data_type']})")

        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(inspect())
