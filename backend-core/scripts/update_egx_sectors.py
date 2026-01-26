
import pandas as pd
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

# Load env variables
load_dotenv()
# Fallback to parent .env if needed
if not os.getenv("DATABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

async def main():
    print("🚀 Starting Enterprise Sector Update...")
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ CRITICAL: DATABASE_URL not set.")
        return

    # Try multiple paths for the Excel file
    possible_paths = [
        'backend-core/data/EGX_Stocks_Sectors.xlsx',
        'data/EGX_Stocks_Sectors.xlsx',
        '/app/backend-core/data/EGX_Stocks_Sectors.xlsx',
        'EGX Stocks Sectors.xlsx',
        '../data/EGX_Stocks_Sectors.xlsx'
    ]
    
    excel_path = None
    for p in possible_paths:
        if os.path.exists(p):
            excel_path = p
            break
            
    if not excel_path:
        print(f"❌ Error: Excel file 'EGX Stocks Sectors.xlsx' not found in search paths.")
        return
        
    print(f"📂 Loading Data Source: {excel_path}")
    
    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(f"❌ Failed to read Excel: {e}")
        return

    df.columns = [c.strip() for c in df.columns]
    
    if 'Symbol' not in df.columns or 'Sector' not in df.columns:
        print(f"❌ Schema Error: Missing 'Symbol' or 'Sector' columns. Found: {df.columns}")
        return

    print(f"🔌 Connecting to Database...")
    try:
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
    except Exception as e:
        print(f"❌ DB Connection Failed: {e}")
        return
    
    # Pre-fetch existing tickers to minimize query overhead
    print("🔍 Analyzing current database state...")
    existing_tickers = await conn.fetch("SELECT symbol, sector_name FROM market_tickers")
    db_map = {r['symbol']: r['sector_name'] for r in existing_tickers}
    print(f"   -> Found {len(db_map)} tickers in DB.")
    
    updates = []
    
    print(f"🔄 Processing {len(df)} records from source...")
    
    for index, row in df.iterrows():
        symbol = str(row['Symbol']).strip().upper()
        sector = str(row['Sector']).strip()
        
        # Data Cleaning
        if not symbol or not sector or symbol.lower() == 'nan' or sector.lower() == 'nan':
            continue
            
        # Check if update is needed
        current_sector = db_map.get(symbol)
        if current_sector != sector:
            updates.append((sector, symbol))
    
    if not updates:
        print("✅ Analysis Complete: No updates required. Database is in sync.")
        await conn.close()
        return

    print(f"⚡ Applying {len(updates)} sector updates...")
    
    # Batch update
    try:
        await conn.executemany("""
            UPDATE market_tickers 
            SET sector_name = $1
            WHERE symbol = $2
        """, updates)
        print(f"✅ Successfully updated {len(updates)} stocks.")
    except Exception as e:
        print(f"❌ Batch Update Failed: {e}")
        # Fallback to individual updates
        print("⚠️ Attempting individual recovery...")
        success_count = 0
        for sector, symbol in updates:
            try:
                await conn.execute("UPDATE market_tickers SET sector_name = $1 WHERE symbol = $2", sector, symbol)
                success_count += 1
            except Exception as inner_e:
                print(f"   Failed {symbol}: {inner_e}")
        print(f"   Recovered {success_count}/{len(updates)} updates.")

    # Verify Logic ("The Forever Fix")
    print("\n🔍 Verification Sampling:")
    sample_symbols = [u[1] for u in updates[:3]]
    if sample_symbols:
        q = "SELECT symbol, sector_name FROM market_tickers WHERE symbol = ANY($1)"
        rows = await conn.fetch(q, sample_symbols)
        for r in rows:
            print(f"   - {r['symbol']}: {r['sector_name']}")

    print("-" * 40)
    print(f"✅ MISSION COMPLETE: Sector Data Synchronized.")
    print("-" * 40)
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
