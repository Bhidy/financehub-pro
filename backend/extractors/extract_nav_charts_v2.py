"""
MUBASHER CHART SCRAPER V2 - HTML PAGE SCRAPING
===============================================
Extracts chart data by scraping the fund detail page HTML.
This bypasses API restrictions by getting data embedded in the page.
"""

import tls_client
import time
import asyncio
import asyncpg
import logging
import os
import re
import json
from datetime import datetime
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

def create_session():
    """Create a TLS session that mimics a real browser"""
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )
    return session

def get_headers(referer=None):
    """Browser-like headers"""
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer or "https://english.mubasher.info/countries/eg/funds",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive",
        "Cache-Control": "max-age=0"
    }

async def get_all_fund_ids():
    """Get all EGX fund IDs from database"""
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    rows = await conn.fetch("""
        SELECT fund_id, fund_name 
        FROM mutual_funds 
        WHERE market_code = 'EGX' 
        ORDER BY fund_id
    """)
    await conn.close()
    return rows

def extract_chart_from_page(html_content, fund_id):
    """Extract chart data from page HTML/JS"""
    chart_data = []
    
    # Method 1: Look for JSON data in script tags
    # Mubasher often embeds chart data as JSON in the page
    patterns = [
        r'chartData\s*=\s*(\[[\s\S]*?\]);',
        r'priceData\s*=\s*(\[[\s\S]*?\]);',
        r'navData\s*=\s*(\[[\s\S]*?\]);',
        r'"data"\s*:\s*(\[\[[\d,\.]+\](?:,\s*\[\d+,[\d\.]+\])*\])',
        r'series\s*:\s*\[\s*\{\s*data\s*:\s*(\[[\s\S]*?\])',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, html_content)
        for match in matches:
            try:
                data = json.loads(match)
                if isinstance(data, list) and len(data) > 10:
                    # Validate it looks like NAV data [[timestamp, value], ...]
                    if isinstance(data[0], list) and len(data[0]) == 2:
                        chart_data = data
                        logger.info(f"  Found {len(chart_data)} points via regex")
                        return chart_data
            except:
                continue
    
    # Method 2: Parse script tags for initialization data
    soup = BeautifulSoup(html_content, 'html.parser')
    scripts = soup.find_all('script')
    
    for script in scripts:
        if script.string:
            # Look for Highcharts or similar chart initialization
            if 'Highcharts' in script.string or 'chart' in script.string.lower():
                # Try to extract data arrays
                data_matches = re.findall(r'\[\s*\[\s*\d+\s*,\s*[\d\.]+\s*\](?:\s*,\s*\[\s*\d+\s*,\s*[\d\.]+\s*\])+\s*\]', script.string)
                for match in data_matches:
                    try:
                        data = json.loads(match)
                        if len(data) > 10:
                            chart_data = data
                            logger.info(f"  Found {len(chart_data)} points in Highcharts")
                            return chart_data
                    except:
                        continue
    
    return chart_data

def fetch_chart_via_api_with_cookies(session, fund_id):
    """Try fetching chart API with session cookies established"""
    periods = ['all', '5y', '3y', '1y', 'ytd', '6m', '3m', '1m']
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": f"https://english.mubasher.info/markets/EGX/funds/{fund_id}",
        "Origin": "https://english.mubasher.info",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
    }
    
    for period in periods:
        try:
            url = f"https://english.mubasher.info/api/1/funds/{fund_id}/chart?type={period}"
            resp = session.get(url, headers=headers)
            
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 2:
                        logger.info(f"  ✓ API returned {len(data)} points for '{period}'")
                        return data
                except:
                    pass
        except Exception as e:
            logger.debug(f"  API error: {e}")
    
    return None

async def save_nav_history(pool, fund_id, chart_data):
    """Save chart data to nav_history table"""
    if not chart_data:
        return 0
    
    inserted = 0
    async with pool.acquire() as conn:
        for point in chart_data:
            try:
                ts = point[0]
                nav = point[1]
                
                # Convert timestamp (ms or s)
                if ts > 9999999999:
                    dt = datetime.fromtimestamp(ts / 1000.0)
                else:
                    dt = datetime.fromtimestamp(ts)
                
                date_str = dt.strftime('%Y-%m-%d')
                
                await conn.execute("""
                    INSERT INTO nav_history (fund_id, date, nav)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                """, fund_id, date_str, float(nav))
                inserted += 1
            except Exception as e:
                pass
    
    return inserted

async def main():
    logger.info("=" * 70)
    logger.info("MUBASHER CHART SCRAPER V2 - MULTI-METHOD EXTRACTION")
    logger.info("=" * 70)
    
    # Get all EGX funds
    funds = await get_all_fund_ids()
    logger.info(f"Found {len(funds)} EGX funds to process")
    
    # Create session
    session = create_session()
    
    # Step 1: Visit main page to establish cookies
    logger.info("Establishing session cookies...")
    try:
        resp = session.get("https://english.mubasher.info/countries/eg/funds", headers=get_headers())
        logger.info(f"Main page status: {resp.status_code}")
        time.sleep(2)
    except Exception as e:
        logger.warning(f"Main page failed: {e}")
    
    # Create DB pool
    pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0)
    
    total_points = 0
    success_count = 0
    
    for i, fund in enumerate(funds):
        fund_id = fund['fund_id']
        name = fund['fund_name']
        logger.info(f"[{i+1}/{len(funds)}] {name} (ID: {fund_id})")
        
        chart_data = None
        
        # Method 1: Visit fund page first to establish context
        fund_page_url = f"https://english.mubasher.info/markets/EGX/funds/{fund_id}"
        try:
            resp = session.get(fund_page_url, headers=get_headers())
            if resp.status_code == 200:
                # Try to extract data from page
                chart_data = extract_chart_from_page(resp.text, fund_id)
        except Exception as e:
            logger.debug(f"  Page scrape failed: {e}")
        
        # Method 2: Try API with cookies
        if not chart_data:
            chart_data = fetch_chart_via_api_with_cookies(session, fund_id)
        
        # Save if we got data
        if chart_data:
            count = await save_nav_history(pool, fund_id, chart_data)
            total_points += count
            success_count += 1
            logger.info(f"  💾 Saved {count} NAV records")
        else:
            logger.warning(f"  ⚠️ No chart data found")
        
        # Rate limiting
        time.sleep(1.5)
    
    await pool.close()
    
    logger.info("=" * 70)
    logger.info(f"✅ EXTRACTION COMPLETE")
    logger.info(f"   Funds processed: {len(funds)}")
    logger.info(f"   Successful: {success_count}")
    logger.info(f"   Total NAV records: {total_points}")
    logger.info("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
