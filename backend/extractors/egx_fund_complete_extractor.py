"""
AGGRESSIVE COMPLETE EGX FUND EXTRACTOR
=======================================
Extracts 100% of ALL available data from Mubasher.info
Zero tolerance for NULL fields where data exists on source.

Sources:
1. Fund List API (basic data)
2. Statistics Page (symbol, classification)
3. Individual Fund Pages (ALL profile, performance, NAV history)
"""

import tls_client
import time
import re
import asyncio
import asyncpg
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
from bs4 import BeautifulSoup

# Load environment
load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database Config
DATABASE_URL = os.getenv("DATABASE_URL")

def create_session():
    """Create TLS client session with browser fingerprint."""
    return tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )

def get_headers(referer="https://english.mubasher.info/"):
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": referer,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
    }

def parse_pct(val):
    """Parse percentage string to float."""
    if not val:
        return None
    try:
        clean = str(val).replace('%', '').replace(',', '').replace('+', '').replace('−', '-').replace('–', '-').strip()
        if clean in ['', '-', 'N/A', 'null']:
            return None
        return float(clean)
    except:
        return None

def parse_date(date_str):
    """Parse date string like '31 July 2024' to date object."""
    if not date_str:
        return None
    try:
        # Try various formats
        for fmt in ['%d %B %Y', '%Y-%m-%d', '%d/%m/%Y', '%d %b %Y']:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except:
                continue
        return None
    except:
        return None

def fetch_fund_list():
    """Fetch all Egypt mutual fund IDs from API."""
    session = create_session()
    all_funds = []
    start = 0
    size = 100
    
    while True:
        url = f"https://english.mubasher.info/api/1/funds?country=EG&start={start}&size={size}"
        logger.info(f"Fetching fund list: {url}")
        
        try:
            resp = session.get(url, headers=get_headers())
            if resp.status_code != 200:
                break
            
            data = resp.json()
            rows = data.get('rows', [])
            
            if not rows:
                break
                
            all_funds.extend(rows)
            logger.info(f"Got {len(rows)} funds. Total: {len(all_funds)}")
            
            if len(rows) < size:
                break
                
            start += size
            time.sleep(0.3)
            
        except Exception as e:
            logger.error(f"Exception fetching list: {e}")
            break

    return all_funds

def scrape_statistics_page(session):
    """Scrape statistics page for symbols and classifications."""
    url = "https://english.mubasher.info/countries/eg/funds-statistics"
    logger.info(f"Scraping statistics page: {url}")
    
    symbol_map = {}  # fund_id -> {symbol, classification}
    
    try:
        resp = session.get(url, headers=get_headers())
        if resp.status_code != 200:
            logger.error(f"Failed to get statistics page: {resp.status_code}")
            return symbol_map
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Find table rows with fund data
        for row in soup.select('table tr, .fund-row, .list-item'):
            # Try to extract symbol from data attributes or cells
            fund_link = row.select_one('a[href*="/funds/"]')
            if fund_link:
                href = fund_link.get('href', '')
                match = re.search(r'/funds/(\d+)', href)
                if match:
                    fund_id = match.group(1)
                    
                    # Look for symbol in row
                    symbol_el = row.select_one('.symbol, [data-symbol], td:nth-child(2)')
                    symbol = None
                    if symbol_el:
                        symbol = symbol_el.get_text(strip=True)
                        if len(symbol) > 20:  # Not a symbol
                            symbol = None
                    
                    # Look for classification
                    class_el = row.select_one('.classification, .category, td:nth-child(4)')
                    classification = None
                    if class_el:
                        classification = class_el.get_text(strip=True)
                        if len(classification) > 50:
                            classification = None
                    
                    if symbol or classification:
                        symbol_map[fund_id] = {
                            'symbol': symbol,
                            'classification': classification
                        }
        
        logger.info(f"Found {len(symbol_map)} funds with symbols/classifications")
        
    except Exception as e:
        logger.error(f"Error scraping statistics: {e}")
    
    return symbol_map

def scrape_fund_detail(session, fund_id):
    """
    AGGRESSIVE scraping of individual fund page.
    Extracts EVERY available field.
    """
    url = f"https://english.mubasher.info/countries/EG/funds/{fund_id}"
    logger.info(f"Scraping fund {fund_id}: {url}")
    
    data = {
        'fund_id': fund_id,
        'fund_name_en': None,
        'manager_name_en': None,
        'owner_name_en': None,
        'investment_strategy': None,
        'eligibility': None,
        'establishment_date': None,
        'latest_nav': None,
        'profit_week': None,
        'profit_month': None,
        'profit_3month': None,
        'profit_6month': None,
        'profit_ytd': None,
        'profit_1year': None,
        'profit_3year': None,
        'profit_5year': None,
        'profit_52w_high': None,
        'profit_52w_low': None,
        'nav_history': []
    }
    
    try:
        resp = session.get(url, headers=get_headers())
        if resp.status_code != 200:
            logger.warning(f"Failed to get fund {fund_id}: {resp.status_code}")
            return data
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # ===== FUND NAME (Multiple selectors for robustness) =====
        for selector in ['h1', '.fund-name', '.profile-name', 'title', '.page-title']:
            el = soup.select_one(selector)
            if el and el.get_text(strip=True):
                name = el.get_text(strip=True)
                # Clean title
                name = name.replace(' - Mubasher Info Egypt', '').replace(' - معلومات مباشر مصر', '').strip()
                if name and len(name) < 200:
                    data['fund_name_en'] = name
                    break
        
        # ===== PERFORMANCE SECTION =====
        # Look for performance table/grid
        perf_mapping = {
            'since start of year': 'profit_ytd',
            'since a year': 'profit_1year',
            'since three years': 'profit_3year',
            'since five years': 'profit_5year',
            'since three months': 'profit_3month',
            'since six months': 'profit_6month',
            'since a month': 'profit_month',
            'since a week': 'profit_week',
            'highest and lowest in 52 weeks': None,  # Handle specially
            '52 week high': 'profit_52w_high',
            '52 week low': 'profit_52w_low',
        }
        
        # Method 1: Look for labeled rows
        for row in soup.select('.profile-container tr, .info-row, .data-row, .performance-row, dl dt, .flex-row'):
            label_el = row.select_one('td:first-child, dt, .label, .title, span:first-child')
            value_el = row.select_one('td:last-child, dd, .value, span:last-child')
            
            if label_el and value_el:
                label = label_el.get_text(strip=True).lower()
                value = value_el.get_text(strip=True)
                
                for pattern, field in perf_mapping.items():
                    if pattern in label and field:
                        data[field] = parse_pct(value)
                        break
        
        # Method 2: Look for profit containers
        for container in soup.select('.profit, .performance-item, .metric-item'):
            text = container.get_text(' ', strip=True).lower()
            value_el = container.select_one('.value, .number, strong')
            if value_el:
                value = value_el.get_text(strip=True)
                for pattern, field in perf_mapping.items():
                    if pattern in text and field:
                        data[field] = parse_pct(value)
                        break
        
        # ===== FUND INFORMATION SECTION =====
        info_mapping = {
            'strategy': 'investment_strategy',
            'investment strategy': 'investment_strategy',
            'eligibility': 'eligibility',
            'establishment date': 'establishment_date',
            'inception date': 'establishment_date',
            'manager': 'manager_name_en',
            'fund manager': 'manager_name_en',
            'owner': 'owner_name_en',
        }
        
        # Look for info rows
        for row in soup.select('.info-section tr, .profile-info tr, .details-row, dl, .info-item'):
            label_el = row.select_one('td:first-child, dt, .label, th')
            value_el = row.select_one('td:last-child, dd, .value')
            
            if label_el and value_el:
                label = label_el.get_text(strip=True).lower()
                value = value_el.get_text(strip=True)
                
                for pattern, field in info_mapping.items():
                    if pattern in label:
                        if field == 'establishment_date':
                            data[field] = parse_date(value)
                        elif field == 'investment_strategy':
                            data[field] = value[:2000] if len(value) > 2000 else value
                        else:
                            data[field] = value if len(value) < 500 else value[:500]
                        break
        
        # ===== LOOK FOR NAV PRICE =====
        for selector in ['.current-price', '.nav-value', '.price-value', '.last-price']:
            el = soup.select_one(selector)
            if el:
                price_text = el.get_text(strip=True)
                price_match = re.search(r'([\d,.]+)', price_text)
                if price_match:
                    try:
                        data['latest_nav'] = float(price_match.group(1).replace(',', ''))
                    except:
                        pass
                break
        
        # ===== NAV HISTORY (from embedded chart data) =====
        # Look for Highcharts data in script tags
        for script in soup.select('script'):
            script_text = script.string or ''
            if 'Highcharts' in script_text or 'series' in script_text:
                # Try to extract data points
                data_match = re.search(r'data:\s*\[([\d\s,.\[\]]+)\]', script_text)
                if data_match:
                    try:
                        points = eval('[' + data_match.group(1) + ']')
                        if points and isinstance(points[0], (list, tuple)):
                            data['nav_history'] = [{'date': p[0], 'nav': p[1]} for p in points[:365]]
                    except:
                        pass
        
        return data
        
    except Exception as e:
        logger.error(f"Error scraping fund {fund_id}: {e}")
        return data

async def save_complete_data(funds_data):
    """Save all extracted data to database."""
    logger.info(f"Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    success_count = 0
    nav_count = 0
    today = datetime.now().date()
    
    for fund in funds_data:
        fid = fund['fund_id']
        
        try:
            # Update fund with all scraped data
            await conn.execute("""
                UPDATE mutual_funds SET
                    fund_name_en = COALESCE($1, fund_name_en),
                    manager_name_en = COALESCE($2, manager_name_en),
                    investment_strategy = COALESCE($3, investment_strategy),
                    eligibility = COALESCE($4, eligibility),
                    establishment_date = COALESCE($5, establishment_date),
                    profit_week = COALESCE($6, profit_week),
                    profit_month = COALESCE($7, profit_month),
                    profit_3month = COALESCE($8, profit_3month),
                    profit_6month = COALESCE($9, profit_6month),
                    profit_52w_high = COALESCE($10, profit_52w_high),
                    profit_52w_low = COALESCE($11, profit_52w_low),
                    ytd_return = COALESCE($12, ytd_return),
                    one_year_return = COALESCE($13, one_year_return),
                    three_year_return = COALESCE($14, three_year_return),
                    five_year_return = COALESCE($15, five_year_return),
                    last_updated = NOW()
                WHERE fund_id = $16
            """, 
                fund.get('fund_name_en'),
                fund.get('manager_name_en'),
                fund.get('investment_strategy'),
                fund.get('eligibility'),
                fund.get('establishment_date'),
                fund.get('profit_week'),
                fund.get('profit_month'),
                fund.get('profit_3month'),
                fund.get('profit_6month'),
                fund.get('profit_52w_high'),
                fund.get('profit_52w_low'),
                fund.get('profit_ytd'),
                fund.get('profit_1year'),
                fund.get('profit_3year'),
                fund.get('profit_5year'),
                fid
            )
            success_count += 1
            
            # Insert NAV history if available
            nav_history = fund.get('nav_history', [])
            for point in nav_history[:365]:  # Limit to 1 year
                try:
                    nav_date = datetime.fromtimestamp(point['date'] / 1000).date() if point['date'] > 1000000000 else today
                    await conn.execute("""
                        INSERT INTO nav_history (fund_id, date, nav)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                    """, fid, nav_date, point['nav'])
                    nav_count += 1
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"Error saving fund {fid}: {e}")
    
    # Get final stats
    null_stats = await conn.fetchrow("""
        SELECT 
            COUNT(*) FILTER (WHERE investment_strategy IS NULL AND market_code = 'EGX') as null_strategy,
            COUNT(*) FILTER (WHERE eligibility IS NULL AND market_code = 'EGX') as null_eligibility,
            COUNT(*) FILTER (WHERE establishment_date IS NULL AND market_code = 'EGX') as null_estdate,
            COUNT(*) FILTER (WHERE market_code = 'EGX') as total_egx
        FROM mutual_funds
    """)
    
    logger.info(f"📊 Update Stats: {success_count} funds updated, {nav_count} NAV records added")
    logger.info(f"📊 NULL Stats: strategy={null_stats['null_strategy']}, eligibility={null_stats['null_eligibility']}, est_date={null_stats['null_estdate']} out of {null_stats['total_egx']} EGX funds")
    
    await conn.close()

def run_complete_extraction():
    """Main extraction pipeline."""
    session = create_session()
    
    # Step 1: Get fund list
    funds = fetch_fund_list()
    logger.info(f"Found {len(funds)} EGX funds to process")
    
    if not funds:
        logger.error("No funds found!")
        return
    
    # Step 2: Scrape statistics page for symbols
    symbol_map = scrape_statistics_page(session)
    
    # Step 3: Scrape each fund's detail page
    all_data = []
    for i, fund in enumerate(funds):
        fund_id = str(fund.get('fundId'))
        
        # Scrape detail page
        detail = scrape_fund_detail(session, fund_id)
        
        # Merge with symbol data if available
        if fund_id in symbol_map:
            detail['symbol'] = symbol_map[fund_id].get('symbol')
            detail['classification'] = symbol_map[fund_id].get('classification')
        
        all_data.append(detail)
        
        # Progress
        if (i + 1) % 20 == 0:
            logger.info(f"Progress: {i + 1}/{len(funds)} funds scraped")
        
        # Rate limiting
        time.sleep(0.5)
    
    # Step 4: Save to database
    asyncio.run(save_complete_data(all_data))
    
    logger.info("✅ Complete extraction finished!")

if __name__ == "__main__":
    run_complete_extraction()
