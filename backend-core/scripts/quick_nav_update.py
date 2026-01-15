#!/usr/bin/env python3
"""
Quick NAV Updater for Egypt Funds
Scrapes the Mubasher Egypt funds list page and updates latest_nav in mutual_funds table.
"""

import asyncio
import os
import asyncpg
from datetime import datetime
from playwright.async_api import async_playwright
from pathlib import Path

# Load env manually
env_path = Path("/Users/home/Documents/Info Site/mubasher-deep-extract/.env")
for line in env_path.read_text().splitlines():
    if line.strip() and not line.startswith('#') and '=' in line:
        key, val = line.split('=', 1)
        os.environ[key.strip()] = val.strip()

DATABASE_URL = os.getenv('DATABASE_URL')
BASE_URL = "https://english.mubasher.info"
LIST_URL = f"{BASE_URL}/countries/eg/funds"

def parse_decimal(text):
    if not text: return None
    clean = str(text).replace(',', '').replace('%', '').replace('EGP', '').replace('USD', '').strip()
    if not clean or clean == '-' or clean == '--': return None
    try:
        return float(clean)
    except:
        return None

def clean_text(text):
    if not text: return None
    return text.strip().replace('\xa0', ' ')

async def scrape_mubasher_nav():
    """Scrape NAV from Mubasher Egypt funds list and update database."""
    print("=" * 70)
    print("MUBASHER EGYPT NAV SCRAPER")
    print("=" * 70)
    
    funds_data = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        print(f"\n📋 Navigating to {LIST_URL}...")
        await page.goto(LIST_URL)
        await page.wait_for_timeout(3000)
        
        try:
            await page.wait_for_selector('tr.mi-table__tbody-tr', timeout=15000)
        except:
            print("   ⚠️ Timeout waiting for table. Trying alternate selector...")
        
        page_num = 1
        while True:
            print(f"\n📄 Processing page {page_num}...")
            rows = await page.query_selector_all('tr.mi-table__tbody-tr')
            print(f"   Found {len(rows)} fund rows")
            
            for row in rows:
                cols = await row.query_selector_all('td')
                if len(cols) >= 5:
                    link_elem = await cols[0].query_selector('a')
                    if link_elem:
                        url = await link_elem.get_attribute('href')
                        name = await link_elem.inner_text()
                        
                        # Extract numeric Mubasher ID from URL and convert to EGY format
                        mubasher_id = url.split('/')[-1] if url else None
                        
                        # Get NAV price from table
                        price_text = await cols[4].inner_text() if len(cols) > 4 else None
                        nav = parse_decimal(price_text)
                        
                        if mubasher_id and nav is not None and nav > 0:
                            funds_data.append({
                                'mubasher_id': mubasher_id,
                                'name': clean_text(name),
                                'nav': nav
                            })
                            print(f"   ✅ {mubasher_id}: {name[:40]} - NAV: {nav}")
            
            # Try to go to next page
            next_btn = await page.query_selector('ul.cd-pagination li a:has-text("Next")')
            if not next_btn:
                next_btn = await page.query_selector('.pagination .next a')
                
            if next_btn and await next_btn.is_visible():
                print("   ➡️ Next page...")
                await next_btn.click()
                await page.wait_for_load_state('networkidle')
                await page.wait_for_timeout(2000)
                page_num += 1
            else:
                print("   ⛔ No more pages.")
                break
        
        await browser.close()
    
    print(f"\n📊 Scraped {len(funds_data)} funds with NAV data")
    
    # Update database
    if funds_data:
        print("\n💾 Updating database...")
        conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
        
        updated = 0
        for fund in funds_data:
            # Try to match by name similarity (since IDs are different)
            # Update any mutual_funds row where the name matches closely
            result = await conn.execute("""
                UPDATE mutual_funds 
                SET latest_nav = $1, updated_at = NOW()
                WHERE market_code = 'EGX'
                  AND (
                      fund_name ILIKE '%' || $2 || '%'
                      OR fund_name_en ILIKE '%' || $2 || '%'
                  )
            """, fund['nav'], fund['name'][:30])
            
            if 'UPDATE 1' in result or 'UPDATE 2' in result:
                updated += 1
        
        # Also insert into nav_history for funds we can match
        today = datetime.now().date()
        for fund in funds_data:
            # Find matching fund_id
            existing = await conn.fetchrow("""
                SELECT fund_id FROM mutual_funds 
                WHERE market_code = 'EGX'
                  AND (fund_name ILIKE '%' || $1 || '%' OR fund_name_en ILIKE '%' || $1 || '%')
                LIMIT 1
            """, fund['name'][:30])
            
            if existing:
                fund_id = existing['fund_id']
                try:
                    await conn.execute("""
                        INSERT INTO nav_history (fund_id, date, nav)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                    """, fund_id, today, fund['nav'])
                except Exception as e:
                    pass  # Ignore errors
        
        await conn.close()
        print(f"   ✅ Updated {updated} funds in database")
    
    print("\n✅ SCRAPING COMPLETE!")
    return len(funds_data)

if __name__ == "__main__":
    asyncio.run(scrape_mubasher_nav())
