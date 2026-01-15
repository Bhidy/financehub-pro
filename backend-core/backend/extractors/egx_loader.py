import requests
from bs4 import BeautifulSoup
import pandas as pd
import logging
import re
from datetime import datetime
from typing import List, Dict, Optional

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EGXExtractor:
    BASE_URL = "https://stockanalysis.com"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    }

    def _get_soup(self, url: str) -> Optional[BeautifulSoup]:
        """Helper to fetch and parse URL"""
        try:
            logger.info(f"Fetching {url}...")
            response = requests.get(url, headers=self.HEADERS, timeout=15)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

    def _parse_number(self, text: str) -> Optional[float]:
        """Parses number strings with K, M, B suffixes"""
        if not text or text == '-':
            return None
        
        text = text.replace(',', '').replace('$', '').replace('EGP', '').strip()
        multiplier = 1
        
        if text.endswith('K'):
            multiplier = 1_000
            text = text[:-1]
        elif text.endswith('M'):
            multiplier = 1_000_000
            text = text[:-1]
        elif text.endswith('B'):
            multiplier = 1_000_000_000
            text = text[:-1]
        elif text.endswith('%'):
            multiplier = 0.01
            text = text[:-1]
            
        try:
            return float(text) * multiplier
        except ValueError:
            return None

    def get_all_tickers(self) -> List[Dict]:
        """Scrapes the list of all EGX stocks"""
        url = "https://stockanalysis.com/list/egyptian-stock-exchange/"
        soup = self._get_soup(url)
        if not soup:
            return []

        tickers = []
        table = soup.find('table', {'id': 'main-table'})
        if not table:
             # Fallback: finding the table by class or structure
             table = soup.find('table', class_='svelte-104zggs') # Try generic or first table
             if not table:
                 table = soup.find('table')

        if not table:
            logger.error("No stock table found on list page")
            return []

        # Identify headers to map columns
        headers = [th.text.strip() for th in table.find('thead').find_all('th')]
        logger.info(f"DEBUG: Found Headers: {headers}")
        
        # Map indices
        idx_map = {
            'symbol': 0, # Default
            'name': 1,   # Default
            'sector': -1,
            'price': -1,
            'change': -1,
            'pct_change': -1,
            'volume': -1,
            'market_cap': -1
        }
        
        for i, h in enumerate(headers):
            h_lower = h.lower()
            if 'symbol' in h_lower: idx_map['symbol'] = i
            elif 'company' in h_lower or 'name' in h_lower: idx_map['name'] = i
            elif 'sector' in h_lower: idx_map['sector'] = i
            elif 'price' in h_lower: idx_map['price'] = i
            elif 'change' in h_lower:
                if '%' in h_lower: idx_map['pct_change'] = i
                else: idx_map['change'] = i
            elif 'volume' in h_lower: idx_map['volume'] = i
            elif 'market cap' in h_lower: idx_map['market_cap'] = i
        
        logger.info(f"DEBUG: Column Map: {idx_map}")
        
        # Iterate rows
        rows = table.find('tbody').find_all('tr')
        logger.info(f"DEBUG: Found {len(rows)} rows")
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 3:
                continue
            
            # Extract Symbol and Name from their mapped or default columns
            # Symbol is usually a link in the first column
            symbol_col_idx = idx_map['symbol'] if idx_map['symbol'] != -1 else 0
            if symbol_col_idx >= len(cols):
                 logger.warning(f"DEBUG: Row has only {len(cols)} columns, need {symbol_col_idx}")
                 continue
                 
            symbol_col = cols[symbol_col_idx]
            symbol_tag = symbol_col.find('a')
            if not symbol_tag:
                 # logger.warning(f"DEBUG: No link in symbol column {symbol_col}")
                 continue
            symbol = symbol_tag.text.strip()
            
            name_col = cols[idx_map['name']] if idx_map['name'] != -1 and len(cols) > idx_map['name'] else cols[1]
            name = name_col.text.strip()
            
            # Extract Metrics
            sector = cols[idx_map['sector']].text.strip() if idx_map['sector'] != -1 and len(cols) > idx_map['sector'] else None
            
            # Safe extraction helper
            def get_col_val(idx):
                if idx != -1 and idx < len(cols):
                    return self._parse_number(cols[idx].text) or 0.0
                return 0.0

            price = get_col_val(idx_map['price'])
            change = get_col_val(idx_map['change'])
            pct_change = get_col_val(idx_map['pct_change'])
            volume = int(get_col_val(idx_map['volume']))
            
            # Calculate absolute change if missing but we have price and %
            if change == 0.0 and price != 0.0 and pct_change != 0.0:
                # Current = Prev * (1 + pct/100)
                # Prev = Current / (1 + pct/100)
                # Change = Current - Prev
                prev = price / (1 + (pct_change / 100))
                change = price - prev
                change = round(change, 3) # Keep clean
            
            tickers.append({
                "symbol": symbol,
                "name_en": name,
                "sector_name": sector,
                "market_code": "EGX",
                "currency": "EGP",
                "active": True,
                "last_price": price,
                "change": change,
                "change_percent": pct_change,
                "volume": int(volume) if volume else 0
            })
        
        logger.info(f"Found {len(tickers)} EGX tickers with price data")
        return tickers

    def get_company_profile(self, symbol: str) -> Dict:
        """extracts profile info"""
        url = f"{self.BASE_URL}/quote/egx/{symbol}/profile/"
        soup = self._get_soup(url)
        profile = {}
        
        if not soup:
            return profile

        # Description
        desc_div = soup.find('div', class_=lambda x: x and 'description' in x)
        if desc_div:
            profile['description'] = desc_div.text.strip()
            
        # Info Table (Sector, Industry, Employees)
        # Usually looking for specific labels
        for row in soup.find_all('div', class_='flex flex-row'): # Generic flex structure detection, risky
             text = row.text
             if 'Sector' in text:
                 profile['sector'] = text.replace('Sector', '').strip()
             if 'Industry' in text:
                 profile['industry'] = text.replace('Industry', '').strip()
             if 'Employees' in text:
                 profile['employees'] = text.replace('Employees', '').strip()
             if 'Website' in text:
                 link = row.find('a')
                 if link:
                     profile['website'] = link['href']

        return profile

    def get_financials(self, symbol: str, period: str = 'annual') -> List[Dict]:
        """
        Extracts financials. 
        period: 'annual' or 'quarterly'
        """
        # StockAnalysis uses /financials/ (Annual) and /financials/quarterly/
        suffix = "financials/"
        if period == 'quarterly':
            suffix += "quarterly/"
            
        url = f"{self.BASE_URL}/quote/egx/{symbol}/{suffix}"
        soup = self._get_soup(url)
        if not soup:
            return []
            
        table = soup.find('table')
        if not table:
            return []
            
        # Parse Headers (Years/Dates)
        headers = [th.text.strip() for th in table.find('thead').find_all('th')]
        # Headers: ["Year", "2023", "2022", ...]
        
        data_map = {} # Key: Date/Year, Value: Dict of metrics
        
        date_cols = headers[1:] # Skip first column
        
        rows = table.find('tbody').find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            metric_name = cols[0].text.strip()
            
            for i, col in enumerate(cols[1:]):
                if i >= len(date_cols): break
                
                date_key = date_cols[i]
                val = self._parse_number(col.text)
                
                if date_key not in data_map:
                    data_map[date_key] = {}
                
                data_map[date_key][metric_name] = val
                
        # Convert to list of dicts suitable for DB
        results = []
        for date_str, metrics in data_map.items():
            # Try to parse Year or Date
            fiscal_year = None
            end_date = None
            
            if len(date_str) == 4 and date_str.isdigit():
                fiscal_year = int(date_str)
                end_date = f"{fiscal_year}-12-31" # Approx for annual
            else:
                 # Try parse date like "Dec 31, 2023"
                 try:
                     dt = datetime.strptime(date_str, '%b %d, %Y')
                     end_date = dt.strftime('%Y-%m-%d')
                     fiscal_year = dt.year
                 except:
                     fiscal_year = 0 # Fallback
            
            entry = {
                "symbol": symbol,
                "period_type": "FY" if period == 'annual' else "Q", # Logic needs refinement for Q1/Q2
                "fiscal_year": fiscal_year,
                "end_date": end_date,
                "raw_data": metrics,
                # Map specific columns
                "revenue": metrics.get("Revenue"),
                "net_income": metrics.get("Net Income"),
                "gross_profit": metrics.get("Gross Profit"),
                "operating_income": metrics.get("Operating Income"),
                "eps": metrics.get("EPS (Basic)"),
                # We need to map more if we want specific columns filled
            }
            results.append(entry)
            
        return results

    def get_statistics(self, symbol: str) -> Dict:
        """Get key statistics (Valuation, etc)"""
        url = f"{self.BASE_URL}/quote/egx/{symbol}/statistics/"
        soup = self._get_soup(url)
        stats = {}
        if not soup: return stats
        
        # Determine all "value" cells
        # This page usually has multiple tables or grids.
        # We'll just grab common labels
        
        labels = soup.find_all(text=True)
        for i, text in enumerate(labels):
            if text in ['Market Cap', 'Enterprise Value', 'Trailing P/E', 'Forward P/E', 'Price / Sales', 'Price / Book']:
                # The value is usually the next element or nearby
                # This is brittle, better to find the cell structure
                pass
        
        # Better approach: Look for table cells
        cells = soup.find_all('div', class_=lambda x: x and 'data-cell' in x) # Hypothetical
        # Fallback: just parse all key-value pairs in tables
        tables = soup.find_all('table')
        for t in tables:
            for row in t.find_all('tr'):
                cols = row.find_all('td')
                if len(cols) >= 2:
                    k = cols[0].text.strip()
                    v = self._parse_number(cols[1].text)
                    stats[k] = v
                    
        return stats

    def get_dividends(self, symbol: str) -> List[Dict]:
        """Get dividend history"""
        url = f"{self.BASE_URL}/quote/egx/{symbol}/dividend/"
        soup = self._get_soup(url)
        if not soup: return []
        
        divs = []
        table = soup.find('table')
        if not table: return []
        
        # Headers usually: Ex-Dividend Date, Payout Amount, Yield, etc.
        rows = table.find('tbody').find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 2: continue
            
            try:
                date_str = cols[0].text.strip()
                amount = self._parse_number(cols[1].text)
                
                # Parse date
                ex_date = None
                try:
                    dt = datetime.strptime(date_str, '%b %d, %Y')
                    ex_date = dt.strftime('%Y-%m-%d')
                except:
                    continue
                
                divs.append({
                    "symbol": symbol,
                    "ex_date": ex_date,
                    "payment_date": ex_date, # Approximation
                    "amount": amount,
                    "type": "DIVIDEND"
                })
            except:
                continue
                
        return divs
