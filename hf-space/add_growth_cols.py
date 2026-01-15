
import asyncio
from app.db.session import db

async def add_cols():
    await db.connect()
    if not db._pool: return
    
    async with db._pool.acquire() as conn:
        print("Adding growth columns to stock_statistics...")
        try:
            await conn.execute("""
                ALTER TABLE stock_statistics 
                ADD COLUMN IF NOT EXISTS revenue_growth DECIMAL(10,4),
                ADD COLUMN IF NOT EXISTS profit_growth DECIMAL(10,4),
                ADD COLUMN IF NOT EXISTS eps_growth DECIMAL(10,4)
            """)
            print("✅ Columns added successfully.")
        except Exception as e:
            print(f"❌ Error adding columns: {e}")
            
    await db.close()

if __name__ == "__main__":
    asyncio.run(add_cols())
