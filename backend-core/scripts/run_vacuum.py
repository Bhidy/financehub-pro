import asyncio
import os
import sys
import asyncpg

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

async def run_vacuum():
    print("🚀 Starting VACUUM FULL to reclaim disk space...")
    print("⚠️  This might take a minute and will lock the intraday tables temporarily.")
    
    if not settings.DATABASE_URL:
        print("❌ Error: DATABASE_URL is not set.")
        return

    try:
        # Connect directly with asyncpg to ensure no implicit transaction wrappers
        # VACUUM cannot run inside a transaction block
        conn = await asyncpg.connect(
            dsn=settings.DATABASE_URL,
            ssl='require',
            timeout=300  # 5 minute timeout for vacuum
        )
        
        try:
            # 1. Vacuum intraday_5m
            print("🧹 Running VACUUM FULL on 'intraday_5m'...")
            # We set isolation level to ensure we are outside any transaction block if needed, 
            # though connect() usually gives a raw connection.
            await conn.execute("VACUUM FULL intraday_5m;")
            print("   ✅ VACUUM FULL 'intraday_5m' complete.")

            # 2. Vacuum intraday_1h
            print("🧹 Running VACUUM FULL on 'intraday_1h'...")
            await conn.execute("VACUUM FULL intraday_1h;")
            print("   ✅ VACUUM FULL 'intraday_1h' complete.")
            
            print("\n🎉 SUCCESS: Physical disk space should now be reclaimed.")
            
        finally:
            await conn.close()

    except Exception as e:
        print(f"\n❌ ERROR during VACUUM: {e}")
        print("   If this fails, you may need to run it in the Supabase Dashboard SQL Editor.")

if __name__ == "__main__":
    asyncio.run(run_vacuum())
