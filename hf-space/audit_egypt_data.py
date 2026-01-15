
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
    
    symbols = ['COMI', 'ABUK', 'MFOT', 'EKHO']
    print(f'Checking {symbols}...')
    
    async with db._pool.acquire() as conn:
        for symbol in symbols:
            # Query the database
            row = await conn.fetchrow('SELECT * FROM stock_statistics WHERE symbol = $1', symbol)
            if row:
                print(f'✅ {symbol}: Data found.')
                print(f'   Altman: {row["altman_z_score"]}')
                print(f'   EV/EBIT: {row["ev_ebit"]}')
                print(f'   ROCE: {row["roce"]}')
                print(f'   Revenue Growth: {row["revenue_growth"]}')
            else:
                print(f'❌ {symbol}: No data in stock_statistics')
                
    await db.close()

if __name__ == "__main__":
    asyncio.run(check())
