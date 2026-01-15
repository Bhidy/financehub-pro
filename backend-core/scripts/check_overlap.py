import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(db_url)
    
    print("Checking if '2664' exists in market_tickers...")
    row = await conn.fetchrow("SELECT * FROM market_tickers WHERE symbol = '2664'")
    if row:
        print(f"YES: {dict(row)}")
    else:
        print("NO")
        
    print("\nChecking collision count (symbols in both tables)...")
    # Assuming symbol in market_tickers corresponds to fund_id in mutual_funds if they overlap
    rows = await conn.fetch("""
        SELECT count(*) 
        FROM market_tickers mt
        JOIN mutual_funds mf ON mt.symbol = mf.fund_id::text
    """)
    print(f"Overlap Count: {rows[0]['count']}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
