import asyncio
import os
import json
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def check_cache():
    url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    
    row = await conn.fetchrow("SELECT symbol, profile_data, financial_data, last_updated FROM yahoo_cache WHERE symbol = 'COMI'")
    if row:
        print(f"Symbol: {row['symbol']}, Last Updated: {row['last_updated']}")
        print("--- Profile Data ---")
        item = json.loads(row['profile_data'])
        print(json.dumps(item, indent=2))
        
        # print("--- Financial Data ---")
        # fund = json.loads(row['financial_data'])
        # print(json.dumps(fund, indent=2))
    else:
        print("COMI not found in yahoo_cache")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_cache())
