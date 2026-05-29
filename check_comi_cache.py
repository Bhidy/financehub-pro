import asyncio
import asyncpg
import os
import json

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        # Fetch from yahoo_cache for COMI
        row = await conn.fetchrow("SELECT symbol, profile_data, financial_data, history_data FROM yahoo_cache WHERE symbol = 'COMI'")
        if row:
            print("Found cache row for COMI!")
            if row['history_data']:
                history = json.loads(row['history_data'])
                print(f"Total rows in cache history: {len(history)}")
                
                # Check for low prices
                anomalies = [h for h in history if h.get('close') is not None and float(h['close']) < 15.0]
                print(f"Found {len(anomalies)} anomalies (price < 15.0) in yahoo_cache for COMI:")
                for a in anomalies:
                    print(f"  Date: {a.get('date')}, O: {a.get('open')}, H: {a.get('high')}, L: {a.get('low')}, C: {a.get('close')}")
            else:
                print("Cache history_data is empty")
        else:
            print("No cache row found for COMI")
            
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
