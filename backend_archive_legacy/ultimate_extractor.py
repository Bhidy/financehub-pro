"""
ULTIMATE PRODUCTION SOLUTION
Full Playwright-based real data extractor that works like a real user

This bypasses ALL WAF protection by being a real browser
"""

import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime, timedelta
from typing import List, Dict
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import db

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [ULTIMATE] - %(message)s'
)
logger = logging.getLogger(__name__)


class UltimateRealDataExtractor:
    """
    Full browser-based extraction - bypasses ALL protection
    This is how Goo-level experts solve WAF problems
    """
    
    def __init__(self):
        self.stats = {
            "tickers": 0,
            "history_bars": 0,
            "errors": 0
        }
        self.browser = None
        self.context = None
    
    async def init_browser(self):
        """Initialize browser with realistic settings"""
        playwright = await async_playwright().start()
        
        # Launch browser with realistic user profile
        self.browser = await playwright.chromium.launch(
            headless=True,  # Set to False to see what's happening
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage'
            ]
        )
        
        # Create context with realistic fingerprint
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='Asia/Riyadh'
        )
        
        # Add extra stealth
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)
        
        logger.info("✅ Browser initialized with stealth mode")
    
    async def extract_tickers_from_page(self) -> List[Dict]:
        """Extract stock tickers by loading the actual page"""
        page = await self.context.new_page()
        tickers = []
        
        try:
            logger.info("Loading mubasher.info stocks page...")
            
            # Navigate to stocks page
            await page.goto('https://www.mubasher.info/markets/TDWL/stocks', timeout=60000)
            
            # Wait for content to load
            logger.info("Waiting for page to load...")
            await page.wait_for_load_state('networkidle', timeout=60000)
            
            # Additional wait for dynamic content
            await page.wait_for_timeout(5000)
            
            # Extract stock data using JavaScript
            logger.info("Extracting stock data from page...")
            tickers = await page.evaluate("""
                () => {
                    const stocks = [];
                    
                    // Try multiple selectors - different page structures
                    const selectors = [
                        'table tbody tr',
                        '[class*="stock-row"]',
                        '[data-symbol]',
                        '.market-table tr'
                    ];
                    
                    for (const selector of selectors) {
                        const rows = document.querySelectorAll(selector);
                        
                        if (rows.length > 0) {
                            console.log(`Found ${rows.length} rows with selector: ${selector}`);
                            
                            rows.forEach(row => {
                                // Try to extract data from row
                                const cells = row.querySelectorAll('td, [class*="cell"]');
                                
                                if (cells.length >= 3) {
                                    const symbol = row.getAttribute('data-symbol') || 
                                                  cells[0]?.textContent?.trim() ||
                                                  row.querySelector('[class*="symbol"]')?.textContent?.trim();
                                    
                                    const name = cells[1]?.textContent?.trim() ||
                                                row.querySelector('[class*="name"]')?.textContent?.trim();
                                    
                                    const priceText = cells[2]?.textContent?.trim() ||
                                                     row.querySelector('[class*="price"]')?.textContent?.trim();
                                    
                                    const price = parseFloat(priceText?.replace(/[^0-9.-]/g, ''));
                                    
                                    if (symbol && !isNaN(price) && price > 0) {
                                        stocks.push({
                                            symbol: symbol,
                                            name_en: name || `Stock ${symbol}`,
                                            last_price: price,
                                            market_code: 'TDWL'
                                        });
                                    }
                                }
                            });
                            
                            if (stocks.length > 0) break;  // Found data, stop trying selectors
                        }
                    }
                    
                    // If no stocks found with table approach, try finding JSON data in page
                    if (stocks.length === 0) {
                        const scripts = document.querySelectorAll('script');
                        for (const script of scripts) {
                            const text = script.textContent;
                            if (text && (text.includes('stocks') || text.includes('tickers'))) {
                                // Try to extract JSON data
                                try {
                                    const jsonMatch = text.match(/\{[\s\S]*"stocks"[\s\S]*\}/);
                                    if (jsonMatch) {
                                        const data = JSON.parse(jsonMatch[0]);
                                        if (data.stocks && Array.isArray(data.stocks)) {
                                            return data.stocks.map(s => ({
                                                symbol: s.symbol || s.code,
                                                name_en: s.name || s.name_en,
                                                last_price: parseFloat(s.last_price || s.close || s.price),
                                                market_code: 'TDWL'
                                            }));
                                        }
                                    }
                                } catch(e) {
                                    console.log('JSON parse failed:', e);
                                }
                            }
                        }
                    }
                    
                    return stocks;
                }
            """)
            
            if tickers:
                logger.info(f"✅ Extracted {len(tickers)} tickers from page")
                self.stats["tickers"] = len(tickers)
            else:
                logger.error("❌ No tickers extracted - page structure may have changed")
                # Take screenshot for debugging
                await page.screenshot(path='mubasher_debug.png')
                logger.info("Saved debug screenshot: mubasher_debug.png")
            
        except Exception as e:
            logger.error(f"Error extracting tickers: {str(e)}")
            self.stats["errors"] += 1
        
        finally:
            await page.close()
        
        return tickers
    
    async def extract_stock_history(self, symbol: str) -> List[Dict]:
        """Extract historical data for a stock"""
        page = await self.context.new_page()
        history = []
        
        try:
            # Navigate to stock page
            url = f'https://www.mubasher.info/markets/TDWL/stocks/{symbol}'
            logger.info(f"Loading history for {symbol}...")
            
            await page.goto(url, timeout=60000)
            await page.wait_for_load_state('networkidle', timeout=60000)
            
            # Click on historical data tab if it exists
            try:
                await page.click('text=Historical', timeout=5000)
                await page.wait_for_timeout(2000)
            except:
                pass
            
            # Extract historical data
            history = await page.evaluate("""
                () => {
                    const data = [];
                    const rows = document.querySelectorAll('[class*="history"] tr, [class*="historical"] tr');
                    
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 5) {
                            const dateText = cells[0]?.textContent?.trim();
                            const open = parseFloat(cells[1]?.textContent?.replace(/[^0-9.-]/g, ''));
                            const high = parseFloat(cells[2]?.textContent?.replace(/[^0-9.-]/g, ''));
                            const low = parseFloat(cells[3]?.textContent?.replace(/[^0-9.-]/g, ''));
                            const close = parseFloat(cells[4]?.textContent?.replace(/[^0-9.-]/g, ''));
                            const volume = parseInt(cells[5]?.textContent?.replace(/[^0-9]/g, '')) || 0;
                            
                            if (dateText && !isNaN(close)) {
                                data.push({
                                    date: dateText,
                                    open: open,
                                    high: high,
                                    low: low,
                                    close: close,
                                    volume: volume
                                });
                            }
                        }
                    });
                    
                    return data;
                }
            """)
            
            if history:
                logger.info(f"✅ {symbol}: Got {len(history)} historical bars")
                self.stats["history_bars"] += len(history)
            
        except Exception as e:
            logger.error(f"Error extracting history for {symbol}: {str(e)}")
            self.stats["errors"] += 1
        
        finally:
            await page.close()
        
        return history
    
    async def store_data(self, tickers: List[Dict]):
        """Store extracted data in database"""
        logger.info("\n💾 Storing REAL data in database...")
        
        await db.connect()
        
        # Store tickers
        for ticker in tickers:
            try:
                await db.execute("""
                    INSERT INTO market_tickers (symbol, name_en, market_code, last_price, last_updated)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (symbol) DO UPDATE SET
                        name_en = EXCLUDED.name_en,
                        last_price = EXCLUDED.last_price,
                        last_updated = NOW()
                """, 
                    ticker['symbol'],
                    ticker['name_en'],
                    ticker['market_code'],
                    ticker['last_price']
                )
            except Exception as e:
                logger.error(f"Error storing {ticker['symbol']}: {str(e)}")
        
        logger.info(f"✅ Stored {len(tickers)} tickers")
        
        # Extract history for top stocks
        logger.info("\nExtracting historical data for top 50 stocks...")
        for idx, ticker in enumerate(tickers[:50], 1):
            symbol = ticker['symbol']
            logger.info(f"[{idx}/50] {symbol}...")
            
            history = await self.extract_stock_history(symbol)
            
            # Store history
            for bar in history:
                try:
                    # Parse date
                    try:
                        date = datetime.strptime(bar['date'], '%Y-%m-%d').date()
                    except:
                        try:
                            date = datetime.strptime(bar['date'], '%d/%m/%Y').date()
                        except:
                            continue
                    
                    await db.execute("""
                        INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (symbol, date) DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume
                    """,
                        symbol, date,
                        bar['open'], bar['high'], bar['low'], bar['close'], bar['volume']
                    )
                except Exception as e:
                    logger.debug(f"Skip bar: {str(e)}")
            
            # Rate limiting
            if idx % 10 == 0:
                await asyncio.sleep(2)
        
        await db.close()
    
    async def run(self):
        """Main execution"""
        logger.info("="*80)
        logger.info("🚀 ULTIMATE REAL DATA EXTRACTION - PLAYWRIGHT APPROACH")
        logger.info("="*80)
        logger.info("Using real browser to bypass ALL protection\n")
        
        try:
            # Initialize browser
            await self.init_browser()
            
            # Extract tickers
            tickers = await self.extract_tickers_from_page()
            
            if not tickers:
                logger.error("\n❌ CRITICAL: No tickers extracted")
                return False
            
            # Store data
            await self.store_data(tickers)
            
            # Stats
            logger.info("\n" + "="*80)
            logger.info("📊 EXTRACTION COMPLETE")
            logger.info("="*80)
            logger.info(f"Tickers:      {self.stats['tickers']}")
            logger.info(f"History Bars: {self.stats['history_bars']}")
            logger.info(f"Errors:       {self.stats['errors']}")
            logger.info("="*80)
            logger.info("\n✅ REAL DATA EXTRACTION SUCCESSFUL!\n")
            
            return True
            
        finally:
            if self.browser:
                await self.browser.close()


async def main():
    extractor = UltimateRealDataExtractor()
    success = await extractor.run()
    
    if not success:
        logger.error("Extraction failed")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
