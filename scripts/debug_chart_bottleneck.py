
import asyncio
import os
import sys
import time
from datetime import datetime

# Add backend-core to path
sys.path.append('/Users/home/Documents/Info Site/mubasher-deep-extract/backend-core')

from app.db.session import db
from app.chat.handlers.chart_handler import handle_stock_chart, fetch_ohlc_live
from dotenv import load_dotenv

load_dotenv('/Users/home/Documents/Info Site/mubasher-deep-extract/.env')

async def debug_chart():
    symbol = "SPIN"
    print(f"--- Debugging Chart for {symbol} ---")
    
    # Test fetch_ohlc_live with different URLs
    print(f"\n[Test 1] Testing fetch_ohlc_live with different URLs...")
    urls_to_test = [
        f"https://stockanalysis.com/quote/egx/{symbol.lower()}/history/",
        f"https://stockanalysis.com/egx/{symbol.lower()}/history/"
    ]
    
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        for url in urls_to_test:
            print(f"Testing URL: {url}")
            try:
                start = time.time()
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                duration = time.time() - start
                print(f"  Response: {resp.status_code} in {duration:.2f}s")
                if resp.status_code == 200:
                    print(f"  ✅ URL works!")
            except Exception as e:
                print(f"  ❌ URL Error: {e}")

    # Test full handler
    print(f"\n[Test 2] Testing handle_stock_chart...")
    if not os.getenv('DATABASE_URL'):
        print("Error: DATABASE_URL not found")
        return

    try:
        await db.connect()
        async with db._pool.acquire() as conn:
            start = time.time()
            result = await handle_stock_chart(conn, symbol, range_code='1M', language='en')
            duration = time.time() - start
            
            if result.get('success'):
                print(f"✅ Handler success in {duration:.2f}s")
                print(f"Chart data points: {len(result.get('chart', {}).get('data', []))}")
                print(f"Source: {result.get('chart', {}).get('data_source')}")
            else:
                print(f"❌ Handler FAILED in {duration:.2f}s: {result.get('message')}")
    except Exception as e:
        import traceback
        print(f"🔥 Handler CRASHED: {e}")
        traceback.print_exc()
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(debug_chart())
