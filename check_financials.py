
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

# Load env variables
load_dotenv('backend-core/.env')

async def verify_financial_sector():
    print("🚀 Verifying Financial Services Sector...")
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not set")
        return

    try:
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
        
        # 1. Check HRHO specifically
        print("\n🔍 Checking HRHO (Hermes)...")
        hrho = await conn.fetchrow("SELECT symbol, sector_name, industry FROM market_tickers WHERE symbol = 'HRHO'")
        if hrho:
            print(f"   Symbol: {hrho['symbol']}")
            print(f"   Sector: '{hrho['sector_name']}'")
            print(f"   Industry: '{hrho['industry']}'")
        else:
            print("   ❌ HRHO not found in DB!")

        # 2. Check Count of 'Financial Services'
        print("\n🔍 Counting 'Financial Services'...")
        count = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE sector_name = 'Financial Services'")
        print(f"   Exact Match Count: {count}")
        
        # 3. Check LIKE match (what the handler does)
        print("\n🔍 Testing Handler Logic (LIKE %financial services%)...")
        handler_rows = await conn.fetch("""
            SELECT symbol, sector_name FROM market_tickers 
            WHERE LOWER(sector_name) LIKE '%financial services%'
        """)
        print(f"   Handler Logic Count: {len(handler_rows)}")
        if len(handler_rows) > 0:
             print(f"   Sample: {[r['symbol'] for r in handler_rows[:5]]}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_financial_sector())
