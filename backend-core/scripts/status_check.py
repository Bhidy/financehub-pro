
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def main():
    try:
        conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
        
        funds = await conn.fetchval("SELECT count(*) FROM mutual_funds")
        disclosures = await conn.fetchval("SELECT count(*) FROM fund_disclosures")
        investments = await conn.fetchval("SELECT count(*) FROM fund_investments")
        peers = await conn.fetchval("SELECT count(*) FROM fund_peers")
        actions = await conn.fetchval("SELECT count(*) FROM fund_actions")
        
        print("--- 📊 EGYPT FUNDS EXTRACTION STATUS 📊 ---")
        print(f"Funds (Total):      {funds}")
        print(f"Disclosures Found:  {disclosures}")
        print(f"Investments Found:  {investments}")
        print(f"Peer Relations:     {peers}")
        print(f"Corp. Actions:      {actions}")
        print("-------------------------------------------")
        
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
