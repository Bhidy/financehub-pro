import schedule
import sys
import time
import subprocess
import logging
import threading
from datetime import datetime

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [ENGINE] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("engine.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

import asyncio
from app.services.market_broadcaster import broadcaster
from app.db.session import db

def run_fast_loop():
    """Fast Loop (1m): Snapshots for Ticker Tape - REAL DATA ONLY"""
    logger.info("⚡ Executing Fast Loop (Market Snapshot)...")
    try:
        # Step 1: Run the real extractor to fetch latest prices from source
        # This updates the database with fresh data
        try:
            subprocess.run(["node", "browser_extract.js", "snapshot"], check=True, timeout=30)
            logger.info("Extractor completed successfully.")
        except FileNotFoundError:
            logger.warning("browser_extract.js not found - using existing DB data.")
        except subprocess.TimeoutExpired:
            logger.warning("Extractor timed out - using existing DB data.")
        except Exception as e:
            logger.warning(f"Extractor failed: {e} - using existing DB data.")
        
        # Step 2: Broadcast real prices from database
        async def broadcast_real_updates():
            # Connect if not connected (DB)
            if not db._pool: await db.connect()
            
            # Fetch REAL prices from database (no simulation)
            tickers = await db.fetch_all("""
                SELECT symbol, last_price, change_value, change_percent 
                FROM market_tickers 
                ORDER BY volume DESC 
                LIMIT 20
            """)
            
            updates = []
            for t in tickers:
                updates.append({
                    "symbol": t['symbol'],
                    "price": float(t['last_price'] or 0),
                    "change": float(t['change_value'] or 0),
                    "change_percent": float(t['change_percent'] or 0)
                })
                
            # Broadcast real data
            if updates:
                await broadcaster.broadcast({
                    "type": "MARKET_UPDATE",
                    "data": updates
                })
                logger.info(f"Broadcasted {len(updates)} REAL ticker updates.")

        # Run async function in main event loop (Thread Safe)
        from app.main import main_event_loop
        if main_event_loop:
            future = asyncio.run_coroutine_threadsafe(broadcast_real_updates(), main_event_loop)
        else:
            logger.error("Main Event Loop not found!")

        logger.info("Fast Loop Complete.")
    except Exception as e:
        logger.error(f"Fast Loop Failed: {e}")

def run_medium_loop():
    """Medium Loop (15m): News & Screener Update"""
    logger.info("📰 Executing Medium Loop (News & Scan)...")
    try:
        # Run the news extractor script as a subprocess to ensure clean state
        subprocess.run(["python3", "backend/extractors/news_extractor.py"], check=True)
        logger.info("News Job Completed Successfully.")
    except Exception as e:
        logger.error(f"News Job Failed: {e}")
    logger.info("Medium Loop Complete.")

def run_slow_loop():
    """Slow Loop (24h): Deep Financials & Profile Crawl"""
    logger.info("🐢 Executing Slow Loop (Daily Updates)...")
    try:
        # Run Real Fund Extractor (Daily NAV)
        subprocess.run([sys.executable, "backend/extractors/real_fund_extractor.py"], check=True)
        # Run Real Insider/Corporate Extractor
        subprocess.run([sys.executable, "backend/extractors/real_insider_extractor.py"], check=True)
        # Run Real Analyst Ratings Extractor
        subprocess.run([sys.executable, "backend/extractors/real_analyst_extractor.py"], check=True)
        
        logger.info("All Daily Syncs Complete.")
    except Exception as e:
        logger.error(f"Sync Failed: {e}")
    logger.info("Slow Loop Complete.")

def start_scheduler():
    logger.info("🚀 Enterprise Engine Started. Initializing Loops...")

    # Schedule Definitions
    schedule.every(1).minutes.do(run_fast_loop)
    schedule.every(15).minutes.do(run_medium_loop)
    schedule.every(24).hours.do(run_slow_loop)

    # Initial Run
    run_fast_loop()

    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    start_scheduler()
