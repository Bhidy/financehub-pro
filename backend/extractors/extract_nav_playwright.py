"""
MUBASHER CHART EXTRACTOR V3 - PLAYWRIGHT BROWSER AUTOMATION
===========================================================
Uses real browser automation to bypass Cloudflare and extract chart data.
"""

import asyncio
import asyncpg
import logging
import os
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

async def get_all_fund_ids():
    """Get all EGX fund IDs from database"""
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    rows = await conn.fetch("""
        SELECT fund_id, fund_name 
        FROM mutual_funds 
        WHERE market_code = 'EGX' 
        ORDER BY fund_id
    """)
    await conn.close()
    return rows

async def save_nav_history(pool, fund_id, chart_data):
    """Save chart data to nav_history table"""
    if not chart_data:
        return 0
    
    inserted = 0
    async with pool.acquire() as conn:
        for point in chart_data:
            try:
                ts = point[0]
                nav = point[1]
                
                if ts > 9999999999:
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
            except:
                pass
    
    return inserted

async def extract_chart_data_via_browser(page, fund_id):
    """Navigate to fund page and intercept chart API calls"""
    chart_data = None
    
    # Set up API interception
    async def handle_response(response):
        nonlocal chart_data
        if '/chart?' in response.url:
            try:
                data = await response.json()
                if isinstance(data, list) and len(data) > 2:
                    logger.info(f"  ✓ Intercepted {len(data)} chart points from API")
                    if not chart_data or len(data) > len(chart_data):
                        chart_data = data
            except:
                pass
    
    page.on("response", handle_response)
    
    try:
        # Navigate to fund page
        url = f"https://english.mubasher.info/markets/EGX/funds/{fund_id}"
        await page.goto(url, wait_until='networkidle', timeout=30000)
        
        # Wait for chart to potentially load
        await asyncio.sleep(2)
        
        # Click on different period buttons to trigger API calls
        for period in ['all', '5y', '3y', '1y']:
            try:
                # Look for period buttons on the page
                buttons = await page.query_selector_all(f'button:has-text("{period}"), span:has-text("{period}"), a:has-text("{period}")')
                for btn in buttons:
                    if await btn.is_visible():
                        await btn.click()
                        await asyncio.sleep(1)
                        if chart_data and len(chart_data) > 100:
                            return chart_data
            except:
                pass
        
        # If no button clicks worked, try extracting from page content
        if not chart_data:
            content = await page.content()
            # Look for embedded chart data
            patterns = [
                r'chartData\s*=\s*(\[[\s\S]*?\]);',
                r'"data"\s*:\s*(\[\[[\d,\.]+\](?:,\s*\[\d+,[\d\.]+\])*\])',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    try:
                        data = json.loads(match)
                        if isinstance(data, list) and len(data) > 10:
                            if isinstance(data[0], list) and len(data[0]) == 2:
                                chart_data = data
                                logger.info(f"  ✓ Extracted {len(chart_data)} points from page content")
                                return chart_data
                    except:
                        continue
        
    except Exception as e:
        logger.error(f"  Browser error: {e}")
    
    return chart_data

async def main():
    logger.info("=" * 70)
    logger.info("MUBASHER CHART EXTRACTOR V3 - PLAYWRIGHT BROWSER AUTOMATION")
    logger.info("=" * 70)
    
    # Get all EGX funds
    funds = await get_all_fund_ids()
    logger.info(f"Found {len(funds)} EGX funds to process")
    
    # Create DB pool
    pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0)
    
    total_points = 0
    success_count = 0
    
    async with async_playwright() as p:
        # Launch browser
        logger.info("Launching browser...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        page = await context.new_page()
        
        # First visit main page to establish session
        logger.info("Establishing session...")
        await page.goto("https://english.mubasher.info/countries/eg/funds", wait_until='networkidle')
        await asyncio.sleep(2)
        
        for i, fund in enumerate(funds):
            fund_id = fund['fund_id']
            name = fund['fund_name']
            logger.info(f"[{i+1}/{len(funds)}] {name} (ID: {fund_id})")
            
            chart_data = await extract_chart_data_via_browser(page, fund_id)
            
            if chart_data:
                count = await save_nav_history(pool, fund_id, chart_data)
                total_points += count
                success_count += 1
                logger.info(f"  💾 Saved {count} NAV records")
            else:
                logger.warning(f"  ⚠️ No chart data found")
            
            # Small delay between funds
            await asyncio.sleep(1)
        
        await browser.close()
    
    await pool.close()
    
    logger.info("=" * 70)
    logger.info(f"✅ EXTRACTION COMPLETE")
    logger.info(f"   Funds processed: {len(funds)}")
    logger.info(f"   Successful: {success_count}")
    logger.info(f"   Total NAV records: {total_points}")
    logger.info("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
