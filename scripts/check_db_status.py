import asyncio
import os
import asyncpg
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def check():
    conn = await asyncpg.connect(DATABASE_URL)
    rows = await conn.fetch('''
        SELECT count(*), 
               max(updated_at) as last_update,
               now() - max(updated_at) as age
        FROM egx_watchlist
    ''')
    print(f"Total Rows: {rows[0]['count']}")
    print(f"Last Update: {rows[0]['last_update']}")
    print(f"Age: {rows[0]['age']}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
