"""
PHASE 2: CORPORATE ACTIONS - REAL DATA
Extract real dividends and splits from Yahoo Finance

Yahoo Finance provides historical corporate actions data
"""

import yfinance as yf
import asyncio
from database import db
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Saudi stocks (use the ones we already have)
SAUDI_STOCKS = [
    ('2222', 'Saudi Aramco'),
    ('1120', 'Al Rajhi Bank'),
    ('2010', 'SABIC'),
    ('1010', 'Riyad Bank'),
    ('7010', 'STC'),
    ('1150', 'Alinma Bank'),
    ('1180', 'SNB'),
    ('1050', 'Bank AlBilad'),
    ('1111', 'SABB'),
    ('4190', 'Jarir'),
    ('2050', 'Savola'),
    ('1211', 'Maaden'),
    ('2020', 'SABIC Agri'),
    ('2060', 'SIPCHEM'),
    ('2080', 'Safco'),
    ('1030', 'Alawwal Bank'),
    ('1060', 'Bank AlJazira'),
    ('2110', 'Sahara Petrochem'),
    ('4002', 'Mouwasat'),
    ('4001', 'Alhokair'),
]


async def extract_corporate_actions():
    """Extract real dividends and splits from Yahoo Finance"""
    
    logger.info("="*80)
    logger.info("🏛️ EXTRACTING REAL CORPORATE ACTIONS")
    logger.info("="*80)
    logger.info("Source: Yahoo Finance historical data\n")
    
    await db.connect()
    
    total_dividends = 0
    total_splits = 0
    
    for symbol, name in SAUDI_STOCKS:
        try:
            yahoo_symbol = f"{symbol}.SR"
            logger.info(f"📊 {symbol} ({name})...")
            
            stock = yf.Ticker(yahoo_symbol)
            
            # Get dividends
            dividends = stock.dividends
            if len(dividends) > 0:
                logger.info(f"   ✅ Found {len(dividends)} dividend payments")
                
                for date, amount in dividends.items():
                    # Store dividend
                    await db.execute("""
                        INSERT INTO corporate_actions (
                            symbol, action_type, description, amount, 
                            ex_date, announcement_date
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                    """,
                        symbol,
                        'DIVIDEND',
                        f'Cash dividend payment of {amount:.2f} SAR per share',
                        float(amount),
                        date.date(),
                        date.date()
                    )
                    total_dividends += 1
            
            # Get stock splits
            splits = stock.splits
            if len(splits) > 0:
                logger.info(f"   ✅ Found {len(splits)} stock splits")
                
                for date, ratio in splits.items():
                    # Store split
                    await db.execute("""
                        INSERT INTO corporate_actions (
                            symbol, action_type, description, amount,
                            ex_date, announcement_date
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                    """,
                        symbol,
                        'SPLIT',
                        f'Stock split {ratio:.0f}-for-1',
                        float(ratio),
                        date.date(),
                        date.date()
                    )
                    total_splits += 1
            
            await asyncio.sleep(0.5)  # Rate limiting
            
        except Exception as e:
            logger.error(f"   ❌ Error with {symbol}: {str(e)}")
    
    await db.close()
    
    logger.info("\n" + "="*80)
    logger.info("📊 CORPORATE ACTIONS EXTRACTION COMPLETE")
    logger.info("="*80)
    logger.info(f"Stocks Processed:  {len(SAUDI_STOCKS)}")
    logger.info(f"Dividends Found:   {total_dividends}")
    logger.info(f"Splits Found:      {total_splits}")
    logger.info(f"Total Events:      {total_dividends + total_splits}")
    logger.info("="*80)
    logger.info("\n✅ REAL CORPORATE ACTIONS DATA EXTRACTED!\n")


if __name__ == "__main__":
    asyncio.run(extract_corporate_actions())
