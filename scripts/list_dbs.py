import asyncio
import asyncpg
import os

# Connect to 'postgres' default DB to list others
DB_URL = "postgresql://home@localhost:5432/postgres"

async def main():
    print(f"🔌 Connecting to {DB_URL}...")
    try:
        conn = await asyncpg.connect(DB_URL)
        rows = await conn.fetch("SELECT datname FROM pg_database WHERE datistemplate = false;")
        print("📂 Available Databases:")
        for r in rows:
            print(f"- {r['datname']}")
        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
