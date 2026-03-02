import asyncio
import os
from dotenv import load_dotenv

# Load explicitly from backend-core/.env
load_dotenv(dotenv_path="/Users/home/Documents/Info Site/mubasher-deep-extract/backend-core/.env")

from app.chat.handlers.compare_handler import handle_compare_stocks
import asyncpg
import json

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
         print("NO DB URL FOUND")
         return
    print("Connecting to:", db_url)
    conn = await asyncpg.connect(db_url)
    try:
        results = {}
        
        # Test 1: PHDC vs PEERS (fallback)
        print("Testing: PHDC (expecting 3 stocks from same sector)")
        res1 = await handle_compare_stocks(conn, ["PHDC"], "en")
        print("TEST 1: headers ->", res1.get("comparison_table", {}).get("headers", []))
        
        print("Testing: PHDC vs JUFO (user forced cross-sector)")
        res2 = await handle_compare_stocks(conn, ["PHDC", "JUFO"], "en")
        print("TEST 2: headers ->", res2.get("comparison_table", {}).get("headers", []))
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
