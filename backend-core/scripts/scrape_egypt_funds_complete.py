#!/usr/bin/env python3
"""
Comprehensive Decypha Egypt Funds Scraper
Extracts data from ALL fund profile tabs:
- Fund Profile (Overview, Management, Fees)
- Fund Performance (Returns, 52W range, NAV history)
- Fund Ratios (Sharpe, Alpha, Beta, etc.)
- Disclosures (PDF links)
"""

import asyncio
import os
import re
import json
import aiohttp
import asyncpg
from bs4 import BeautifulSoup
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

# Decypha URL patterns
BASE_URL = "https://www.decypha.com"
FUND_URLS = {
    'profile':     '{base}/en/fund-profile/EG/DFNMF/{symbol}',
    'performance': '{base}/en/fund-performance/EG/DFNMF/{symbol}',
    'ratios':      '{base}/en/fund-ratios/EG/DFNMF/{symbol}',
    'disclosures': '{base}/en/disclosures/EG/DFNMF/{symbol}',
    'investments': '{base}/en/fund-investments/EG/DFNMF/{symbol}',
}

# Session cookies from authenticated browser (updated 2026-01-07)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': '_gid=GA1.2.296858900.1767716209; __utmz=136105892.1767716264.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utma=136105892.1594976689.1767716209.1767735405.1767742498.3; advSearchHistory=["Arab African"]; country=Egypt; countryCode=EG; _ga_W40R8LVTWX=GS2.2.s1767775716$o5$g0$t1767775716$j60$l0$h0; tempRandom=n6rtvx8okv1r2m2mdbjjc; currentPackage=""; history=20260107091430%7E/%7E%7EHome%20Page; user=Bhidy.mubasher; userDetails="{\\\"rep_phn\\\":\\\"+94112593959\\\",\\\"fnam\\\":\\\"Ahmed \\\",\\\"mail\\\":\\\"m.mostafa@mubasher.net\\\",\\\"rep_nam\\\":\\\"DFN Accounts\\\",\\\"uid\\\":\\\"222158\\\",\\\"ccon\\\":\\\"EG\\\",\\\"phn\\\":\\\"+2 01222616863\\\",\\\"company\\\":\\\"Mubasher Trade\\\",\\\"titl\\\":\\\"Mr\\\",\\\"accType\\\":\\\"1\\\",\\\"lnam\\\":\\\"Tarek \\\",\\\"rep_nam_ar\\\":\\\"               \\\",\\\"rep_mail\\\":\\\"infoplus.dev@directfn.com\\\"}"; usrAccType=1; type=c; userServices="{\\\"PRO\\\":false}"; globalSelection=code%3D20%26conUrl%3DEG%26type%3Dreg%26desc%3DMENA%26regDet%3D20%252CMENA%26conDet%3DEG%252CEgypt%26exgDet%3DEGX%2CEgyptian%2BExchange; _ga_4JPCQH97XD=GS2.1.s1767777270$o5$g1$t1767777400$j1$l0$h0; _ga_3B3PQFES42=GS2.2.s1767777270$o4$g1$t1767777400$j60$l0$h0; _ga=GA1.2.1594976689.1767716209; _ga_1K4PXSBDPY=GS2.2.s1767775811$o2$g1$t1767777443$j17$l0$h0'
}


def clean_text(text):
    """Clean whitespace and special chars from text."""
    if not text:
        return None
    return text.strip().replace('\xa0', ' ').replace('--', '').strip() or None


def parse_decimal(text):
    """Parse decimal value from text, handling %, currency symbols, etc."""
    if not text:
        return None
    clean = str(text).replace(',', '').replace('%', '').replace('EGP', '').replace('USD', '').strip()
    if clean == '' or clean == '-' or clean == '--':
        return None
    try:
        return float(clean)
    except:
        return None


def parse_date(text):
    """Parse date from various formats."""
    if not text:
        return None
    clean = clean_text(text)
    if not clean:
        return None
    for fmt in ['%d-%b-%Y', '%d %b %Y', '%Y-%m-%d', '%d-%B-%Y']:
        try:
            return datetime.strptime(clean, fmt).date()
        except:
            continue
    return None


async def fetch_page(session, url):
    """Fetch a page with error handling."""
    try:
        async with session.get(url, headers=HEADERS, ssl=False) as resp:
            if resp.status == 200:
                return await resp.text()
            print(f"❌ Failed to fetch {url}: {resp.status}")
            return None
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        return None


def extract_header_data(soup):
    """Extract header section data (NAV, returns, symbol info)."""
    data = {}
    
    # NAV value: #fund_snapshot span
    nav_elem = soup.select_one('#fund_snapshot span')
    if nav_elem:
        data['latest_nav'] = parse_decimal(nav_elem.get_text())
    
    # Get currency from .fig_currency
    currency_elem = soup.select_one('#fund_snapshot .fig_currency')
    if currency_elem:
        data['currency'] = clean_text(currency_elem.get_text())
    
    # As Of Date: .last_update .b_lbl
    as_of_elem = soup.select_one('.last_update .b_lbl')
    if as_of_elem:
        as_of_text = as_of_elem.get_text()
        # Format: "As Of : 05-Jan-2026"
        date_match = re.search(r'(\d{1,2}[- ]\w{3}[- ]\d{4})', as_of_text)
        if date_match:
            data['as_of_date'] = parse_date(date_match.group(1))
    
    # 1Y Return: .side-right .col-12:nth-child(1) .chart_fig .fig_3
    y1_elem = soup.select_one('.side-right .col-12:nth-child(1) .chart_fig .fig_3')
    if y1_elem:
        data['one_year_return'] = parse_decimal(y1_elem.get_text())
    
    # YTD Return: .side-right .col-12:nth-child(2) .chart_fig .fig_3
    ytd_elem = soup.select_one('.side-right .col-12:nth-child(2) .chart_fig .fig_3')
    if ytd_elem:
        data['ytd_return'] = parse_decimal(ytd_elem.get_text())
    
    # ISIN from header - look for pattern
    page_text = soup.get_text()
    isin_match = re.search(r'ISIN\s*:\s*([A-Z0-9]{12})', page_text)
    if isin_match:
        data['isin'] = isin_match.group(1)
    
    return data


def extract_overview_data(soup):
    """Extract Overview section fields using ul.info structure."""
    data = {}
    
    def get_field(label):
        """Find field value by label in ul.info li structure."""
        # Look for li with .info_caption containing the label
        for li in soup.select('ul.info li'):
            caption = li.select_one('.info_caption')
            if caption and label.lower() in caption.get_text().lower():
                value = li.select_one('.info_txt')
                if value:
                    return clean_text(value.get_text())
        
        # Fallback: Try table row pattern
        for row in soup.select('table tr'):
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 2:
                if label.lower() in cells[0].get_text().lower():
                    return clean_text(cells[1].get_text())
        
        return None
    
    # Overview fields
    data['fund_classification'] = get_field('Fund Classification')
    data['geographic_focus'] = get_field('Geographic Focus')
    data['domicile'] = get_field('Domicile')
    data['eligibility'] = get_field('Eligibility')
    data['benchmark'] = get_field('Benchmark')
    data['nav_frequency'] = get_field('NAV Frequency')
    data['currency'] = data.get('currency') or get_field('Currency')
    data['fund_type'] = get_field('Type')
    data['establishment_date'] = parse_date(get_field('Establishing Date'))
    data['certificates'] = get_field('Certificates')
    data['duration_years'] = parse_decimal(get_field('Duration'))
    data['par_value'] = parse_decimal(get_field('Par Value'))
    data['fy_start'] = get_field('Start of FY')
    data['fy_end'] = get_field('End of FY')
    data['objective'] = get_field('Objective')
    data['investment_strategy'] = get_field('Investment Strategy')
    data['dividend_policy'] = get_field('Dividend')
    data['risk_level'] = get_field('Risk')
    
    # Management
    data['manager_name_en'] = get_field('Manager')
    data['issuer'] = get_field('Issuer')
    data['ipo_receiver'] = get_field('IPO Receiver')
    
    # Fees
    data['fee_subscription'] = parse_decimal(get_field('Subscription'))
    data['fee_redemption'] = parse_decimal(get_field('Redemption'))
    data['fee_management'] = parse_decimal(get_field('Management'))
    data['fee_administration'] = parse_decimal(get_field('Administration'))
    data['fee_custodian'] = parse_decimal(get_field('Custodian'))
    data['fee_performance'] = parse_decimal(get_field('Performance'))
    data['min_subscription'] = parse_decimal(get_field('Min. Subscription'))
    data['subsequent_sub'] = parse_decimal(get_field('Subsequent'))
    data['other_expenses'] = get_field('Other Expenses')
    
    return data


async def scrape_performance_tab(session, symbol):
    """Scrape Fund Performance tab for returns and chart data."""
    url = FUND_URLS['performance'].format(base=BASE_URL, symbol=symbol)
    html = await fetch_page(session, url)
    if not html:
        return {}
    
    soup = BeautifulSoup(html, 'html.parser')
    data = {}
    
    # Look for performance metrics table
    # Expected fields: 1M, 3M, YTD, 1Y, 3Y, 5Y changes
    def get_perf_field(label):
        td = soup.find(lambda tag: tag.name in ['td', 'th'] and label in tag.get_text())
        if td:
            value_td = td.find_next_sibling('td')
            if value_td:
                return parse_decimal(value_td.get_text())
        return None
    
    data['returns_1m'] = get_perf_field('1M')
    data['returns_3m'] = get_perf_field('3M')
    data['ytd_return'] = get_perf_field('YTD')
    data['one_year_return'] = get_perf_field('1Y')
    data['returns_3y'] = get_perf_field('3Y')
    data['returns_5y'] = get_perf_field('5Y')
    
    # Look for 52-week range
    nav_52w_text = soup.find(string=re.compile(r'52.*Weeks?', re.I))
    if nav_52w_text:
        range_text = nav_52w_text.parent.get_text() if nav_52w_text.parent else str(nav_52w_text)
        # Pattern: 52 Weeks: 100.00 - 180.00 or Low: 100 High: 180
        range_match = re.search(r'([\d.]+)\s*[-–]\s*([\d.]+)', range_text)
        if range_match:
            data['nav_52w_low'] = parse_decimal(range_match.group(1))
            data['nav_52w_high'] = parse_decimal(range_match.group(2))
    
    # Try to extract chart data from embedded JavaScript
    scripts = soup.find_all('script')
    nav_history = []
    for script in scripts:
        if script.string and ('chartData' in script.string or 'navData' in script.string):
            # Look for JSON array patterns
            json_match = re.search(r'\[.*?\{.*?"date".*?:.*?"nav".*?\}.*?\]', script.string, re.DOTALL)
            if json_match:
                try:
                    nav_history = json.loads(json_match.group())
                except:
                    pass
            
            # Alternative: Look for data arrays
            date_match = re.findall(r'"(\d{4}-\d{2}-\d{2})"', script.string)
            nav_match = re.findall(r'"nav"\s*:\s*([\d.]+)', script.string)
            if date_match and nav_match and len(date_match) == len(nav_match):
                nav_history = [
                    {'date': d, 'nav': float(n)} 
                    for d, n in zip(date_match, nav_match)
                ]
    
    data['nav_history'] = nav_history
    
    return data


async def scrape_ratios_tab(session, symbol):
    """Scrape Fund Ratios tab for risk metrics."""
    url = FUND_URLS['ratios'].format(base=BASE_URL, symbol=symbol)
    html = await fetch_page(session, url)
    if not html:
        return {}
    
    soup = BeautifulSoup(html, 'html.parser')
    data = {}
    
    def get_ratio_field(label):
        td = soup.find(lambda tag: tag.name in ['td', 'th', 'span'] and label.lower() in tag.get_text().lower())
        if td:
            value_elem = td.find_next_sibling(['td', 'span'])
            if value_elem:
                return parse_decimal(value_elem.get_text())
        return None
    
    data['sharpe_ratio'] = get_ratio_field('Sharpe')
    data['alpha'] = get_ratio_field('Alpha')
    data['beta'] = get_ratio_field('Beta')
    data['r_squared'] = get_ratio_field('R-Squared') or get_ratio_field('R²')
    data['treynor_ratio'] = get_ratio_field('Treynor')
    data['information_ratio'] = get_ratio_field('Information')
    data['volatility_monthly'] = get_ratio_field('Monthly')
    data['volatility_annual'] = get_ratio_field('Annual') or get_ratio_field('Annualized')
    data['correlation'] = get_ratio_field('Correlation')
    
    return data


async def scrape_disclosures_tab(session, symbol):
    """Scrape Disclosures tab for PDF document links."""
    url = FUND_URLS['disclosures'].format(base=BASE_URL, symbol=symbol)
    html = await fetch_page(session, url)
    if not html:
        return []
    
    soup = BeautifulSoup(html, 'html.parser')
    disclosures = []
    
    # Look for disclosure table rows
    rows = soup.select('table tbody tr')
    for row in rows:
        cols = row.find_all('td')
        if len(cols) >= 2:
            date_text = clean_text(cols[0].get_text())
            title = clean_text(cols[1].get_text())
            
            # Look for PDF link
            pdf_link = row.find('a', href=re.compile(r'\.pdf', re.I))
            file_url = pdf_link.get('href', '') if pdf_link else None
            
            # Determine sub_category from title
            sub_category = 'other'
            if 'prospectus' in title.lower():
                sub_category = 'prospectus'
            elif 'monthly' in title.lower() or 'performance' in title.lower():
                sub_category = 'fact_sheet'
            elif 'annual' in title.lower():
                sub_category = 'annual_report'
            
            disclosures.append({
                'disclosure_date': parse_date(date_text),
                'title': title,
                'sub_category': sub_category,
                'file_url': file_url if file_url and file_url.startswith('http') else f"{BASE_URL}{file_url}" if file_url else None
            })
    
    return disclosures


async def scrape_fund_complete(session, symbol):
    """Scrape all tabs for a single fund."""
    print(f"🔍 Scraping {symbol}...")
    
    # 1. Profile tab (includes header, overview, management, fees)
    profile_url = FUND_URLS['profile'].format(base=BASE_URL, symbol=symbol)
    html = await fetch_page(session, profile_url)
    if not html:
        return None
    
    soup = BeautifulSoup(html, 'html.parser')
    
    data = {'symbol': symbol}
    
    # Extract header data
    header_data = extract_header_data(soup)
    data.update(header_data)
    
    # Extract overview data
    overview_data = extract_overview_data(soup)
    data.update(overview_data)
    
    # 2. Performance tab
    await asyncio.sleep(0.3)  # Rate limiting
    perf_data = await scrape_performance_tab(session, symbol)
    for key, value in perf_data.items():
        if value is not None and key != 'nav_history':
            data[key] = value
    data['nav_history'] = perf_data.get('nav_history', [])
    
    # 3. Ratios tab
    await asyncio.sleep(0.3)
    ratios_data = await scrape_ratios_tab(session, symbol)
    for key, value in ratios_data.items():
        if value is not None:
            data[key] = value
    
    # 4. Disclosures tab
    await asyncio.sleep(0.3)
    data['disclosures'] = await scrape_disclosures_tab(session, symbol)
    
    return data


async def save_fund_complete(conn, data):
    """Save complete fund data to database."""
    symbol = data['symbol']
    
    # Check if fund exists
    row = await conn.fetchrow('SELECT fund_id FROM mutual_funds WHERE symbol = $1', symbol)
    
    if row:
        fund_id = row['fund_id']
        # Update existing fund
        await conn.execute('''
            UPDATE mutual_funds SET
                fund_name_en = COALESCE($2, fund_name_en),
                latest_nav = COALESCE($3, latest_nav),
                as_of_date = COALESCE($4, as_of_date),
                one_year_return = COALESCE($5, one_year_return),
                ytd_return = COALESCE($6, ytd_return),
                isin = COALESCE($7, isin),
                fund_classification = COALESCE($8, fund_classification),
                domicile = COALESCE($9, domicile),
                eligibility = COALESCE($10, eligibility),
                currency = COALESCE($11, currency),
                fund_type = COALESCE($12, fund_type),
                establishment_date = COALESCE($13, establishment_date),
                manager_name_en = COALESCE($14, manager_name_en),
                issuer = COALESCE($15, issuer),
                returns_1m = COALESCE($16, returns_1m),
                returns_3m = COALESCE($17, returns_3m),
                returns_3y = COALESCE($18, returns_3y),
                returns_5y = COALESCE($19, returns_5y),
                nav_52w_high = COALESCE($20, nav_52w_high),
                nav_52w_low = COALESCE($21, nav_52w_low),
                sharpe_ratio = COALESCE($22, sharpe_ratio),
                alpha = COALESCE($23, alpha),
                beta = COALESCE($24, beta),
                r_squared = COALESCE($25, r_squared),
                treynor_ratio = COALESCE($26, treynor_ratio),
                volatility_monthly = COALESCE($27, volatility_monthly),
                volatility_annual = COALESCE($28, volatility_annual),
                market_code = 'EGX',
                last_updated = NOW()
            WHERE fund_id = $1
        ''', fund_id,
           data.get('fund_name_en'), data.get('latest_nav'), data.get('as_of_date'),
           data.get('one_year_return'), data.get('ytd_return'), data.get('isin'),
           data.get('fund_classification'), data.get('domicile'), data.get('eligibility'),
           data.get('currency'), data.get('fund_type'), data.get('establishment_date'),
           data.get('manager_name_en'), data.get('issuer'),
           data.get('returns_1m'), data.get('returns_3m'), data.get('returns_3y'), data.get('returns_5y'),
           data.get('nav_52w_high'), data.get('nav_52w_low'),
           data.get('sharpe_ratio'), data.get('alpha'), data.get('beta'), data.get('r_squared'),
           data.get('treynor_ratio'), data.get('volatility_monthly'), data.get('volatility_annual')
        )
    else:
        # Insert new fund
        fund_id = symbol  # Use symbol as fund_id for Egypt funds
        await conn.execute('''
            INSERT INTO mutual_funds (
                fund_id, symbol, fund_name_en, latest_nav, as_of_date,
                one_year_return, ytd_return, isin, fund_classification, domicile, eligibility,
                currency, fund_type, establishment_date, manager_name_en, issuer,
                returns_1m, returns_3m, returns_3y, returns_5y, nav_52w_high, nav_52w_low,
                sharpe_ratio, alpha, beta, r_squared, treynor_ratio, volatility_monthly, volatility_annual,
                market_code, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, 'EGX', NOW())
        ''', fund_id, symbol,
           data.get('fund_name_en'), data.get('latest_nav'), data.get('as_of_date'),
           data.get('one_year_return'), data.get('ytd_return'), data.get('isin'),
           data.get('fund_classification'), data.get('domicile'), data.get('eligibility'),
           data.get('currency'), data.get('fund_type'), data.get('establishment_date'),
           data.get('manager_name_en'), data.get('issuer'),
           data.get('returns_1m'), data.get('returns_3m'), data.get('returns_3y'), data.get('returns_5y'),
           data.get('nav_52w_high'), data.get('nav_52w_low'),
           data.get('sharpe_ratio'), data.get('alpha'), data.get('beta'), data.get('r_squared'),
           data.get('treynor_ratio'), data.get('volatility_monthly'), data.get('volatility_annual')
        )
    
    # Save NAV history
    nav_history = data.get('nav_history', [])
    for entry in nav_history:
        try:
            await conn.execute('''
                INSERT INTO nav_history (fund_id, date, nav)
                VALUES ($1, $2, $3)
                ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
            ''', fund_id, entry.get('date'), entry.get('nav'))
        except Exception as e:
            print(f"   ⚠️ NAV history insert error: {e}")
    
    # Save disclosures
    disclosures = data.get('disclosures', [])
    for disc in disclosures:
        try:
            await conn.execute('''
                INSERT INTO fund_disclosures (fund_id, disclosure_date, title, sub_category, file_url)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT DO NOTHING
            ''', fund_id, disc.get('disclosure_date'), disc.get('title'), disc.get('sub_category'), disc.get('file_url'))
        except Exception as e:
            print(f"   ⚠️ Disclosure insert error: {e}")
    
    print(f"✅ Saved {symbol} (NAV: {data.get('latest_nav')}, 1Y: {data.get('one_year_return')}%)")


async def load_fund_list():
    """Load list of Egypt funds from JSON file."""
    json_path = os.path.join(os.path.dirname(__file__), '..', 'decypha_funds_list.json')
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            funds = json.load(f)
        return [f['symbol'] for f in funds]
    return []


async def main(test_symbol=None):
    """Main scraper entry point."""
    print("🚀 Decypha Egypt Funds Complete Scraper")
    print("=" * 50)
    
    # Use statement_cache_size=0 for pgbouncer compatibility
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    connector = aiohttp.TCPConnector(ssl=False)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        if test_symbol:
            # Test mode: single fund
            symbols = [test_symbol]
            print(f"📋 Test mode: scraping {test_symbol}")
        else:
            # Full mode: all funds
            symbols = await load_fund_list()
            print(f"📋 Found {len(symbols)} funds to scrape")
        
        for i, symbol in enumerate(symbols):
            print(f"\n[{i+1}/{len(symbols)}] Processing {symbol}...")
            
            data = await scrape_fund_complete(session, symbol)
            if data:
                await save_fund_complete(conn, data)
            
            # Rate limiting between funds
            await asyncio.sleep(1)
    
    await conn.close()
    print("\n🏁 Scraping complete!")


if __name__ == "__main__":
    import sys
    
    # Allow test mode: python scrape_egypt_funds_complete.py EGYAFMDHB
    test_symbol = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(main(test_symbol))
