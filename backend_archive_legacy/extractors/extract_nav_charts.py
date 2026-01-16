"""
MUBASHER HISTORICAL NAV EXTRACTOR - CLOUDFLARE BYPASS
======================================================
Uses tls_client to bypass Cloudflare protection and extract full historical NAV data.
"""

import tls_client
import time
import asyncio
import asyncpg
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

def create_session():
    """Create a TLS session that mimics a real browser"""
    return tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )

def get_headers():
    """Browser-like headers to bypass Cloudflare"""
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://english.mubasher.info/countries/eg/funds",
        "Origin": "https://english.mubasher.info",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Connection": "keep-alive"
    }

async def get_all_fund_ids():
    """Get all EGX fund IDs from database"""
    conn = await asyncpg.connect(DATABASE_URL)
    rows = await conn.fetch("SELECT fund_id, fund_name FROM mutual_funds WHERE market_code = 'EGX' ORDER BY fund_id")
    await conn.close()
    return rows

def fetch_fund_chart(session, fund_id):
    """Fetch chart data from Mubasher API using multiple period types"""
    # Try all periods - 'all' gives max history
    periods = ['all', '5y', '3y', '1y', 'ytd', '6m', '3m', '1m']
    
    for period in periods:
        url = f"https://english.mubasher.info/api/1/funds/{fund_id}/chart?type={period}"
        try:
            resp = session.get(url, headers=get_headers())
            
            if resp.status_code == 200:
                data = resp.json()
                # Data format: [[timestamp, nav], [timestamp, nav], ...]
                if data and isinstance(data, list) and len(data) > 0:
                    logger.info(f"  ✓ Got {len(data)} points for period '{period}'")
                    return data
            elif resp.status_code == 403:
                logger.warning(f"  Cloudflare blocked (403) for period '{period}'")
            elif resp.status_code == 429:
                logger.warning(f"  Rate limited (429) - sleeping 5s...")
                time.sleep(5)
            else:
                logger.debug(f"  Status {resp.status_code} for period '{period}'")
                
        except Exception as e:
            logger.error(f"  Error: {e}")
    
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
                pass  # Skip bad data
    
    return inserted

async def main():
    logger.info("=" * 60)
    logger.info("MUBASHER HISTORICAL NAV EXTRACTOR - CLOUDFLARE BYPASS")
    logger.info("=" * 60)
    
    # Get all EGX funds
    funds = await get_all_fund_ids()
    logger.info(f"Found {len(funds)} EGX funds to process")
    
    # Create session with browser fingerprint
    session = create_session()
    
    # First, warm up the session by visiting the main page
    logger.info("Warming up session...")
    try:
        warmup = session.get("https://english.mubasher.info/countries/eg/funds", headers=get_headers())
        logger.info(f"Warmup status: {warmup.status_code}")
        time.sleep(2)
    except Exception as e:
        logger.warning(f"Warmup failed: {e}")
    
    # Create DB pool
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    total_points = 0
    success_count = 0
    
    for i, fund in enumerate(funds):
        fund_id = fund['fund_id']
        name = fund['fund_name']
        logger.info(f"[{i+1}/{len(funds)}] Processing: {name} (ID: {fund_id})")
        
        # Fetch chart data
        chart_data = fetch_fund_chart(session, fund_id)
        
        if chart_data:
            count = await save_nav_history(pool, fund_id, chart_data)
            total_points += count
            success_count += 1
            logger.info(f"  💾 Saved {count} NAV records")
        else:
            logger.warning(f"  ⚠️ No chart data available")
        
        # Rate limiting - be polite to the API
        delay = 1.0 + (i % 3) * 0.5  # Vary delay to seem more human
        time.sleep(delay)
    
    await pool.close()
    
    logger.info("=" * 60)
    logger.info(f"✅ EXTRACTION COMPLETE")
    logger.info(f"   Funds processed: {len(funds)}")
    logger.info(f"   Successful: {success_count}")
    logger.info(f"   Total NAV records: {total_points}")
    logger.info("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
