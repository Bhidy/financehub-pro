import asyncio
import asyncpg
import yfinance as yf
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"

async def fetch_tickers(conn):
    rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE last_price > 0")
    return [r['symbol'] for r in rows]

async def process_ticker(conn, symbol):
    # Yahoo Ticker format: 1120.SR
    y_sym = f"{symbol}.SR"
    try:
        # Use fast info fetch
        ticker = yf.Ticker(y_sym)
        # info is a property, triggers request
        info = ticker.info
        
        # Check if we have data
        if not info or 'regularMarketPrice' not in info:
            return
            
        # Extract Consensus Data
        # recommendationKey: 'buy', 'hold', etc.
        # targetMeanPrice: float
        # numberOfAnalystOpinions: int
        
        rec = info.get('recommendationKey', 'none').upper()
        target = info.get('targetMeanPrice')
        current = info.get('currentPrice') or info.get('regularMarketPrice')
        num_analysts = info.get('numberOfAnalystOpinions')
        
        if target or rec != 'NONE':
            # Insert Consensus Row
            await conn.execute("""
                INSERT INTO analyst_ratings 
                (symbol, analyst_firm, rating, target_price, current_price, rating_date)
                VALUES ($1, $2, $3, $4, $5, NOW())
            """, symbol, "Market Consensus", rec, target, current)
            
            logger.info(f"✅ {symbol}: {rec} | Target: {target}")
            
    except Exception as e:
        logger.warning(f"Failed {symbol}: {e}")

async def main():
    logger.info("Starting Analyst Ratings Extractor (Yahoo Consensus)...")
    conn = await asyncpg.connect(DB_DSN)
    
    # Clean old data
    await conn.execute("TRUNCATE TABLE analyst_ratings RESTART IDENTITY CASCADE")
    
    tickers = await fetch_tickers(conn)
    logger.info(f"Processing {len(tickers)} tickers...")
    
    # Process sequentially to avoid rate limits (Yahoo is lenient but still)
    # Using batches of 10?
    count = 0
    for sym in tickers:
        await process_ticker(conn, sym)
        count += 1
        if count % 10 == 0:
            print(f"Processed {count}...")
            
    await conn.close()
    logger.info("Analyst Ratings Sync Complete.")

if __name__ == "__main__":
    asyncio.run(main())
