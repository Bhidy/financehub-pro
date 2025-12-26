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

import os

# Define Paths dynamically
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR) # /app or .../backend

def get_path(relative_path):
    """Resolve absolute path compatible with Docker and Local"""
    return os.path.join(BACKEND_ROOT, relative_path)

def run_fast_loop():
    """Fast Loop (1m): Snapshots for Ticker Tape - REAL DATA ONLY"""
    logger.info("⚡ Executing Fast Loop (Market Snapshot)...")
    try:
        script_path = get_path("browser_extract.js")
        
        # Check if node is available
        try:
            subprocess.run(["node", "--version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except (FileNotFoundError, subprocess.CalledProcessError):
            logger.warning("Node.js not found in environment - Skipping JS extractor.")
            return

        # Step 1: Run the real extractor
        try:
            subprocess.run(["node", script_path, "snapshot"], check=True, timeout=30)
            logger.info("Extractor completed successfully.")
        except FileNotFoundError:
            logger.warning(f"Script not found: {script_path}")
        except subprocess.TimeoutExpired:
            logger.warning("Extractor timed out - using existing DB data.")
        except Exception as e:
            logger.warning(f"Extractor failed: {e} - using existing DB data.")
        
        # Step 2: Broadcast real prices
        async def broadcast_real_updates():
            if not db._pool: 
                # Silent return if DB not ready
                return 
            
            # Fetch REAL prices
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
                
            if updates:
                await broadcaster.broadcast({
                    "type": "MARKET_UPDATE",
                    "data": updates
                })
                logger.info(f"Broadcasted {len(updates)} REAL ticker updates.")

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
        script_path = get_path("extractors/news_extractor.py")
        subprocess.run([sys.executable, script_path], check=True)
        logger.info("News Job Completed Successfully.")
    except Exception as e:
        logger.error(f"News Job Failed: {e}")
    logger.info("Medium Loop Complete.")

def run_slow_loop():
    """Slow Loop (24h): Deep Financials & Profile Crawl"""
    logger.info("🐢 Executing Slow Loop (Daily Updates)...")
    try:
        scripts = [
            "extractors/real_fund_extractor.py",
            "extractors/real_insider_extractor.py",
            "extractors/real_analyst_extractor.py"
        ]
        
        for script in scripts:
            script_path = get_path(script)
            subprocess.run([sys.executable, script_path], check=True)
        
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
