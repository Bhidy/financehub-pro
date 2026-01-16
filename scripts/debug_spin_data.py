
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

# Load env from backend-core logic (or just manually set url if known, but better to load)
# We need to point to the right .env. The user has .env in mubasher-deep-extract.
load_dotenv('/Users/home/Documents/Info Site/mubasher-deep-extract/.env')

DATABASE_URL = os.getenv('DATABASE_URL')
# Fallback to local if not set or remote if needed. 
# The user's metadata says the backend is on Hetzner but code runs locally? 
# No, code runs locally. I need to connect to the DB.
# The user's env likely has the connection string.

async def check_data():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return

    print(f"Connecting to DB...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Check Ticker
        print("\n--- Ticker Check ---")
        row = await conn.fetchrow("SELECT * FROM market_tickers WHERE symbol = 'SPIN'")
        if row:
            print(f"Found SPIN: {dict(row)}")
        else:
            print("SPIN not found in market_tickers")

        # Check Shareholders
        print("\n--- Shareholders Check ---")
        rows = await conn.fetch("SELECT * FROM major_shareholders WHERE symbol = 'SPIN'")
        if rows:
            print(f"Found {len(rows)} shareholders:")
            for r in rows:
                print(dict(r))
        else:
            print("No shareholders found for SPIN.")

        # Check OHLC (Chart)
        print("\n--- Chart Data Check ---")
        count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_data WHERE symbol = 'SPIN'")
        print(f"OHLC Rows for SPIN: {count}")
        
        await conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_data())
