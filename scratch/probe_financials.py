import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="/Users/home/Documents/Info Site/mubasher-deep-extract/.env")

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        print("--- income_statements columns and sample for 'COMI' ---")
        row_inc = await conn.fetchrow("SELECT * FROM income_statements WHERE symbol = 'COMI' LIMIT 1")
        if row_inc:
            d = dict(row_inc)
            print(f"income_statements keys: {list(d.keys())}")
            print(f"Sample data: fiscal_year={d['fiscal_year']}, period_type={d['period_type']}, revenue={d['revenue']}, operating_income={d['operating_income']}, net_income={d['net_income']}")
            
        print("\n--- balance_sheets columns and sample for 'COMI' ---")
        row_bal = await conn.fetchrow("SELECT * FROM balance_sheets WHERE symbol = 'COMI' LIMIT 1")
        if row_bal:
            d_bal = dict(row_bal)
            print(f"balance_sheets keys: {list(d_bal.keys())}")
            print(f"Sample data: fiscal_year={d_bal['fiscal_year']}, period_type={d_bal['period_type']}, total_assets={d_bal['total_assets']}, total_liabilities={d_bal['total_liabilities']}, total_equity={d_bal['total_equity']}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
