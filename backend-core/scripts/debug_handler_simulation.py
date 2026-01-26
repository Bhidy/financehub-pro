import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    print(f"Connecting to {db_url.split('@')[1] if '@' in db_url else 'DB'}...")
    
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    # Simulation Parameters
    sector_input = "financial services"
    search_terms = [f"%{sector_input}%"] # ['%financial services%']
    
    print(f"\n--- Simulating Handler for '{sector_input}' ---")
    print(f"Search Terms: {search_terms}")
    
    sql = """
        SELECT symbol, name_en, sector_name, market_code
        FROM market_tickers
        WHERE (LOWER(sector_name) LIKE ANY($1))
    """
    
    try:
        rows = await conn.fetch(sql, search_terms)
        print(f"Rows Found: {len(rows)}")
        for r in rows[:5]:
            print(f"   {r['symbol']} | {r['sector_name']} | Match? {'financial services' in r['sector_name'].lower()}")
            
    except Exception as e:
        print(f"Error: {e}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
