
import asyncio
import os
import asyncpg
from datetime import datetime

# Adjust path to find .env if needed
from dotenv import load_dotenv
load_dotenv()

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        return

    print(f"Connecting to DB...")
    conn = await asyncpg.connect(db_url)
    
    symbol = "MASR"
    print(f"Fetching data for {symbol}...")
    
    # Check Ticker
    ticker = await conn.fetchrow("SELECT * FROM market_tickers WHERE symbol = $1", symbol)
    print(f"Ticker: {dict(ticker) if ticker else 'NotFound'}")
    
    # Check Annual Income
    print("\n--- ANNUAL INCOME ---")
    rows = await conn.fetch("SELECT fiscal_year, revenue, net_income, period_type FROM income_statements WHERE symbol = $1 AND period_type = 'annual' ORDER BY fiscal_year DESC", symbol)
    for r in rows:
        print(dict(r))

    # Check Quarterly Income
    print("\n--- QUARTERLY INCOME ---")
    rows = await conn.fetch("SELECT fiscal_year, fiscal_quarter, revenue, net_income, period_type FROM income_statements WHERE symbol = $1 AND period_type = 'quarterly' ORDER BY fiscal_year DESC, fiscal_quarter DESC", symbol)
    for r in rows:
        print(dict(r))
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
