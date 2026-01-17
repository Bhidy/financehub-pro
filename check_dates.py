
import asyncio
import os
import asyncpg

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        # Check Period Ending population
        print("Checking Period Ending population...")
        
        # Count total rows
        total = await conn.fetchval("SELECT count(*) FROM income_statements")
        # Count rows with period_ending
        with_period = await conn.fetchval("SELECT count(*) FROM income_statements WHERE period_ending IS NOT NULL")
        
        print(f"Total Income Rows: {total}")
        print(f"Rows with Period Ending: {with_period}")
        print(f"Missing Period Ending: {total - with_period}")
        
        # Check specific stocks
        for sym in ['SEIGA', 'CIEB', 'SWDY', 'HRHO']:
            row = await conn.fetchrow("SELECT count(*) as cnt, count(period_ending) as with_pe FROM income_statements WHERE symbol = $1", sym)
            print(f"{sym}: Total {row['cnt']}, With Date {row['with_pe']}")
            
            if row['with_pe'] == 0 and row['cnt'] > 0:
                print(f"   WARNING: {sym} has data but NO dates!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
