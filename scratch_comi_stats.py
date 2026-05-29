import asyncio
import asyncpg

async def run():
    conn = await asyncpg.connect("postgres://postgres.kgjpkphfjmmiyjsgsaup:REDACTED_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require")
    row = await conn.fetchrow("""
        SELECT AVG(close) as avg_price, MIN(close) as min_price, MAX(close) as max_price, COUNT(*) as count
        FROM ohlc_data 
        WHERE symbol = 'COMI'
    """)
    print("--- COMI DB STATS ---")
    print(dict(row))
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
