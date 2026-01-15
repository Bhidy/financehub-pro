from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging
import asyncio
from datetime import datetime
import sys
import os

# DEFENSIVE CONFIGURATION
# Ensure root path is accessible without crashing
try:
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
except Exception:
    pass

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._startup_check_done = False
        
    def start(self):
        """
        Enterprise-Grade Startup: Wrapped in full try/catch to prevent API crashes.
        Uses lazy imports for maximum stability.
        """
        try:
            logger.info("🚀 Initializing Enterprise Scheduler...")
            
            # Lazy import dependencies to prevent top-level import loops
            from app.services.notification_service import notification_service
            
            # --- TIER 1A: Intraday Prices (Every 5 Minutes) ---
            self.scheduler.add_job(
                self.run_market_job_silent,
                CronTrigger(day_of_week='sun,mon,tue,wed,thu', hour='10-15', minute='*/5', timezone='Africa/Cairo'),
                id='tier1_intraday_live',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )

            # --- TIER 1B: Market Close (Daily 15:30) ---
            self.scheduler.add_job(
                self.run_market_job_loud,
                CronTrigger(day_of_week='sun,mon,tue,wed,thu', hour=15, minute=30, timezone='Africa/Cairo'),
                id='tier1_market_close',
                replace_existing=True
            )

            # --- TIER 2: Weekly Sweep (Friday 00:00) ---
            self.scheduler.add_job(
                self.run_maintenance_job,
                CronTrigger(day_of_week='fri', hour=0, minute=0, timezone='Africa/Cairo'),
                id='tier2_weekly_sweep',
                replace_existing=True
            )
            
            # --- TIER 3: Seasonal (Daily 02:00 in Quarter months) ---
            self.scheduler.add_job(
                self.run_maintenance_job,
                CronTrigger(month='1,4,7,10', hour=2, minute=0, timezone='Africa/Cairo'),
                id='tier3_earnings_burst',
                replace_existing=True
            )

            # --- TIER 4: Decypha Sync (Daily 18:00) ---
            self.scheduler.add_job(
                self.run_decypha_job,
                CronTrigger(hour=18, minute=0, timezone='Africa/Cairo'),
                id='tier4_decypha_sync',
                replace_existing=True
            )
            
            # --- TIER 4B: Mubasher Sync (Daily 06:00) ---
            self.scheduler.add_job(
                self.run_mubasher_job,
                CronTrigger(hour=6, minute=0, timezone='Africa/Cairo'),
                id='tier4_mubasher_sync',
                replace_existing=True
            )
            
            # --- TIER 5: Rubix Watchlist (Every 1 min in Session) ---
            self.scheduler.add_job(
                self.run_rubix_watchlist_job,
                CronTrigger(
                    day_of_week='sun,mon,tue,wed,thu',
                    hour='10-15',
                    minute='*',
                    timezone='Africa/Cairo'
                ),
                id='tier5_rubix_watchlist',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )
            
            # --- TIER 6: Redundant OHLC Catch-Up (Every 4 Hours) ---
            self.scheduler.add_job(
                self.run_ohlc_catchup_job,
                IntervalTrigger(hours=4),
                id='tier6_ohlc_catchup',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )
            
            self.scheduler.start()
            logger.info("✅ Scheduler Started Successfully. All tiers active.")
            
            # Startup Notification
            try:
                notification_service.send_discord(
                    "🤖 **FinanceHub Scheduler Online**\n"
                    "Status: **System Healthy**\n"
                    "Version: **1.1.0 (Enterprise Safe)**\n"
                    "Action: **Monitoring Started**", 
                    is_error=False
                )
            except Exception as e:
                logger.warning(f"Startup notification failed (Non-critical): {e}")

            # Trigger Startup Catch-up (Async)
            asyncio.create_task(self._startup_ohlc_catchup())
            
        except Exception as e:
            # THIS IS THE SAFETY NET
            # If scheduler fails, we LOG IT, but we DO NOT CRASH THE API
            logger.critical(f"🔥🔥🔥 SCHEDULER STARTUP CRASHED: {e}")
            try:
                from app.services.notification_service import notification_service
                notification_service.send_discord(f"🔥 **CRITICAL FAILURE**\nScheduler crashed on startup!\nError: {e}", is_error=True)
            except:
                pass

    async def _startup_ohlc_catchup(self):
        """CRITICAL: Startup catch-up for stale OHLC data."""
        if self._startup_check_done: return
        self._startup_check_done = True
        
        try:
            await asyncio.sleep(20) # Wait for DB
            from app.db.session import db
            from app.services.notification_service import notification_service
            
            # Check last OHLC date
            latest_ohlc = await db.fetch_one("SELECT MAX(date) as last_date FROM ohlc_data WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code = 'EGX')")
            
            if not latest_ohlc or not latest_ohlc.get('last_date'):
                await self._trigger_ohlc_update("startup_no_data")
                return
            
            last_date = latest_ohlc['last_date']
            days_stale = (datetime.now().date() - last_date).days
            
            if days_stale > 3:
                msg = (f"⚠️ **Stale Data Detected (Startup)**\n"
                       f"Last Date: {last_date} ({days_stale} days ago)\n"
                       f"Action: **Starting Catch-Up Job**")
                notification_service.send_discord(msg, is_error=True)
                await self._trigger_ohlc_update(f"startup_stale_{days_stale}d")
            else:
                logger.info(f"✅ Startup Check: Data is fresh ({days_stale} days old).")
                # Optional: Send 'Heartbeat' if requested, currently silent.
                
        except Exception as e:
            logger.error(f"Startup catch-up error: {e}")

    async def run_ohlc_catchup_job(self):
        """Periodic OHLC catch-up job (Runs every 4 hours)."""
        try:
            from app.db.session import db
            from app.services.notification_service import notification_service
            
            latest_ohlc = await db.fetch_one("SELECT MAX(date) as last_date FROM ohlc_data WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code = 'EGX')")
            if not latest_ohlc or not latest_ohlc.get('last_date'):
                await self._trigger_ohlc_update("catchup_no_data")
                return
                
            last_date = latest_ohlc['last_date']
            days_stale = (datetime.now().date() - last_date).days
            
            if days_stale > 2:
                msg = (f"🚨 **Stale Data Detected (Periodic)**\n"
                       f"Last Date: {last_date} ({days_stale} days ago)\n"
                       f"Action: **Starting Catch-Up Job**")
                notification_service.send_discord(msg, is_error=True)
                await self._trigger_ohlc_update(f"catchup_{days_stale}d")
            # Else: Silent Success
                
        except Exception as e:
            logger.error(f"Periodic checks error: {e}")

    async def _trigger_ohlc_update(self, reason: str):
        """Trigger update with notifications."""
        try:
            from data_pipeline.market_loader import run_daily_market_job
            from app.services.notification_service import notification_service
            
            result = await run_daily_market_job()
            
            if result.get('status') == 'success':
                stats = result.get('stats', {})
                msg = (f"✅ **Auto-Update Success**\n"
                       f"Trigger: **{reason}**\n"
                       f"New OHLC: {stats.get('ohlc_new', 0)}\n"
                       f"Tickers: {stats.get('tickers_updated', 0)}")
                notification_service.send_discord(msg, is_error=False)
            else:
                msg = (f"❌ **Auto-Update Failed**\n"
                       f"Trigger: **{reason}**\n"
                       f"Error: {result.get('error')}")
                notification_service.send_discord(msg, is_error=True)
        except Exception as e:
            logger.error(f"Trigger update error: {e}")

    # --- WRAPPER JOBS (Lazy Loaded) ---

    async def run_market_job_silent(self):
        try:
            from app.api.v1.endpoints.admin import refresh_all_prices
            await refresh_all_prices()
        except Exception as e:
            logger.error(f"Intraday job error: {e}")

    async def run_market_job_loud(self):
        try:
            from data_pipeline.market_loader import run_daily_market_job
            from app.services.notification_service import notification_service
            
            result = await run_daily_market_job()
            if result['status'] == 'success':
                msg = f"✅ **Daily Close Success**\nStats: {result['stats']}"
                notification_service.send_discord(msg, is_error=False)
            else:
                notification_service.send_discord(f"❌ **Daily Close Failed**\nError: {result.get('error')}", is_error=True)
        except Exception as e:
            logger.error(f"Close job error: {e}")

    async def run_maintenance_job(self):
        try:
            from data_pipeline.ingest_stockanalysis import run_ingestion_job
            from app.services.notification_service import notification_service
            
            result = await run_ingestion_job()
            if result['status'] == 'success':
                notification_service.send_discord(f"✅ **Weekly Sweep Success**\nSymbols: {result['symbols_count']}", is_error=False)
            else:
                notification_service.send_discord(f"❌ **Weekly Sweep Failed**", is_error=True)
        except Exception as e:
            logger.error(f"Maintenance job error: {e}")

    async def run_decypha_job(self):
        try:
            from app.services.decypha_provider import decypha_provider
            from app.services.notification_service import notification_service
            
            result = await decypha_provider.sync_funds()
            if result['status'] == 'success':
                notification_service.send_discord(f"✅ **Decypha Sync Success**\nFunds: {result['new']}", is_error=False)
            else:
                notification_service.send_discord(f"❌ **Decypha Sync Failed**", is_error=True)
        except Exception as e:
            logger.error(f"Decypha job error: {e}")

    async def run_mubasher_job(self):
        try:
            from app.services.notification_service import notification_service
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            script_path = os.path.join(base_dir, 'scripts', 'scrape_mubasher.py')
            
            proc = await asyncio.create_subprocess_exec(
                sys.executable, script_path,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()
            
            if proc.returncode == 0:
                notification_service.send_discord("✅ **Mubasher Sync Success**", is_error=False)
            else:
                notification_service.send_discord(f"❌ **Mubasher Sync Failed**\nExit: {proc.returncode}", is_error=True)
        except Exception as e:
            logger.error(f"Mubasher job error: {e}")

    async def run_rubix_watchlist_job(self):
        try:
            import datetime
            # Use lazy imports if possible, or datetime is standard
            from app.services.notification_service import notification_service
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            script_path = os.path.join(base_dir, 'scripts', 'archive', 'rubix_watchlist_extractor.py')
            
            proc = await asyncio.create_subprocess_exec(
                sys.executable, script_path, '--silent',
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            
            # Extract count and notify
            if proc.returncode == 0:
                # Notify on every successful run (it runs every minute, so we might want to throttle)
                # But since the user asked for 5-minute schedule, let's just log success.
                # Actually, the user's primary "intraday" job is 5 mins.
                # If this Rubix job is running every "minute" (as per schedule), 
                # we should probably notify only every 5 mins.
                if datetime.datetime.now().minute % 5 == 0:
                     output = stdout.decode()
                     count = output.split("Saved")[1].split("/")[0].strip() if "Saved" in output else "?"
                     notification_service.send_discord(f"✅ **Watchlist Backup**\nStocks: {count}", is_error=False)
        except Exception as e:
            logger.error(f"Rubix job error: {e}")

scheduler_service = SchedulerService()
