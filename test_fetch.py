import sys
import os
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), "backend-core"))
from app.chat.handlers.chart_handler import fetch_ohlc_live

async def test():
    res = await fetch_ohlc_live("TMGH", 200)
    print(f"Total points fetched: {len(res) if res else 0}")
    if res:
        print(f"Earliest: {res[0]['time']}, Latest: {res[-1]['time']}")

if __name__ == "__main__":
    asyncio.run(test())
