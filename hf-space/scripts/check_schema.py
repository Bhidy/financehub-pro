import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url: return
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        # Check table existence
        exists = await conn.fetchval("SELECT to_regclass('public.fund_aliases')")
        print(f"Table 'fund_aliases' exists: {exists}")
        
        if exists:
            cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='fund_aliases'")
            print("Columns:", [c['column_name'] for c in cols])
            
        # Check ticker_aliases constraints
        constraints = await conn.fetch("""
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE conrelid = 'public.ticker_aliases'::regclass
        """)
        print("\n--- Ticker Aliases Constraints ---")
        for c in constraints:
            print(f"{c['conname']}: {c['pg_get_constraintdef']}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
