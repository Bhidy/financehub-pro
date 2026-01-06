
import asyncio
import httpx
import logging
import sys
import os

# Add path to data_pipeline
sys.path.append(os.path.join(os.getcwd(), 'hf-space'))

from data_pipeline.ingest_stockanalysis import fetch_price_snapshot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_fetch():
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        print("Fetching COMI...")
        data = await fetch_price_snapshot(client, "COMI")
        print(f"Result: {data}")

if __name__ == "__main__":
    asyncio.run(test_fetch())
