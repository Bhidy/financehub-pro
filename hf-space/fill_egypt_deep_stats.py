
import asyncio
import httpx
from bs4 import BeautifulSoup
from app.db.session import db
import time
import argparse
import json
import re

# Configuration
BASE_URL = "https://stockanalysis.com/quote/egx/{symbol}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Mapping: Source Key -> DB Column (stock_statistics)
STATS_MAP = {
    'Enterprise Value': 'enterprise_value',
    'PE Ratio': 'pe_ratio',
    'Forward PE': 'forward_pe',
    'PEG Ratio': 'peg_ratio',
    'PS Ratio': 'ps_ratio',
    'PB Ratio': 'pb_ratio',
    'Price/Book': 'pb_ratio', # Alias
    'EV / EBITDA': 'ev_ebitda',
    'EV / Sales': 'ev_sales',
    'Return on Equity (ROE)': 'roe',
    'Return on Assets (ROA)': 'roa',
    'Return on Invested Capital (ROIC)': 'roic',
    'Return on Capital Employed (ROCE)': 'roce',
    'Gross Margin': 'gross_margin',
    'Operating Margin': 'operating_margin',
    'Profit Margin': 'profit_margin',
    'EBITDA Margin': 'ebitda_margin',
    'Total Debt': 'total_debt',
    'Cash & Cash Equivalents': 'cash_ttm',
    'Debt / Equity': 'debt_equity',
    'Current Ratio': 'current_ratio',
    'Quick Ratio': 'quick_ratio',
    'Interest Coverage': 'interest_coverage',
    'Beta (5Y)': 'beta_5y',
    'Relative Strength Index (RSI)': 'rsi_14',
    '50-Day Moving Average': 'ma_50d',
    '200-Day Moving Average': 'ma_200d',
    'Revenue': 'revenue_ttm', # Usually TTM in Statistics table
    'Net Income': 'net_income_ttm',
    'EBITDA': 'ebitda_ttm',
    'Free Cash Flow': 'fcf_ttm',
    'EPS (ttm)': 'eps_ttm',
    'Dividend Yield': 'dividend_yield',
    'Payout Ratio': 'payout_ratio',
    # Phase 5 Additions
    'Altman Z-Score': 'altman_z_score',
    'Piotroski F-Score': 'piotroski_f_score',
    'EV / EBIT': 'ev_ebit',
    'EV / FCF': 'ev_fcf',
    'Debt / EBITDA': 'debt_ebitda',
    'Pretax Margin': 'pretax_margin',
    'Shares Outstanding': 'shares_outstanding',
    'Float': 'float_shares',
    # Phase 6: The Final 8 (Hidden Gems)
    'P/OCF Ratio': 'p_ocf',
    'P/TBV Ratio': 'p_tbv',
    'Debt / FCF': 'debt_fcf',
    'Return on Capital Employed (ROCE)': 'roce',
    'Asset Turnover': 'asset_turnover',
    'Inventory Turnover': 'inventory_turnover',
    'Earnings Yield': 'earnings_yield',
    'FCF Yield': 'fcf_yield',
    'FCF Margin': 'fcf_margin'
}

def parse_val(s):
    if not s or s == 'n/a' or s == '-': return None
    clean = s.replace(',', '').replace('%', '').strip()
    multiplier = 1.0
    if s.endswith('%'): multiplier = 0.01 # Store 50% as 0.50? Or 50? Usually ratios are 0.50
    # Wait, existing data: dividend_yield 0.0226. So % should be /100.
    
    # Handle B, M, T, K
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

async def fetch_deep_stats(client, symbol):
    # 1. STATISTICS PAGE
    url = f"{BASE_URL.format(symbol=symbol.upper())}/statistics/"
    stats_data = {}
    
    try:
        resp = await client.get(url, headers=HEADERS, follow_redirects=True)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            tables = soup.find_all('table')
            
            # Flatten table data
            for t in tables:
                rows = t.find_all('tr')
                for row in rows:
                    cols = row.find_all(['td', 'th'])
                    if len(cols) >= 2:
                        key = cols[0].text.strip()
                        val_str = cols[1].text.strip()
                        stats_data[key] = val_str
    except Exception as e:
        print(f"Stats Error {symbol}: {e}")

    # Map to DB Columns
    db_stats = {}
    for src_key, db_col in STATS_MAP.items():
        if src_key in stats_data:
            val = parse_val(stats_data[src_key])
            if val is not None:
                db_stats[db_col] = val

    # 2. COMPANY PROFILE PAGE (Officers, Website)
    url_prof = f"{BASE_URL.format(symbol=symbol.upper())}/company/"
    profile_data = {}
    
    try:
        resp = await client.get(url_prof, headers=HEADERS, follow_redirects=True)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Website, Phone (Usually in tables)
            # Table logic again
            tables = soup.find_all('table')
            for t in tables:
                rows = t.find_all('tr')
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 2:
                        key = cols[0].text.strip()
                        val = cols[1].text.strip()
                        if 'Website' in key or 'Web' in key: 
                            link = cols[1].find('a')
                            if link and link.get('href'):
                                profile_data['website'] = link.get('href')
                            else:
                                profile_data['website'] = val
                        if 'Phone' in key: profile_data['phone'] = val
                        if 'Employees' in key: 
                            try: profile_data['employees'] = int(val.replace(',', ''))
                            except: pass
            
            # Officers / Executives
            # Looking for table with "Name", "Position" header OR specific class
            # Probe showed Table 3 has "Name", "Position".
            officers = []
            for t in tables:
                headers = [th.text.strip().lower() for th in t.find_all('th')]
                if 'name' in headers and 'position' in headers:
                    # Found it
                    print(f"  Found Officers Table with headers: {headers}")
                    rows = t.find_all('tr')[1:]
                    for r in rows:
                        cols = [td.text.strip() for td in r.find_all('td')]
                        if len(cols) >= 2:
                            officers.append({'name': cols[0], 'position': cols[1]})
                else:
                    print(f"  Skipped Table headers: {headers}")
            
            if officers:
                profile_data['officers'] = json.dumps(officers)
                
    except Exception as e:
        print(f"Profile Error {symbol}: {e}")
        
    return db_stats, profile_data

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    await db.connect()
    print("Fetching EGX Symbols...")
    rows = await db.fetch_all("SELECT symbol FROM market_tickers WHERE market_code = 'EGX'")
    symbols = [r['symbol'] for r in rows]
    
    if args.limit: symbols = symbols[:args.limit]
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        count = 0
        for symbol in symbols:
            print(f"[{symbol}] Deep Scrape...", end=" ", flush=True)
            stats, profile = await fetch_deep_stats(client, symbol)
            
            got_stats = len(stats) > 0
            got_prof = len(profile) > 0
            
            print(f"Stats: {len(stats)} fields. Profile: {len(profile)} fields.")
            
            if not args.dry_run:
                # 1. Update stock_statistics
                # Check if row exists first
                # In Supabase/Postgres we can INSERT ... ON CONFLICT
                # But let's verify if `stock_statistics` has rows. It has 223 rows linked.
                # So we UPDATE.
                
                if stats:
                    # Build Dynamic Query
                    set_clauses = [f"{k} = ${i+2}" for i, k in enumerate(stats.keys())]
                    if set_clauses:
                        sql = f"""
                            UPDATE stock_statistics
                            SET {', '.join(set_clauses)}, updated_at = NOW()
                            WHERE symbol = $1 AND market_code = 'EGX'
                        """
                        # params: symbol, val1, val2...
                        params = [symbol] + list(stats.values())
                        await db.execute(sql, *params)
                
                # 2. Update company_profiles
                if profile:
                    set_clauses = [f"{k} = ${i+2}" for i, k in enumerate(profile.keys())]
                    if set_clauses:
                        sql = f"""
                            UPDATE company_profiles
                            SET {', '.join(set_clauses)}, updated_at = NOW()
                            WHERE symbol = $1
                        """
                        params = [symbol] + list(profile.values())
                        await db.execute(sql, *params)
                
            count += 1
            # Gentle rate limit
            time.sleep(1.0)
            
    print(f"Completed {count} stocks.")
    await db.close()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
