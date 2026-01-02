#!/usr/bin/env python3
"""
FinanceHub Pro - Enterprise Auto-Update Scheduler
==================================================
Runs data extractors on a professional schedule to keep the database fresh.

Schedule:
- Market Data (Tickers, Prices): Every 15 minutes during market hours
- Intraday Data: Every 5 minutes during market hours  
- OHLC History: Daily at 6:00 PM (after market close)
- Financial Data: Weekly on Friday at 8:00 PM
- News & Events: Every 30 minutes
- Full Sync: Daily at 2:00 AM

Usage:
    python3 scheduler.py          # Run scheduler in foreground
    python3 scheduler.py --daemon # Run as background daemon
"""

import schedule
import time
import subprocess
import logging
import os
import sys
from datetime import datetime, timedelta
import signal

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [SCHEDULER] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXTRACTORS_DIR = os.path.join(BASE_DIR, 'backend', 'extractors')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')

# Ensure logs directory exists
os.makedirs(LOGS_DIR, exist_ok=True)

# Market Hours (Saudi Arabia - Sunday to Thursday, 10:00 AM - 3:00 PM AST)
MARKET_OPEN_HOUR = 10
MARKET_CLOSE_HOUR = 15
MARKET_DAYS = [0, 1, 2, 3, 6]  # Mon-Thu, Sun (Python: Mon=0, Sun=6)

def is_market_hours():
    """Check if currently within Saudi market trading hours"""
    now = datetime.now()
    day_of_week = now.weekday()
    hour = now.hour
    
    # Sunday to Thursday, 10:00 AM - 3:00 PM
    if day_of_week in MARKET_DAYS:
        if MARKET_OPEN_HOUR <= hour < MARKET_CLOSE_HOUR:
            return True
    return False

def run_extractor(extractor_name: str, log_suffix: str = ""):
    """Run an extractor script with logging"""
    script_path = os.path.join(EXTRACTORS_DIR, f"{extractor_name}.py")
    log_file = os.path.join(LOGS_DIR, f"{extractor_name}_{log_suffix or 'auto'}.log")
    
    if not os.path.exists(script_path):
        logger.error(f"Extractor not found: {script_path}")
        return False
    
    try:
        logger.info(f"🚀 Starting {extractor_name}...")
        
        # Run extractor with timeout (30 minutes max)
        result = subprocess.run(
            ['python3', script_path],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=1800  # 30 minutes
        )
        
        # Log output
        with open(log_file, 'a') as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"Run: {datetime.now().isoformat()}\n")
            f.write(f"{'='*60}\n")
            f.write(result.stdout)
            if result.stderr:
                f.write(f"\nSTDERR:\n{result.stderr}")
        
        if result.returncode == 0:
            logger.info(f"✅ {extractor_name} completed successfully")
            return True
        else:
            logger.error(f"❌ {extractor_name} failed with code {result.returncode}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error(f"⏰ {extractor_name} timed out after 30 minutes")
        return False
    except Exception as e:
        logger.error(f"❌ {extractor_name} error: {e}")
        return False

# ============================================================================
# SCHEDULED JOBS
# ============================================================================

def job_update_market_data():
    """Update live market prices - runs every 15 min during market hours"""
    if not is_market_hours():
        logger.debug("Market closed, skipping price update")
        return
    
    logger.info("📊 Updating live market data...")
    run_extractor("stock_extractor", "market")

def job_update_intraday():
    """Update intraday bars - runs every 5 min during market hours"""
    if not is_market_hours():
        return
    
    logger.info("📈 Updating intraday data...")
    # Use production extractor for intraday if available
    run_extractor("production_stock_extractor", "intraday")

def job_daily_ohlc():
    """Update daily OHLC after market close - runs daily at 6 PM"""
    logger.info("📉 Running daily OHLC update...")
    run_extractor("full_history_extractor", "daily")

def job_update_financials():
    """Update financial statements - runs weekly on Friday"""
    logger.info("💰 Running weekly financials update...")
    run_extractor("fundamental_extractor", "weekly")
    run_extractor("ratios_extractor", "weekly")

def job_update_earnings():
    """Update earnings calendar - runs daily"""
    logger.info("📅 Updating earnings calendar...")
    run_extractor("earnings_extractor", "daily")

def job_update_shareholders():
    """Update major shareholders - runs weekly"""
    logger.info("👥 Updating shareholder data...")
    run_extractor("shareholder_extractor", "weekly")

def job_update_funds():
    """Update mutual fund NAVs - runs daily at 7 PM"""
    logger.info("💼 Updating fund NAV data...")
    run_extractor("fund_history_extractor", "daily")

def job_update_analyst_ratings():
    """Update analyst ratings - runs daily"""
    logger.info("⭐ Updating analyst ratings...")
    run_extractor("real_analyst_extractor", "daily")

def job_update_insider_trading():
    """Update insider trading & corporate actions - runs twice daily"""
    logger.info("🔍 Updating insider trading & corporate actions...")
    run_extractor("real_insider_extractor", "daily")

def job_full_sync():
    """Full database sync - runs at 2 AM daily"""
    logger.info("🔄 Starting full database sync...")
    
    extractors = [
        "stock_extractor",
        "earnings_extractor", 
        "shareholder_extractor",
        "ratios_extractor",
        "real_analyst_extractor",
        "real_insider_extractor",
    ]
    
    for ext in extractors:
        run_extractor(ext, "fullsync")
        time.sleep(5)  # Small delay between extractors
    
    logger.info("✅ Full sync complete!")

def job_health_check():
    """System health check - runs every hour"""
    logger.info("🏥 Running health check...")
    
    # Check database connection
    try:
        import psycopg2
        conn = psycopg2.connect(
            host="localhost",
            database="mubasher_db",
            user=os.environ.get("DB_USER", ""),
            password=os.environ.get("DB_PASSWORD", "")
        )
        conn.close()
        logger.info("✅ Database connection OK")
    except Exception as e:
        logger.error(f"❌ Database error: {e}")
    
    # Check API
    try:
        import requests
        resp = requests.get("http://localhost:8000/", timeout=5)
        if resp.status_code == 200:
            logger.info("✅ API server OK")
        else:
            logger.warning(f"⚠️ API returned {resp.status_code}")
    except Exception as e:
        logger.error(f"❌ API error: {e}")

# ============================================================================
# SCHEDULE CONFIGURATION
# ============================================================================

def setup_schedule():
    """Configure all scheduled jobs"""
    
    # Market Hours Jobs (every 15 min during trading)
    schedule.every(15).minutes.do(job_update_market_data)
    
    # Intraday Updates (every 5 min during trading)
    schedule.every(5).minutes.do(job_update_intraday)
    
    # Daily Jobs
    schedule.every().day.at("18:00").do(job_daily_ohlc)          # 6 PM - OHLC after market
    schedule.every().day.at("19:00").do(job_update_funds)        # 7 PM - Fund NAVs
    schedule.every().day.at("20:00").do(job_update_earnings)     # 8 PM - Earnings
    schedule.every().day.at("21:00").do(job_update_analyst_ratings)  # 9 PM - Analyst ratings
    schedule.every().day.at("09:00").do(job_update_insider_trading)  # 9 AM - Insider trading
    schedule.every().day.at("17:00").do(job_update_insider_trading)  # 5 PM - Insider trading
    
    # Weekly Jobs
    schedule.every().friday.at("20:00").do(job_update_financials)    # Friday 8 PM
    schedule.every().friday.at("22:00").do(job_update_shareholders)  # Friday 10 PM
    
    # Full Sync (daily at 2 AM)
    schedule.every().day.at("02:00").do(job_full_sync)
    
    # Health Check (hourly)
    schedule.every().hour.do(job_health_check)
    
    logger.info("📅 Schedule configured:")
    logger.info("  • Market data: Every 15 min (during trading hours)")
    logger.info("  • Intraday: Every 5 min (during trading hours)")
    logger.info("  • Daily OHLC: 6:00 PM")
    logger.info("  • Fund NAVs: 7:00 PM")
    logger.info("  • Earnings: 8:00 PM")
    logger.info("  • Analyst Ratings: 9:00 PM")
    logger.info("  • Insider Trading: 9:00 AM & 5:00 PM")
    logger.info("  • Financials: Friday 8:00 PM")
    logger.info("  • Shareholders: Friday 10:00 PM")
    logger.info("  • Full Sync: 2:00 AM daily")
    logger.info("  • Health Check: Every hour")

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info("🛑 Scheduler shutting down...")
    sys.exit(0)

def main():
    """Main scheduler entry point"""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("=" * 60)
    logger.info("🚀 FinanceHub Pro Auto-Update Scheduler Starting...")
    logger.info("=" * 60)
    
    setup_schedule()
    
    # Run initial health check
    job_health_check()
    
    logger.info("⏰ Scheduler running. Press Ctrl+C to stop.")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
