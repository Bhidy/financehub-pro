import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def check_fin_hist():
    url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    
    row = await conn.fetchrow("SELECT count(*) FROM financial_history WHERE symbol = 'COMI'")
    print(f"Financial History Rows for COMI: {row['count']}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_fin_hist())
