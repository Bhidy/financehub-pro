import asyncio
import asyncpg
import aiohttp
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def search_yahoo(session, query):
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=5&newsCount=0"
    try:
        async with session.get(url, ssl=False) as resp:
            data = await resp.json()
            if 'quotes' in data and data['quotes']:
                # Filter for Cairo exchange or .CA
                for q in data['quotes']:
                    sym = q.get('symbol', '')
                    if sym.endswith('.CA'):
                        return sym
    except Exception as e:
        pass
    return None

async def main():
    print("🕵️‍♂️ Starting Yahoo Name Search Rescue...")
    conn = await asyncpg.connect(DB_URL)
    
    # Get unmapped stocks (where symbol is same as ISIN or NULL)
    # Note: `harvest_symbols` might have left them as NULL if I killed it?
    # Or `smart_mapper` only updated 45.
    rows = await conn.fetch("""
        SELECT isin, name_en FROM yahoo_universe 
        WHERE symbol IS NULL OR symbol LIKE 'EGS%'
    """)
    print(f"🚑 Rescue Mission: {len(rows)} stocks to identify.")
    
    async with aiohttp.ClientSession() as session:
        for i, r in enumerate(rows):
            isin = r['isin']
            name = r['name_en']
            
            if not name:
                continue
                
            # Clean name
            clean_name = name.lower().replace('sae', '').replace('holding', '').replace('co.', '').strip()
            if len(clean_name) < 3: continue

            print(f"🔎 [{i+1}/{len(rows)}] Searching for: {clean_name}...")
            
            sym = await search_yahoo(session, clean_name)
            
            if sym:
                if sym == isin:
                    print(f"   ⚠️ Found same: {sym}")
                else:
                    print(f"   ✅ FOUND: {sym}")
                    await conn.execute("UPDATE yahoo_universe SET symbol = $1 WHERE isin = $2", sym, isin)
            else:
                print(f"   ❌ No match for {clean_name}")
                
            await asyncio.sleep(0.5)

    print("🎉 Rescue Mission Complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
