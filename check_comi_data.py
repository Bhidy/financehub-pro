
import asyncio
import asyncpg
import os

async def check_comi():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    row = await conn.fetchrow("SELECT symbol, last_price, change, change_percent, last_updated FROM market_tickers WHERE symbol = 'COMI'")
    print(dict(row))
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_comi())
