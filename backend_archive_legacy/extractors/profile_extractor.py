"""
SECTOR CLASSIFICATION & COMPANY PROFILE EXTRACTOR
Target: All 453 Saudi stocks
Data: Sector, Industry, Company info, Sharia compliance
Method: tls_client + Regex
"""

import asyncio
import asyncpg
import logging
import re
import tls_client

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [PROFILE] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("profile_extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"
session = tls_client.Session(client_identifier="chrome_120")

async def get_all_symbols():
    conn = await asyncpg.connect(DB_DSN)
    rows = await conn.fetch("SELECT symbol FROM market_tickers ORDER BY symbol")
    await conn.close()
    return [r['symbol'] for r in rows]

def extract_profile(html, symbol):
    """Extract company profile and sector classification"""
    record = {'symbol': symbol}
    
    try:
        # Try midata.profile
        match = re.search(r"midata\.(?:profile|company)\s*=\s*(\{.*?\});", html, re.DOTALL)
        
        if match:
            import ast
            json_str = match.group(1)
            json_str = json_str.replace('null', 'None').replace('true', 'True').replace('false', 'False')
            data = ast.literal_eval(json_str)
            
            record['sector_ar'] = data.get('sector', data.get('sectorAr'))
            record['sector_en'] = data.get('sectorEn')
            record['industry_ar'] = data.get('industry', data.get('industryAr'))
            record['industry_en'] = data.get('industryEn')
            record['is_sharia_compliant'] = data.get('shariaCompliant', data.get('isSharia'))
        
        # Fallback: scrape from HTML
        if not record.get('sector_ar'):
            # Look for sector in page
            sector_match = re.search(r'القطاع[:\s]*</[^>]+>\s*<[^>]+>([^<]+)', html)
            if sector_match:
                record['sector_ar'] = sector_match.group(1).strip()
        
        if not record.get('industry_ar'):
            industry_match = re.search(r'الصناعة[:\s]*</[^>]+>\s*<[^>]+>([^<]+)', html)
            if industry_match:
                record['industry_ar'] = industry_match.group(1).strip()
                
    except Exception as e:
        logger.debug(f"Parse error for {symbol}: {e}")
    
    return record if len(record) > 1 else None

async def save_record(conn, record):
    if not record:
        return 0
    
    try:
        await conn.execute("""
            INSERT INTO sector_classification 
            (symbol, sector_ar, sector_en, industry_ar, industry_en, is_sharia_compliant)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (symbol) 
            DO UPDATE SET sector_ar = EXCLUDED.sector_ar,
                          sector_en = EXCLUDED.sector_en,
                          industry_ar = EXCLUDED.industry_ar,
                          industry_en = EXCLUDED.industry_en,
                          is_sharia_compliant = EXCLUDED.is_sharia_compliant
        """, record['symbol'], record.get('sector_ar'), record.get('sector_en'),
            record.get('industry_ar'), record.get('industry_en'), 
            record.get('is_sharia_compliant'))
        return 1
    except Exception as e:
        logger.debug(f"DB Error: {e}")
        return 0

async def main():
    symbols = await get_all_symbols()
    logger.info(f"🎯 Extracting profiles for {len(symbols)} stocks")
    
    conn = await asyncpg.connect(DB_DSN)
    total_saved = 0
    
    for idx, symbol in enumerate(symbols, 1):
        url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/profile"
        
        try:
            resp = session.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": "https://www.google.com/"
            })
            
            if resp.status_code == 200:
                record = extract_profile(resp.text, symbol)
                if record:
                    saved = await save_record(conn, record)
                    total_saved += saved
                    logger.info(f"✅ [{idx}/{len(symbols)}] {symbol}: Saved profile")
                else:
                    logger.info(f"⚠️ [{idx}/{len(symbols)}] {symbol}: No profile data")
            else:
                logger.warning(f"⚠️ [{idx}/{len(symbols)}] {symbol}: HTTP {resp.status_code}")
                
        except Exception as e:
            logger.error(f"❌ {symbol}: {e}")
        
        await asyncio.sleep(0.3)
    
    await conn.close()
    logger.info(f"🎉 Complete! Total profiles saved: {total_saved}")

if __name__ == "__main__":
    asyncio.run(main())
