
import asyncio
from app.db.session import db

async def check():
    await db.connect()
    if not db._pool: return
    async with db._pool.acquire() as conn:
        rows = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'technical_levels'")
        print([r['column_name'] for r in rows])
    await db.close()

if __name__ == "__main__":
    asyncio.run(check())
