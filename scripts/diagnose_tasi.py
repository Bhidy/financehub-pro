import asyncio
import asyncpg
import os

DATABASE_URL = os.environ.get('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Check for TASI-like symbols
    rows = await conn.fetch("SELECT symbol, last_price, last_updated FROM market_tickers WHERE symbol ILIKE '%TASI%' OR symbol ILIKE '%INDEX%'")
    print(f"Found TASI/Index symbols: {len(rows)}")
    for r in rows:
        print(r)

    # Check weighted price calc
    w_price = await conn.fetchval("SELECT ROUND(SUM(last_price * volume) / NULLIF(SUM(volume), 0), 2) FROM market_tickers WHERE last_price IS NOT NULL AND volume > 0")
    print(f"Calculated Weighted Price (VWAP): {w_price}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
