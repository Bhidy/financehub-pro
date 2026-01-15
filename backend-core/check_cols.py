
import asyncio
from app.db.session import db

async def check_cols():
    await db.connect()
    if not db._pool:
        print("No pool")
        return
    
    async with db._pool.acquire() as conn:
        cols = await conn.fetch("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'stock_statistics'
        """)
        print("Columns in stock_statistics:")
        for r in cols:
            print(f"- {r['column_name']}")
            
    await db.close()

if __name__ == "__main__":
    asyncio.run(check_cols())
