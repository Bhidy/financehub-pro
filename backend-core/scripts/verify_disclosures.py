
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    rows = await conn.fetch('''
        SELECT d.disclosure_date, d.title, d.file_url 
        FROM fund_disclosures d
        JOIN mutual_funds f ON d.fund_id = f.fund_id
        WHERE f.symbol = 'EGYAFMDHB'
        ORDER BY d.disclosure_date DESC
    ''')
    
    print(f"Found {len(rows)} disclosures for EGYAFMDHB:")
    for r in rows:
        print(f" - {r['disclosure_date']}: {r['title']} ({r['file_url']})")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
