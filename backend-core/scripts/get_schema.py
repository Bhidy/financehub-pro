
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    cols = await conn.fetch("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'mutual_funds'
        ORDER BY ordinal_position
    """)
    
    print("mutual_funds COLUMNS:")
    for c in cols:
        print(f"  {c['column_name']} ({c['data_type']})")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
