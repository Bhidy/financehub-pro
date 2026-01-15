import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("No DATABASE_URL found")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        print("--- Stock Coverage (market_tickers) ---")
        total_stocks = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE market_code='EGX'")
        missing_ar_stocks = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE market_code='EGX' AND name_ar IS NULL")
        print(f"Total EGX Stocks: {total_stocks}")
        print(f"Missing Arabic Names: {missing_ar_stocks} ({missing_ar_stocks/total_stocks*100:.1f}%)")
        
        print("\n--- Fund Coverage (mutual_funds) ---")
        # Check if table has name_ar
        columns = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'mutual_funds'")
        col_names = [r['column_name'] for r in columns]
        print(f"Columns: {col_names}")
        
        total_funds = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds WHERE market_code='EGX'")
        print(f"Total EGX Funds: {total_funds}")
        
        if 'name_ar' in col_names:
            missing_ar_funds = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds WHERE market_code='EGX' AND name_ar IS NULL")
            print(f"Missing Arabic Names: {missing_ar_funds}")
        else:
            print("WARNING: 'name_ar' column NOT FOUND in mutual_funds")

        print("\n--- Sample Fund Data ---")
        rows = await conn.fetch("SELECT fund_id, fund_name, fund_name_en FROM mutual_funds WHERE market_code='EGX' LIMIT 10")
        for r in rows:
            print(f"ID: {r['fund_id']}")
            print(f"  Name (Native): {r['fund_name']}")
            print(f"  Name (EN): {r['fund_name_en']}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
