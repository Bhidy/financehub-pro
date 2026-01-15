
import asyncio
from app.db.session import db

async def check_db_details():
    await db.connect()
    if not db._pool: return
    
    async with db._pool.acquire() as conn:
        db_name = await conn.fetchval("SELECT current_database()")
        schema_name = await conn.fetchval("SELECT current_schema()")
        print(f"Connected to DB: {db_name}, Schema: {schema_name}")
        
        # Check if table exists in this schema
        exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = $1 AND table_name = 'stock_statistics'
            )
        """, schema_name)
        print(f"Table 'stock_statistics' exists: {exists}")
        
        if exists:
            cols = await conn.fetch("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = $1 AND table_name = 'stock_statistics'
                AND column_name = 'revenue_growth'
            """, schema_name)
            print(f"Column 'revenue_growth' found: {len(cols) > 0}")
            
    await db.close()

if __name__ == "__main__":
    asyncio.run(check_db_details())
