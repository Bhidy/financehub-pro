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


# ============================================================================
# EGX (Egyptian Stock Exchange) SCHEDULED JOBS
# ============================================================================

def run_egx_daily_update():
    """
    EGX Daily Update (runs at 08:00 Egypt time)
    Updates ticker prices and fetches new OHLC data
    """
    logger.info("🇪🇬 Executing EGX Daily Update...")
    try:
        script_path = os.path.join(
            os.path.dirname(BACKEND_ROOT),  # Go to project root
            "scripts", "egx_production_loader.py"
        )
        
        result = subprocess.run(
            [sys.executable, script_path, "--daily"],
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode == 0:
            logger.info("✅ EGX Daily Update completed successfully")
        else:
            logger.error(f"EGX Update failed: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        logger.error("EGX Daily Update timed out after 10 minutes")
    except Exception as e:
        logger.error(f"EGX Daily Update failed: {e}")


def run_egx_price_refresh():
    """
    EGX Price Refresh (runs every 15 minutes during market hours)
    Updates ticker prices only (fast operation)
    """
    logger.info("🇪🇬 Refreshing EGX prices...")
    try:
        # Check if market is open (EGX: Sun-Thu, 10:00-14:30 Egypt time)
        now = datetime.now()
        weekday = now.weekday()  # 0=Mon, 6=Sun
        hour = now.hour
        
        # EGX is open Sunday (6) to Thursday (3), 10:00-14:30
        market_open = weekday in [6, 0, 1, 2, 3] and 10 <= hour < 15
        
        if not market_open:
            logger.info("EGX market closed - skipping price refresh")
            return
        
        script_path = os.path.join(
            os.path.dirname(BACKEND_ROOT),
            "scripts", "egx_production_loader.py"
        )
        
        # Quick price update only (no OHLC history)
        result = subprocess.run(
            [sys.executable, script_path, "--daily"],
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )
        
        if result.returncode == 0:
            logger.info("✅ EGX price refresh completed")
        else:
            logger.warning(f"EGX price refresh issue: {result.stderr[:200]}")
            
    except Exception as e:
        logger.error(f"EGX price refresh failed: {e}")


def run_egx_full_sync():
    """
    EGX Full Sync (runs once per week on Friday)
    Complete refresh of all EGX data
    """
    logger.info("🇪🇬 Executing EGX Weekly Full Sync...")
    try:
        # Only run on Fridays
        if datetime.now().weekday() != 4:  # 4 = Friday
            logger.info("Not Friday - skipping weekly full sync")
            return
            
        script_path = os.path.join(
            os.path.dirname(BACKEND_ROOT),
            "scripts", "egx_production_loader.py"
        )
        
        result = subprocess.run(
            [sys.executable, script_path, "--full"],
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout for full sync
        )
        
        if result.returncode == 0:
            logger.info("✅ EGX Weekly Full Sync completed")
        else:
            logger.error(f"EGX Full Sync failed: {result.stderr}")
            
    except Exception as e:
        logger.error(f"EGX Full Sync failed: {e}")


def start_scheduler():
    logger.info("🚀 Enterprise Engine Started. Initializing Loops...")

    # Schedule Definitions
    schedule.every(1).minutes.do(run_fast_loop)
    schedule.every(15).minutes.do(run_medium_loop)
    schedule.every(24).hours.do(run_slow_loop)
    
    # EGX (Egyptian Stock Exchange) Schedules
    schedule.every().day.at("08:00").do(run_egx_daily_update)  # Daily update at 8 AM
    schedule.every(15).minutes.do(run_egx_price_refresh)       # Price refresh every 15 min
    schedule.every().day.at("18:00").do(run_egx_full_sync)     # Weekly full sync (checks for Friday)
    
    logger.info("📅 EGX Scheduler Active:")
    logger.info("   - Daily update: 08:00 Egypt time")
    logger.info("   - Price refresh: Every 15 min (market hours)")
    logger.info("   - Full sync: Weekly on Fridays")

    # Initial Run
    run_fast_loop()

    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    start_scheduler()
