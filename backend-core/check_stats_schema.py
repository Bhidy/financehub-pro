
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add app to path
sys.path.append(os.getcwd())
load_dotenv('.env')

from app.db.session import db

async def check():
    await db.connect()
    if not db._pool:
        print('Failed to connect')
        return
    
    async with db._pool.acquire() as conn:
        print('Checking stock_statistics columns...')
        rows = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'stock_statistics'
        """)
        for row in rows:
            print(f"- {row['column_name']} ({row['data_type']})")
                
    await db.close()

if __name__ == "__main__":
    asyncio.run(check())
