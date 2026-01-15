
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    print("Clearing disclosures for EGYAFMDHB...")
    # Get fund_id
    fund_id = await conn.fetchval("SELECT fund_id FROM mutual_funds WHERE symbol = 'EGYAFMDHB'")
    if fund_id:
        await conn.execute("DELETE FROM fund_disclosures WHERE fund_id = $1", fund_id)
        print("✅ Cleared.")
    else:
        print("⚠️ Fund not found.")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
