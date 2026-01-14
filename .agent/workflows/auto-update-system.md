---
description: Comprehensive documentation of the FinanceHub Pro Auto-Update System
---

# FinanceHub Pro Auto-Update System

This document details the enterprise-grade automated data ingestion system for FinanceHub Pro. The system runs on HuggingFace Spaces (FastAPI Backend) and orchestrates data collection from multiple sources (Saudi Market, Egyptian Market, Mutual Funds) into a unified PostgreSQL database.

## System Architecture

The core of the system is `app/services/scheduler.py`, which uses **APScheduler (AsyncIO)** to manage 6 distinct tiers of data jobs.

### Scheduler Configuration
- **Timezone**: `Africa/Cairo` (All schedules observe this timezone)
- **Execution Mode**: `AsyncIOScheduler` (Non-blocking)
- **Persistence**: Jobs are stateless (re-initialized on server startup) but use checking logic to avoid redundant work.
- **Error Handling**: Wrapped in expansive `try/catch` blocks with Discord notifications.

### Startup Sequence
When the API starts (`app/main.py`):
1.  **DB Connection**: Initializes connection pool.
2.  **Scheduler Start**: Call `scheduler_service.start()`.
3.  **Startup Catch-Up**:
    -   Checks the last OHLC date in the database.
    -   If data is >3 days stale (e.g., after server downtime), it immediately triggers a background "Catch-Up" job.

---

## Job Tiers & Logic

### Tier 1A: Intraday Prices (Live)
Refreshes KSA and EGX stock prices every minute during active market sessions.

-   **Schedule**: `Mon-Thu, Sun`, `10:00 - 15:59` (Every minute)
-   **Function**: `run_market_job_silent` -> `app.api.v1.endpoints.admin.refresh_all_prices`
-   **Logic**:
    -   **Parallel Execution**: Runs Saudi (yfinance) and Egypt (StockAnalysis/Screener) updates concurrently.
    -   **Optimized Upsert**: Updates `market_tickers` info (Last Price, Change %, Volume).
    -   **Silent Mode**: Does not send success notifications to avoid spam; only logs errors.

### Tier 1B: Daily Market Close
Finalizes the day's data and ensures OHLC history is recorded.

-   **Schedule**: `Mon-Thu, Sun` at `15:30` (Cairo)
-   **Function**: `run_market_job_loud` -> `data_pipeline.market_loader.run_daily_market_job`
-   **Logic**:
    -   Uses `EGXProductionLoader` class.
    -   Fetches definitive End-Of-Day data.
    -   **Notifications**: Sends a "Daily Close Success" report to Discord with updated ticker counts.

### Tier 2: Weekly Data Sweep
Deep maintenance job to fill gaps and ensure data integrity.

-   **Schedule**: `Friday` at `00:00` (Midnight)
-   **Function**: `run_maintenance_job` -> `data_pipeline.ingest_stockanalysis.run_ingestion_job`
-   **Logic**:
    -   Runs a full crawl of all tickers.
    -   Updates static data: Market Cap, Sector Map, Profiles.
    -   Fills any missing historical data from the week.

### Tier 3: Seasonal Earnings
Captures financial statements during earnings seasons.

-   **Schedule**: `Months 1,4,7,10` (Quarterly) at `02:00` daily.
-   **Function**: `run_maintenance_job` (Reused)
-   **Logic**: Same as Tier 2 but scheduled specifically to catch new financial reports (Income St, Balance Sheet) during peak reporting periods.

### Tier 4: External Syncs (Funds & News)
Synchronizes data from specialized external sources.

1.  **Decypha Sync (Funds)**
    -   **Schedule**: Daily at `18:00`
    -   **Function**: `run_decypha_job` -> `app.services.decypha_provider.sync_funds`
    -   **Target**: Updates Mutual Fund NAVs and metadata.
    
2.  **Mubasher Sync**
    -   **Schedule**: Daily at `06:00`
    -   **Function**: `run_mubasher_job` -> `scripts/scrape_mubasher.py`
    -   **Method**: Subprocess execution.

### Tier 5: Rubix Watchlist (Real-Time Backup)
Uses a headless browser to scrape "Rubix" watchlist data as a secondary source.

-   **Schedule**: Market Hours (`10-15`), every minute.
-   **Function**: `run_rubix_watchlist_job` -> `scripts/archive/rubix_watchlist_extractor.py`
-   **Method**: Playwright (Headless Browser) running in a subprocess.
-   **Note**: Updates are throttled to notify only every 15 minutes.

### Tier 6: Redundant Data Watchdog
Safety net to prevent data stagnation.

-   **Schedule**: Every `4 Hours`.
-   **Function**: `run_ohlc_catchup_job`
-   **Logic**:
    -   Queries DB: `SELECT MAX(date) FROM ohlc_data`.
    -   If date is >2 days old and it's a weekday -> **TRIGGER EMERGENCY UPDATE**.
    -   Else -> Do nothing.

---

## File Map

| Component | File Path |
| :--- | :--- |
| **Scheduler Engine** | `hf-space/app/services/scheduler.py` |
| **Notification Service** | `hf-space/app/services/notification_service.py` |
| **Intraday Logic** | `hf-space/app/api/v1/endpoints/admin.py` |
| **Daily Loader (EGX)** | `hf-space/data_pipeline/market_loader.py` |
| **Funds Sync** | `hf-space/app/services/decypha_provider.py` |
| **Rubix Scraper** | `hf-space/scripts/archive/rubix_watchlist_extractor.py` |
| **Mubasher Scraper** | `hf-space/scripts/scrape_mubasher.py` |

## Troubleshooting

### "Stale Data" Alert
If you receive a "Stale Data Detected" alert:
1.  Check the HuggingFace Space logs.
2.  The scheduler likely crashed or the container was sleeping.
3.  Restart the Space to trigger the **Startup Catch-Up** automatically.

### "Rubix Job Failed"
1.  This job uses a headless browser (Playwright).
2.  Ensure the container has `playwright install chromium` dependencies.
3.  Check `scripts/archive/rubix_watchlist_extractor.py` logs.

### Adding a New Job
1.  Define the async function in `scheduler.py`.
2.  Wrap it in a `try/except` block.
3.  Add it to `start()` using `self.scheduler.add_job`.
4.  Use **Lazy Imports** inside the function to prevent circular dependency crashes.
