
import asyncio
import asyncpg
import os
from datetime import datetime

async def check_comi_ohlc():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    
    # Get range
    range_row = await conn.fetchrow("""
        SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count 
        FROM ohlc_data 
        WHERE symbol = 'COMI'
    """)
    
    # Get last 5 rows to see structure
    latest_rows = await conn.fetch("""
        SELECT date, close FROM ohlc_data 
        WHERE symbol = 'COMI' 
        ORDER BY date DESC 
        LIMIT 5
    """)
    
    print("--- COMI OHLC DATA STATS ---")
    print(f"Min Date: {range_row['min_date']}")
    print(f"Max Date: {range_row['max_date']}")
    print(f"Total Records: {range_row['count']}")
    
    print("\n--- LATEST 5 RECORDS ---")
    for row in latest_rows:
        print(f"{row['date']}: {row['close']}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_comi_ohlc())
