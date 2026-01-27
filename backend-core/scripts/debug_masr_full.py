
import asyncio
import os
import asyncpg
from decimal import Decimal

# Adjust path to find .env if needed
from dotenv import load_dotenv
load_dotenv()

def p(d):
    # filtered dict print
    return {k: float(v) if isinstance(v, Decimal) else v for k, v in d.items() if v is not None}

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    symbol = "MASR"
    
    print("\n--- QUARTERLY INCOME (FULL) ---")
    rows = await conn.fetch("SELECT * FROM income_statements WHERE symbol = $1 AND period_type = 'quarterly' ORDER BY fiscal_year DESC, fiscal_quarter DESC LIMIT 8", symbol)
    for r in rows:
        print(f"{r['fiscal_year']} Q{r['fiscal_quarter']}: {p(dict(r))}")

    print("\n--- QUARTERLY BALANCE (FULL) ---")
    rows = await conn.fetch("SELECT * FROM balance_sheets WHERE symbol = $1 AND period_type = 'quarterly' ORDER BY fiscal_year DESC, fiscal_quarter DESC LIMIT 8", symbol)
    for r in rows:
        print(f"{r['fiscal_year']} Q{r['fiscal_quarter']}: {p(dict(r))}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
