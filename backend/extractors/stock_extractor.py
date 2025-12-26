"""
REAL STOCK DATA EXTRACTOR
Fetches live stock data from mubasher.info APIs

This replaces ALL simulated stock data with real data from mubasher.info
"""

import asyncio
import aiohttp
import ssl
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [STOCK_EXTRACTOR] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RealStockExtractor:
    """Extract real stock data from mubasher.info"""
    
    def __init__(self):
        self.base_url = "https://www.mubasher.info/api/1"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
            "Referer": "https://www.mubasher.info/countries/sa/stocks",
            "Origin": "https://www.mubasher.info"
        }
        # SSL context to bypass certificate verification
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        self.stats = {
            "tickers_fetched": 0,
            "history_fetched": 0,
            "profiles_fetched": 0,
            "errors": 0
        }
    
    def fetch_all_tickers(self) -> List[Dict]:
        """Fetch ALL Saudi stock tickers from mubasher.info API using tls_client"""
        import tls_client
        
        url = f"{self.base_url}/market/tickers"
        
        logger.info(f"Fetching tickers via tls_client from: {url}")
        
        session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.mubasher.info/countries/sa/stocks",
            "Origin": "https://www.mubasher.info",
            "Accept": "application/json"
        }
        
        try:
            # Try fetching without pagination first (often returns full list for this endpoint)
            response = session.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch tickers: HTTP {response.status_code}")
                self.stats["errors"] += 1
                return []
                
            data = response.json()
            
            # Handle response structure
            if isinstance(data, list):
                tickers = data
            elif isinstance(data, dict):
                tickers = data.get('data') or data.get('tickers') or []
            else:
                tickers = []
            
            # Filter for Saudi stocks (TDWL market)
            saudi_tickers = [
                t for t in tickers 
                if isinstance(t, dict) and t.get('market_code') in ['TDWL', 'SA', 'TASI']
            ]
            
            logger.info(f"✅ Fetched {len(saudi_tickers)} Saudi stock tickers")
            self.stats["tickers_fetched"] = len(saudi_tickers)
            return saudi_tickers
                    
        except Exception as e:
            logger.error(f"Error fetching tickers: {str(e)}")
            self.stats["errors"] += 1
            return []

    async def fetch_stock_history(
        self, 
        session: aiohttp.ClientSession, 
        symbol: str, 
        period: str = "max"
    ) -> List[Dict]:
        """Fetch historical OHLC data for a stock"""
        url = f"{self.base_url}/stocks/{symbol}/history"
        params = {"period": period}  # max = all available history
        
        try:
            await asyncio.sleep(2)  # Rate limiting
            
            async with session.get(url, headers=self.headers, params=params, timeout=30, ssl=self.ssl_context) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Handle different response structures
                    if isinstance(data, list):
                        history = data
                    elif isinstance(data, dict) and 'data' in data:
                        history = data['data']
                    elif isinstance(data, dict) and 'history' in data:
                        history = data['history']
                    else:
                        history = []
                    
                    if history:
                        logger.info(f"✅ {symbol}: Fetched {len(history)} historical bars")
                        self.stats["history_fetched"] += 1
                    else:
                        logger.warning(f"⚠️ {symbol}: No historical data found")
                    
                    return history
                else:
                    logger.warning(f"⚠️ {symbol}: History fetch failed (HTTP {response.status})")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ {symbol}: Error fetching history - {str(e)}")
            self.stats["errors"] += 1
            return []
    
    async def fetch_stock_profile(
        self,
        session: aiohttp.ClientSession,
        symbol: str
    ) -> Optional[Dict]:
        """Fetch company profile/fundamentals"""
        url = f"{self.base_url}/stocks/{symbol}/profile"
        
        try:
            await asyncio.sleep(2)  # Rate limiting
            
            async with session.get(url, headers=self.headers, timeout=30, ssl=self.ssl_context) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"✅ {symbol}: Fetched profile data")
                    self.stats["profiles_fetched"] += 1
                    return data
                else:
                    logger.warning(f"⚠️ {symbol}: Profile fetch failed (HTTP {response.status})")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ {symbol}: Error fetching profile - {str(e)}")
            self.stats["errors"] += 1
            return None
    
    async def store_tickers(self, tickers: List[Dict]):
        """Store ticker data in database"""
        logger.info(f"Storing {len(tickers)} tickers in database...")
        
        for ticker in tickers:
            try:
                # Extract fields (handle different API response formats)
                symbol = str(ticker.get('symbol') or ticker.get('code') or ticker.get('ticker_code'))
                name_en = ticker.get('name_en') or ticker.get('name') or ticker.get('company_name') or f"Stock {symbol}"
                name_ar = ticker.get('name_ar') or ticker.get('name_arabic') or ''
                market_code = ticker.get('market_code') or 'TDWL'
                sector = ticker.get('sector_name') or ticker.get('sector') or 'Unknown'
                
                # Price data
                last_price = float(ticker.get('last_price') or ticker.get('close') or ticker.get('price') or 0)
                change = float(ticker.get('change') or ticker.get('change_amount') or 0)
                change_percent = float(ticker.get('change_percent') or ticker.get('change_percentage') or 0)
                volume = int(ticker.get('volume') or ticker.get('traded_volume') or 0)
                
                # Additional fields
                open_price = float(ticker.get('open') or ticker.get('open_price') or last_price)
                high = float(ticker.get('high') or ticker.get('high_price') or last_price)
                low = float(ticker.get('low') or ticker.get('low_price') or last_price)
                prev_close = float(ticker.get('prev_close') or ticker.get('previous_close') or last_price)
                
                await db.execute(
                    """
                    INSERT INTO market_tickers (
                        symbol, name_en, name_ar, market_code, sector_name,
                        last_price, change, change_percent, volume,
                        open_price, high, low, prev_close, last_updated
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                    ON CONFLICT (symbol) DO UPDATE SET
                        name_en = EXCLUDED.name_en,
                        name_ar = EXCLUDED.name_ar,
                        market_code = EXCLUDED.market_code,
                        sector_name = EXCLUDED.sector_name,
                        last_price = EXCLUDED.last_price,
                        change = EXCLUDED.change,
                        change_percent = EXCLUDED.change_percent,
                        volume = EXCLUDED.volume,
                        open_price = EXCLUDED.open_price,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        prev_close = EXCLUDED.prev_close,
                        last_updated = NOW()
                    """,
                    symbol, name_en, name_ar, market_code, sector,
                    last_price, change, change_percent, volume,
                    open_price, high, low, prev_close
                )
                
            except Exception as e:
                logger.error(f"Error storing ticker {ticker.get('symbol')}: {str(e)}")
                self.stats["errors"] += 1
        
        logger.info(f"✅ Stored {len(tickers)} tickers successfully")
    
    async def store_history(self, symbol: str, history: List[Dict]):
        """Store historical OHLC data"""
        if not history:
            return
        
        logger.info(f"Storing {len(history)} historical bars for {symbol}...")
        
        stored_count = 0
        for bar in history:
            try:
                # Parse date (handle different formats)
                date_str = bar.get('date') or bar.get('d') or bar.get('timestamp')
                if isinstance(date_str, str):
                    # Try parsing common formats
                    for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%d/%m/%Y']:
                        try:
                            date = datetime.strptime(date_str, fmt).date()
                            break
                        except:
                            continue
                    else:
                        # If all formats fail, try ISO format
                        date = datetime.fromisoformat(date_str.split('T')[0]).date()
                else:
                    date = datetime.fromtimestamp(date_str).date() if date_str else datetime.now().date()
                
                # Price data
                open_price = float(bar.get('open') or bar.get('o') or 0)
                high = float(bar.get('high') or bar.get('h') or 0)
                low = float(bar.get('low') or bar.get('l') or 0)
                close = float(bar.get('close') or bar.get('c') or 0)
                volume = int(bar.get('volume') or bar.get('v') or 0)
                
                if close > 0:  # Only store valid data
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
                        symbol, date, open_price, high, low, close, volume
                    )
                    stored_count += 1
                    
            except Exception as e:
                logger.debug(f"Skipping bar for {symbol}: {str(e)}")
        
        if stored_count > 0:
            logger.info(f"✅ {symbol}: Stored {stored_count} OHLC bars")
    
    async def extract_all_data(self):
        """Main extraction workflow"""
        logger.info("=" * 80)
        logger.info("🚀 STARTING REAL STOCK DATA EXTRACTION")
        logger.info("=" * 80)
        
        await db.connect()
        
        async with aiohttp.ClientSession() as session:
            # Step 1: Fetch all tickers
            logger.info("\n📊 STEP 1: Fetching all stock tickers...")
            tickers = self.fetch_all_tickers()
            
            if not tickers:
                logger.error("❌ No tickers fetched. Aborting.")
                return
            
            # Step 2: Store tickers
            logger.info("\n💾 STEP 2: Storing ticker data...")
            await self.store_tickers(tickers)
            
            # Step 3: Fetch historical data for each stock
            logger.info(f"\n📈 STEP 3: Fetching historical data for {len(tickers)} stocks...")
            logger.info("This may take some time (rate limited to avoid blocking)...")
            
            for idx, ticker in enumerate(tickers, 1):  # REMOVED [:50] LIMIT
                symbol = str(ticker.get('symbol') or ticker.get('code'))
                name = ticker.get('name_en') or ticker.get('name') or symbol
                
                logger.info(f"\n[{idx}/{len(tickers)}] Processing {symbol} ({name})...")
                
                # Fetch history
                history = await self.fetch_stock_history(session, symbol, period="max")
                
                # Store history
                if history:
                    await self.store_history(symbol, history)
                
                # Small delay between stocks
                if idx % 10 == 0:
                    logger.info(f"Progress: {idx}/{len(tickers)} stocks processed. Taking brief pause...")
                    await asyncio.sleep(5)
        
        await db.close()
        
        # Print final statistics
        logger.info("\n" + "=" * 80)
        logger.info("📊 EXTRACTION COMPLETE - STATISTICS")
        logger.info("=" * 80)
        logger.info(f"Tickers Fetched:    {self.stats['tickers_fetched']}")
        logger.info(f"History Fetched:    {self.stats['history_fetched']}")
        logger.info(f"Profiles Fetched:   {self.stats['profiles_fetched']}")
        logger.info(f"Errors:             {self.stats['errors']}")
        logger.info("=" * 80)
        
        # Verify database
        ticker_count = await db.fetch_val("SELECT COUNT(*) FROM market_tickers")
        ohlc_count = await db.fetch_val("SELECT COUNT(*) FROM ohlc_data")
        logger.info(f"\n✅ Database now contains:")
        logger.info(f"   - {ticker_count} stock tickers")
        logger.info(f"   - {ohlc_count} OHLC data points")
        logger.info("\n🎉 REAL STOCK DATA EXTRACTION SUCCESSFUL!")


async def main():
    extractor = RealStockExtractor()
    await extractor.extract_all_data()


if __name__ == "__main__":
    asyncio.run(main())
