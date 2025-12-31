#!/usr/bin/env python3
"""
Corporate Actions Update Script
===============================
Extracts dividends, splits, and rights issues.
Uses Playwright for scraping Tadawul/Mubasher data.
"""

import asyncio
import asyncpg
import os
import ssl
import logging
import re
from datetime import datetime
import sys

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Installing playwright...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    from playwright.async_api import async_playwright

# Configuration
DATABASE_URL = os.environ.get('DATABASE_URL')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def get_ssl_context():
    """Create SSL context for Supabase connection"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context


async def get_all_symbols(pool):
    rows = await pool.fetch("SELECT symbol FROM market_tickers WHERE symbol ~ '^[0-9]{4}$' ORDER BY symbol")
    return [r['symbol'] for r in rows]


async def extract_corporate_actions(page, symbol):
    """Extract dividends and corporate actions for a stock"""
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/corporate-action"
    records = []
    
    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        
        # Extract from embedded JS data
        data = await page.evaluate("""() => {
            if (typeof midata !== 'undefined' && midata.corporateActions) {
                return midata.corporateActions;
            }
            return [];
        }""")
        
        if data and len(data) > 0:
            for action in data:
                try:
                    action_type = 'DIVIDEND'
                    # Simple mapping - expand as needed
                    t = str(action.get('type', ''))
                    if 'تجزئة' in t or 'Split' in t: action_type = 'SPLIT'
                    elif 'منحة' in t or 'Bonus' in t: action_type = 'BONUS'
                    elif 'حقوق' in t or 'Rights' in t: action_type = 'RIGHTS'
                    
                    date_str = action.get('date', action.get('exDate', ''))
                    ex_date = None
                    if date_str:
                        ex_date = datetime.strptime(date_str[:10], '%Y-%m-%d').date()
                    
                    details = str(action.get('details', action.get('amount', '')))
                    dividend_amount = None
                    amounts = re.findall(r'[\d.]+', details)
                    if amounts:
                        dividend_amount = float(amounts[0])
                    
                    records.append({
                        'symbol': symbol,
                        'action_type': action_type,
                        'ex_date': ex_date,
                        'dividend_amount': dividend_amount,
                        'raw_data': action
                    })
                except Exception as e:
                    pass
                    
            logger.info(f"✅ {symbol}: Found {len(records)} actions")
        
    except Exception as e:
        logger.warning(f"Failed to extract {symbol}: {e}")
    
    return records


async def save_records(pool, records):
    saved = 0
    async with pool.acquire() as conn:
        for rec in records:
            try:
                await conn.execute("""
                    INSERT INTO corporate_actions 
                    (symbol, action_type, ex_date, dividend_amount, raw_data)
                    VALUES ($1, $2, $3, $4, $5::jsonb)
                    ON CONFLICT (symbol, action_type, ex_date) 
                    DO UPDATE SET dividend_amount = EXCLUDED.dividend_amount
                """, rec['symbol'], rec['action_type'], rec['ex_date'], 
                    rec['dividend_amount'], str(rec['raw_data']).replace("'", '"'))
                saved += 1
            except Exception:
                pass
    return saved


async def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set!")
        sys.exit(1)

    # Robust connection
    pool = None
    try:
        pool = await asyncpg.create_pool(DATABASE_URL, ssl=get_ssl_context(), min_size=1, max_size=3)
    except:
        try:
            pool = await asyncpg.create_pool(DATABASE_URL, ssl='require', min_size=1, max_size=3)
        except:
            logger.error("Failed to connect to DB")
            sys.exit(1)

    try:
        symbols = await get_all_symbols(pool)
        logger.info(f"Checking corporate actions for {len(symbols)} stocks...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Rate limit processing
            # Process only first 50 symbols per run to avoid timeout/blocking if frequent
            # Or randomized batch
            import random
            random.shuffle(symbols)
            batch = symbols[:50] 
            
            logger.info(f"Processing batch of {len(batch)} symbols")
            
            total_saved = 0
            for symbol in batch:
                records = await extract_corporate_actions(page, symbol)
                if records:
                    saved = await save_records(pool, records)
                    total_saved += saved
                await asyncio.sleep(1)
            
            logger.info(f"Total actions saved: {total_saved}")
            await browser.close()
            
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
