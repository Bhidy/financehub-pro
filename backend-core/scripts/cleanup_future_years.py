
import asyncio
import os
import asyncpg

# Adjust path to find .env if needed
from dotenv import load_dotenv
load_dotenv()

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    print("cleaning up future years > 2026...")
    tables = [
        "income_statements",
        "balance_sheets",
        "cashflow_statements",
        "financial_ratios_history"
    ]
    
    for table in tables:
        # Check count first
        rows = await conn.fetch(f"SELECT symbol, fiscal_year FROM {table} WHERE fiscal_year > 2026")
        if rows:
            print(f"Found {len(rows)} rows in {table} with year > 2026:")
            for r in rows[:5]:
                print(f"  {r['symbol']} {r['fiscal_year']}")
            
            # Delete
            res = await conn.execute(f"DELETE FROM {table} WHERE fiscal_year > 2026")
            print(f"Deleted: {res}")
        else:
            print(f"No future rows in {table}")
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
