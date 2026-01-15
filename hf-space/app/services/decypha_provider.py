
import asyncio
import os
import requests
import pandas as pd
import io
import logging
import tls_client
from datetime import datetime
from app.db.session import db
from app.services.notification_service import notification_service

# Config
LOGIN_URL = "https://www.decypha.com/en/login"
EXPORT_URL = "https://www.decypha.com/en/funds/search/export?selectedRegion=MENA-20&fundName=&country=EG&fundClass=-1"

logger = logging.getLogger("DecyphaProvider")

class DecyphaProvider:
    def __init__(self):
        self.email = os.environ.get("DECYPHA_EMAIL", "m.mostafa@mubasher.net")
        self.password = os.environ.get("DECYPHA_PASSWORD", "bhidy1234")
        self.cookie = os.environ.get("DECYPHA_COOKIE") # Optional override
        
    async def sync_funds(self):
        logger.info("Starting Decypha Sync Job...")
        result = {
            "status": "failed", 
            "processed": 0, 
            "new": 0, 
            "error": None
        }
        
        try:
            # 1. Download Content
            content = self._download_file()
            if not content:
                raise Exception("Download returned empty content")
                
            # 2. Parse Data
            df = self._parse_content(content)
            if df is None or df.empty:
                raise Exception("Failed to parse Excel/HTML content")
                
            # 3. Sync to DB
            stats = await self._sync_to_db(df)
            
            result["status"] = "success"
            result["processed"] = stats["processed"]
            result["new"] = stats["new"]
            
        except Exception as e:
            logger.error(f"Decypha Sync Failed: {e}")
            result["error"] = str(e)
            
        return result

    def _download_file(self):
        session = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.decypha.com/en/login"
        }

        # Strategy 1: Use Cookie if provided
        if self.cookie:
            logger.info("Using provided DECYPHA_COOKIE...")
            headers["Cookie"] = self.cookie
            r = session.get(EXPORT_URL, headers=headers)
            if self._is_valid_file(r):
                return r.content
            logger.warning("Provided cookie failed/expired. Falling back to Login.")

        # Strategy 2: Login
        if not self.email or not self.password:
            raise Exception("Missing DECYPHA_EMAIL/PASSWORD credentials")

        # Get Login Page (Cookies)
        session.get(LOGIN_URL, headers=headers)
        
        # Post Login
        payload = {
            "email": self.email,
            "password": self.password
        }
        login_resp = session.post(LOGIN_URL, data=payload, headers=headers)
        logger.info(f"Login Status: {login_resp.status_code}")
        
        if login_resp.status_code != 200:
             # Try to detect if blocked
             if "captcha" in login_resp.text.lower():
                 raise Exception("Login blocked by CAPTCHA. Please update DECYPHA_COOKIE env var.")
        
        # Download
        r = session.get(EXPORT_URL, headers=headers)
        
        if not self._is_valid_file(r):
             if b"<!DOCTYPE html>" in r.content[:200]:
                 raise Exception("Download failed: Received HTML (likely Captcha or Login redirect).")
             raise Exception(f"Download failed: Status {r.status_code}")
             
        return r.content

    def _is_valid_file(self, response):
        if response.status_code != 200: return False
        if len(response.content) < 1000: return False
        # If it's HTML, it's not the file we want
        if b"<!DOCTYPE html>" in response.content[:100] or b"<html" in response.content[:100]:
            return False
        return True

    def _parse_content(self, content):
        logger.info("Parsing Excel content...")
        try:
             # Try standard Excel
             return pd.read_excel(io.BytesIO(content))
        except:
             try:
                 # Try HTML Table (sometimes they export HTML tables as .xls)
                 dfs = pd.read_html(io.BytesIO(content))
                 if dfs: return dfs[0]
             except Exception as e:
                 logger.error(f"Parse error: {e}")
        return None

    async def _sync_to_db(self, df):
        processed = 0
        new_count = 0
        
        def parse_pct(val):
            if pd.isna(val) or val == '' or val == '-': return None
            s = str(val).replace('%', '').strip()
            try: return float(s) / 100.0 
            except: return None
            
        await db.connect() # Ensure connection
        
        # 0. Schema Updates (Idempotent)
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
                pass # Ignore if exists or minor error

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
                # Generate ID logic
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

        return {"processed": processed, "new": new_count}

decypha_provider = DecyphaProvider()
