
import os
import shutil
import asyncio
import asyncpg
from pathlib import Path

# Paths
BASE_DIR = Path("/Users/home/Documents/Info Site/mubasher-deep-extract")
SOURCE_DIR = BASE_DIR / "EGX Logos"
DEST_DIR = BASE_DIR / "frontend/public/logos"
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres") # Local Dev Port

async def main():
    print("🚀 Starting Logo Migration...")
    
    # 1. Create Destination Directory
    if not DEST_DIR.exists():
        DEST_DIR.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {DEST_DIR}")
    
    # 2. Connect to Database
    try:
        conn = await asyncpg.connect(DB_URL)
        print("✅ Connected to Database")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return

    # 3. Add Column if not exists
    try:
        await conn.execute("ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS logo_url TEXT;")
        print("✅ Database Schema Updated (logo_url column added)")
    except Exception as e:
        print(f"⚠️ Schema update warning: {e}")

    # 4. Process Logos
    files = list(SOURCE_DIR.glob("*.svg"))
    print(f"📂 Found {len(files)} logo files in source.")
    
    updated_count = 0
    
    for file_path in files:
        # Normalize filename
        symbol = file_path.stem.upper()  # e.g., 'COMI' from 'COMI.svg'
        
        # Handle special filenames if needed (e.g., matching ticker regex)
        # Assuming filenames are accurate tickers for now
        
        # Destination path
        dest_file = DEST_DIR / f"{symbol}.svg"
        
        # Copy file
        shutil.copy2(file_path, dest_file)
        
        # Public URL (relative to frontend public root)
        # Production URL structure: https://startamarkets.com/logos/SYMBOL.svg
        public_url = f"https://startamarkets.com/logos/{symbol}.svg"
        
        # Update DB
        try:
            # Only update if symbol exists
            res = await conn.execute(
                "UPDATE market_tickers SET logo_url = $1 WHERE symbol = $2",
                public_url, symbol
            )
            if "UPDATE 1" in res:
                updated_count += 1
                # print(f"   Updated {symbol}")
        except Exception as e:
            print(f"   ❌ Failed to update {symbol}: {e}")
            
    print(f"✨ Migration Complete. Updated {updated_count} stocks with logos.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
