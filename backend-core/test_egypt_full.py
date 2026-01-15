
import asyncio
import sys
import os
import httpx
import asyncpg
from datetime import datetime

# Add path to find the module
sys.path.append(os.getcwd())

from data_pipeline.ingest_stockanalysis import fetch_company_profile, fetch_historical_data

async def test_full_ingest():
    print("🚀 Testing Full StockAnalysis Ingestion (Profile + History)...")
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("❌ ERROR: DATABASE_URL not set")
        return

    pool = await asyncpg.create_pool(db_url, statement_cache_size=0)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        symbol = "EGAL"
        print(f"Testing for {symbol}...")
        
        # 1. Profile
        print("1. Fetching Profile...")
        p_res = await fetch_company_profile(pool, client, symbol)
        print(f"Profile Result: {p_res}")
        
        # 2. History
        print("2. Fetching History...")
        h_res = await fetch_historical_data(pool, client, symbol)
        print(f"History Result: {h_res} records inserted")
        
        if p_res > 0 and h_res > 0:
             print("✅ SUCCESS: Profile and History ingested")
        else:
             print("⚠️ PARTIAL/FAIL: Check logs")
             
    await pool.close()

if __name__ == "__main__":
    asyncio.run(test_full_ingest())
