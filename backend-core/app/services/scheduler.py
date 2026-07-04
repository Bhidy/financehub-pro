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

            # --- TIER 1C: Egypt Yahoo Daily Sync (Daily 16:30 Cairo) ---
            self.scheduler.add_job(
                self.run_egypt_yahoo_sync_job,
                CronTrigger(day_of_week='sun,mon,tue,wed,thu', hour=16, minute=30, timezone='Africa/Cairo'),
                id='tier1c_egypt_yahoo_sync',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )

            # --- TIER 2: Weekly Sweep (Friday 00:00) ---
            self.scheduler.add_job(
                self.run_maintenance_job,
                CronTrigger(day_of_week='fri', hour=0, minute=0, timezone='Africa/Cairo'),
                id='tier2_weekly_sweep',
                replace_existing=True
            )

            # --- TIER 2B: Statistics slot (Friday 01:00) ---
            # No-op — TradingView financials/estimates cycles cover this data
            self.scheduler.add_job(
                self.run_statistics_refresh_job,
                CronTrigger(day_of_week='fri', hour=1, minute=0, timezone='Africa/Cairo'),
                id='tier2b_statistics_refresh',
                replace_existing=True,
                max_instances=1,
                coalesce=True
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

            # --- TIER 4C: EGX Multi-Source News (Every 2 Hours) ---
            self.scheduler.add_job(
                self.run_egx_multisource_news_job,
                CronTrigger(hour='*/2', minute=5, timezone='Africa/Cairo'),
                id='tier4c_egx_multisource_news_2h',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )
            
            # --- TIER 4D: Fund Risk Metrics (30 min after NAV updates, Sun-Thu) ---
            # Computes volatility/max_drawdown/52w/returns from nav_history into the
            # fund_risk_metrics side table. Runs after the Mubasher CSV NAV refresh so
            # metrics reflect the freshest NAVs. Pushable automation (no workflow scope
            # needed); the equivalent GitHub Actions workflow (funds-metrics.yml) is an
            # alternative for anyone with workflow scope.
            self.scheduler.add_job(
                self.run_fund_metrics_job,
                CronTrigger(day_of_week='sun,mon,tue,wed,thu', hour='8,19', minute=30,
                            timezone='Africa/Cairo'),
                id='tier4d_fund_metrics',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )

            # --- TIER 4E: Mubasher LIST-API NAV augment (fresher pipeline, Sun-Thu) ---
            # Pulls every EG fund's current price from the list API (~1 day ahead of the
            # per-fund CSV) and upserts it, keeping headline NAV fresh and stale funds
            # re-crossing the freshness gate. Runs just before the metrics compute.
            self.scheduler.add_job(
                self.run_fund_list_api_job,
                CronTrigger(day_of_week='sun,mon,tue,wed,thu', hour='8,19', minute=10,
                            timezone='Africa/Cairo'),
                id='tier4e_fund_list_api',
                replace_existing=True,
                max_instances=1,
                coalesce=True
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
            
            # --- TIER 7: Weekly Database Backup (Thursday 03:00) ---
            self.scheduler.add_job(
                self.run_weekly_backup_job,
                CronTrigger(day_of_week='thu', hour=3, minute=0, timezone='Africa/Cairo'),
                id='tier7_weekly_backup',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )
            
            # --- TIER 8a: Weekly Newsletter Pulse (Sunday 08:00 Cairo) ---
            self.scheduler.add_job(
                self.run_weekly_newsletter_job,
                CronTrigger(day_of_week='sun', hour=8, minute=0, timezone='Africa/Cairo'),
                id='tier8a_weekly_newsletter',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )
            
            # --- TIER 8b: Monthly Newsletter Deep Dive (1st of month 09:00 Cairo) ---
            self.scheduler.add_job(
                self.run_monthly_newsletter_job,
                CronTrigger(day=1, hour=9, minute=0, timezone='Africa/Cairo'),
                id='tier8b_monthly_newsletter',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )

            # --- TIER 8c: Academy Newsletter (Wednesday 10:00 Cairo) ---
            self.scheduler.add_job(
                self.run_academy_newsletter_job,
                CronTrigger(day_of_week='wed', hour=10, minute=0, timezone='Africa/Cairo'),
                id='tier8c_academy_newsletter',
                replace_existing=True,
                max_instances=1,
                coalesce=True
            )
            
            # --- TIER 8d: Flash Alerts Check (Hourly) ---
            self.scheduler.add_job(
                self.run_flash_alerts_job,
                IntervalTrigger(hours=1),
                id='tier8d_flash_alerts',
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
            except Exception:
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
            from app.services.notification_service import notification_service
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            script_path = os.path.join(base_dir, 'scripts', 'tv_egx_harvester.py')

            logger.info("Weekly sweep: triggering TradingView financials cycle...")
            proc = await asyncio.create_subprocess_exec(
                sys.executable, script_path, '--cycle', 'financials',
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            out = (stdout or b'').decode(errors='ignore')

            if proc.returncode == 0:
                notification_service.send_discord(
                    f"✅ **Weekly Sweep Success** (TV financials)\n{out[-200:]}",
                    is_error=False)
            else:
                err = (stderr or b'').decode(errors='ignore')[-400:]
                notification_service.send_discord(
                    f"❌ **Weekly Sweep Failed** (TV financials)\n```{err}```",
                    is_error=True)
        except Exception as e:
            logger.error(f"Maintenance job error: {e}")

    async def run_statistics_refresh_job(self):
        """Weekly stats refresh — superseded by TradingView financials/estimates cycles.
        Data now flows from tv_egx_harvester (egx_technicals, analyst_estimates tables).
        This slot is kept in the scheduler to avoid breaking the cron wiring."""
        logger.info("Statistics slot: TradingView financials/estimates cover this — no-op")

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

    async def run_fund_metrics_job(self):
        """Compute fund risk metrics (volatility / max_drawdown / 52w / returns)
        from nav_history into the fund_risk_metrics companion table. Deterministic,
        idempotent, read-only-safe (skips clean during a Supabase read-only
        incident); a failure is isolated and never crashes the API."""
        try:
            from app.services.notification_service import notification_service
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            script_path = os.path.join(base_dir, 'scripts', 'compute_fund_metrics.py')

            proc = await asyncio.create_subprocess_exec(
                sys.executable, script_path, '--min-updated', '50',
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            if proc.returncode == 0:
                notification_service.send_discord("✅ **Fund Metrics Compute Success**", is_error=False)
            else:
                notification_service.send_discord(
                    f"❌ **Fund Metrics Compute Failed**\nExit: {proc.returncode}", is_error=True)
        except Exception as e:
            logger.error(f"Fund metrics job error: {e}")

    async def run_fund_list_api_job(self):
        """Augment NAVs from Mubasher's LIST API (fresher than the per-fund CSV,
        ~1 day ahead) for funds already in mutual_funds. Idempotent, read-only-safe;
        failure isolated, never crashes the API."""
        try:
            from app.services.notification_service import notification_service
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            script_path = os.path.join(base_dir, 'scripts', 'funds_list_api_sync.py')

            proc = await asyncio.create_subprocess_exec(
                sys.executable, script_path, '--min-updated', '50',
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            if proc.returncode == 0:
                notification_service.send_discord("✅ **Fund List-API Sync Success**", is_error=False)
            else:
                notification_service.send_discord(
                    f"❌ **Fund List-API Sync Failed**\nExit: {proc.returncode}", is_error=True)
        except Exception as e:
            logger.error(f"Fund list-api job error: {e}")

    async def run_egx_multisource_news_job(self):
        """Runs EGX multi-source news scraper every 2 hours."""
        try:
            from app.services.notification_service import notification_service

            backend_core_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            script_path = os.path.join(backend_core_dir, 'scripts', 'scrape_egx_multisource_news.py')

            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                script_path,
                '--days',
                '30',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            out = (stdout or b'').decode(errors='ignore')
            err = (stderr or b'').decode(errors='ignore')

            if proc.returncode == 0:
                summary = "EGX multi-source news sync completed."
                marker = "Combined coverage last 30 days ->"
                if marker in out:
                    summary = out.split(marker, 1)[-1].splitlines()[0].strip()
                    summary = f"Coverage {summary}"
                notification_service.send_discord(
                    f"✅ **EGX Multi-Source News Sync Success**\n{summary}",
                    is_error=False
                )
            else:
                error_tail = (err or out)[-800:] if (err or out) else f"Exit: {proc.returncode}"
                notification_service.send_discord(
                    f"❌ **EGX Multi-Source News Sync Failed**\n```{error_tail}```",
                    is_error=True
                )
        except Exception as e:
            logger.error(f"EGX multi-source news job error: {e}")

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

    async def run_egypt_yahoo_sync_job(self):
        """Runs the Egypt Yahoo Daily incremental sync every trading day at 16:30 Cairo."""
        try:
            from app.services.notification_service import notification_service
            backend_core_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            script_path = os.path.join(backend_core_dir, 'data_pipeline', 'egypt_yahoo_loader.py')
            
            proc = await asyncio.create_subprocess_exec(
                sys.executable, script_path, '--daily',
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            out = (stdout or b'').decode(errors='ignore')
            err = (stderr or b'').decode(errors='ignore')
            
            if proc.returncode == 0:
                logger.info("✅ Egypt Yahoo daily sync completed successfully.")
                
                # Parse pipeline stats
                processed = "?"
                saved = "?"
                errors = "?"
                duration = "?"
                
                for line in out.splitlines():
                    if "Stocks Processed" in line:
                        processed = line.split(":")[-1].strip()
                    elif "Candles Saved" in line:
                        saved = line.split(":")[-1].strip()
                    elif "Errors/Warnings" in line:
                        errors = line.split(":")[-1].strip()
                    elif "Duration" in line:
                        duration = line.split(":")[-1].strip()
                
                msg = (f"✅ **Egypt Yahoo Daily Sync Success**\n"
                       f"🏦 Stocks Synced  : **{processed}**\n"
                       f"📊 Candles Saved   : **{saved}**\n"
                       f"❌ Errors/Warnings : **{errors}**\n"
                       f"⏱️ Duration       : **{duration}**")
                notification_service.send_discord(msg, is_error=False)
            else:
                logger.error(f"❌ Egypt Yahoo daily sync failed with exit code {proc.returncode}: {err}")
                error_tail = (err or out)[-800:] if (err or out) else f"Exit: {proc.returncode}"
                notification_service.send_discord(
                    f"❌ **Egypt Yahoo Daily Sync Failed**\nExit: {proc.returncode}\n```{error_tail}```",
                    is_error=True
                )
        except Exception as e:
            logger.error(f"Egypt Yahoo sync job error: {e}")

    async def run_weekly_backup_job(self):
        """Weekly database backup job (runs every Thursday 03:00 Cairo)."""
        try:
            from app.services.backup_service import backup_service
            result = await backup_service.run_backup()
            logger.info(f"Weekly backup result: {result.get('status')}")
        except Exception as e:
            logger.error(f"Weekly backup job error: {e}")

    async def run_weekly_newsletter_job(self):
        """Weekly newsletter dispatch (runs every Sunday 08:00 Cairo)."""
        try:
            from app.services.newsletter_service import newsletter_service
            result = await newsletter_service.send_weekly_pulse()
            logger.info(f"Weekly newsletter result: {result}")
        except Exception as e:
            logger.error(f"Weekly newsletter job error: {e}")

    async def run_monthly_newsletter_job(self):
        """Monthly newsletter dispatch (runs 1st of each month 09:00 Cairo)."""
        try:
            from app.services.newsletter_service import newsletter_service
            result = await newsletter_service.send_monthly_deep_dive()
            logger.info(f"Monthly newsletter result: {result}")
        except Exception as e:
            logger.error(f"Monthly newsletter job error: {e}")

    async def run_academy_newsletter_job(self):
        """Academy newsletter dispatch (runs Wednesday 10:00 Cairo)."""
        try:
            from app.services.newsletter_service import newsletter_service
            result = await newsletter_service.send_academy_lessons()
            logger.info(f"Academy newsletter result: {result}")
        except Exception as e:
            logger.error(f"Academy newsletter job error: {e}")

    async def run_flash_alerts_job(self):
        """Flash Alerts Check (runs hourly)."""
        try:
            from app.services.newsletter_service import newsletter_service
            result = await newsletter_service.check_and_send_flash_alerts()
            logger.info(f"Flash alerts check result: {result}")
        except Exception as e:
            logger.error(f"Flash alerts job error: {e}")


scheduler_service = SchedulerService()
