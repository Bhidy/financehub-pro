"""
FULL HISTORY EXTRACTOR: MUTUAL FUNDS (Highcharts Injection)
Target: 620 Funds
Method: Browser Automation (Playwright)
Concurrency: 5 Parallel Tabs
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging
from datetime import datetime
import json
import os

# logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [HISTORY] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("history_extractor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"
CONCURRENCY = 1

async def fetch_fund_ids():
    conn = await asyncpg.connect(DB_DSN)
    rows = await conn.fetch("SELECT fund_id FROM mutual_funds ORDER BY fund_id")
    await conn.close()
    return [r['fund_id'] for r in rows]

async def extract_fund_history(context, fund_id):
    page = await context.new_page()
    url = f"https://www.mubasher.info/countries/sa/funds/{fund_id}"
    logger.info(f"Processing {fund_id}...")
    
    result_data = []
    
    try:
        # Optimized load: domcontentloaded is usually enough for the skeleton, 
        # but Highcharts renders after scripts.
        await page.goto(url, timeout=40000, wait_until="domcontentloaded")
        
        # Wait for Highcharts to exist (polling)
        try:
            await page.wait_for_function("typeof Highcharts !== 'undefined' && Highcharts.charts && Highcharts.charts.some(c => c)", timeout=15000)
        except:
            logger.warning(f"Timeout waiting for Highcharts on {fund_id}")
            await page.close()
            return []

        # Extract Data
        data = await page.evaluate("""() => {
            if (typeof Highcharts === 'undefined' || !Highcharts.charts) return null;
            const chart = Highcharts.charts.find(c => c);
            if (!chart || !chart.series || !chart.series[0]) return null;
            
            // Prefer options.data (raw) over data (processed/sampled)
            const raw = chart.series[0].options.data; 
            if (raw && raw.length > 0) return raw;
            
            // Fallback to series.data
            return chart.series[0].data.map(p => [p.x, p.y]);
        }""")
        
        if data:
            logger.info(f"✅ {fund_id}: Found {len(data)} points.")
            # Convert to list of (date, value)
            # data is [[timestamp, value], ...]
            unique_map = {}
            for point in data:
                if isinstance(point, list) and len(point) >= 2:
                    ts = point[0]
                    val = point[1]
                    if ts and val is not None:
                        dt = datetime.fromtimestamp(ts / 1000.0).date()
                        unique_map[dt] = float(val)
            
            # Convert to list
            result_data = [(fund_id, d, v) for d, v in unique_map.items()]
            logger.info(f"✅ {fund_id}: Found {len(result_data)} unique points.")
        else:
            logger.warning(f"❌ {fund_id}: No data found in Highcharts.")

    except Exception as e:
        logger.error(f"Error processing {fund_id}: {e}")
    
    await page.close()
    return result_data

import random

async def worker(queue, browser, pool):
    while True:
        fund_id = await queue.get()
        if fund_id is None:
            break
        
        success = False
        for attempt in range(1, 4):
            try:
                # Fresh context often helps
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                
                records = await extract_fund_history(context, fund_id)
                await context.close()
                
                if records:
                    async with pool.acquire() as conn:
                        try:
                            # Cleanup and Insert
                            await conn.execute("DELETE FROM nav_history WHERE fund_id = $1", fund_id)
                            await conn.copy_records_to_table(
                                'nav_history', records=records, columns=['fund_id', 'date', 'nav'], schema_name='public'
                            )
                            success = True
                            # Optional: Update 'last_updated' in mutual_funds?
                        except Exception as e:
                            logger.error(f"DB Error {fund_id}: {e}")
                    
                    break # Success break
                else:
                    logger.warning(f"Attempt {attempt} failed for {fund_id} (No data).")
                    
            except Exception as e:
                logger.error(f"Attempt {attempt} error {fund_id}: {e}")
            
            # Exponential Backoff
            sleep_time = random.uniform(5, 15) * attempt
            await asyncio.sleep(sleep_time)

        if not success:
            logger.error(f"❌ Failed to process {fund_id} after 3 attempts.")
        
        # Rate Limiting between funds
        await asyncio.sleep(random.uniform(5, 10))
        queue.task_done()

async def main():
    # 1. Get Funds
    try:
        fund_ids = await fetch_fund_ids()
        # Shuffle to avoid hitting sequential hot-spots
        random.shuffle(fund_ids)
        logger.info(f"Loaded {len(fund_ids)} funds to process.")
    except Exception as e:
# ... (rest of main)
        logger.error(f"DB Error: {e}")
        return

    # 2. Setup DB Pool
    pool = await asyncpg.create_pool(DB_DSN)

    # 3. Setup Browser
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # 4. Queue
        queue = asyncio.Queue()
        for fid in fund_ids:
            queue.put_nowait(fid)
            
        # 5. Workers
        tasks = []
        for _ in range(CONCURRENCY):
            task = asyncio.create_task(worker(queue, browser, pool))
            tasks.append(task)
            
        # 6. Wait
        await queue.join()
        
        # Stop workers
        for _ in range(CONCURRENCY):
            queue.put_nowait(None)
        await asyncio.gather(*tasks)
        
        await browser.close()
        
    await pool.close()
    logger.info("🎉 All Funds Processed.")

if __name__ == "__main__":
    asyncio.run(main())
