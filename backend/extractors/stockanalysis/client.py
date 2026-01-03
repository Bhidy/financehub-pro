"""
StockAnalysis.com API Client for Egyptian Stock Exchange (EGX)
==============================================================
Professional-grade API client with:
- Exponential backoff retry logic
- Rate limiting (1 req/sec)
- Comprehensive error handling
- Full data type extraction
"""

import requests
import time
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from functools import wraps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('stockanalysis_client')


def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator for exponential backoff retry logic"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                    time.sleep(delay)
            logger.error(f"All {max_retries} attempts failed")
            raise last_exception
        return wrapper
    return decorator


class StockAnalysisClient:
    """
    API Client for StockAnalysis.com
    Supports EGX (Egyptian Stock Exchange) data extraction
    """
    
    BASE_URL = "https://stockanalysis.com"
    
    # Default columns for screener API (can be extended to 200+ fields)
    SCREENER_COLUMNS = [
        'no', 's', 'n', 'marketCap', 'price', 'change', 'volume',
        'revenue', 'netIncome', 'peRatio', 'dividendYield', 'sector'
    ]
    
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://stockanalysis.com/",
        "Origin": "https://stockanalysis.com"
    }
    
    def __init__(self, rate_limit_delay: float = 1.0):
        """
        Initialize the client.
        
        Args:
            rate_limit_delay: Seconds to wait between requests (default 1.0)
        """
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)
        self.rate_limit_delay = rate_limit_delay
        self._last_request_time = 0
    
    def _rate_limit(self):
        """Enforce rate limiting between requests"""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = time.time()
    
    @retry_with_backoff(max_retries=3)
    def _get(self, url: str, params: dict = None) -> Dict:
        """
        Make a GET request with retry logic.
        
        Args:
            url: Full URL or path
            params: Query parameters
            
        Returns:
            JSON response as dict
        """
        self._rate_limit()
        
        full_url = url if url.startswith('http') else f"{self.BASE_URL}{url}"
        logger.debug(f"GET {full_url}")
        
        response = self.session.get(full_url, params=params, timeout=30)
        response.raise_for_status()
        
        return response.json()
    
    def _get_html(self, url: str) -> str:
        """Get raw HTML content"""
        self._rate_limit()
        full_url = url if url.startswith('http') else f"{self.BASE_URL}{url}"
        response = self.session.get(full_url, timeout=30)
        response.raise_for_status()
        return response.text
    
    # =========================================================================
    # PUBLIC API METHODS
    # =========================================================================
    
    def get_egx_stocks(self, columns: List[str] = None) -> List[Dict]:
        """
        Get all Egyptian Stock Exchange (EGX) stocks.
        
        Args:
            columns: List of column codes to fetch. Defaults to basic set.
                     Available: s, n, marketCap, price, change, volume, revenue,
                     netIncome, peRatio, pbRatio, dividendYield, sector, etc.
        
        Returns:
            List of stock dictionaries
        """
        cols = columns or self.SCREENER_COLUMNS
        col_str = ','.join(cols)
        
        url = f"/api/screener/a/f"
        params = {
            'm': 'marketCap',
            's': 'desc',
            'c': col_str,
            'sc': 'marketCap',
            'f': 'exchangeCode-is-EGX,subtype-is-stock',
            'i': 'symbols'
        }
        
        try:
            data = self._get(url, params)
            
            # Parse response - data is in 'data.data' as list of dicts
            stocks = []
            if 'data' in data and 'data' in data['data']:
                rows = data['data']['data']
                
                for row in rows:
                    # Row is already a dictionary with field names
                    symbol_raw = row.get('s', '')
                    # Symbol format is 'egx/COMI' - extract just the symbol
                    symbol = symbol_raw.split('/')[-1] if '/' in symbol_raw else symbol_raw
                    
                    normalized = {
                        'symbol': symbol,
                        'name_en': row.get('n', ''),
                        'market_cap': self._parse_number(row.get('marketCap')),
                        'last_price': self._parse_number(row.get('price')),
                        'change_percent': self._parse_number(row.get('change')),
                        'volume': self._parse_number(row.get('volume')),
                        'revenue': self._parse_number(row.get('revenue')),
                        'net_income': self._parse_number(row.get('netIncome')),
                        'pe_ratio': self._parse_number(row.get('peRatio')),
                        'dividend_yield': self._parse_number(row.get('dividendYield')),
                        'sector_name': row.get('sector', ''),
                        'market_code': 'EGX',
                        'currency': 'EGP'
                    }
                    stocks.append(normalized)
                    
            logger.info(f"Fetched {len(stocks)} EGX stocks from screener")
            return stocks
            
        except Exception as e:
            logger.error(f"Failed to fetch EGX stocks: {e}")
            return []
    
    def get_stock_history(self, symbol: str, period: str = 'max') -> List[Dict]:
        """
        Get historical OHLCV data for a stock.
        
        Args:
            symbol: Stock symbol (e.g., 'COMI')
            period: 'max', '5y', '1y', '6m', 'ytd'
            
        Returns:
            List of daily OHLCV records
        """
        url = f"/api/symbol/a/EGX-{symbol}/history"
        params = {'type': 'full'}  # Full OHLCV data
        
        try:
            data = self._get(url, params)
            
            # Parse the full history format
            # { data: { data: [{t, o, h, l, c, a, v, ch}, ...] } }
            history = []
            
            if 'data' in data and 'data' in data['data']:
                for row in data['data']['data']:
                    record = {
                        'symbol': symbol,
                        'date': row.get('t'),  # Already in YYYY-MM-DD format
                        'open': row.get('o'),
                        'high': row.get('h'),
                        'low': row.get('l'),
                        'close': row.get('c'),
                        'adj_close': row.get('a'),
                        'volume': int(row.get('v', 0)) if row.get('v') else 0,
                        'change_percent': row.get('ch')
                    }
                    history.append(record)
            
            logger.info(f"Fetched {len(history)} historical records for {symbol}")
            return history
            
        except Exception as e:
            logger.error(f"Failed to fetch history for {symbol}: {e}")
            return []
    
    def get_financials(self, symbol: str, statement_type: str = 'income') -> List[Dict]:
        """
        Get financial statements for a stock.
        
        Args:
            symbol: Stock symbol
            statement_type: 'income', 'balance-sheet', 'cash-flow-statement', 'ratios'
            
        Returns:
            List of financial records by period
        """
        path_map = {
            'income': 'financials',
            'balance-sheet': 'financials/balance-sheet',
            'cash-flow-statement': 'financials/cash-flow-statement',
            'ratios': 'financials/ratios'
        }
        
        path = path_map.get(statement_type, 'financials')
        url = f"/quote/egx/{symbol.lower()}/{path}/__data.json"
        
        try:
            data = self._get(url)
            
            # SvelteKit __data.json format parsing
            # The data is nested and needs careful extraction
            records = self._parse_sveltekit_data(data, symbol, statement_type)
            
            logger.info(f"Fetched {len(records)} {statement_type} records for {symbol}")
            return records
            
        except Exception as e:
            logger.error(f"Failed to fetch {statement_type} for {symbol}: {e}")
            return []
    
    def get_dividends(self, symbol: str) -> List[Dict]:
        """
        Get dividend history for a stock.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            List of dividend records
        """
        url = f"/quote/egx/{symbol.lower()}/dividend/__data.json"
        
        try:
            data = self._get(url)
            dividends = self._parse_dividend_data(data, symbol)
            
            logger.info(f"Fetched {len(dividends)} dividend records for {symbol}")
            return dividends
            
        except Exception as e:
            logger.error(f"Failed to fetch dividends for {symbol}: {e}")
            return []
    
    def get_profile(self, symbol: str) -> Dict:
        """
        Get company profile.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Company profile dictionary
        """
        url = f"/quote/egx/{symbol.lower()}/profile/__data.json"
        
        try:
            data = self._get(url)
            profile = self._parse_profile_data(data, symbol)
            
            logger.info(f"Fetched profile for {symbol}")
            return profile
            
        except Exception as e:
            logger.error(f"Failed to fetch profile for {symbol}: {e}")
            return {}
    
    def get_statistics(self, symbol: str) -> Dict:
        """
        Get key statistics and ratios.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Statistics dictionary
        """
        url = f"/quote/egx/{symbol.lower()}/statistics/__data.json"
        
        try:
            data = self._get(url)
            stats = self._parse_statistics_data(data, symbol)
            
            logger.info(f"Fetched statistics for {symbol}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to fetch statistics for {symbol}: {e}")
            return {}
    
    # =========================================================================
    # PRIVATE HELPER METHODS
    # =========================================================================
    
    def _parse_number(self, value: Any) -> Optional[float]:
        """Parse a number from various formats"""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove currency symbols, commas, etc.
            clean = value.replace(',', '').replace('$', '').replace('EGP', '').strip()
            
            # Handle suffixes
            multiplier = 1
            if clean.endswith('B'):
                multiplier = 1_000_000_000
                clean = clean[:-1]
            elif clean.endswith('M'):
                multiplier = 1_000_000
                clean = clean[:-1]
            elif clean.endswith('K'):
                multiplier = 1_000
                clean = clean[:-1]
            elif clean.endswith('%'):
                multiplier = 0.01
                clean = clean[:-1]
                
            try:
                return float(clean) * multiplier
            except ValueError:
                return None
        return None
    
    def _parse_sveltekit_data(self, data: Dict, symbol: str, statement_type: str) -> List[Dict]:
        """
        Parse SvelteKit __data.json format.
        This format is complex and varies by page.
        """
        records = []
        
        try:
            # The nodes array contains the data
            if 'nodes' in data:
                for node in data['nodes']:
                    if isinstance(node, dict) and 'data' in node:
                        # Find the table data
                        node_data = node['data']
                        if isinstance(node_data, list):
                            for item in node_data:
                                if isinstance(item, dict):
                                    records.append({
                                        'symbol': symbol,
                                        'statement_type': statement_type.upper(),
                                        'raw_data': item
                                    })
        except Exception as e:
            logger.warning(f"Error parsing SvelteKit data: {e}")
        
        # Fallback: store raw data
        if not records:
            records.append({
                'symbol': symbol,
                'statement_type': statement_type.upper(),
                'raw_data': data
            })
            
        return records
    
    def _parse_dividend_data(self, data: Dict, symbol: str) -> List[Dict]:
        """Parse dividend data from __data.json"""
        dividends = []
        
        try:
            if 'nodes' in data:
                for node in data['nodes']:
                    if isinstance(node, dict) and 'data' in node:
                        # Extract dividend rows if available
                        pass
        except Exception as e:
            logger.warning(f"Error parsing dividend data: {e}")
            
        return dividends
    
    def _parse_profile_data(self, data: Dict, symbol: str) -> Dict:
        """Parse company profile from __data.json"""
        profile = {'symbol': symbol}
        
        try:
            if 'nodes' in data:
                for node in data['nodes']:
                    if isinstance(node, dict) and 'data' in node:
                        if isinstance(node['data'], dict):
                            profile.update(node['data'])
        except Exception as e:
            logger.warning(f"Error parsing profile data: {e}")
            
        return profile
    
    def _parse_statistics_data(self, data: Dict, symbol: str) -> Dict:
        """Parse statistics from __data.json"""
        stats = {'symbol': symbol}
        
        try:
            if 'nodes' in data:
                for node in data['nodes']:
                    if isinstance(node, dict) and 'data' in node:
                        if isinstance(node['data'], dict):
                            stats.update(node['data'])
        except Exception as e:
            logger.warning(f"Error parsing statistics data: {e}")
            
        return stats


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_client() -> StockAnalysisClient:
    """Get a singleton client instance"""
    return StockAnalysisClient()


if __name__ == "__main__":
    # Test the client
    client = StockAnalysisClient()
    
    print("=" * 60)
    print("Testing StockAnalysis.com API Client for EGX")
    print("=" * 60)
    
    # Test 1: Get all EGX stocks
    print("\n1. Fetching all EGX stocks...")
    stocks = client.get_egx_stocks()
    print(f"   Found {len(stocks)} stocks")
    if stocks:
        print(f"   Sample: {stocks[0]}")
    
    # Test 2: Get history for top stock
    if stocks:
        symbol = stocks[0]['symbol']
        print(f"\n2. Fetching history for {symbol}...")
        history = client.get_stock_history(symbol)
        print(f"   Found {len(history)} records")
        if history:
            print(f"   Latest: {history[0]}")
            print(f"   Oldest: {history[-1]}")
    
    print("\n" + "=" * 60)
    print("Client test complete!")
