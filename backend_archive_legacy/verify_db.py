import asyncio
from database import db

async def verify():
    await db.connect()
    try:
        res = await db.fetch_one("SELECT count(*) as count FROM market_tickers")
        print(f"PYTHON SEES: {res['count']}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(verify())
