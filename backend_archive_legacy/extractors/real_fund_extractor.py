"""
REAL DATA EXTRACTOR: MUTUAL FUNDS
Source: Mubasher.info (API Interception)
Authenticity: 100% Real
"""

import tls_client
import time
from datetime import datetime
import asyncio
import asyncpg
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database Config
DB_DSN = "postgresql://home@localhost/mubasher_db"

def fetch_real_funds():
    logger.info("Initializing TLS Client...")
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.mubasher.info/",
        "Accept": "application/json"
    }

    all_funds = []
    start = 0
    size = 100
    
    while True:
        url = f"https://www.mubasher.info/api/1/funds?start={start}&size={size}"
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
                
            if rows:
                logger.info(f"Sample Fund Keys: {rows[0].keys()}")
                logger.info(f"Sample Fund Data: {rows[0]}")
            
            all_funds.extend(rows)
            logger.info(f"Got {len(rows)} funds. Total so far: {len(all_funds)}")
            
            if len(rows) < size:
                break
                
            start += size
            time.sleep(1) # Be polite
            
        except Exception as e:
            logger.error(f"Exception: {e}")
            break

    return all_funds

async def save_to_db(funds):
    conn = await asyncpg.connect(DB_DSN)
    
    logger.info(f"Inserting/Updating {len(funds)} real funds...")
    
    fund_values = []
    nav_values = []
    today = datetime.now().date()
    
    unique_ids = set()
    
    def parse_pct(val):
        if not val or val == 'N/A': return None
        try:
            return float(str(val).replace('%', '').replace(',', ''))
        except:
            return None

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
        
        # AUM is not in API list, might be 'totalAssets' if it existed, but keys didn't show it.
        # We leave AUM null or update later if found.
        aum = None 
        
        fund_values.append((fid, name, owner, price, aum, ytd, r1y, r3y, r5y, datetime.now()))
        
        if price:
            # Schema: fund_id, date, nav
            nav_values.append((fid, today, price))

    logger.info(f"Preparing to insert {len(fund_values)} records...")

    # Batch Insert Funds (Loop for debugging)
    if fund_values:
        query = """
            INSERT INTO mutual_funds (
                fund_id, fund_name, manager_name, latest_nav, aum, 
                ytd_return, one_year_return, three_year_return, five_year_return, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (fund_id) DO UPDATE SET
                latest_nav = EXCLUDED.latest_nav,
                ytd_return = EXCLUDED.ytd_return,
                one_year_return = EXCLUDED.one_year_return,
                three_year_return = EXCLUDED.three_year_return,
                five_year_return = EXCLUDED.five_year_return,
                last_updated = EXCLUDED.last_updated
        """
        for i, record in enumerate(fund_values):
            try:
                await conn.execute(query, *record)
            except Exception as e:
                logger.error(f"Insert Error on record {i} {record[0]}: {e}")

    # Batch Insert NAV
    if nav_values:
        try:
            await conn.executemany("""
                INSERT INTO nav_history (fund_id, date, nav) 
                VALUES ($1, $2, $3)
                ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
            """, nav_values)
        except Exception as e:
            logger.error(f"NAV Insert Error: {e}")
            
    # Verify
    cnt = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds")
    logger.info(f"Verified Count in DB: {cnt}")
    
    await conn.close()
    logger.info("✅ Database updated with REAL DATA!")

if __name__ == "__main__":
    data = fetch_real_funds()
    if data:
        asyncio.run(save_to_db(data))
    else:
        logger.error("No data fetched.")
