
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def verify_data():
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found")
        return

    print(f"🔌 Connecting to DB...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    symbols = ['TMGH', 'COMI', 'SWDY', 'PHDC']
    
    print(f"\n🔍 Verifying Data for: {symbols}")
    
    for sym in symbols:
        print(f"\n--- {sym} ---")
        # Check stock_statistics
        stats = await conn.fetchrow("SELECT * FROM stock_statistics WHERE symbol = $1", sym)
        if stats:
            print(f"✅ stock_statistics: Found. Z-Score={stats.get('altman_z_score')}, EV/EBIT={stats.get('ev_ebit')}")
        else:
            print(f"❌ stock_statistics: NOT FOUND")
            
            # Check if it exists with suffix
            stats_suff = await conn.fetchrow("SELECT * FROM stock_statistics WHERE symbol = $1", f"{sym}.CA")
            if stats_suff:
                print(f"⚠️  stock_statistics: Found as {sym}.CA (Suffix Mismatch!)")
        
        # Check market_tickers
        ticker = await conn.fetchrow("SELECT symbol, market_code FROM market_tickers WHERE symbol = $1", sym)
        if ticker:
            print(f"✅ market_tickers: Found. Market={ticker['market_code']}")
        else:
            print(f"❌ market_tickers: NOT FOUND")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(verify_data())
