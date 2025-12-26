import asyncio
import asyncpg
import logging
import pandas as pd
import numpy as np
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DB_DSN = os.getenv("DB_DSN", "postgresql://home@localhost/mubasher_db")

async def calculate_metrics():
    logger.info("Starting Fund Metrics Calculation...")
    conn = await asyncpg.connect(DB_DSN)
    
    # Get all funds
    funds = await conn.fetch("SELECT fund_id FROM mutual_funds")
    logger.info(f"Processing metrics for {len(funds)} funds...")
    
    for row in funds:
        fid = row['fund_id']
        try:
            # Fetch NAV History
            navs = await conn.fetch("""
                SELECT date, nav FROM nav_history 
                WHERE fund_id = $1 
                ORDER BY date ASC
            """, fid)
            
            if not navs or len(navs) < 30:
                continue
                
            # Create DataFrame
            df = pd.DataFrame(navs, columns=['date', 'nav'])
            df['nav'] = df['nav'].astype(float)
            df['date'] = pd.to_datetime(df['date'])
            df.set_index('date', inplace=True)
            
            # Calculate Returns
            df['returns'] = df['nav'].pct_change()
            
            # Annualized Volatility (Standard Deviation)
            # Assuming 252 trading days
            volatility = df['returns'].std() * np.sqrt(252) * 100 # In percent
            
            # Sharpe Ratio
            # Assume Risk Free Rate = 4.0%
            risk_free_rate = 0.04
            mean_return = df['returns'].mean() * 252
            
            if volatility > 0:
                sharpe = (mean_return - risk_free_rate) / (volatility / 100)
            else:
                sharpe = 0
            
            # Max Drawdown
            cumulative = (1 + df['returns']).cumprod()
            peak = cumulative.cummax()
            drawdown = (cumulative - peak) / peak
            max_drawdown = drawdown.min() * 100 # In percent
            
            # Update DB
            await conn.execute("""
                UPDATE mutual_funds 
                SET 
                    standard_deviation = $1,
                    sharpe_ratio = $2
                    -- Could add max_drawdown if column exists
                WHERE fund_id = $3
            """, volatility, sharpe, fid)
            
        except Exception as e:
            logger.error(f"Error calculating {fid}: {e}")
            
    logger.info("Metrics calculation complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(calculate_metrics())
