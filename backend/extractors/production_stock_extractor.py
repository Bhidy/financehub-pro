"""
PRODUCTION STOCK EXTRACTOR: PARALLEL EXECUTION
Target: 453 Saudi stocks
Method: Playwright + Highcharts (Proven method from mutual funds)
Concurrency: 5 parallel tabs
Expected Output: 500K+ OHLC points + 1M+ intraday points
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging
from datetime import datetime, timezone
import random

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [PROD_STOCK] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("stock_extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"
CONCURRENCY = 5  # Parallel tabs

async def fetch_stock_symbols():
    """Get all stock symbols from DB"""
    conn = await asyncpg.connect(DB_DSN)
    rows = await conn.fetch("SELECT symbol FROM market_tickers ORDER BY symbol")
    await conn.close()
    return [r['symbol'] for r in rows]

async def extract_stock_data(context, symbol):
    """Extract historical + intraday data for one stock"""
    page = await context.new_page()
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}"
    logger.info(f"Processing {symbol}...")
    
    result = {'intraday': [], 'history': []}
    
    try:
        await page.goto(url, timeout=60000, wait_until="domcontentloaded")
        
        # Wait for Highcharts
        try:
            await page.wait_for_function(
                "typeof Highcharts !== 'undefined' && Highcharts.charts && Highcharts.charts.length > 0", 
                timeout=20000
            )
        except:
            logger.warning(f"⚠️ {symbol}: No charts found (might be invalid ticker)")
            await page.close()
            return result

        # Click "All" button for full history
        try:
            for text in ["الكل", "All", "Max"]:
                try:
                    await page.click(f"text={text}", timeout=3000)
                    logger.debug(f"🖱️ {symbol}: Clicked '{text}'")
                    await page.wait_for_timeout(3000)
                    break
                except:
                    continue
        except Exception as e:
            logger.debug(f"⚠️ {symbol}: No 'All' button interaction - {e}")

        # Extract from Highcharts
        extracted = await page.evaluate("""() => {
            const data = { intraday: [], history: [] };
            
            if (!Highcharts || !Highcharts.charts) return data;
            
            // Chart 0: Intraday
            const c0 = Highcharts.charts[0];
            if (c0 && c0.series && c0.series[0]) {
                const raw = c0.series[0].options.data || c0.series[0].data.map(p => [p.x, p.y]);
                data.intraday = raw;
            }
            
            // Chart 1: Historical OHLC
            const c1 = Highcharts.charts[1];
            if (c1 && c1.series && c1.series[0]) {
                const raw = c1.series[0].options.data || c1.series[0].data.map(p => {
                    if (p.x !== undefined) {
                        return [p.x, p.open || p.y, p.high || p.y, p.low || p.y, p.close || p.y];
                    }
                    return null;
                }).filter(x => x);
                data.history = raw;
            }
            
            return data;
        }""")
        
        # Parse Intraday
        if extracted.get('intraday'):
            for p in extracted['intraday']:
                if isinstance(p, list) and len(p) >= 2:
                    ts_ms = p[0]
                    val = p[1]
                    if ts_ms and val is not None:
                        dt = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
                        result['intraday'].append((dt, float(val)))
            logger.info(f"✅ {symbol}: {len(result['intraday'])} intraday points")

        # Parse History
        if extracted.get('history'):
            for p in extracted['history']:
                if isinstance(p, list) and len(p) >= 5:
                    ts_ms, o, h, l, c = p[0], p[1], p[2], p[3], p[4]
                    if ts_ms:
                        dt = datetime.fromtimestamp(ts_ms / 1000.0).date()
                        result['history'].append({
                            'date': dt, 
                            'open': float(o), 
                            'high': float(h), 
                            'low': float(l), 
                            'close': float(c)
                        })
            logger.info(f"✅ {symbol}: {len(result['history'])} historical points")

    except Exception as e:
        logger.error(f"❌ {symbol}: {e}")
    
    await page.close()
    return result

async def save_data(pool, symbol, data):
    """Save extracted data to database"""
    async with pool.acquire() as conn:
        # Save Intraday
        if data['intraday']:
            try:
                records = [(symbol, dt, price, price, price, price, 0) for dt, price in data['intraday']]
                await conn.execute("DELETE FROM intraday_data WHERE symbol = $1", symbol)
                await conn.copy_records_to_table(
                    'intraday_data', 
                    records=records, 
                    columns=['symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume']
                )
                logger.info(f"💾 {symbol}: Saved {len(records)} intraday rows")
            except Exception as e:
                logger.error(f"DB Error (intraday) {symbol}: {e}")

        # Save Historical
        if data['history']:
            count = 0
            for row in data['history']:
                try:
                    await conn.execute("""
                        INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                        VALUES ($1, $2, $3, $4, $5, $6, 0)
                        ON CONFLICT (symbol, date) DO UPDATE SET
                            open = EXCLUDED.open, high = EXCLUDED.high, 
                            low = EXCLUDED.low, close = EXCLUDED.close
                    """, symbol, row['date'], row['open'], row['high'], row['low'], row['close'])
                    count += 1
                except:
                    pass
            logger.info(f"💾 {symbol}: Saved {count} historical rows")

async def worker(queue, browser, pool):
    """Worker process for parallel extraction"""
    while True:
        symbol = await queue.get()
        if symbol is None:
            break
        
        success = False
        for attempt in range(1, 3):
            try:
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                )
                
                data = await extract_stock_data(context, symbol)
                await context.close()
                
                if data['intraday'] or data['history']:
                    await save_data(pool, symbol, data)
                    success = True
                    break
                else:
                    logger.warning(f"Attempt {attempt}: {symbol} returned no data")
                    
            except Exception as e:
                logger.error(f"Attempt {attempt} error {symbol}: {e}")
            
            await asyncio.sleep(random.uniform(2, 5))

        if not success:
            logger.error(f"❌ Failed {symbol} after retries")
        
        await asyncio.sleep(random.uniform(1, 3))  # Rate limiting
        queue.task_done()

async def main():
    # 1. Get symbols
    symbols = await fetch_stock_symbols()
    random.shuffle(symbols)  # Distribute load
    logger.info(f"🎯 Targeting {len(symbols)} stocks with {CONCURRENCY} parallel workers")
    
    # 2. DB Pool
    pool = await asyncpg.create_pool(DB_DSN)
    
    # 3. Browser
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # 4. Queue
        queue = asyncio.Queue()
        for sym in symbols:
            queue.put_nowait(sym)
            
        # 5. Workers
        tasks = [asyncio.create_task(worker(queue, browser, pool)) for _ in range(CONCURRENCY)]
        
        # 6. Wait
        await queue.join()
        
        # Stop workers
        for _ in range(CONCURRENCY):
            queue.put_nowait(None)
        await asyncio.gather(*tasks)
        
        await browser.close()
        
    await pool.close()
    logger.info("🎉 All stocks processed!")

if __name__ == "__main__":
    asyncio.run(main())
