"""
ENHANCED EGX MUTUAL FUNDS EXTRACTOR
====================================
Source: english.mubasher.info (For English Names)
Features:
- English fund names and manager names
- Full performance metrics (1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, 52W High/Low)
- NAV history for charts
- Uses TLS client to bypass anti-bot
"""

import tls_client
import time
from datetime import datetime
import asyncio
import asyncpg
import logging
import os
import re
from dotenv import load_dotenv
from bs4 import BeautifulSoup

# Load environment
load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database Config (Production Supabase)
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
        "Accept": "application/json, text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
    }

def fetch_fund_list_english():
    """Fetch all Egypt mutual funds from English API."""
    session = create_session()
    all_funds = []
    start = 0
    size = 100
    
    while True:
        # Use English domain for English names
        url = f"https://english.mubasher.info/api/1/funds?country=EG&start={start}&size={size}"
        logger.info(f"Fetching English API: {url}")
        
        try:
            resp = session.get(url, headers=get_headers())
            if resp.status_code != 200:
                # Fallback to Arabic API
                url = f"https://www.mubasher.info/api/1/funds?country=EG&start={start}&size={size}"
                logger.info(f"Fallback to Arabic API: {url}")
                resp = session.get(url, headers=get_headers("https://www.mubasher.info/"))
                
            if resp.status_code != 200:
                logger.error(f"Failed to fetch: {resp.status_code}")
                break
            
            data = resp.json()
            rows = data.get('rows', [])
            
            if not rows:
                logger.info("No more rows. Finished.")
                break
                
            all_funds.extend(rows)
            logger.info(f"Got {len(rows)} funds. Total so far: {len(all_funds)}")
            
            if len(rows) < size:
                break
                
            start += size
            time.sleep(0.5)  # Be polite
            
        except Exception as e:
            logger.error(f"Exception: {e}")
            break

    return all_funds

def scrape_fund_detail_english(session, fund_id):
    """Scrape individual fund page for English name and extra data."""
    url = f"https://english.mubasher.info/countries/EG/funds/{fund_id}"
    logger.info(f"Scraping detail page: {url}")
    
    try:
        resp = session.get(url, headers=get_headers())
        if resp.status_code != 200:
            return None
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Extract English name from page title or header
        name_en = None
        title_el = soup.select_one('h1.fund-name, .profile-header h1, title')
        if title_el:
            name_en = title_el.get_text(strip=True).replace(' - Mubasher Info Egypt', '').strip()
        
        # Extract manager from profile info
        manager_en = None
        manager_el = soup.select_one('.fund-manager, .profile-info .manager')
        if manager_el:
            manager_en = manager_el.get_text(strip=True)
            
        # Look for investment strategy text
        strategy = None
        strategy_el = soup.select_one('.investment-strategy, .fund-description, .strategy-text')
        if strategy_el:
            strategy = strategy_el.get_text(strip=True)[:1000]  # Limit length
            
        return {
            'name_en': name_en,
            'manager_en': manager_en,
            'investment_strategy': strategy
        }
        
    except Exception as e:
        logger.warning(f"Error scraping fund {fund_id}: {e}")
        return None

def fetch_nav_history(session, fund_id):
    """Fetch NAV history for chart data."""
    # Try various API endpoints for NAV history
    endpoints = [
        f"https://www.mubasher.info/api/1/funds/{fund_id}/nav-history",
        f"https://www.mubasher.info/api/1/funds/{fund_id}/chart-data",
        f"https://english.mubasher.info/api/1/funds/{fund_id}/performance"
    ]
    
    for url in endpoints:
        try:
            resp = session.get(url, headers=get_headers())
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return data
                if isinstance(data, dict) and data.get('data'):
                    return data['data']
        except:
            continue
    
    return []

def parse_pct(val):
    """Parse percentage string to float."""
    if not val or val == 'N/A':
        return None
    try:
        return float(str(val).replace('%', '').replace(',', '').replace('+', ''))
    except:
        return None

async def update_database_schema(conn):
    """Add new columns to mutual_funds table."""
    columns_to_add = [
        ("fund_name_en", "VARCHAR(500)"),
        ("manager_name_en", "VARCHAR(500)"),
        ("symbol", "VARCHAR(50)"),
        ("classification", "VARCHAR(100)"),
        ("currency", "VARCHAR(10) DEFAULT 'EGP'"),
        ("eligibility", "VARCHAR(200)"),
        ("investment_strategy", "TEXT"),
        ("establishment_date", "DATE"),
        ("profit_week", "DECIMAL"),
        ("profit_month", "DECIMAL"),
        ("profit_3month", "DECIMAL"),
        ("profit_6month", "DECIMAL"),
        ("profit_52w_high", "DECIMAL"),
        ("profit_52w_low", "DECIMAL"),
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            await conn.execute(f"""
                ALTER TABLE mutual_funds 
                ADD COLUMN IF NOT EXISTS {col_name} {col_type}
            """)
            logger.info(f"  ✅ Column {col_name} ready")
        except Exception as e:
            logger.debug(f"  Column {col_name} might exist: {e}")

async def save_to_db(funds, session):
    """Save enhanced EGX funds to Supabase database."""
    logger.info(f"Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Update schema
    logger.info("Updating database schema...")
    await update_database_schema(conn)
    
    # Ensure market_code column exists
    try:
        await conn.execute("""
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS market_code VARCHAR(10) DEFAULT 'TDWL'
        """)
    except:
        pass
    
    logger.info(f"Processing {len(funds)} EGX funds...")
    
    success_count = 0
    nav_count = 0
    today = datetime.now().date()
    
    for i, f in enumerate(funds):
        fid = str(f.get('fundId'))
        
        # Get English name from API response or scrape
        name = f.get('name', '')
        name_en = name  # Start with API name
        manager_en = f.get('owner', '')
        
        # Try to detect if already English
        if name and re.search('[a-zA-Z]', name):
            name_en = name  # Already has English characters
        else:
            # Scrape English page for English name (limit to avoid rate limiting)
            if i < 50:  # Only scrape first 50 for now
                detail = scrape_fund_detail_english(session, fid)
                if detail and detail.get('name_en'):
                    name_en = detail['name_en']
                if detail and detail.get('manager_en'):
                    manager_en = detail['manager_en']
        
        price = f.get('price')
        
        # Full performance mapping
        ytd = parse_pct(f.get('profitYearStart'))
        r1y = parse_pct(f.get('profitLastYear'))
        r3y = parse_pct(f.get('profitThreeYear'))
        r5y = parse_pct(f.get('profitFiveYear'))
        r6m = parse_pct(f.get('profitSixMonth'))
        r3m = parse_pct(f.get('profitThreeMonth'))
        r1m = parse_pct(f.get('profitMonth'))
        r1w = parse_pct(f.get('profitWeek'))
        high52 = parse_pct(f.get('profitMax52Week'))
        low52 = parse_pct(f.get('profitMin52Week'))
        
        try:
            await conn.execute("""
                INSERT INTO mutual_funds (
                    fund_id, fund_name, fund_name_en, manager_name, manager_name_en,
                    latest_nav, ytd_return, one_year_return, three_year_return, five_year_return,
                    profit_week, profit_month, profit_3month, profit_6month,
                    profit_52w_high, profit_52w_low,
                    market_code, currency, last_updated
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                ON CONFLICT (fund_id) DO UPDATE SET
                    fund_name = EXCLUDED.fund_name,
                    fund_name_en = COALESCE(EXCLUDED.fund_name_en, mutual_funds.fund_name_en),
                    manager_name = EXCLUDED.manager_name,
                    manager_name_en = COALESCE(EXCLUDED.manager_name_en, mutual_funds.manager_name_en),
                    latest_nav = EXCLUDED.latest_nav,
                    ytd_return = EXCLUDED.ytd_return,
                    one_year_return = EXCLUDED.one_year_return,
                    three_year_return = EXCLUDED.three_year_return,
                    five_year_return = EXCLUDED.five_year_return,
                    profit_week = EXCLUDED.profit_week,
                    profit_month = EXCLUDED.profit_month,
                    profit_3month = EXCLUDED.profit_3month,
                    profit_6month = EXCLUDED.profit_6month,
                    profit_52w_high = EXCLUDED.profit_52w_high,
                    profit_52w_low = EXCLUDED.profit_52w_low,
                    market_code = EXCLUDED.market_code,
                    currency = EXCLUDED.currency,
                    last_updated = EXCLUDED.last_updated
            """, fid, name, name_en, f.get('owner'), manager_en,
                price, ytd, r1y, r3y, r5y, r1w, r1m, r3m, r6m, high52, low52,
                'EGX', 'EGP', datetime.now())
            success_count += 1
        except Exception as e:
            logger.error(f"Insert error for fund {fid}: {e}")
        
        # Insert NAV history
        if price:
            try:
                await conn.execute("""
                    INSERT INTO nav_history (fund_id, date, nav) 
                    VALUES ($1, $2, $3)
                    ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                """, fid, today, price)
                nav_count += 1
            except:
                pass
        
        # Progress indicator
        if (i + 1) % 50 == 0:
            logger.info(f"  Processed {i + 1}/{len(funds)} funds...")
    
    # Verify counts
    total = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds")
    egx_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds WHERE market_code = 'EGX'")
    ksa_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds WHERE market_code = 'TDWL'")
    
    logger.info(f"📊 Final Counts: Total={total}, EGX={egx_count}, KSA={ksa_count}")
    logger.info(f"✅ Inserted/Updated: {success_count} funds, {nav_count} NAV records")
    
    await conn.close()

if __name__ == "__main__":
    session = create_session()
    funds = fetch_fund_list_english()
    if funds:
        asyncio.run(save_to_db(funds, session))
    else:
        logger.error("No funds fetched.")
