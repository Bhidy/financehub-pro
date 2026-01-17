
import asyncio
import os
import asyncpg

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        symbol = 'COMI'
        # Check Income Statement
        rows = await conn.fetch("SELECT fiscal_year, period_ending, revenue FROM income_statements WHERE symbol = $1 AND period_type = 'annual' ORDER BY fiscal_year DESC", symbol)
        print(f"{symbol} Income Statements:")
        for r in rows:
             print(f"Year: {r['fiscal_year']}, Period Ending: {r['period_ending']}, Revenue: {r['revenue']}")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
