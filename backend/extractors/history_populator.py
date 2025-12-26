import asyncio
import random
import math
from datetime import datetime, timedelta
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HistoryPopulator")

async def generate_fractal_history(symbol: str, start_price: float, days=1250): # 5 Years approx
    """
    Generates realistic stock price history using Geometric Brownian Motion
    """
    history = []
    current_price = start_price
    
    # Drift and Volatility settings for realistic look (Enterprise Blue Chip style)
    mu = 0.0002  # Slight upward drift
    sigma = 0.015 # 1.5% daily volatility
    
    # Work backwards from today
    end_date = datetime.now()
    
    for i in range(days):
        date = end_date - timedelta(days=i)
        
        # Skip weekends (Fri/Sat in Saudi? No, Sun-Thu is market)
        # Saudi Market: Sun-Thu. Fri-Sat Closed.
        if date.weekday() in [4, 5]: # 4=Fri, 5=Sat
            continue
            
        # GBM Step
        shock = random.gauss(0, 1)
        change_pct = math.exp((mu - 0.5 * sigma**2) + sigma * shock)
        
        # Previous price (since we work backwards, this is actually the 'next' day's price relative to i)
        # So: Price[i] = Price[i-1] / change
        prev_price = current_price / change_pct
        
        # OHLC Logic
        day_volatility = random.uniform(0.005, 0.02)
        open_p = prev_price * random.uniform(0.995, 1.005)
        close_p = prev_price # Actually it should be aligned, simplified here
        
        high_p = max(open_p, close_p) * (1 + random.uniform(0, day_volatility))
        low_p = min(open_p, close_p) * (1 - random.uniform(0, day_volatility))
        
        volume = int(random.uniform(50000, 5000000))
        
        history.append({
            "time": date,
            "symbol": symbol,
            "open": open_p,
            "high": high_p,
            "low": low_p,
            "close": close_p,
            "volume": volume
        })
        
        current_price = prev_price

    return history

async def run():
    await db.connect()
    
    try:
        # Get all tickers
        tickers = await db.fetch_all("SELECT symbol, last_price FROM market_tickers")
        logger.info(f"Generating history for {len(tickers)} tickers...")
        
        total_records = 0
        
        for t in tickers:
            symbol = t['symbol']
            price = float(t['last_price'] or 100.0)
            
            logger.info(f"Processing {symbol} base {price}...")
            
            records = await generate_fractal_history(symbol, price)
            
            # Bulk Insert
            # We insert in chunks to avoid query size limits
            chunk_size = 1000
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i+chunk_size]
                
                # Construct massive insert
                values = []
                flattened = []
                idx = 0
                for r in chunk:
                    idx += 1
                    values.append(f"($1, ${idx*6-4}, ${idx*6-3}, ${idx*6-2}, ${idx*6-1}, ${idx*6}, ${idx*6+1})")
                    flattened.extend([r['time'], r['symbol'], r['open'], r['high'], r['low'], r['close'], r['volume']])
                
                # Manual Query Construction is safer with asyncpg executemany but let's try raw SQL for speed validation
                # Actually asyncpg .executemany is best
                
                await db._pool.executemany("""
                    INSERT INTO ohlc_history (time, symbol, open, high, low, close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (time, symbol) DO NOTHING
                """, [
                    (r['time'], r['symbol'], r['open'], r['high'], r['low'], r['close'], r['volume'])
                    for r in chunk
                ])
                
            total_records += len(records)
            
        logger.info(f"✅ Successfully generated {total_records} historical records.")
        
    except Exception as e:
        logger.error(f"Failed: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(run())
