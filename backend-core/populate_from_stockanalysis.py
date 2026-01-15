import asyncio
import httpx
from bs4 import BeautifulSoup
import asyncpg
import json
import time
import argparse
import re
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
BASE_URL = "https://stockanalysis.com/quote/egx/{symbol}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def parse_val(s):
    if not s or s == 'n/a' or s == '-': return None
    clean = s.replace(',', '').replace('%', '').strip()
    multiplier = 1.0
    if s.endswith('%'): multiplier = 0.01 
    
    if clean.endswith('T'): 
        multiplier = 1e12
        clean = clean[:-1]
    elif clean.endswith('B'): 
        multiplier = 1e9
        clean = clean[:-1]
    elif clean.endswith('M'): 
        multiplier = 1e6
        clean = clean[:-1]
    elif clean.endswith('K'): 
        multiplier = 1e3
        clean = clean[:-1]
        
    try:
        val = float(clean)
        if s.endswith('%'): val = val * 0.01
        else: val = val * multiplier
        return val
    except:
        return None

async def fetch_sa_data(client, symbol):
    """
    Fetches Profile and Statistics from StockAnalysis.com and returns a dict 
    compatible with 'yahoo_cache' financial_data/profile_data structure.
    """
    sa_fund = {}
    sa_prof = {}
    
    # 1. STATISTICS PAGE
    url = f"{BASE_URL.format(symbol=symbol.upper())}/statistics/"
    try:
        resp = await client.get(url, headers=HEADERS, follow_redirects=True)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            tables = soup.find_all('table')
            
            stats_map = {}
            for t in tables:
                rows = t.find_all('tr')
                for row in rows:
                    cols = row.find_all(['td', 'th'])
                    if len(cols) >= 2:
                        key = cols[0].text.strip()
                        val_str = cols[1].text.strip()
                        stats_map[key] = val_str
            
            # Map to Yahoo Keys
            # Valuation
            if 'PE Ratio' in stats_map: sa_fund['pe_ratio'] = parse_val(stats_map['PE Ratio'])
            if 'Forward PE' in stats_map: sa_fund['forward_pe'] = parse_val(stats_map['Forward PE'])
            if 'PEG Ratio' in stats_map: sa_fund['peg_ratio'] = parse_val(stats_map['PEG Ratio'])
            if 'Price/Book' in stats_map: sa_fund['price_to_book'] = parse_val(stats_map['Price/Book'])
            if 'PS Ratio' in stats_map: sa_fund['price_to_sales'] = parse_val(stats_map['PS Ratio'])
            if 'Enterprise Value' in stats_map: sa_fund['enterprise_value'] = parse_val(stats_map['Enterprise Value'])
            if 'EV / EBITDA' in stats_map: sa_fund['enterprise_to_ebitda'] = parse_val(stats_map['EV / EBITDA'])
            if 'EV / Sales' in stats_map: sa_fund['enterprise_to_revenue'] = parse_val(stats_map['EV / Sales'])
            
            # Profitability
            if 'Profit Margin' in stats_map: sa_fund['profit_margin'] = parse_val(stats_map['Profit Margin'])
            if 'Operating Margin' in stats_map: sa_fund['operating_margin'] = parse_val(stats_map['Operating Margin'])
            if 'Gross Margin' in stats_map: sa_fund['gross_margin'] = parse_val(stats_map['Gross Margin'])
            if 'Return on Equity (ROE)' in stats_map: sa_fund['return_on_equity'] = parse_val(stats_map['Return on Equity (ROE)'])
            if 'Return on Assets (ROA)' in stats_map: sa_fund['return_on_assets'] = parse_val(stats_map['Return on Assets (ROA)'])
            
            # Financials
            if 'Revenue' in stats_map: sa_fund['total_revenue'] = parse_val(stats_map['Revenue'])
            if 'Total Debt' in stats_map: sa_fund['total_debt'] = parse_val(stats_map['Total Debt'])
            if 'Cash & Cash Equivalents' in stats_map: sa_fund['total_cash'] = parse_val(stats_map['Cash & Cash Equivalents'])
            if 'EPS (ttm)' in stats_map: sa_fund['trailing_eps'] = parse_val(stats_map['EPS (ttm)'])
            if 'Free Cash Flow' in stats_map: sa_fund['free_cash_flow'] = parse_val(stats_map['Free Cash Flow'])
            if 'Debt / Equity' in stats_map: sa_fund['debt_to_equity'] = parse_val(stats_map['Debt / Equity'])
            if 'Current Ratio' in stats_map: sa_fund['current_ratio'] = parse_val(stats_map['Current Ratio'])
            if 'Quick Ratio' in stats_map: sa_fund['quick_ratio'] = parse_val(stats_map['Quick Ratio'])
            
            # Dividends
            if 'Dividend Yield' in stats_map: 
                 # SA gives e.g. 4.50%. parse_val returns 0.045
                 # Yahoo expects percentage as number? Or fraction? 
                 # yfinance usually gives fraction (0.045). 
                 # BUT my backend helper multiplied by 100 in previous versions ???
                 # Let's stick to decimal (0.045)
                 sa_fund['dividend_yield'] = parse_val(stats_map['Dividend Yield'])
            if 'Payout Ratio' in stats_map: sa_fund['payout_ratio'] = parse_val(stats_map['Payout Ratio'])
            
            # Structure
            if 'Beta (5Y)' in stats_map: sa_fund['beta'] = parse_val(stats_map['Beta (5Y)'])
            if 'Shares Outstanding' in stats_map: sa_prof['shares_outstanding'] = parse_val(stats_map['Shares Outstanding'])
            if 'Float' in stats_map: sa_prof['float_shares'] = parse_val(stats_map['Float'])

    except Exception as e:
        print(f"Error Stats {symbol}: {e}")

    # 2. PROFILE PAGE
    url_prof = f"{BASE_URL.format(symbol=symbol.upper())}/company/"
    try:
        resp = await client.get(url_prof, headers=HEADERS, follow_redirects=True)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Description is usually in a paragraph with specific class or just after header
            # Looking for meta description or first p tag in main content
            # StockAnalysis puts description in a div class relative to 'About'
            
            # Brute force description finding: look for long text
            desc_div = soup.find('div', class_=re.compile('text-gray-'))
            # Better: use meta description as fallback
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                # content usually "Commercial International Bank Egypt (CIB) S.A.E. company profile. Sector: Financials. ..."
                content = meta_desc['content']
                sa_prof['description'] = content
            
            # Extract Sector/Industry/Employees from table
            tables = soup.find_all('table')
            for t in tables:
                rows = t.find_all('tr')
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 2:
                        key = cols[0].text.strip()
                        val = cols[1].text.strip()
                        
                        if 'Sector' in key: sa_prof['sector'] = val
                        if 'Industry' in key: sa_prof['industry'] = val
                        if 'Employees' in key: sa_prof['employees'] = parse_val(val) # Returns float, cast to int later?
                        if 'Website' in key: 
                            link = cols[1].find('a')
                            if link: sa_prof['website'] = link.get('href')
                        if 'Phone' in key: sa_prof['phone'] = val
                        
    except Exception as e:
        print(f"Error Profile {symbol}: {e}")
        
    return sa_prof, sa_fund

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("No DATABASE_URL")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    # Get symbols
    rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code='EGX'")
    symbols = [r['symbol'] for r in rows]
    # Fallback
    if not symbols:
         symbols = ["COMI", "SWDY", "ETEL", "EAST", "HRHO", "MNHD", "TMGH", "EKHO", "ADIB", "HDBK"]
    # symbols = ["COMI"]
    
    print(f"Starting StockAnalysis Scrape for {len(symbols)} symbols...")
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        for sym in symbols:
            print(f"Processing {sym}...", end=" ", flush=True)
            
            prof, fund = await fetch_sa_data(client, sym)
            
            if prof or fund:
                # We need to UPSERT merged.
                # First get existing cache
                row = await conn.fetchrow("SELECT profile_data, financial_data FROM yahoo_cache WHERE symbol=$1", sym)
                
                curr_prof = {}
                curr_fund = {}
                
                if row:
                    if row['profile_data']: curr_prof = json.loads(row['profile_data'])
                    if row['financial_data']: curr_fund = json.loads(row['financial_data'])
                
                # Merge: New data overrides old nulls, but what about existing data?
                # We assume StockAnalysis is BETTER for static/fund, YFinance better for Price/MktCap
                # So we update curr with new
                curr_prof.update({k:v for k,v in prof.items() if v is not None})
                curr_fund.update({k:v for k,v in fund.items() if v is not None})
                
                # Upsert
                await conn.execute("""
                    INSERT INTO yahoo_cache (symbol, profile_data, financial_data, last_updated)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (symbol) DO UPDATE 
                    SET profile_data = $2, financial_data = $3, last_updated = NOW()
                """, sym, json.dumps(curr_prof), json.dumps(curr_fund))
                
                print(f"UPDATED (Prof: {len(prof)}, Fund: {len(fund)})")
            else:
                print("No Data Found.")
            
            time.sleep(1.0) # Be polite

    await conn.close()
    print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
