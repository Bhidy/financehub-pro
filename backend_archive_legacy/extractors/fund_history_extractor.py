import tls_client
import asyncio
import asyncpg
import logging
from datetime import datetime
import os

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DB_DSN = os.getenv("DB_DSN", "postgresql://home@localhost/mubasher_db")

async def fetch_and_save_history():
    logger.info("Connecting to DB...")
    conn = await asyncpg.connect(DB_DSN)
    
    # Get all fund IDs
    rows = await conn.fetch("SELECT fund_id FROM mutual_funds")
    fund_ids = [r['fund_id'] for r in rows]
    logger.info(f"Found {len(fund_ids)} funds to process.")
    
    # Pre-fetch max dates for efficiency
    logger.info("Fetching existing max dates...")
    rows = await conn.fetch("SELECT fund_id, MAX(date) as max_date FROM nav_history GROUP BY fund_id")
    max_dates = {r['fund_id']: r['max_date'] for r in rows}
    
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.mubasher.info/",
        "Origin": "https://www.mubasher.info"
    }

    count = 0
    skipped_count = 0
    
    for fid in fund_ids:
        # Check existing max date
        last_date = max_dates.get(fid)
        
        url = f"https://static.mubasher.info/File.MubasherCharts/File.Mutual_Fund_Charts_Dir/priceChartFund_{fid}.csv"
        
        try:
            resp = session.get(url, headers=headers)
            if resp.status_code != 200:
                continue
            
            lines = resp.text.strip().split('\n')
            if not lines:
                continue

            records = []
            # Format: 2004/08/22/00:00:00,1602.1735
            for line in lines:
                parts = line.split(',')
                if len(parts) < 2: continue
                
                date_str = parts[0].strip() # 2004/08/22/00:00:00
                price_str = parts[1].strip()
                
                try:
                    # Parse YYYY/MM/DD...
                    dt = datetime.strptime(date_str[:10], "%Y/%m/%d").date()
                    
                    # SMART FILTER: Only add if newer than DB
                    if last_date and dt <= last_date:
                        continue
                        
                    price = float(price_str)
                    records.append((fid, dt, price))
                except:
                    continue
                except:
                    continue
            
            if records:
                # Insert
                # Use ON CONFLICT DO NOTHING to avoid dups if run multiple times
                # But copy_records doesn't support ON CONFLICT easily.
                # We can use execute_many with INSERT ... ON CONFLICT
                
                # Using executemany is safer for conflicts
                await conn.executemany("""
                    INSERT INTO nav_history (fund_id, date, nav)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                """, records)
                
                count += 1
                if count % 10 == 0:
                    logger.info(f"Processed {count} funds...")
                    
        except Exception as e:
            logger.error(f"Error processing {fid}: {e}")
            
    logger.info("History extraction complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(fetch_and_save_history())
