"""
IMPROVED EGX FUND EXTRACTOR v2
==============================
Uses CORRECT CSS selectors discovered from HTML analysis:
- funds-details__text (labels)
- funds-details__value (values)
- midata JavaScript objects

Extracts ALL fields with ZERO tolerance for NULL where data exists.
"""

import tls_client
import time
import re
import asyncio
import asyncpg
import logging
import os
import json
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
    }

def parse_pct(val):
    """Parse percentage string to float."""
    if not val:
        return None
    try:
        clean = str(val).replace('%', '').replace(',', '').replace('+', '').replace('−', '-').replace('–', '-').strip()
        if clean in ['', '-', 'N/A', 'null', '--']:
            return None
        return float(clean)
    except:
        return None

def parse_date(date_str):
    """Parse date string like '31 July 2024' to date object."""
    if not date_str:
        return None
    try:
        for fmt in ['%d %B %Y', '%Y-%m-%d', '%d/%m/%Y', '%d %b %Y']:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except:
                continue
        return None
    except:
        return None

def scrape_fund_detail_v2(session, fund_id):
    """
    IMPROVED scraping using correct CSS selectors from HTML analysis.
    """
    url = f"https://english.mubasher.info/countries/EG/funds/{fund_id}"
    logger.info(f"Scraping fund {fund_id}")
    
    data = {
        'fund_id': fund_id,
        'fund_name_en': None,
        'manager_name_en': None,
        'owner_name_en': None,
        'investment_strategy': None,
        'eligibility': None,
        'establishment_date': None,
        'profit_ytd': None,
        'profit_1year': None,
        'profit_3year': None,
        'profit_5year': None,
        'profit_3month': None,
        'profit_6month': None,
        'profit_month': None,
        'profit_week': None,
        'profit_52w_high': None,
        'profit_52w_low': None,
    }
    
    try:
        resp = session.get(url, headers=get_headers())
        if resp.status_code != 200:
            logger.warning(f"Failed to get fund {fund_id}: {resp.status_code}")
            return data
        
        html = resp.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # ===== FUND NAME (from title) =====
        title = soup.select_one('title')
        if title:
            name = title.get_text(strip=True).replace(' - Mubasher Info Egypt', '').strip()
            if name:
                data['fund_name_en'] = name
        
        # ===== USING CORRECT SELECTORS: funds-details__text and funds-details__value =====
        # Find all text-and-value items
        items = soup.select('.funds-details__text-and-value-item')
        
        label_map = {
            'investment strategy': 'investment_strategy',
            'manager': 'manager_name_en',
            'owner': 'owner_name_en',
            'establishment date': 'establishment_date',
            'eligibility': 'eligibility',
            'since start of year': 'profit_ytd',
            'since a year': 'profit_1year',
            'since three years': 'profit_3year',
            'since five years': 'profit_5year',
            'since three months': 'profit_3month',
            'since six months': 'profit_6month',
            'since a month': 'profit_month',
            'since a week': 'profit_week',
            'highest in 52 weeks': 'profit_52w_high',
            'lowest in 52 weeks': 'profit_52w_low',
            '52 week high': 'profit_52w_high',
            '52 week low': 'profit_52w_low',
        }
        
        for item in items:
            label_el = item.select_one('.funds-details__text')
            value_el = item.select_one('.funds-details__value')
            
            if label_el and value_el:
                label = label_el.get_text(strip=True).lower()
                value = value_el.get_text(strip=True)
                
                for pattern, field in label_map.items():
                    if pattern in label:
                        if field == 'establishment_date':
                            data[field] = parse_date(value)
                        elif field in ['investment_strategy', 'eligibility', 'manager_name_en', 'owner_name_en']:
                            data[field] = value[:2000] if len(value) > 2000 else value
                        else:  # Performance metrics
                            data[field] = parse_pct(value)
                        break
        
        # ===== ALSO TRY EXTRACTING FROM midata JavaScript =====
        midata_match = re.search(r'midata\.fund\s*=\s*(\{[^;]+\});', html)
        if midata_match:
            try:
                fund_data = json.loads(midata_match.group(1))
                if not data['investment_strategy'] and fund_data.get('strategy'):
                    data['investment_strategy'] = fund_data['strategy']
                if not data['eligibility'] and fund_data.get('eligibility'):
                    data['eligibility'] = fund_data['eligibility']
                if not data['establishment_date'] and fund_data.get('establishmentDate'):
                    data['establishment_date'] = parse_date(fund_data['establishmentDate'])
            except:
                pass
        
        # Log what we found
        found = sum(1 for v in data.values() if v is not None)
        logger.info(f"  Fund {fund_id}: Found {found - 1} fields")  # -1 for fund_id
        
        return data
        
    except Exception as e:
        logger.error(f"Error scraping fund {fund_id}: {e}")
        return data

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

async def save_improved_data(funds_data):
    """Save all extracted data to database."""
    logger.info(f"Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    success_count = 0
    
    for fund in funds_data:
        fid = fund['fund_id']
        
        try:
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
        except Exception as e:
            logger.error(f"Error saving fund {fid}: {e}")
    
    # Get final stats
    null_stats = await conn.fetchrow("""
        SELECT 
            COUNT(*) FILTER (WHERE investment_strategy IS NULL AND market_code = 'EGX') as null_strategy,
            COUNT(*) FILTER (WHERE eligibility IS NULL AND market_code = 'EGX') as null_eligibility,
            COUNT(*) FILTER (WHERE establishment_date IS NULL AND market_code = 'EGX') as null_estdate,
            COUNT(*) FILTER (WHERE fund_name_en IS NULL AND market_code = 'EGX') as null_name_en,
            COUNT(*) FILTER (WHERE market_code = 'EGX') as total_egx
        FROM mutual_funds
    """)
    
    logger.info(f"📊 Update Stats: {success_count} funds updated")
    logger.info(f"📊 NULL Stats: name_en={null_stats['null_name_en']}, strategy={null_stats['null_strategy']}, eligibility={null_stats['null_eligibility']}, est_date={null_stats['null_estdate']} out of {null_stats['total_egx']} EGX funds")
    
    await conn.close()

def run_improved_extraction():
    """Main extraction pipeline."""
    session = create_session()
    
    # Step 1: Get fund list
    funds = fetch_fund_list()
    logger.info(f"Found {len(funds)} EGX funds to process")
    
    if not funds:
        logger.error("No funds found!")
        return
    
    # Step 2: Scrape each fund's detail page with CORRECT selectors
    all_data = []
    for i, fund in enumerate(funds):
        fund_id = str(fund.get('fundId'))
        detail = scrape_fund_detail_v2(session, fund_id)
        all_data.append(detail)
        
        if (i + 1) % 20 == 0:
            logger.info(f"Progress: {i + 1}/{len(funds)} funds scraped")
        
        time.sleep(0.5)
    
    # Step 3: Save to database
    asyncio.run(save_improved_data(all_data))
    
    logger.info("✅ Improved extraction finished!")

if __name__ == "__main__":
    run_improved_extraction()
