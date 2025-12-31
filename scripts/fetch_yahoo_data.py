#!/usr/bin/env python3
"""
FinanceHub Pro - Live Stock Price Fetcher
==========================================
Fetches REAL live stock prices from Yahoo Finance and updates the database.
Designed for GitHub Actions scheduled runs.
"""

import asyncio
import asyncpg
import os
import logging
from datetime import datetime
import sys

# Try to import yfinance, install if not available
try:
    import yfinance as yf
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yfinance"])
    import yfinance as yf

DATABASE_URL = os.environ.get('DATABASE_URL')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Saudi Stock Exchange suffix
SAUDI_SUFFIX = ".SR"


async def get_all_symbols(pool) -> list:
    """Get all stock symbols from database"""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT symbol FROM market_tickers WHERE symbol ~ '^[0-9]{4}$' ORDER BY symbol"
        )
        return [r['symbol'] for r in rows]


async def update_stock_price(pool, symbol: str, data: dict) -> bool:
    """Update a single stock's price in the database"""
    if not data:
        return False
        
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE market_tickers 
            SET 
                last_price = $2,
                change = $3,
                change_percent = $4,
                volume = $5,
                open_price = $6,
                high = $7,
                low = $8,
                prev_close = $9,
                last_updated = NOW()
            WHERE symbol = $1
        """, 
            symbol,
            data.get('last_price'),
            data.get('change'),
            data.get('change_percent'),
            data.get('volume'),
            data.get('open'),
            data.get('high'),
            data.get('low'),
            data.get('prev_close')
        )
        return True


def fetch_yahoo_data(symbol: str) -> dict:
    """Fetch live data from Yahoo Finance"""
    try:
        yahoo_symbol = f"{symbol}{SAUDI_SUFFIX}"
        ticker = yf.Ticker(yahoo_symbol)
        info = ticker.info
        
        if not info or 'regularMarketPrice' not in info:
            # Try fast_info as fallback
            fast = ticker.fast_info
            if hasattr(fast, 'last_price'):
                return {
                    'last_price': fast.last_price,
                    'prev_close': getattr(fast, 'previous_close', None),
                    'open': getattr(fast, 'open', None),
                    'high': getattr(fast, 'day_high', None),
                    'low': getattr(fast, 'day_low', None),
                    'volume': getattr(fast, 'last_volume', None),
                    'change': None,
                    'change_percent': None
                }
            return None
        
        current_price = info.get('regularMarketPrice') or info.get('currentPrice')
        prev_close = info.get('regularMarketPreviousClose') or info.get('previousClose')
        
        change = None
        change_percent = None
        if current_price and prev_close:
            change = round(current_price - prev_close, 4)
            change_percent = round((change / prev_close) * 100, 2)
        
        return {
            'last_price': current_price,
            'change': change,
            'change_percent': change_percent,
            'volume': info.get('regularMarketVolume') or info.get('volume'),
            'open': info.get('regularMarketOpen') or info.get('open'),
            'high': info.get('regularMarketDayHigh') or info.get('dayHigh'),
            'low': info.get('regularMarketDayLow') or info.get('dayLow'),
            'prev_close': prev_close
        }
        
    except Exception as e:
        logger.warning(f"Failed to fetch {symbol}: {e}")
        return None


async def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set!")
        sys.exit(1)
    
    logger.info("=" * 60)
    logger.info("    LIVE STOCK PRICE UPDATE - Starting")
    logger.info("=" * 60)
    
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        statement_cache_size=0
    )
    
    try:
        symbols = await get_all_symbols(pool)
        logger.info(f"Found {len(symbols)} symbols to update")
        
        updated = 0
        failed = 0
        
        # Process in batches to avoid rate limiting
        batch_size = 10
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i+batch_size]
            
            for symbol in batch:
                data = fetch_yahoo_data(symbol)
                if data:
                    success = await update_stock_price(pool, symbol, data)
                    if success:
                        updated += 1
                        logger.info(f"✅ {symbol}: {data['last_price']} SAR ({data['change_percent']}%)")
                    else:
                        failed += 1
                else:
                    failed += 1
            
            # Small delay between batches to avoid rate limiting
            await asyncio.sleep(1)
        
        logger.info("=" * 60)
        logger.info(f"✅ Updated: {updated} stocks")
        logger.info(f"❌ Failed: {failed} stocks")
        logger.info(f"📊 Success Rate: {(updated/(updated+failed))*100:.1f}%")
        logger.info("=" * 60)
        
        if updated == 0:
            logger.error("No stocks were updated! This is a critical failure.")
            sys.exit(1)
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
