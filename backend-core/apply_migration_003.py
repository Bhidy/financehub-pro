
import asyncio
import os
import asyncpg

async def run_migration():
    db_url = os.environ.get("DATABASE_URL")
    print(f"Connecting to {db_url.split('@')[-1]}")
    
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    with open("app/db/migrations/003_add_missing_gaps.sql", "r") as f:
        sql = f.read()
        
    print("Executing Migration 003...")
    await conn.execute(sql)
    print("Migration Complete.")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
