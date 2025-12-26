"""
FAIR VALUES & ANALYST TARGETS EXTRACTOR
Target: All 453 Saudi stocks
Data: Fair value estimates, analyst price targets, upside potential
Method: Playwright (CSR)
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging
from datetime import datetime
import re

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [FAIRVALUE] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("fairvalue_extraction.log"),
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

async def extract_fair_values(page, symbol):
    """Extract fair values and analyst targets"""
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/fair-values"
    records = []
    
    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        
        data = await page.evaluate("""() => {
            const values = [];
            
            // Try midata first
            if (typeof midata !== 'undefined' && midata.fairValues) {
                return midata.fairValues;
            }
            
            // Scrape from DOM
            const cards = document.querySelectorAll('[class*="fair"], [class*="value"], .card');
            cards.forEach(card => {
                const text = card.textContent;
                const priceMatch = text.match(/([\\d.,]+)\\s*(?:ر\\.س|SAR)/);
                const percentMatch = text.match(/([+-]?[\\d.,]+)\\s*%/);
                
                if (priceMatch) {
                    values.push({
                        model: 'ANALYST_TARGET',
                        fair_value: parseFloat(priceMatch[1].replace(',', '')),
                        upside: percentMatch ? parseFloat(percentMatch[1]) : null
                    });
                }
            });
            
            // Also check tables
            const rows = document.querySelectorAll('table tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const model = cells[0]?.textContent?.trim();
                    const valueText = cells[1]?.textContent?.trim();
                    const valueMatch = valueText?.match(/([\\d.,]+)/);
                    if (valueMatch) {
                        values.push({
                            model: model || 'VALUATION',
                            fair_value: parseFloat(valueMatch[1].replace(',', ''))
                        });
                    }
                }
            });
            
            return values;
        }""")
        
        if data and len(data) > 0:
            for fv in data:
                records.append({
                    'symbol': symbol,
                    'valuation_model': fv.get('model', 'GENERAL'),
                    'fair_value': fv.get('fair_value'),
                    'upside_percent': fv.get('upside'),
                    'valuation_date': datetime.now().date()
                })
            
            logger.info(f"✅ {symbol}: Found {len(records)} fair values")
        else:
            logger.debug(f"⚠️ {symbol}: No fair values found")
            
    except Exception as e:
        logger.error(f"❌ {symbol}: {e}")
    
    return records

async def save_records(conn, records):
    saved = 0
    for rec in records:
        try:
            await conn.execute("""
                INSERT INTO fair_values 
                (symbol, valuation_model, fair_value, upside_percent, valuation_date)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (symbol, valuation_model, valuation_date) 
                DO UPDATE SET fair_value = EXCLUDED.fair_value,
                              upside_percent = EXCLUDED.upside_percent
            """, rec['symbol'], rec['valuation_model'], rec['fair_value'],
                rec['upside_percent'], rec['valuation_date'])
            saved += 1
        except Exception as e:
            logger.debug(f"DB Error: {e}")
    return saved

async def main():
    symbols = await get_all_symbols()
    logger.info(f"🎯 Extracting fair values for {len(symbols)} stocks")
    
    conn = await asyncpg.connect(DB_DSN)
    total_saved = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = await context.new_page()
        
        for idx, symbol in enumerate(symbols, 1):
            records = await extract_fair_values(page, symbol)
            if records:
                saved = await save_records(conn, records)
                total_saved += saved
                logger.info(f"💾 [{idx}/{len(symbols)}] {symbol}: Saved {saved} fair values")
            else:
                logger.info(f"⚠️ [{idx}/{len(symbols)}] {symbol}: No fair values")
            
            await asyncio.sleep(0.5)
        
        await browser.close()
    
    await conn.close()
    logger.info(f"🎉 Complete! Total fair value records: {total_saved}")

if __name__ == "__main__":
    asyncio.run(main())
