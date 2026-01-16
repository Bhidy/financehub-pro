"""
TICKER DISCOVERY: Saudi Stock Market
Method: Browser Scraping (Playwright)
Target: ~300 Stock Symbols from mubasher.info
"""

import asyncio
from playwright.async_api import async_playwright
import asyncpg
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [DISCOVERY] - %(message)s')
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"

async def discover_all_tickers():
    """Scrape all stock tickers from the market overview page"""
    tickers = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        url = "https://www.mubasher.info/countries/sa/all-stock-prices"
        logger.info(f"Loading {url}...")
        await page.goto(url, timeout=60000, wait_until="domcontentloaded")
        
        # Wait for table to render
        await page.wait_for_selector('table tbody tr', timeout=20000)
        
        # Extract table data
        data = await page.evaluate("""() => {
            const rows = document.querySelectorAll('table tbody tr');
            const results = [];
            rows.forEach(row => {
                const link = row.querySelector('a[href*="/stocks/"]');
                if (link) {
                    const href = link.getAttribute('href');
                    const match = href.match(/\\/stocks\\/(\\d+)/);
                    if (match) {
                        const symbol = match[1];
                        const name = link.textContent.trim();
                        results.push({symbol, name});
                    }
                }
            });
            return results;
        }""")
        
        tickers = data
        logger.info(f"✅ Found {len(tickers)} tickers")
        
        await browser.close()
    
    return tickers

async def save_tickers(tickers):
    """Save to database"""
    conn = await asyncpg.connect(DB_DSN)
    
    for t in tickers:
        try:
            await conn.execute("""
                INSERT INTO market_tickers (symbol, name_en)
                VALUES ($1, $2)
                ON CONFLICT (symbol) DO UPDATE SET name_en = EXCLUDED.name_en
            """, t['symbol'], t['name'])
        except Exception as e:
            logger.error(f"Error saving {t['symbol']}: {e}")
    
    await conn.close()
    logger.info(f"💾 Saved {len(tickers)} tickers to database")

async def main():
    tickers = await discover_all_tickers()
    if tickers:
        await save_tickers(tickers)
        logger.info(f"🎉 Discovery complete: {len(tickers)} stocks")
    else:
        logger.error("❌ No tickers found")

if __name__ == "__main__":
    asyncio.run(main())
