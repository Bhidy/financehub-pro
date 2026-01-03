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
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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

        rows = table.find('tbody').find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 3:
                continue
                
            symbol_tag = cols[0].find('a')
            if not symbol_tag:
                 continue
                 
            symbol = symbol_tag.text.strip()
            name = cols[1].text.strip()
            
            # Identify Sector if available (column index varies)
            # Usually: Symbol, Name, Price, ..., Sector is often last or near end
            # Let's try to find 'Sector' header index
            headers = [th.text for th in table.find('thead').find_all('th')]
            sector_idx = -1
            for i, h in enumerate(headers):
                if 'Sector' in h:
                    sector_idx = i
                    break
            
            sector = cols[sector_idx].text.strip() if sector_idx != -1 and len(cols) > sector_idx else None
            
            tickers.append({
                "symbol": symbol,
                "name_en": name,
                "sector_name": sector,
                "market_code": "EGX",
                "currency": "EGP",
                "active": True
            })
            
        logger.info(f"Found {len(tickers)} EGX tickers")
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
