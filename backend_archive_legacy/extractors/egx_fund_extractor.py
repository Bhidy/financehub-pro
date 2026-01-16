
"""
EGX MUTUAL FUNDS EXTRACTOR
Source: Mubasher.info API
Market: Egypt (EGX)
"""

import tls_client
import time
from datetime import datetime
import asyncio
import asyncpg
import logging
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database Config (Production)
DATABASE_URL = os.getenv("DATABASE_URL")

def fetch_egx_funds():
    """Fetch all Egypt mutual funds from Mubasher API."""
    logger.info("Initializing TLS Client for EGX Funds...")
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://english.mubasher.info/",
        "Accept": "application/json"
    }

    all_funds = []
    start = 0
    size = 100
    
    while True:
        url = f"https://www.mubasher.info/api/1/funds?country=EG&start={start}&size={size}"
        logger.info(f"Fetching {url}...")
        
        try:
            resp = session.get(url, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Failed to fetch: {resp.status_code}")
                break
            
            data = resp.json()
            rows = data.get('rows', [])
            
            if not rows:
                logger.info("No more rows. Finished.")
                break
                
            if start == 0 and rows:
                logger.info(f"Sample Fund Keys: {rows[0].keys()}")
            
            all_funds.extend(rows)
            logger.info(f"Got {len(rows)} funds. Total so far: {len(all_funds)}")
            
            if len(rows) < size:
                break
                
            start += size
            time.sleep(1)  # Be polite
            
        except Exception as e:
            logger.error(f"Exception: {e}")
            break

    return all_funds

def parse_pct(val):
    """Parse percentage string to float."""
    if not val or val == 'N/A':
        return None
    try:
        return float(str(val).replace('%', '').replace(',', ''))
    except:
        return None

async def save_to_db(funds):
    """Save EGX funds to Supabase database."""
    logger.info(f"Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Step 1: Ensure market_code column exists
    logger.info("Ensuring market_code column exists...")
    try:
        await conn.execute("""
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS market_code VARCHAR(10) DEFAULT 'TDWL'
        """)
        logger.info("✅ market_code column ready")
    except Exception as e:
        logger.warning(f"Column might already exist: {e}")
    
    # Step 2: Update existing KSA funds to have TDWL
    await conn.execute("""
        UPDATE mutual_funds SET market_code = 'TDWL' WHERE market_code IS NULL
    """)
    
    logger.info(f"Inserting/Updating {len(funds)} EGX funds...")
    
    fund_values = []
    nav_values = []
    today = datetime.now().date()
    
    unique_ids = set()

    for f in funds:
        fid = str(f.get('fundId'))
        if fid in unique_ids:
            continue
        unique_ids.add(fid)
        
        name = f.get('name')
        owner = f.get('owner') or (f.get('managers', [''])[0] if f.get('managers') else '')
        price = f.get('price')
        
        # Performance mapping
        ytd = parse_pct(f.get('profitYearStart'))
        r1y = parse_pct(f.get('profitLastYear'))
        r3y = parse_pct(f.get('profitThreeYear'))
        r5y = parse_pct(f.get('profitFiveYear'))
        
        # Market code for Egypt
        market_code = 'EGX'
        
        fund_values.append((fid, name, owner, price, None, ytd, r1y, r3y, r5y, market_code, datetime.now()))
        
        if price:
            nav_values.append((fid, today, price))

    logger.info(f"Prepared {len(fund_values)} fund records for insert...")

    # Batch Insert Funds
    if fund_values:
        query = """
            INSERT INTO mutual_funds (
                fund_id, fund_name, manager_name, latest_nav, aum, 
                ytd_return, one_year_return, three_year_return, five_year_return,
                market_code, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (fund_id) DO UPDATE SET
                fund_name = EXCLUDED.fund_name,
                manager_name = EXCLUDED.manager_name,
                latest_nav = EXCLUDED.latest_nav,
                ytd_return = EXCLUDED.ytd_return,
                one_year_return = EXCLUDED.one_year_return,
                three_year_return = EXCLUDED.three_year_return,
                five_year_return = EXCLUDED.five_year_return,
                market_code = EXCLUDED.market_code,
                last_updated = EXCLUDED.last_updated
        """
        success = 0
        for i, record in enumerate(fund_values):
            try:
                await conn.execute(query, *record)
                success += 1
            except Exception as e:
                logger.error(f"Insert Error on record {i} ({record[0]}): {e}")
        logger.info(f"✅ Inserted/Updated {success}/{len(fund_values)} funds")

    # Batch Insert NAV History
    if nav_values:
        try:
            await conn.executemany("""
                INSERT INTO nav_history (fund_id, date, nav) 
                VALUES ($1, $2, $3)
                ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
            """, nav_values)
            logger.info(f"✅ NAV history updated for {len(nav_values)} funds")
        except Exception as e:
            logger.error(f"NAV Insert Error: {e}")
            
    # Verify counts
    total = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds")
    egx_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds WHERE market_code = 'EGX'")
    ksa_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds WHERE market_code = 'TDWL'")
    
    logger.info(f"📊 Final Counts: Total={total}, EGX={egx_count}, KSA={ksa_count}")
    
    await conn.close()
    logger.info("✅ Database updated with EGX Mutual Funds!")

if __name__ == "__main__":
    data = fetch_egx_funds()
    if data:
        asyncio.run(save_to_db(data))
    else:
        logger.error("No data fetched.")
