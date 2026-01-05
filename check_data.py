
import asyncio
import os
import sys
import asyncpg

# DB Config from env or hardcoded for the script (assuming env is set or I can use local credentials)
# Since I am in the user environment, I can try to connect to the production DB if I have credentials, 
# but usually I only have local access. 
# However, the user said "data backing... in the database". 
# The local and production DBs might be different. 
# I will query the *production* API to check coverage indirectly if I can't hit the DB. 
# But wait, I can use the run_command to run a script that connects using the env vars *if* they are set in the exported env.
# The previous `export $(grep ...)` suggests we have env vars.

async def check_coverage():
    try:
        # PGPASSWORD is usually needed
        dsn = os.environ.get("DATABASE_URL")
        if not dsn:
            print("No DATABASE_URL found.")
            return

        conn = await asyncpg.connect(dsn)
        
        tables = ['technical_levels', 'major_shareholders', 'fair_values', 'financial_ratios_extended', 'company_profiles']
        
        print("--- Table Row Counts ---")
        for t in tables:
            try:
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {t}")
                print(f"{t}: {count}")
            except Exception as e:
                print(f"{t}: Error ({e})")
        
        # Check specific coverage for CIB (COMI) and SWDY
        print("\n--- Specific Stock Coverage (COMI, SWDY) ---")
        for symbol in ['COMI', 'SWDY']:
            print(f"Checking {symbol}:")
            for t in tables:
                try:
                    c = await conn.fetchval(f"SELECT COUNT(*) FROM {t} WHERE symbol = $1", symbol)
                    print(f"  - {t}: {c}")
                except:
                    pass
        
        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.run_until_complete(check_coverage())
