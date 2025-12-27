#!/usr/bin/env python3
"""
REAL YAHOO FINANCE DATA COLLECTOR
==================================
Fetches authentic historical OHLC data from Yahoo Finance for all Saudi stocks.
Yahoo Finance uses .SR suffix for Saudi (Tadawul) stocks.

Target: Replace synthetic data with real historical data
"""

import asyncio
import asyncpg
import yfinance as yf
import pandas as pd
import logging
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import time

# Configuration
DATABASE_URL = "postgresql://postgres.kgjpkphfjmmiyjsgsaup:DgYNreqd4S7YLF6R@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('yahoo_data_collection.log')
    ]
)
logger = logging.getLogger(__name__)


def fetch_yahoo_ohlc(symbol: str, period: str = "5y") -> pd.DataFrame:
    """
    Fetch historical OHLC data from Yahoo Finance.
    Saudi stocks use .SR suffix (e.g., 2222.SR for Aramco)
    """
    yahoo_symbol = f"{symbol}.SR"
    
    try:
        ticker = yf.Ticker(yahoo_symbol)
        df = ticker.history(period=period)
        
        if df.empty:
            logger.warning(f"No data returned for {yahoo_symbol}")
            return pd.DataFrame()
        
        # Reset index to get date as column
        df = df.reset_index()
        
        # Rename columns to match our schema
        df = df.rename(columns={
            'Date': 'time',
            'Open': 'open',
            'High': 'high',
            'Low': 'low',
            'Close': 'close',
            'Volume': 'volume'
        })
        
        # Add symbol
        df['symbol'] = symbol
        
        # Select only needed columns
        df = df[['time', 'symbol', 'open', 'high', 'low', 'close', 'volume']]
        
        # Convert timestamp to Python datetime (timezone-naive for asyncpg)
        df['time'] = pd.to_datetime(df['time']).dt.tz_localize(None)
        
        return df
        
    except Exception as e:
        logger.error(f"Error fetching {yahoo_symbol}: {e}")
        return pd.DataFrame()


async def main():
    print()
    print("╔" + "═" * 68 + "╗")
    print("║" + " YAHOO FINANCE REAL DATA COLLECTOR ".center(68) + "║")
    print("║" + " Fetching authentic historical data for Saudi stocks ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")
    print()
    
    # Connect to database
    logger.info("Connecting to database...")
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        statement_cache_size=0
    )
    
    stats = {
        'processed': 0,
        'success': 0,
        'failed': 0,
        'rows_added': 0,
        'start_time': datetime.now()
    }
    
    try:
        # Get all symbols
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT symbol FROM market_tickers ORDER BY symbol"
            )
            symbols = [r['symbol'] for r in rows]
        
        logger.info(f"Found {len(symbols)} symbols to fetch")
        
        # Process symbols in batches to avoid rate limiting
        batch_size = 10
        total = len(symbols)
        
        for i in range(0, total, batch_size):
            batch = symbols[i:i+batch_size]
            
            for symbol in batch:
                stats['processed'] += 1
                progress = (stats['processed'] / total) * 100
                
                logger.info(f"[{stats['processed']}/{total}] ({progress:.1f}%) Fetching {symbol}...")
                
                # Fetch from Yahoo Finance
                df = fetch_yahoo_ohlc(symbol, period="5y")
                
                if df.empty:
                    stats['failed'] += 1
                    continue
                
                # Insert into database (replacing synthetic data)
                async with pool.acquire() as conn:
                    # Delete existing data for this symbol
                    await conn.execute(
                        "DELETE FROM ohlc_history WHERE symbol = $1",
                        symbol
                    )
                    
                    # Insert new data - convert timestamps to Python datetime
                    records = [
                        (row['time'].to_pydatetime(), row['symbol'], float(row['open']), float(row['high']), 
                         float(row['low']), float(row['close']), int(row['volume']))
                        for _, row in df.iterrows()
                    ]
                    
                    await conn.executemany("""
                        INSERT INTO ohlc_history (time, symbol, open, high, low, close, volume)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (time, symbol) DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume
                    """, records)
                    
                    stats['success'] += 1
                    stats['rows_added'] += len(records)
                    logger.info(f"  ✅ Added {len(records)} real data points for {symbol}")
            
            # Rate limiting between batches
            if i + batch_size < total:
                logger.info(f"  💤 Waiting 2 seconds (rate limiting)...")
                time.sleep(2)
        
        # Final stats
        duration = (datetime.now() - stats['start_time']).total_seconds()
        
        print()
        print("=" * 70)
        print("    YAHOO FINANCE DATA COLLECTION COMPLETE")
        print("=" * 70)
        print(f"  Symbols Processed: {stats['processed']}")
        print(f"  Successful:        {stats['success']}")
        print(f"  Failed:            {stats['failed']}")
        print(f"  Total Rows Added:  {stats['rows_added']:,}")
        print(f"  Duration:          {duration:.1f} seconds")
        print("=" * 70)
        
        # Get new totals
        async with pool.acquire() as conn:
            ohlc_count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_history")
            ohlc_symbols = await conn.fetchval("SELECT COUNT(DISTINCT symbol) FROM ohlc_history")
        
        print()
        print(f"  📊 NEW OHLC Total:  {ohlc_count:,} records")
        print(f"  📈 Symbols Covered: {ohlc_symbols}")
        print()
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
