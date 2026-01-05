
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def check_profile():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        # Check market_tickers for name
        ticker = await conn.fetchrow("SELECT symbol, name_en, name_ar FROM market_tickers WHERE symbol = 'SWDY'")
        if ticker:
            print(f"✅ SWDY Ticker Found: {dict(ticker)}")
        else:
            print("❌ SWDY Ticker NOT FOUND")

        # Check company_profiles presence
        profile = await conn.fetchrow("SELECT symbol FROM company_profiles WHERE symbol = 'SWDY'")
        if profile:
            print(f"✅ SWDY Profile Found")
        else:
            print("❌ SWDY Profile NOT FOUND")
            
        # check if The United Bank exists
        row2 = await conn.fetchrow("SELECT symbol, name_en FROM market_tickers WHERE name_en ILIKE '%United Bank%'")
        if row2:
            print(f"⚠️ United Bank Found: {dict(row2)}")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_profile())
