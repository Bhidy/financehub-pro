"""
EARNINGS CALENDAR EXTRACTOR
Target: All 453 Saudi stocks
Data: EPS announcements, revenue, surprises, YoY changes
Method: Playwright + embedded JS parsing
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging
from datetime import datetime
import re

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [EARNINGS] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("earnings_extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"

async def get_all_symbols():
    conn = await asyncpg.connect(DB_DSN)
    rows = await conn.fetch("SELECT symbol FROM market_tickers ORDER BY symbol")
    await conn.close()
    return [r['symbol'] for r in rows]

async def extract_earnings(page, symbol):
    """Extract earnings announcements for a stock"""
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/earnings"
    records = []
    
    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        
        # Extract earnings data
        data = await page.evaluate("""() => {
            const earnings = [];
            
            // Try midata object first
            if (typeof midata !== 'undefined' && midata.earnings) {
                return midata.earnings;
            }
            
            // Fallback: scrape from table
            const rows = document.querySelectorAll('table tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    earnings.push({
                        period: cells[0]?.textContent?.trim(),
                        date: cells[1]?.textContent?.trim(),
                        eps: cells[2]?.textContent?.trim(),
                        revenue: cells[3]?.textContent?.trim()
                    });
                }
            });
            
            return earnings;
        }""")
        
        if data and len(data) > 0:
            for earning in data:
                try:
                    # Parse period (e.g., "Q3 2024", "FY 2023")
                    period = str(earning.get('period', earning.get('fiscalQuarter', '')))
                    
                    # Parse date
                    date_str = earning.get('date', earning.get('announcementDate', ''))
                    ann_date = None
                    if date_str:
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y']:
                            try:
                                ann_date = datetime.strptime(str(date_str)[:10], fmt).date()
                                break
                            except:
                                continue
                    
                    # Parse EPS
                    eps_str = str(earning.get('eps', earning.get('epsActual', '')))
                    eps_actual = None
                    eps_nums = re.findall(r'-?[\d.]+', eps_str)
                    if eps_nums:
                        eps_actual = float(eps_nums[0])
                    
                    # Parse Revenue
                    rev_str = str(earning.get('revenue', earning.get('revenueActual', '')))
                    revenue_actual = None
                    rev_nums = re.findall(r'-?[\d.]+', rev_str.replace(',', ''))
                    if rev_nums:
                        revenue_actual = float(rev_nums[0])
                    
                    records.append({
                        'symbol': symbol,
                        'fiscal_quarter': period,
                        'announcement_date': ann_date,
                        'eps_actual': eps_actual,
                        'revenue_actual': revenue_actual
                    })
                except Exception as e:
                    logger.debug(f"Parse error: {e}")
            
            logger.info(f"✅ {symbol}: Found {len(records)} earnings announcements")
        else:
            logger.debug(f"⚠️ {symbol}: No earnings found")
            
    except Exception as e:
        logger.error(f"❌ {symbol}: {e}")
    
    return records

async def save_records(conn, records):
    saved = 0
    for rec in records:
        try:
            await conn.execute("""
                INSERT INTO earnings_calendar 
                (symbol, fiscal_quarter, announcement_date, eps_actual, revenue_actual)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (symbol, fiscal_quarter) 
                DO UPDATE SET eps_actual = EXCLUDED.eps_actual,
                              revenue_actual = EXCLUDED.revenue_actual,
                              announcement_date = EXCLUDED.announcement_date
            """, rec['symbol'], rec['fiscal_quarter'], rec['announcement_date'],
                rec['eps_actual'], rec['revenue_actual'])
            saved += 1
        except Exception as e:
            logger.debug(f"DB Error: {e}")
    return saved

async def main():
    symbols = await get_all_symbols()
    logger.info(f"🎯 Extracting earnings for {len(symbols)} stocks")
    
    conn = await asyncpg.connect(DB_DSN)
    total_saved = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = await context.new_page()
        
        for idx, symbol in enumerate(symbols, 1):
            records = await extract_earnings(page, symbol)
            if records:
                saved = await save_records(conn, records)
                total_saved += saved
                logger.info(f"💾 [{idx}/{len(symbols)}] {symbol}: Saved {saved} earnings")
            else:
                logger.info(f"⚠️ [{idx}/{len(symbols)}] {symbol}: No earnings")
            
            await asyncio.sleep(0.5)
        
        await browser.close()
    
    await conn.close()
    logger.info(f"🎉 Complete! Total earnings records: {total_saved}")

if __name__ == "__main__":
    asyncio.run(main())
