import asyncio
import asyncpg
from yahooquery import search
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def main():
    print("🕵️‍♂️ Starting YahooQuery Rescue...")
    conn = await asyncpg.connect(DB_URL)
    
    rows = await conn.fetch("""
        SELECT isin, name_en FROM yahoo_universe 
        WHERE symbol IS NULL OR symbol LIKE 'EGS%'
    """)
    print(f"🚑 Rescue V2: {len(rows)} stocks.")
    
    count = 0
    for i, r in enumerate(rows):
        isin = r['isin']
        name = r['name_en']
        if not name or len(name) < 4: continue
        
        # clean name
        q = name.lower().replace('sae', '').replace('holding', '').replace('co.', '').strip()
        
        try:
            # print(f"Searching {q}...")
            data = search(q)
            if 'quotes' in data and data['quotes']:
                found = False
                for item in data['quotes']:
                    sym = item.get('symbol', '')
                    if sym.endswith('.CA'):
                        # Found it!
                        if sym != isin:
                            await conn.execute("UPDATE yahoo_universe SET symbol = $1 WHERE isin = $2", sym, isin)
                            print(f"✅ [{i}] Mapped {name} -> {sym}")
                            found = True
                            count += 1
                            break
                        else:
                             # It found the ISIN itself. 
                             pass
                if not found:
                    # print(f"❌ {name}: No .CA match")
                    pass
            else:
                pass
        except Exception as e:
            print(f"Error {name}: {e}")
            
    print(f"🎉 Rescue V2 Complete. Recovered {count} additional symbols.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
