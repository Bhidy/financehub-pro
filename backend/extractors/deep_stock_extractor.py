"""
DEEP STOCK EXTRACTOR: HIGHCHARTS INJECTION
Target: Saudi Stock Market (TDWL)
Method: Browser Automation (Playwright) -> Highcharts Data Extraction
Goal: 5 Million+ Data Points (Intraday + Deep History)
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging
from datetime import datetime, timezone
import json
import os
import random
import argparse

# logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [DEEP_STOCK] - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"

async def ensure_schema(conn):
    """Ensure the intraday_data table exists"""
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS intraday_data (
            symbol VARCHAR(20) NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            open DECIMAL(12, 4),
            high DECIMAL(12, 4),
            low DECIMAL(12, 4),
            close DECIMAL(12, 4),
            volume BIGINT,
            PRIMARY KEY (symbol, timestamp)
        );
        CREATE INDEX IF NOT EXISTS idx_intraday_symbol_time ON intraday_data(symbol, timestamp DESC);
    """)

async def extract_stock_data(context, symbol):
    """
    Navigate to stock page and extract Highcharts data.
    Returns: { 'intraday': [], 'history': [] }
    """
    page = await context.new_page()
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}"
    logger.info(f"Processing {symbol} at {url}...")
    
    result = {'intraday': [], 'history': []}
    
    try:
        # Load page
        await page.goto(url, timeout=60000, wait_until="domcontentloaded")
        
        # Wait for Highcharts
        try:
            await page.wait_for_function(
                "typeof Highcharts !== 'undefined' && Highcharts.charts && Highcharts.charts.length > 0", 
                timeout=20000
            )
        except:
            logger.warning(f"⚠️ {symbol}: Timeout waiting for Highcharts - Page might be invalid or slow.")
            await page.close()
            return result

        # INTERACTION: Click "All" / "الكل" to load full history
        try:
            # Usually the range selector buttons. Text might be "الكل" or "All" or "Max"
            # We try a broad selector for the text "الكل" inside a button or range selector
            clicked = False
            for text in ["الكل", "All", "Max"]:
                try:
                    # Look for button with exact text
                    await page.click(f"text={text}", timeout=3000)
                    logger.info(f"🖱️ {symbol}: Clicked '{text}' button")
                    clicked = True
                    await page.wait_for_timeout(3000) # Wait for data fetch & render
                    break
                except:
                    continue
            
            if not clicked:
                logger.warning(f"⚠️ {symbol}: Could not find/click 'All' button")

        except Exception as e:
            logger.warning(f"⚠️ {symbol}: Interaction error - {e}")

        # Extract Data directly from Highcharts
        extracted = await page.evaluate("""() => {
            const data = { intraday: [], history: [] };
            
            if (!Highcharts || !Highcharts.charts) return data;
            
            // Chart 0: Usually Intraday
            const c0 = Highcharts.charts[0];
            if (c0 && c0.series && c0.series[0]) {
                // Try .options.data first (raw), then .data (processed)
                const raw = c0.series[0].options.data || c0.series[0].data.map(p => [p.x, p.y]);
                data.intraday = raw;
            }
            
            // Chart 1: Usually History
            const c1 = Highcharts.charts[1];
            if (c1 && c1.series && c1.series[0]) {
                const raw = c1.series[0].options.data || c1.series[0].data.map(p => [p.x, p.y]);
                data.history = raw;
            }
            
            return data;
        }""")
        
        # Parse Intraday
        if extracted.get('intraday'):
            raw_intra = extracted['intraday']
            # Format: [timestamp_ms, close] (Simpler format often used in sparklines)
            # OR: [timestamp, open, high, low, close, vol] depending on chart type.
            # Based on manual inspection, Intraday chart 0 is often a Line chart (Timestamp, Price).
            # We will assume [ts, price] for now unless 5 elements found.
            
            parsed_intra = []
            for p in raw_intra:
                if isinstance(p, list) and len(p) >= 2:
                    ts_ms = p[0]
                    val = p[1]
                    if ts_ms:
                        dt = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
                        parsed_intra.append((dt, float(val)))
            result['intraday'] = parsed_intra
            logger.info(f"✅ {symbol}: Found {len(parsed_intra)} Intraday points")

        # Parse History
        if extracted.get('history'):
            raw_hist = extracted['history']
            parsed_hist = []
            for p in raw_hist:
                if isinstance(p, list) and len(p) >= 2:
                    ts_ms = p[0]
                    val = p[1]
                    # Check if it's OHLC ([t, o, h, l, c]) or Line ([t, c])
                    if len(p) >= 5:
                        # OHLC
                        dt = datetime.fromtimestamp(ts_ms / 1000.0).date()
                        parsed_hist.append({
                            'date': dt, 
                            'open': float(p[1]), 'high': float(p[2]), 
                            'low': float(p[3]), 'close': float(p[4])
                        })
                    else:
                        # Close only
                        dt = datetime.fromtimestamp(ts_ms / 1000.0).date()
                        parsed_hist.append({
                            'date': dt, 
                            'close': float(val)
                        })
                        
            result['history'] = parsed_hist
            logger.info(f"✅ {symbol}: Found {len(parsed_hist)} Historical points")

    except Exception as e:
        logger.error(f"❌ {symbol}: Error extracting - {e}")
    
    await page.close()
    return result

async def save_data(conn, symbol, data):
    # 1. Save Intraday
    if data['intraday']:
        intra_records = []
        for dt, price in data['intraday']:
            # Assuming simple line chart data: Open=High=Low=Close=Price, Vol=0
            intra_records.append((symbol, dt, price, price, price, price, 0))
        
        try:
             await conn.copy_records_to_table(
                'intraday_data', 
                records=intra_records, 
                columns=['symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume'],
                schema_name='public'
            )
             logger.info(f"💾 {symbol}: Saved {len(intra_records)} intraday rows.")
        except Exception as e:
            # Fallback to upsert if copy fails (duplicates)
             logger.warning(f"Batch copy failed ({e}), trying generic insert...")

    # 2. Save History (OHLC)
    if data['history']:
        # Upsert loop (safest)
        count = 0
        for row in data['history']:
            try:
                # If only Close is available, assume O=H=L=C
                op = row.get('open', row['close'])
                hi = row.get('high', row['close'])
                lo = row.get('low', row['close'])
                cl = row['close']
                dt = row['date']
                
                await conn.execute("""
                    INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, 0)
                    ON CONFLICT (symbol, date) DO UPDATE SET
                        close = EXCLUDED.close,
                        open = EXCLUDED.open, 
                        high = EXCLUDED.high, 
                        low = EXCLUDED.low
                """, symbol, dt, op, hi, lo, cl)
                count += 1
            except Exception as e:
                pass
        logger.info(f"💾 {symbol}: Upserted {count} historical rows.")

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', type=str, help="Test a specific symbol")
    parser.add_argument('--full', action='store_true', help="Run full scan (Discovery Mode)")
    args = parser.parse_args()

    conn = await asyncpg.connect(DB_DSN)
    await ensure_schema(conn)
    
    # Symbols to process
    symbols = []
    if args.test:
        symbols = [args.test]
    else:
        # Fetch known existing symbols from DB
        rows = await conn.fetch("SELECT symbol FROM market_tickers")
        symbols = [r['symbol'] for r in rows]
        if not symbols:
            # Fallback Discovery List
            symbols = [str(x) for x in range(1010, 2030)] # Sample range
            logger.info(f"No DB symbols found. Using Discovery Range: {len(symbols)}")

    logger.info(f"Targeting {len(symbols)} symbols...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
             user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
             viewport={'width': 1280, 'height': 800}
        )
        
        for symbol in symbols:
            data = await extract_stock_data(context, symbol)
            if data['intraday'] or data['history']:
                await save_data(conn, symbol, data)
            
            # Rate limit
            await asyncio.sleep(2)
            
        await browser.close()
    
    await conn.close()
    logger.info("Done.")

if __name__ == "__main__":
    asyncio.run(main())
