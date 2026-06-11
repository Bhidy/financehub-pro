import asyncio
import os
import sys
import asyncpg
from dotenv import load_dotenv

# Add backend-core to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend-core'))

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

async def purge_non_egx():
    print("🚀 Starting The Great Purge of Non-EGX Data...")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found!")
        return

    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connected to Database")

        # 1. Count targets
        saudi_aliases = await conn.fetchval("SELECT COUNT(*) FROM ticker_aliases WHERE market_code IS NOT NULL AND market_code <> 'EGX'")
        saudi_tickers = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE market_code <> 'EGX'")
        
        print(f"🧐 Found {saudi_aliases} non-EGX aliases")
        print(f"🧐 Found {saudi_tickers} non-EGX tickers")

        # 2. Delete Saudi Aliases
        if saudi_aliases > 0:
            print("🔥 Deleting non-EGX aliases...")
            await conn.execute("DELETE FROM ticker_aliases WHERE market_code IS NOT NULL AND market_code <> 'EGX'")
            print("✅ Deleted non-EGX aliases.")

        # 3. Delete Dependent Data (Foreign Keys)
        if saudi_tickers > 0:
            print("🔥 Deleting dependent data for non-EGX tickers...")
            # Delete from company_profiles
            await conn.execute("DELETE FROM company_profiles WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code <> 'EGX')")
            # Delete from financials
            await conn.execute("DELETE FROM financials WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code <> 'EGX')")
             # Delete from price_history (if exists)
            try:
                await conn.execute("DELETE FROM price_history WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code <> 'EGX')")
            except Exception:
                pass
            print("✅ Deleted dependent data.")

        # 4. Delete Saudi Tickers
        if saudi_tickers > 0:
            print("🔥 Deleting non-EGX tickers...")
            await conn.execute("DELETE FROM market_tickers WHERE market_code <> 'EGX'")
            print("✅ Deleted non-EGX tickers.")

        # 5. Verify
        remaining = await conn.fetchval("SELECT COUNT(*) FROM ticker_aliases WHERE market_code <> 'EGX'")
        remaining_tickers = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE market_code <> 'EGX'")
        print(f"✨ Remaining non-EGX aliases: {remaining}")
        print(f"✨ Remaining non-EGX tickers: {remaining_tickers}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(purge_non_egx())
