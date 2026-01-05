"""
EGX FUND EXTRACTOR v3 - Symbol & Classification
=================================================
Extracts Symbol and Classification from the Statistics page tables.
"""

import tls_client
import time
import re
import asyncio
import asyncpg
import logging
import os
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

def create_session():
    return tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)

def get_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
    }

def scrape_statistics_page():
    """Scrape the funds-statistics page for Symbol and Classification.
    Also includes the main funds list page for more complete data."""
    
    session = create_session()
    fund_data = {}  # fund_id -> {symbol, classification}
    
    # Try multiple pages that might have this data
    urls = [
        "https://english.mubasher.info/countries/eg/funds-statistics",
        "https://english.mubasher.info/countries/eg/funds",
    ]
    
    for url in urls:
        logger.info(f"Scraping: {url}")
        try:
            resp = session.get(url, headers=get_headers())
            if resp.status_code != 200:
                continue
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Find all fund links and their surrounding data
            for link in soup.select('a[href*="/funds/"]'):
                href = link.get('href', '')
                match = re.search(r'/funds/(\d+)', href)
                if not match:
                    continue
                    
                fund_id = match.group(1)
                if fund_id not in fund_data:
                    fund_data[fund_id] = {'symbol': None, 'classification': None}
                
                # Get parent row/container to find related data
                row = link.find_parent('tr') or link.find_parent('div', class_=lambda x: x and 'row' in x.lower() if x else False)
                if row:
                    # Look for symbol pattern (like EGYBAMX33)
                    row_text = row.get_text()
                    symbol_match = re.search(r'\b(EGY[A-Z0-9]{3,20})\b', row_text)
                    if symbol_match and not fund_data[fund_id]['symbol']:
                        fund_data[fund_id]['symbol'] = symbol_match.group(1)
                    
                    # Look for classification keywords
                    classifications = ['Stocks', 'Balanced', 'Bonds', 'Money Market', 'Fixed income', 
                                     'Commodity', 'Real Estate', 'Index', 'Sukuk', 'Hedge']
                    for cls in classifications:
                        if cls.lower() in row_text.lower() and not fund_data[fund_id]['classification']:
                            fund_data[fund_id]['classification'] = cls
                            break
            
            time.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
    
    logger.info(f"Found {len(fund_data)} funds with symbol/classification data")
    
    # Count filled fields
    symbols = sum(1 for f in fund_data.values() if f['symbol'])
    classifications = sum(1 for f in fund_data.values() if f['classification'])
    logger.info(f"  Symbols: {symbols}, Classifications: {classifications}")
    
    return fund_data

async def update_database(fund_data):
    """Update database with symbol and classification."""
    logger.info("Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    updated = 0
    for fund_id, data in fund_data.items():
        if data['symbol'] or data['classification']:
            try:
                await conn.execute("""
                    UPDATE mutual_funds SET
                        symbol = COALESCE($1, symbol),
                        classification = COALESCE($2, classification)
                    WHERE fund_id = $3
                """, data['symbol'], data['classification'], fund_id)
                updated += 1
            except Exception as e:
                logger.error(f"Error updating fund {fund_id}: {e}")
    
    # Get final stats
    stats = await conn.fetchrow("""
        SELECT 
            COUNT(*) FILTER (WHERE symbol IS NOT NULL AND market_code = 'EGX') as have_symbol,
            COUNT(*) FILTER (WHERE classification IS NOT NULL AND market_code = 'EGX') as have_class,
            COUNT(*) FILTER (WHERE market_code = 'EGX') as total
        FROM mutual_funds
    """)
    
    logger.info(f"📊 Updated {updated} funds")
    logger.info(f"📊 Symbol: {stats['have_symbol']}/{stats['total']}, Classification: {stats['have_class']}/{stats['total']}")
    
    await conn.close()

def run():
    fund_data = scrape_statistics_page()
    if fund_data:
        asyncio.run(update_database(fund_data))
    logger.info("✅ Done")

if __name__ == "__main__":
    run()
