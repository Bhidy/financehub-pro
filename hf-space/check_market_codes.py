
import asyncio
from app.db.session import db

async def check():
    await db.connect()
    if not db._pool: return
    async with db._pool.acquire() as conn:
        rows = await conn.fetch("SELECT symbol, market_code FROM market_tickers WHERE market_code IS NOT NULL LIMIT 20")
        for r in rows:
            print(f"{r['symbol']}: {r['market_code']}")
    await db.close()

if __name__ == "__main__":
    asyncio.run(check())
