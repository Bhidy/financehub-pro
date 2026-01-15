
import asyncio
import httpx
import sys
import os

# Add path to find the module
sys.path.append(os.getcwd())

from data_pipeline.ingest_stockanalysis import fetch_price_snapshot

async def test_fetch():
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    async with httpx.AsyncClient(headers=headers) as client:
        print("Fetching EGAL (Egypt Aluminum)...")
        data = await fetch_price_snapshot(client, "EGAL")
        print(f"Result: {data}")
        
        if data and data['last_price'] > 0:
            print("✅ SUCCESS: Price fetched")
        else:
            print("❌ FAILURE: No price found")

if __name__ == "__main__":
    asyncio.run(test_fetch())
