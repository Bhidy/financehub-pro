
import asyncio
import os
import asyncpg

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        symbol = 'AALR'
        # Check Income Statement
        rows = await conn.fetch("SELECT fiscal_year, period_ending, revenue, ebitda, ebitda_margin FROM income_statements WHERE symbol = $1 AND period_type = 'annual' ORDER BY fiscal_year DESC", symbol)
        print("AALR Income Statements:")
        for r in rows:
            print(f"Year: {r['fiscal_year']}, Period Ending: {r['period_ending']}, Revenue: {r['revenue']}, EBITDA: {r['ebitda']}, EBITDA Margin: {r['ebitda_margin']}")

        # Check Ratios
        r_row = await conn.fetchrow("SELECT enterprise_value, debt_ebitda, debt_equity FROM financial_ratios_history WHERE symbol = $1 ORDER BY fiscal_year DESC LIMIT 1", symbol)
        print(f"Latest Enterprise Value: {r_row['enterprise_value']}")
        print(f"Latest Debt/EBITDA: {r_row['debt_ebitda']}")
        print(f"Latest Debt/Equity: {r_row['debt_equity']}")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
