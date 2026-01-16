"""
EGX HISTORICAL NAV EXTRACTOR
=============================
Fetches full historical NAV data for all EGX funds.
Attempts to get 3-5 years of history to power the charts.
"""

import tls_client
import time
import re
import asyncio
import asyncpg
import logging
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

# API Endpoint for chart data
# https://english.mubasher.info/api/1/funds/6149/chart?type=ytd
# Types: 1m, 3m, 6m, ytd, 1y, 3y, 5y, all

def create_session():
    return tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)

def get_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://english.mubasher.info/countries/eg/funds",
        "Origin": "https://english.mubasher.info"
    }

async def get_all_fund_ids():
    """Get all EGX fund IDs from database"""
    conn = await asyncpg.connect(DATABASE_URL)
    rows = await conn.fetch("SELECT fund_id, fund_name FROM mutual_funds WHERE market_code = 'EGX'")
    await conn.close()
    return rows

def fetch_fund_history(session, fund_id):
    """Fetch history from chart API"""
    # Prefer 'all' to get maximum history, fallback to '5y' then '3y'
    for period in ['all', '5y', '3y']:
        url = f"https://english.mubasher.info/api/1/funds/{fund_id}/chart?type={period}"
        try:
            resp = session.get(url, headers=get_headers())
            if resp.status_code == 200:
                data = resp.json()
                # Data format: [[timestamp, nav], [timestamp, nav], ...]
                if data and isinstance(data, list) and len(data) > 0:
                    logger.info(f"  Got {len(data)} points for fund {fund_id} ({period})")
                    return data
            elif resp.status_code == 429:
                logger.warning(f"  Rate limited, sleeping...")
                time.sleep(5)
            else:
                pass
        except Exception as e:
            logger.error(f"  Error fetching {fund_id} ({period}): {e}")
            
    return None

async def save_history(pool, fund_id, history):
    """Save history to database"""
    if not history:
        return 0
        
    inserted = 0
    async with pool.acquire() as conn:
        for point in history:
            try:
                # Format: [timestamp, nav]
                # Timestamp is usually ms
                ts = point[0]
                nav = point[1]
                
                if ts > 9999999999: # is ms
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
                pass # skip duplicates or bad data silently
                
    return inserted

async def main():
    logger.info("Starting Historical NAV Extraction...")
    
    # Get funds
    funds = await get_all_fund_ids()
    logger.info(f"Found {len(funds)} EGX funds to update")
    
    session = create_session()
    
    # Create DB pool
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    total_points = 0
    
    for i, fund in enumerate(funds):
        fund_id = fund['fund_id']
        name = fund['fund_name']
        logger.info(f"[{i+1}/{len(funds)}] Processing {name} ({fund_id})...")
        
        # 1. Fetch History
        history = fetch_fund_history(session, fund_id)
        
        if history:
            # 2. Save
            count = await save_history(pool, fund_id, history)
            total_points += count
            logger.info(f"  Saved {count} NAV records")
        else:
            logger.warning(f"  No history found for {fund_id}")
            
        # Be nice to the API
        time.sleep(random.uniform(0.5, 1.5))
        
    await pool.close()
    logger.info(f"✅ DONE. Total NAV records saved: {total_points}")

if __name__ == "__main__":
    asyncio.run(main())
