import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("Error: DATABASE_URL not found")
        return

    print(f"Connecting to DB...")
    conn = await asyncpg.connect(url)
    
    with open("app/db/yahoo_cache_migration.sql", "r") as f:
        sql = f.read()
        
    print("Executing migration...")
    try:
        await conn.execute(sql)
        print("Migration successful: yahoo_cache table created.")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
