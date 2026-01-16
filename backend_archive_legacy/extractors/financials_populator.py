import asyncio
import random
from datetime import datetime, timedelta
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FinancialsPopulator")

async def run():
    await db.connect()
    try:
        tickers = await db.fetch_all("SELECT symbol FROM market_tickers")
        logger.info(f"Generating financials for {len(tickers)} tickers...")
        
        for t in tickers:
            symbol = t['symbol']
            
            # Generate 4 Years of Annual Data
            for i in range(4):
                year = 2024 - i
                revenue = random.uniform(10_000_000_000, 500_000_000_000)
                net_income = revenue * random.uniform(0.10, 0.30)
                
                await db.execute("""
                    INSERT INTO financial_statements 
                    (symbol, period_type, fiscal_year, end_date, revenue, net_income, total_assets, total_liabilities, cash_flow_operating)
                    VALUES ($1, 'FY', $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (symbol, fiscal_year, period_type) DO NOTHING
                """, symbol, year, datetime(year, 12, 31), revenue, net_income, revenue * 4, revenue * 2, net_income * 1.2)
                
        logger.info("✅ Financials Generated.")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(run())
