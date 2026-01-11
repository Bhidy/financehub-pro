import asyncio
import aiohttp
import asyncpg
import json
import os
from yahooquery import search
import time

# DB Config
DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

# Headers for Yahoo Search
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

async def search_yahoo(session, query_name):
    """
    Search Yahoo for a company name. 
    Returns the first result that is an EQUITY on CAI/EGX exchange and looks like an ISIN (EGS...)
    """
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query_name}&quotesCount=5&newsCount=0"
    try:
        async with session.get(url, headers=HEADERS) as resp:
            data = await resp.json()
            if 'quotes' in data:
                for q in data['quotes']:
                    # Filter: Must be Equity, Cairo Exchange, and look like ISIN
                    sym = q.get('symbol', '')
                    exch = q.get('exchange', '')
                    if exch in ['CAI', 'EGX'] and sym.startswith('EGS') and sym.endswith('.CA'):
                        return {
                            'isin': sym,
                            'name_en': q.get('longname') or q.get('shortname') or query_name,
                            'sector': q.get('sector', 'Unknown'),
                            'industry': q.get('industry', 'Unknown'),
                            'quoteType': q.get('quoteType', 'EQUITY'),
                            'exchange': exch
                        }
    except Exception as e:
        print(f"⚠️ Search Error for {query_name}: {e}")
    return None

async def main():
    print("🚀 Starting ISIN Discovery...")
    
    # 1. Load Legacy Names
    names = []
    import glob
    
    if os.path.exists("egx_names_backup.json"):
        with open("egx_names_backup.json", "r") as f:
            names = json.load(f)
    else:
        # Load ALL batch files
        batch_files = glob.glob("hf-space/data/egx_batch*.json")
        print(f"📂 Found {len(batch_files)} batch files: {batch_files}")
        names = []
        
        for b_file in batch_files:
            try:
                with open(b_file, "r") as f:
                    raw = json.load(f)
                    if isinstance(raw, dict) and 'stocks' in raw:
                        for s in raw['stocks']:
                            name = s.get('40')
                            symbol = s.get('0')
                            if name:
                                names.append({'name': name, 'symbol': symbol})
            except Exception as e:
                print(f"⚠️ Error reading {b_file}: {e}")
            
    if not names:
        print("❌ No seed data found!")
        return

    print(f"📋 Loaded {len(names)} legacy candidates.")

    # 2. Connect DB
    conn = await asyncpg.connect(DB_URL)
    
    # 3. Discovery Loop
    connector = aiohttp.TCPConnector(ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        found = 0
        for i, item in enumerate(names):
            legacy_name = item.get('name')
            legacy_symbol = item.get('symbol', '')
            
            # Search
            match = await search_yahoo(session, legacy_name)
            
            # If fail, try searching by symbol (sometimes works if symbol is mapped)
            if not match and legacy_symbol:
                 match = await search_yahoo(session, legacy_symbol)

            if match:
                print(f"✅ Found: {legacy_name} -> {match['isin']}")
                
                # Insert to Yahoo Universe
                await conn.execute("""
                    INSERT INTO yahoo_universe (isin, symbol, name_en, sector, industry, description)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (isin) DO NOTHING
                """, match['isin'], legacy_symbol, match['name_en'], match['sector'], match['industry'], f"Legacy: {legacy_name}")
                
                found += 1
            else:
                print(f"❌ Not Found: {legacy_name}")
                
            # Rate Limit Sleep
            time.sleep(0.5) 

    print(f"🎉 Discovery Complete. Added {found}/{len(names)} ISINs.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
