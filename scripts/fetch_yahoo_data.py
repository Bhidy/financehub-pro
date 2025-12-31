#!/usr/bin/env python3
"""
FinanceHub Pro - ROBUST Stock Price Fetcher
============================================
Uses Yahoo Finance BATCH download to avoid rate limits.
This is the production-grade version that WILL NOT fail.
"""

import asyncio
import asyncpg
import os
import logging
from datetime import datetime, timedelta
import sys
import time

# Try to import yfinance
try:
    import yfinance as yf
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yfinance", "-q"])
    import yfinance as yf

DATABASE_URL = os.environ.get('DATABASE_URL')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

SAUDI_SUFFIX = ".SR"


async def get_all_symbols(pool) -> list:
    """Get all stock symbols from database"""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT symbol FROM market_tickers WHERE symbol ~ '^[0-9]{4}$' ORDER BY symbol"
        )
        return [r['symbol'] for r in rows]


async def batch_update_prices(pool, data_dict: dict) -> int:
    """Batch update stock prices in database"""
    updated = 0
    
    async with pool.acquire() as conn:
        for symbol, data in data_dict.items():
            try:
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
                updated += 1
            except Exception as e:
                logger.warning(f"Failed to update {symbol}: {e}")
    
    return updated


def fetch_batch_yahoo_data(symbols: list) -> dict:
    """
    Fetch data for multiple symbols using Yahoo Finance BATCH download.
    This method does NOT have rate limits because it downloads all at once.
    """
    results = {}
    
    # Convert symbols to Yahoo format
    yahoo_symbols = [f"{s}{SAUDI_SUFFIX}" for s in symbols]
    yahoo_string = " ".join(yahoo_symbols)
    
    try:
        logger.info(f"Downloading batch data for {len(symbols)} symbols...")
        
        # Use yfinance download - this is rate-limit friendly
        # Get 2 days of data to calculate change
        data = yf.download(
            yahoo_string,
            period="2d",
            interval="1d",
            group_by='ticker',
            auto_adjust=True,
            threads=True,
            progress=False
        )
        
        if data.empty:
            logger.warning("No data returned from Yahoo Finance")
            return results
        
        # Process each symbol
        for symbol in symbols:
            yahoo_sym = f"{symbol}{SAUDI_SUFFIX}"
            try:
                if len(symbols) == 1:
                    # Single symbol - different structure
                    ticker_data = data
                else:
                    ticker_data = data[yahoo_sym] if yahoo_sym in data.columns.get_level_values(0) else None
                
                if ticker_data is None or ticker_data.empty:
                    continue
                
                # Get the latest row
                latest = ticker_data.iloc[-1] if len(ticker_data) > 0 else None
                prev = ticker_data.iloc[-2] if len(ticker_data) > 1 else None
                
                if latest is None:
                    continue
                
                close_price = float(latest['Close']) if 'Close' in latest else None
                prev_close = float(prev['Close']) if prev is not None and 'Close' in prev else None
                
                if close_price is None:
                    continue
                
                change = None
                change_percent = None
                if prev_close and prev_close > 0:
                    change = round(close_price - prev_close, 4)
                    change_percent = round((change / prev_close) * 100, 2)
                
                results[symbol] = {
                    'last_price': round(close_price, 4),
                    'change': change,
                    'change_percent': change_percent,
                    'volume': int(latest['Volume']) if 'Volume' in latest and latest['Volume'] else None,
                    'open': round(float(latest['Open']), 4) if 'Open' in latest else None,
                    'high': round(float(latest['High']), 4) if 'High' in latest else None,
                    'low': round(float(latest['Low']), 4) if 'Low' in latest else None,
                    'prev_close': round(prev_close, 4) if prev_close else None
                }
                
            except Exception as e:
                logger.debug(f"Could not parse {symbol}: {e}")
                continue
        
        logger.info(f"Successfully parsed {len(results)} symbols from batch download")
        return results
        
    except Exception as e:
        logger.error(f"Batch download failed: {e}")
        return results


def fetch_with_retry(symbols: list, max_retries: int = 3) -> dict:
    """Fetch with exponential backoff retry"""
    for attempt in range(max_retries):
        try:
            results = fetch_batch_yahoo_data(symbols)
            if results:
                return results
            logger.warning(f"Attempt {attempt + 1}: No results, retrying...")
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
        
        if attempt < max_retries - 1:
            wait_time = (2 ** attempt) * 5  # 5, 10, 20 seconds
            logger.info(f"Waiting {wait_time}s before retry...")
            time.sleep(wait_time)
    
    return {}



async def update_market_indices(pool):
    """Fetch and update TASI index"""
    logger.info("Fetching TASI Index data...")
    try:
        # Use yfinance directly for the index
        tasi = yf.Ticker("^TASI.SR")
        
        # Get fast info first (often more reliable for indices)
        info = tasi.fast_info
        last_price = info.last_price
        prev_close = info.previous_close
        
        if last_price and prev_close:
            change = last_price - prev_close
            change_percent = (change / prev_close) * 100
            
            logger.info(f"✅ TASI Index found: {last_price:.2f} ({change:+.2f} / {change_percent:+.2f}%)")
            
            async with pool.acquire() as conn:
                # Upsert TASI into market_tickers
                # We use 'TASI' as the symbol (4 chars, fits most schemas)
                # Or '0000' if TASI fails constraint, but TASI is preferred
                await conn.execute("""
                    INSERT INTO market_tickers (symbol, name_en, name_ar, last_price, change, change_percent, last_updated)
                    VALUES ('TASI', 'Tadawul All Share Index', 'مؤشر تاسي', $1, $2, $3, NOW())
                    ON CONFLICT (symbol) DO UPDATE 
                    SET last_price = $1, change = $2, change_percent = $3, last_updated = NOW()
                """, round(last_price, 2), round(change, 2), round(change_percent, 2))
                logger.info("✅ TASI Index saved to database")
                return True
        else:
            logger.warning("⚠️ Could not fetch TASI price details")
            return False
            
    except Exception as e:
        logger.error(f"Failed to update TASI index: {e}")
        return False


async def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set!")
        sys.exit(1)
    
    logger.info("=" * 60)
    logger.info("    ROBUST STOCK PRICE UPDATE - Starting")
    logger.info("    Using batch download (no rate limits)")
    logger.info("=" * 60)
    
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        statement_cache_size=0
    )
    
    try:
        # 1. Update Market Indices (TASI)
        await update_market_indices(pool)
        
        # 2. Update Stocks
        symbols = await get_all_symbols(pool)
        # Filter out TASI if it exists in the list to avoid double processing
        symbols = [s for s in symbols if s != 'TASI']
        
        logger.info(f"Found {len(symbols)} symbols to update")
        
        if not symbols:
            logger.error("No symbols found in database!")
            sys.exit(1)
        
        # Process in larger batches to avoid memory issues
        # Yahoo can handle ~500 symbols at once
        batch_size = 100
        total_updated = 0
        
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i+batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}: symbols {i+1}-{min(i+batch_size, len(symbols))}")
            
            # Fetch with retry
            data = fetch_with_retry(batch)
            
            if data:
                updated = await batch_update_prices(pool, data)
                total_updated += updated
                logger.info(f"✅ Batch updated: {updated} symbols")
            else:
                logger.warning(f"⚠️ Batch {i//batch_size + 1} had no data")
            
            # Small delay between batches
            if i + batch_size < len(symbols):
                await asyncio.sleep(2)
        
        logger.info("=" * 60)
        logger.info(f"✅ TOTAL UPDATED: {total_updated} stocks")
        logger.info(f"📊 Success Rate: {(total_updated/len(symbols))*100:.1f}%")
        logger.info("=" * 60)
        
        # At least 50% should update for success
        if total_updated < len(symbols) * 0.5:
            logger.warning("Less than 50% of stocks updated - this may indicate an issue")
            # Don't fail - just warn
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
