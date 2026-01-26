
import pandas as pd
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

# Load env variables from parent directory if needed, or current
load_dotenv()

# Also load from .env in backend-core if running from there
if not os.getenv("DATABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        # Try to construct it or ask user?
        # Assuming it's in the environment or .env
        print("❌ DATABASE_URL not set. Please ensure .env is loaded.")
        return

    excel_path = '/Users/home/Documents/Info Site/mubasher-deep-extract/EGX Stocks Sectors.xlsx'
    print(f"📂 Reading Excel: {excel_path}")
    
    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(f"❌ Failed to read Excel: {e}")
        return

    # Normalize column names just in case
    df.columns = [c.strip() for c in df.columns]
    
    if 'Symbol' not in df.columns or 'Sector' not in df.columns:
        print(f"❌ Missing required columns. Found: {df.columns}")
        return

    print(f"🔌 Connecting to DB...")
    try:
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
    except Exception as e:
        print(f"❌ Failed to connect to DB: {e}")
        return
    
    print(f"🔄 Processing {len(df)} rows...")
    
    updated_count = 0
    not_found_count = 0
    errors = 0
    
    # Prepare prepared statement for speed
    # We update sector_name. We will also set industry to match sector if industry is NULL, or maybe just leave it.
    # User said: "that table will include sectors ... chatbot should show the stocks sectors correctly"
    # I will strictly update sector_name.
    
    # Check if we should nullify industry to avoid confusion? 
    # For FWRY, Industry was "Computer Processing...". Sector was NULL.
    # If I set Sector="IT...", FWRY will have both.
    # The chatbot looks at BOTH.
    # If I don't look at name, and FWRY has Sector="IT...", and I search for "Bank", "IT" won't match.
    # So FWRY is fixed.
    
    for index, row in df.iterrows():
        symbol = str(row['Symbol']).strip()
        sector = str(row['Sector']).strip()
        
        # Skip empty rows
        if not symbol or not sector or symbol.lower() == 'nan':
            continue
            
        try:
            print(f"   -> Updating {symbol} to {sector}...")
            # We match by symbol. 
            # We force update sector_name.
            # Use format() to avoid prepared statement issues if any linger, though cache_size=0 fixes most.
            # But simple execute with vars is fine with cache_size=0
            result = await conn.execute("""
                UPDATE market_tickers 
                SET sector_name = $1
                WHERE symbol = $2
            """, sector, symbol)
            
            if result == "UPDATE 1":
                updated_count += 1
            else:
                not_found_count += 1
                # print(f"⚠️ Stock not found: {symbol}")
                
        except Exception as e:
            print(f"❌ Error updating {symbol}: {e}")
            errors += 1

    print("-" * 40)
    print(f"✅ Import Complete")
    print(f"   Updated: {updated_count}")
    print(f"   Not Match: {not_found_count}")
    print(f"   Errors: {errors}")
    print("-" * 40)
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
