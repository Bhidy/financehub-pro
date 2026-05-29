import asyncio
import asyncpg
import os

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        # Check column names of market_news table
        columns = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'market_news'
        """)
        print("Columns in market_news table:")
        for col in columns:
            print(f" - {col['column_name']}: {col['data_type']}")
            
        # Let's see some sample rows
        rows = await conn.fetch("SELECT id, symbol, headline, source_country, url FROM market_news LIMIT 5")
        print("\nSample rows:")
        for r in rows:
            print(dict(r))
            
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
