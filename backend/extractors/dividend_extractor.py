"""
DIVIDENDS & CORPORATE ACTIONS EXTRACTOR
Target: All 453 Saudi stocks
Data: Historical dividends, splits, bonus shares, rights issues
Method: Playwright (CSR data extraction)
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging
from datetime import datetime
import re

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [DIVIDENDS] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("dividend_extraction.log"),
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

async def extract_corporate_actions(page, symbol):
    """Extract dividends and corporate actions for a stock"""
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/corporate-action"
    records = []
    
    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        
        # Extract from embedded JS data
        data = await page.evaluate("""() => {
            // Try to find corporate actions data
            if (typeof midata !== 'undefined' && midata.corporateActions) {
                return midata.corporateActions;
            }
            
            // Fallback: scrape from DOM
            const rows = document.querySelectorAll('table tbody tr');
            const actions = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    actions.push({
                        type: cells[0]?.textContent?.trim(),
                        date: cells[1]?.textContent?.trim(),
                        details: cells[2]?.textContent?.trim()
                    });
                }
            });
            return actions;
        }""")
        
        if data and len(data) > 0:
            for action in data:
                try:
                    # Parse action type
                    action_type = 'DIVIDEND'
                    if 'تجزئة' in str(action.get('type', '')):
                        action_type = 'SPLIT'
                    elif 'منحة' in str(action.get('type', '')):
                        action_type = 'BONUS'
                    elif 'حقوق' in str(action.get('type', '')):
                        action_type = 'RIGHTS'
                    
                    # Parse date
                    date_str = action.get('date', action.get('exDate', ''))
                    ex_date = None
                    if date_str:
                        try:
                            # Try various date formats
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                                try:
                                    ex_date = datetime.strptime(date_str[:10], fmt).date()
                                    break
                                except:
                                    continue
                        except:
                            pass
                    
                    # Parse dividend amount
                    dividend_amount = None
                    details = str(action.get('details', action.get('amount', '')))
                    amounts = re.findall(r'[\d.]+', details)
                    if amounts:
                        dividend_amount = float(amounts[0])
                    
                    records.append({
                        'symbol': symbol,
                        'action_type': action_type,
                        'ex_date': ex_date,
                        'dividend_amount': dividend_amount,
                        'raw_data': action
                    })
                except Exception as e:
                    logger.debug(f"Parse error: {e}")
                    
            logger.info(f"✅ {symbol}: Found {len(records)} corporate actions")
        else:
            logger.debug(f"⚠️ {symbol}: No corporate actions found")
            
    except Exception as e:
        logger.error(f"❌ {symbol}: {e}")
    
    return records

async def save_records(conn, records):
    saved = 0
    for rec in records:
        try:
            await conn.execute("""
                INSERT INTO corporate_actions 
                (symbol, action_type, ex_date, dividend_amount, raw_data)
                VALUES ($1, $2, $3, $4, $5::jsonb)
                ON CONFLICT (symbol, action_type, ex_date) 
                DO UPDATE SET dividend_amount = EXCLUDED.dividend_amount,
                              raw_data = EXCLUDED.raw_data
            """, rec['symbol'], rec['action_type'], rec['ex_date'], 
                rec['dividend_amount'], str(rec['raw_data']).replace("'", '"'))
            saved += 1
        except Exception as e:
            logger.debug(f"DB Error: {e}")
    return saved

async def main():
    symbols = await get_all_symbols()
    logger.info(f"🎯 Extracting dividends for {len(symbols)} stocks")
    
    conn = await asyncpg.connect(DB_DSN)
    total_saved = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = await context.new_page()
        
        for idx, symbol in enumerate(symbols, 1):
            records = await extract_corporate_actions(page, symbol)
            if records:
                saved = await save_records(conn, records)
                total_saved += saved
                logger.info(f"💾 [{idx}/{len(symbols)}] {symbol}: Saved {saved} actions")
            else:
                logger.info(f"⚠️ [{idx}/{len(symbols)}] {symbol}: No actions")
            
            await asyncio.sleep(1)  # Rate limiting
        
        await browser.close()
    
    await conn.close()
    logger.info(f"🎉 Complete! Total corporate actions: {total_saved}")

if __name__ == "__main__":
    asyncio.run(main())
