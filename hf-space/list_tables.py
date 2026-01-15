
import asyncio
from app.db.session import db

async def list_tables():
    await db.connect()
    if not db._pool: return
    
    async with db._pool.acquire() as conn:
        tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        print("Tables in public schema:")
        for t in tables:
            print(f"- {t['table_name']}")
    await db.close()

if __name__ == "__main__":
    asyncio.run(list_tables())
