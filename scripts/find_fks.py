
import asyncio
import os
import sys
from dotenv import load_dotenv
import asyncpg

async def main():
    load_dotenv()
    dsn = os.getenv("DATABASE_URL")
    pool = await asyncpg.create_pool(dsn, statement_cache_size=0)
    
    print("🔎 Finding all tables referencing market_tickers(symbol)...")
    
    query = """
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='market_tickers';
    """
    
    rows = await pool.fetch(query)
    for r in rows:
        print(f"Table: {r['table_name']} -> Column: {r['column_name']}")
        
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
