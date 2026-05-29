import asyncio
import asyncpg
import os

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        symbol = 'COMI'
        # Fetch count
        count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_data WHERE symbol = $1", symbol)
        print(f"Total rows in ohlc_data for {symbol}: {count}")
        
        # Fetch lowest close price rows
        rows = await conn.fetch("SELECT date, open, high, low, close, volume FROM ohlc_data WHERE symbol = $1 ORDER BY close ASC LIMIT 10", symbol)
        print("\nLowest 10 close prices in DB:")
        for r in rows:
            print(f"Date: {r['date']}, O: {r['open']}, H: {r['high']}, L: {r['low']}, C: {r['close']}, V: {r['volume']}")
            
        # Fetch highest close price rows
        rows = await conn.fetch("SELECT date, open, high, low, close, volume FROM ohlc_data WHERE symbol = $1 ORDER BY close DESC LIMIT 10", symbol)
        print("\nHighest 10 close prices in DB:")
        for r in rows:
            print(f"Date: {r['date']}, O: {r['open']}, H: {r['high']}, L: {r['low']}, C: {r['close']}, V: {r['volume']}")
            
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
