
import asyncio
import asyncpg
import yfinance as yf
import os
import logging
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL')

async def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL is not set")
        return

    logger.info("Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        logger.info("Fetching TASI Index history from Yahoo Finance...")
        tasi = yf.Ticker("^TASI.SR")
        
        # Fetch 1 year of history
        hist = tasi.history(period="1y", interval="1d")
        
        if hist.empty:
            logger.error("No data fetched for TASI")
            return

        logger.info(f"Fetched {len(hist)} days of history")

        # Ensure TASI exists in market_tickers first (it should from my previous fix)
        # But for safety, upsert it again
        # We need it to be a valid foreign key for market_ohlc usually
        
        # Prepare data for insertion
        records = []
        for date, row in hist.iterrows():
            # date is Timestamp, convert to string or date object
            record = (
                'TASI',
                date.date(),
                float(row['Open']),
                float(row['High']),
                float(row['Low']),
                float(row['Close']),
                int(row['Volume'])
            )
            records.append(record)

        logger.info(f"Inserting {len(records)} records into market_ohlc...")
        
        # Bulk insert/upsert
        await conn.executemany("""
            INSERT INTO ohlc_history (symbol, time, open, high, low, close, volume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (symbol, time) DO UPDATE 
            SET open = EXCLUDED.open,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume
        """, records)

        logger.info("✅ TASI History successfully updated!")

    except Exception as e:
        logger.error(f"Error updating TASI history: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
