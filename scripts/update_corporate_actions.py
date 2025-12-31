#!/usr/bin/env python3
"""
Corporate Actions Update Script (Yahoo Finance API)
===================================================
Extracts dividends and splits using Yahoo Finance API.
Much faster and more reliable than scraping.
"""

import asyncio
import asyncpg
import os
import ssl
import logging
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import sys

# Configuration
DATABASE_URL = os.environ.get('DATABASE_URL')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def get_ssl_context():
    """Create SSL context for Supabase connection"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context


async def get_all_symbols(pool):
    rows = await pool.fetch("SELECT symbol FROM market_tickers WHERE symbol ~ '^[0-9]{4}$' ORDER BY symbol")
    return [r['symbol'] for r in rows] # List of "1120", "1150" etc.


async def process_batch(pool, symbols):
    """Process a batch of symbols using yfinance batch downloading (if possible) or iteration"""
    
    # yfinance dividends are best accessed per-ticker or via Tickers object
    # We will iterate but use the detailed checking
    
    for symbol in symbols:
        try:
            yf_ticker = f"{symbol}.SR"
            ticker = yf.Ticker(yf_ticker)
            
            # Fetch Dividends
            divs = ticker.dividends
            if not divs.empty:
                # Filter for recent ones (last 30 days) to avoid re-processing full history every day
                # But for robustness, we can process last 1 year or all if upsert handles it
                recent_divs = divs[divs.index > (datetime.now() - timedelta(days=90))]
                
                for date, amount in recent_divs.items():
                    await upsert_action(pool, symbol, 'DIVIDEND', date.date(), float(amount), {"source": "Yahoo"})
                    
            # Fetch Splits
            splits = ticker.splits
            if not splits.empty:
                recent_splits = splits[splits.index > (datetime.now() - timedelta(days=90))]
                for date, ratio in recent_splits.items():
                    await upsert_action(pool, symbol, 'SPLIT', date.date(), None, {"ratio": float(ratio), "source": "Yahoo"})
            
            # Note: Rights issues not directly available in standard yf.dividends/splits usually
            
            logger.info(f"✅ {symbol}: Checked successfully")
            
        except Exception as e:
            logger.warning(f"⚠️ {symbol}: Failed to fetch - {e}")
        
        # Small sleep to be nice to API
        await asyncio.sleep(0.1)


async def upsert_action(pool, symbol, action_type, ex_date, amount, raw_data):
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO corporate_actions 
                (symbol, action_type, ex_date, dividend_amount, raw_data)
                VALUES ($1, $2, $3, $4, $5::jsonb)
                ON CONFLICT (symbol, action_type, ex_date) 
                DO UPDATE SET dividend_amount = EXCLUDED.dividend_amount
            """, symbol, action_type, ex_date, amount, str(raw_data).replace("'", '"'))
    except Exception as e:
        logger.error(f"DB Error {symbol}: {e}")


async def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set!")
        sys.exit(1)

    # Robust DB connection
    pool = None
    try:
        pool = await asyncpg.create_pool(DATABASE_URL, ssl=get_ssl_context(), min_size=1, max_size=3, statement_cache_size=0)
        logger.info("✅ Connected to Database")
    except:
        try:
            pool = await asyncpg.create_pool(DATABASE_URL, ssl='require', min_size=1, max_size=3, statement_cache_size=0)
            logger.info("✅ Connected to Database (fallback)")
        except:
            logger.error("❌ Failed to connect to DB")
            sys.exit(1)

    try:
        symbols = await get_all_symbols(pool)
        logger.info(f"Checking actions for {len(symbols)} stocks using Yahoo Finance API...")
        
        # Determine batch to process (could be all, or rotating)
        # For now, process ALL because API is fast
        
        await process_batch(pool, symbols)
        
        logger.info("🎉 Corporate Actions Update Complete")
            
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
