import os
import asyncio
import asyncpg
import json
from datetime import datetime

# DB Config
DB_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/egx_watchlist")

async def main():
    print("⏳ Connecting to DB for Backup...")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        # specific columns needed for ISIN mapping
        rows = await conn.fetch("SELECT symbol, description FROM egx_watchlist_full")
        
        data = []
        for r in rows:
            data.append({
                "symbol": r['symbol'],
                "name": r['description']
            })
            
        print(f"✅ Fetched {len(data)} legacy symbols.")
        
        with open("egx_names_backup.json", "w") as f:
            json.dump(data, f, indent=2)
            
        print("💾 Saved to egx_names_backup.json")
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        # Fallback: Try to read from local batch file if DB fails
        if os.path.exists("hf-space/data/egx_batch1.json"):
            print("⚠️ DB Fail. Attempting partial backup from local JSON...")

if __name__ == "__main__":
    asyncio.run(main())
