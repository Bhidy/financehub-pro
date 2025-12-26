"""
MAJOR SHAREHOLDERS EXTRACTOR
Target: All 453 Saudi stocks
Data: Ownership structure, institutional holdings, insider ownership
Method: Playwright + DOM scraping
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging
from datetime import datetime
import re
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [SHAREHOLDERS] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("shareholder_extraction.log"),
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

async def extract_shareholders(page, symbol):
    """Extract major shareholders for a stock"""
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/major-shareholders"
    records = []
    
    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        
        # Extract shareholders from DOM
        data = await page.evaluate("""() => {
            const shareholders = [];
            
            // Look for ownership structure section
            const items = document.querySelectorAll('[class*="shareholder"], [class*="owner"], li');
            
            items.forEach(item => {
                const text = item.textContent.trim();
                // Match patterns like "Name (X.XX%)"
                const match = text.match(/(.+?)\\s*\\(([\\d.,]+)%?\\)/);
                if (match) {
                    shareholders.push({
                        name: match[1].trim(),
                        percent: parseFloat(match[2].replace(',', '.'))
                    });
                }
            });
            
            // Also try table format
            const rows = document.querySelectorAll('table tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const name = cells[0]?.textContent?.trim();
                    const percentText = cells[1]?.textContent?.trim();
                    const percentMatch = percentText?.match(/([\\d.,]+)/);
                    if (name && percentMatch) {
                        shareholders.push({
                            name: name,
                            percent: parseFloat(percentMatch[1].replace(',', '.'))
                        });
                    }
                }
            });
            
            return shareholders;
        }""")
        
        if data and len(data) > 0:
            for sh in data:
                # Determine shareholder type
                sh_type = 'INSTITUTION'
                name = sh.get('name', '').lower()
                if 'حكومة' in name or 'government' in name:
                    sh_type = 'GOVERNMENT'
                elif 'صندوق' in name or 'fund' in name:
                    sh_type = 'FUND'
                elif any(x in name for x in ['بن', 'آل', 'عبد']):
                    sh_type = 'INDIVIDUAL'
                
                records.append({
                    'symbol': symbol,
                    'shareholder_name': sh.get('name', 'Unknown'),
                    'ownership_percent': sh.get('percent', 0),
                    'shareholder_type': sh_type,
                    'as_of_date': datetime.now().date()
                })
            
            logger.info(f"✅ {symbol}: Found {len(records)} shareholders")
        else:
            logger.debug(f"⚠️ {symbol}: No shareholders found")
            
    except Exception as e:
        logger.error(f"❌ {symbol}: {e}")
    
    return records

async def save_records(conn, records):
    saved = 0
    for rec in records:
        try:
            await conn.execute("""
                INSERT INTO major_shareholders 
                (symbol, shareholder_name, ownership_percent, shareholder_type, as_of_date)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (symbol, shareholder_name, as_of_date) 
                DO UPDATE SET ownership_percent = EXCLUDED.ownership_percent,
                              shareholder_type = EXCLUDED.shareholder_type
            """, rec['symbol'], rec['shareholder_name'], rec['ownership_percent'],
                rec['shareholder_type'], rec['as_of_date'])
            saved += 1
        except Exception as e:
            logger.debug(f"DB Error: {e}")
    return saved

async def main():
    symbols = await get_all_symbols()
    logger.info(f"🎯 Extracting shareholders for {len(symbols)} stocks")
    
    conn = await asyncpg.connect(DB_DSN)
    total_saved = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = await context.new_page()
        
        for idx, symbol in enumerate(symbols, 1):
            records = await extract_shareholders(page, symbol)
            if records:
                saved = await save_records(conn, records)
                total_saved += saved
                logger.info(f"💾 [{idx}/{len(symbols)}] {symbol}: Saved {saved} shareholders")
            else:
                logger.info(f"⚠️ [{idx}/{len(symbols)}] {symbol}: No shareholders")
            
            await asyncio.sleep(0.5)  # Rate limiting
        
        await browser.close()
    
    await conn.close()
    logger.info(f"🎉 Complete! Total shareholders: {total_saved}")

if __name__ == "__main__":
    asyncio.run(main())
