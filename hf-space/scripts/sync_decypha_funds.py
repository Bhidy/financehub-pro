
import asyncio
import os
import sys
import requests
import pandas as pd
import io
import logging
from datetime import datetime

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.db.session import db, settings

# Config
EMAIL = "m.mostafa@mubasher.net"
PASS = "bhidy1234"
LOGIN_URL = "https://www.decypha.com/en/login"
EXPORT_URL = "https://www.decypha.com/en/funds/search/export?selectedRegion=MENA-20&fundName=&country=EG&fundClass=-1"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DecyphaSync")

async def sync_funds():
    logger.info("Starting Decypha Sync...")
    
    # 1. Download
    logger.info("Downloading Excel from Decypha...")
    import tls_client
    s = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.decypha.com/en/login"
    }
    
    # Login
    # Fetch login page first to get cookies
    s.get(LOGIN_URL, headers=headers)
    
    # Post Login
    payload = {
        "email": EMAIL,
        "password": PASS
        # Usually login forms have hidden fields? Inspecting HTML would be best but let's try standard first.
        # If this fails, we might need 'csrf_token' or similar.
    }
    # Payload needs to differ based on form type (json vs form-data). Usually form-data.
    # tls_client uses data= for form.
    
    login_resp = s.post(LOGIN_URL, data=payload, headers=headers)
    logger.info(f"Login Status: {login_resp.status_code}")
    
    # Export
    r = s.get(EXPORT_URL, headers=headers)
    
    if r.status_code != 200 or len(r.content) < 1000:
        logger.error(f"Download failed: {r.status_code} - Preview: {r.text[:100]}")
        return

    # Check for HTML content in ostensibly Excel file
    if b"<!DOCTYPE html>" in r.content[:100] or b"<html" in r.content[:100]:
        logger.error("Downloaded file is HTML (likely captcha/login page). Aborting.")
        return

    # 2. Parse
    logger.info("Parsing Excel...")
    try:
        # Try excel then html
        try:
            df = pd.read_excel(io.BytesIO(r.content))
        except:
             logger.info("Excel parse failed, trying HTML table...")
             dfs = pd.read_html(io.BytesIO(r.content))
             if dfs: df = dfs[0]
             else: raise Exception("No tables found")
             
    except Exception as e:
        logger.error(f"Excel parse failed: {e}")
        return

    logger.info(f"Found {len(df)} funds.")

    # 3. Connect DB
    logger.info("Connecting to DB...")
    await db.connect()
    
    try:
        # 4. Schema Updates
        updates = [
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS currency VARCHAR(10)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS returns_3m DECIMAL(10,5)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS returns_1y DECIMAL(10,5)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS returns_ytd DECIMAL(10,5)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS fund_type VARCHAR(50)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS manager VARCHAR(255)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS issuer VARCHAR(255)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS aum_millions DECIMAL(20,2)",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS is_shariah BOOLEAN",
            "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW()"
        ]
        for q in updates:
            try:
                await db.execute(q)
            except Exception as e:
                pass # Ignore if exists

        # 5. Upsert
        processed = 0
        new_count = 0
        
        def parse_pct(val):
            if pd.isna(val) or val == '' or val == '-': return None
            s = str(val).replace('%', '').strip()
            try: return float(s) / 100.0 
            except: return None
            
        for _, row in df.iterrows():
            name = str(row.get('Fund Name', '')).strip()
            if not name or name.lower() == 'nan': continue
            
            r3m = parse_pct(row.get('% 3M Change')) or parse_pct(row.get('% 3M'))
            r1y = parse_pct(row.get('% 1YR Change')) or parse_pct(row.get('% 1Y'))
            rytd = parse_pct(row.get('YTD %')) or parse_pct(row.get('YTD'))
            
            curr = str(row.get('Currency', 'EGP')).strip()
            ftype = str(row.get('Fund Type', '')).strip()
            manager = str(row.get('Managers', '')).strip()
            issuer = str(row.get('Issuers', '')).strip()
            
            aum_raw = row.get('AUM (M USD)')
            aum = None
            try:
                if not pd.isna(aum_raw) and str(aum_raw).strip() not in ['-', '']:
                    aum = float(str(aum_raw).replace(',', ''))
            except: pass
            
            shariah_raw = str(row.get('Shariah', 'No')).lower()
            is_shariah = 'yes' in shariah_raw or 'true' in shariah_raw

            existing = await db.fetch_one("SELECT fund_id FROM mutual_funds WHERE fund_name = $1", name)
            
            if existing:
                fid = existing['fund_id']
                await db.execute("""
                    UPDATE mutual_funds SET 
                        market_code = 'EGX', 
                        currency = $2, returns_3m = $3, returns_1y = $4, returns_ytd = $5,
                        fund_type = $6, manager = $7, issuer = $8, aum_millions = $9, is_shariah = $10,
                        last_updated = NOW()
                    WHERE fund_id = $1
                """, fid, curr, r3m, r1y, rytd, ftype, manager, issuer, aum, is_shariah)
            else:
                # Generate ID
                try:
                     max_id_row = await db.fetch_one("SELECT MAX(CAST(fund_id AS INTEGER)) as m FROM mutual_funds WHERE fund_id ~ '^\\d+$'")
                     max_id = (max_id_row['m'] if max_id_row and max_id_row['m'] else 1000) + 1
                     fid = str(max_id)
                except:
                     fid = str(int(datetime.now().timestamp()))

                await db.execute("""
                    INSERT INTO mutual_funds (
                        fund_id, fund_name, market_code, currency, 
                        returns_3m, returns_1y, returns_ytd, 
                        fund_type, manager, issuer, aum_millions, is_shariah, last_updated
                    ) VALUES ($1, $2, 'EGX', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                """, fid, name, curr, r3m, r1y, rytd, ftype, manager, issuer, aum, is_shariah)
                new_count += 1
            
            processed += 1
            if processed % 10 == 0:
                print(f"Propcessed {processed}...", end='\r')

        logger.info(f"Sync Complete. Total: {processed}, New: {new_count}")

    except Exception as e:
        logger.error(f"Sync failed: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    if not os.environ.get("DATABASE_URL"):
        # Fallback if not set (for testing)
        os.environ["DATABASE_URL"] = "postgres://postgres:postgres@localhost:5432/financehub" 
        # CAUTION: The above path is a guess. User env usually has it.
        # But for this script to work, user must have env set or .env file.
        # 'python-dotenv' is used in app.
        from dotenv import load_dotenv
        load_dotenv()
    
    asyncio.run(sync_funds())
