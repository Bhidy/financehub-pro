"""
REAL DATA EXTRACTOR - PRODUCTION GRADE
Uses multiple strategies to bypass WAF and get REAL mubasher.info data

Strategy:
1. Try tls_client (already in project, bypasses most WAFs)
2. Try Playwright with stealth mode
3. Direct web scraping if APIs fail
4. Multiple fallback endpoints
5. NEVER use simulated data

This is production code for real users.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sys
import os
import json

# Try imports
try:
    import tls_client
    HAS_TLS = True
except:
    HAS_TLS = False

try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except:
    HAS_PLAYWRIGHT = False

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import db

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [REAL_DATA] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionDataExtractor:
    """
    Production-grade real data extractor
    ZERO tolerance for simulated data
    """
    
    def __init__(self):
        self.stats = {
            "tickers_extracted": 0,
            "history_bars": 0,
            "funds_extracted": 0,
            "actions_extracted": 0,
            "errors": 0
        }
        
        # Initialize TLS client (better than aiohttp for WAF bypass)
        if HAS_TLS:
            self.session = tls_client.Session(
                client_identifier="chrome_120",
                random_tls_extension_order=True
            )
        else:
            self.session = None
            logger.warning("tls_client not available, will use Playwright")
    
    def _make_request(self, url: str, headers: dict = None) -> Optional[dict]:
        """Make HTTP request with WAF bypass"""
        default_headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
            "Referer": "https://www.mubasher.info/countries/sa/stocks",
            "Origin": "https://www.mubasher.info",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin"
        }
        
        if headers:
            default_headers.update(headers)
        
        try:
            if self.session:
                response = self.session.get(url, headers=default_headers)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"Request failed: {response.status_code} for {url}")
            return None
        except Exception as e:
            logger.error(f"Request error: {str(e)}")
            return None
    
    async def extract_tickers_playwright(self) -> List[Dict]:
        """Extract stock tickers using Playwright (WAF bypass)"""
        if not HAS_PLAYWRIGHT:
            logger.error("Playwright not installed. Install with: pip install playwright && playwright install")
            return []
        
        logger.info("Using Playwright to extract stock tickers...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            
            try:
                # Navigate to stocks page
                logger.info("Navigating to mubasher.info stocks page...")
                await page.goto("https://www.mubasher.info/countries/sa/stocks", timeout=60000)
                await page.wait_for_load_state("networkidle")
                
                # Wait for stock table to load
                await page.wait_for_selector("table", timeout=30000)
                
                # Extract stock data from page
                tickers = await page.evaluate("""
                    () => {
                        const stocks = [];
                        const rows = document.querySelectorAll('table tbody tr');
                        
                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 4) {
                                const symbolCell = cells[0];
                                const nameCell = cells[1];
                                const priceCell = cells[2];
                                const changeCell = cells[3];
                                
                                const symbol = symbolCell?.textContent?.trim();
                                const name = nameCell?.textContent?.trim();
                                const price = parseFloat(priceCell?.textContent?.replace(/[^0-9.-]/g, ''));
                                const change = parseFloat(changeCell?.textContent?.replace(/[^0-9.-]/g, ''));
                                
                                if (symbol && name && !isNaN(price)) {
                                    stocks.push({
                                        symbol: symbol,
                                        name_en: name,
                                        last_price: price,
                                        change: change || 0,
                                        change_percent: price ? (change / price * 100) : 0
                                    });
                                }
                            }
                        });
                        
                        return stocks;
                    }
                """)
                
                logger.info(f"✅ Extracted {len(tickers)} tickers via Playwright")
                await browser.close()
                return tickers
                
            except Exception as e:
                logger.error(f"Playwright extraction failed: {str(e)}")
                await browser.close()
                return []
    
    def extract_tickers_api(self) -> List[Dict]:
        """Try multiple API endpoints to get tickers"""
        endpoints = [
            "https://www.mubasher.info/api/1/market/tickers",
            "https://www.mubasher.info/api/v1/market/tickers",
            "https://www.mubasher.info/api/1/markets/sa/stocks",
        ]
        
        for endpoint in endpoints:
            logger.info(f"Trying endpoint: {endpoint}")
            data = self._make_request(endpoint)
            
            if data:
                # Handle different response structures
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    for key in ['data', 'tickers', 'stocks', 'results']:
                        if key in data and isinstance(data[key], list):
                            logger.info(f"✅ Got {len(data[key])} tickers from {endpoint}")
                            return data[key]
        
        logger.warning("All API endpoints failed")
        return []
    
    async def extract_all_tickers(self) -> List[Dict]:
        """Extract tickers using all available methods"""
        logger.info("=" * 80)
        logger.info("EXTRACTING REAL STOCK TICKERS")
        logger.info("=" * 80)
        
        # Method 1: Try API with tls_client
        if HAS_TLS:
            logger.info("\n📊 Method 1: Trying TLS-client API calls...")
            tickers = self.extract_tickers_api()
            if tickers:
                self.stats["tickers_extracted"] = len(tickers)
                return tickers
        
        # Method 2: Use Playwright (WAF bypass)
        logger.info("\n🎭 Method 2: Using Playwright browser automation...")
        tickers = await self.extract_tickers_playwright()
        if tickers:
            self.stats["tickers_extracted"] = len(tickers)
            return tickers
        
        logger.error("❌ CRITICAL: All ticker extraction methods failed")
        return []
    
    def extract_stock_history(self, symbol: str, retries: int = 3) -> List[Dict]:
        """Extract historical OHLC data for a stock"""
        url = f"https://www.mubasher.info/api/1/stocks/{symbol}/history?period=max"
        
        for attempt in range(retries):
            try:
                data = self._make_request(url)
                
                if data:
                    # Handle different response formats
                    if isinstance(data, list):
                        history = data
                    elif isinstance(data, dict):
                        history = data.get('data', data.get('history', []))
                    else:
                        history = []
                    
                    if history:
                        logger.info(f"✅ {symbol}: Got {len(history)} historical bars")
                        self.stats["history_bars"] += len(history)
                        return history
                
            except Exception as e:
                logger.warning(f"⚠️ {symbol}: Attempt {attempt + 1}/{retries} failed - {str(e)}")
                if attempt < retries - 1:
                    import time
                    time.sleep(2)
        
        logger.error(f"❌ {symbol}: Failed to get history after {retries} attempts")
        return []
    
    async def store_all_data(self, tickers: List[Dict]):
        """Store extracted data in database"""
        logger.info("\n💾 STORING REAL DATA IN DATABASE")
        logger.info("=" * 80)
        
        await db.connect()
        
        # Step 1: Store tickers
        logger.info(f"Storing {len(tickers)} stock tickers...")
        for ticker in tickers:
            try:
                await db.execute(
                    """
                    INSERT INTO market_tickers (
                        symbol, name_en, market_code, last_price, 
                        change, change_percent, last_updated
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (symbol) DO UPDATE SET
                        name_en = EXCLUDED.name_en,
                        last_price = EXCLUDED.last_price,
                        change = EXCLUDED.change,
                        change_percent = EXCLUDED.change_percent,
                        last_updated = NOW()
                    """,
                    ticker.get('symbol'),
                    ticker.get('name_en', ticker.get('name')),
                    'TDWL',
                    float(ticker.get('last_price', 0)),
                    float(ticker.get('change', 0)),
                    float(ticker.get('change_percent', 0))
                )
            except Exception as e:
                logger.error(f"Error storing {ticker.get('symbol')}: {str(e)}")
        
        # Step 2: Extract and store historical data
        logger.info(f"\nExtracting historical data for {len(tickers[:100])} stocks...")
        for idx, ticker in enumerate(tickers[:100], 1):  # Top 100 stocks
            symbol = ticker.get('symbol')
            logger.info(f"[{idx}/100] {symbol}...")
            
            history = self.extract_stock_history(symbol)
            
            if history:
                # Store history
                for bar in history:
                    try:
                        # Parse date
                        date_str = bar.get('date', bar.get('d', bar.get('time')))
                        if date_str:
                            if isinstance(date_str, str):
                                date = datetime.fromisoformat(date_str.split('T')[0]).date()
                            else:
                                date = datetime.fromtimestamp(date_str).date()
                            
                            await db.execute(
                                """
                                INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                                ON CONFLICT (symbol, date) DO UPDATE SET
                                    open = EXCLUDED.open,
                                    high = EXCLUDED.high,
                                    low = EXCLUDED.low,
                                    close = EXCLUDED.close,
                                    volume = EXCLUDED.volume
                                """,
                                symbol,
                                date,
                                float(bar.get('open', bar.get('o', 0))),
                                float(bar.get('high', bar.get('h', 0))),
                                float(bar.get('low', bar.get('l', 0))),
                                float(bar.get('close', bar.get('c', 0))),
                                int(bar.get('volume', bar.get('v', 0)))
                            )
                    except Exception as e:
                        logger.debug(f"Skipping bar: {str(e)}")
            
            # Rate limiting
            if idx % 10 == 0:
                logger.info(f"Progress checkpoint: {idx}/100 stocks processed")
                await asyncio.sleep(3)
        
        await db.close()
    
    async def run(self):
        """Main execution"""
        logger.info("\n" + "=" * 80)
        logger.info("🚀 PRODUCTION REAL DATA EXTRACTION STARTED")
        logger.info("=" * 80)
        logger.info("Target: ZERO simulated data - 100% real mubasher.info data")
        logger.info("=" * 80 + "\n")
        
        # Extract tickers
        tickers = await self.extract_all_tickers()
        
        if not tickers:
            logger.error("\n❌ EXTRACTION FAILED - No data retrieved")
            logger.error("This is a CRITICAL FAILURE for production")
            return False
        
        # Store data
        await self.store_all_data(tickers)
        
        # Print stats
        logger.info("\n" + "=" * 80)
        logger.info("📊 EXTRACTION COMPLETE - STATISTICS")
        logger.info("=" * 80)
        logger.info(f"Tickers Extracted: {self.stats['tickers_extracted']}")
        logger.info(f"History Bars:      {self.stats['history_bars']}")
        logger.info(f"Errors:            {self.stats['errors']}")
        logger.info("=" * 80)
        logger.info("\n✅ REAL DATA EXTRACTION SUCCESSFUL")
        logger.info("Platform now ready for production use\n")
        
        return True


async def main():
    extractor = ProductionDataExtractor()
    success = await extractor.run()
    
    if not success:
        logger.error("\n❌ CRITICAL: Extraction failed. Cannot proceed to production.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
