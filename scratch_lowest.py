import asyncio
import asyncpg
import os

async def run():
    conn = await asyncpg.connect("postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require")
    rows = await conn.fetch("SELECT date, open, high, low, close FROM ohlc_data WHERE symbol = 'COMI' ORDER BY close ASC LIMIT 30")
    print("--- LOWEST COMI VALUES ---")
    for r in rows:
        print(f"Date: {r['date']}, O: {r['open']}, H: {r['high']}, L: {r['low']}, C: {r['close']}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
