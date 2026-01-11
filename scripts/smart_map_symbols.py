import asyncio
import asyncpg
import json
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def main():
    print("🧠 Smart Mapper: Applying Name Matching...")
    conn = await asyncpg.connect(DB_URL)
    
    # Load DB Universe
    db_rows = await conn.fetch("SELECT isin, name_en FROM yahoo_universe")
    print(f"📚 DB has {len(db_rows)} stocks.")
    
    # Load Legacy Data from JSON
    with open('hf-space/data/egx_batch1.json', 'r') as f:
        legacy_data = json.load(f)
    
    stocks = legacy_data.get('stocks', [])
    print(f"📂 JSON has {len(stocks)} legacy records.")
    
    updates = 0
    
    for item in stocks:
        legacy_sym = item.get('symbol')
        legacy_name = item.get('40') # Name key in this weird JSON
        
        if not legacy_sym or not legacy_name:
            continue
            
        # Normalize legacy name
        l_name = legacy_name.lower().replace('sae', '').replace('holding', '').replace('company', '').replace('co.', '').strip()
        
        # Find match in DB
        best_match = None
        
        for row in db_rows:
            db_isin = row['isin']
            db_name = row['name_en'] or ""
            
            d_name = db_name.lower().replace('sae', '').replace('holding', '').replace('company', '').replace('co.', '').strip()
            
            # Direct containment check
            if l_name in d_name or d_name in l_name:
                best_match = db_isin
                break
                
        if best_match:
            target_symbol = f"{legacy_sym}.CA"
            # Update
            await conn.execute("UPDATE yahoo_universe SET symbol = $1 WHERE isin = $2", target_symbol, best_match)
            # print(f"✅ Mapped {best_match} ({db_name}) -> {target_symbol}")
            updates += 1
            
    print(f"🎉 Mapped {updates} stocks via Name Matching.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
