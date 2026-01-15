
import asyncio
import asyncpg
import os

async def check():
    conn = await asyncpg.connect(os.environ.get('DATABASE_URL'))
    try:
        cols = await conn.fetch("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'stock_statistics'
        """)
        print("Columns in stock_statistics:")
        for r in cols:
            print(f" - {r['column_name']}")
            
        # Try to query revenue_growth specifically
        try:
            row = await conn.fetchrow("SELECT revenue_growth FROM stock_statistics LIMIT 1")
            print("Successfully queried revenue_growth")
        except Exception as e:
            print(f"FAILED to query revenue_growth: {e}")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
