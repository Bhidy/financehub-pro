#!/usr/bin/env python3
"""
STEALTH Chart Data Extractor - Bypasses Cloudflare Protection
Uses playwright-stealth and enhanced anti-detection to extract ALL chart data.
"""

import asyncio
import os
import sys
import json
from datetime import datetime
from typing import Optional, Dict, List
import asyncpg
from playwright.async_api import async_playwright, Page
from playwright_stealth import stealth_async

DATABASE_URL = os.getenv("DATABASE_URL")

async def init_db():
    """Initialize database connection."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not set")
    return await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)

async def get_all_fund_ids(pool) -> List[Dict]:
    """Get all fund IDs from database."""
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT fund_id, fund_name, market_code 
            FROM mutual_funds 
            ORDER BY fund_id
        """)
        return [dict(row) for row in rows]

async def save_nav_history(pool, fund_id: str, chart_data: List) -> int:
    """Save NAV history to database."""
    if not chart_data:
        return 0
        
    async with pool.acquire() as conn:
        records = []
        for point in chart_data:
            try:
                ts = point[0] if isinstance(point, list) else point.get('timestamp')
                value = point[1] if isinstance(point, list) else point.get('value')
                
                if ts and value is not None:
                    date = datetime.utcfromtimestamp(ts / 1000).date()
                    records.append((fund_id, date, float(value)))
            except:
                continue
        
        if not records:
            return 0
        
        await conn.executemany("""
            INSERT INTO nav_history (fund_id, nav_date, nav_value)
            VALUES ($1, $2, $3)
            ON CONFLICT (fund_id, nav_date) DO UPDATE SET nav_value = EXCLUDED.nav_value
        """, records)
        
        return len(records)

async def extract_highcharts_data(page: Page) -> Optional[List]:
    """Extract chart data from Highcharts."""
    return await page.evaluate("""
        () => {
            if (window.Highcharts && window.Highcharts.charts) {
                for (const chart of window.Highcharts.charts) {
                    if (chart && chart.series && chart.series[0]) {
                        const data = chart.series[0].options?.data || chart.series[0].data?.map(p => [p.x, p.y]);
                        if (data && data.length > 0) {
                            return data;
                        }
                    }
                }
            }
            return null;
        }
    """)

async def wait_for_cloudflare(page: Page, max_wait: int = 30):
    """Wait for Cloudflare challenge to complete."""
    for i in range(max_wait):
        try:
            # Check if still on Cloudflare challenge
            title = await page.title()
            content = await page.content()
            
            if 'Just a moment' in title or 'Cloudflare' in content[:5000]:
                print(f"  ⏳ Cloudflare challenge... ({i+1}s)")
                await asyncio.sleep(1)
            else:
                print(f"  ✅ Cloudflare passed after {i}s")
                return True
        except:
            await asyncio.sleep(1)
    
    return False

async def process_fund(page: Page, pool, fund: Dict) -> bool:
    """Process a single fund."""
    fund_id = fund['fund_id']
    fund_name = fund.get('fund_name', '')[:40]
    market = 'EG' if fund.get('market_code') == 'EGX' else 'SA'
    
    url = f"https://english.mubasher.info/countries/{market}/funds/{fund_id}"
    print(f"\n📊 Fund {fund_id}: {fund_name}")
    
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # Wait for Cloudflare
        if not await wait_for_cloudflare(page):
            print(f"  ❌ Cloudflare timeout")
            return False
        
        # Wait for page to fully load
        await asyncio.sleep(3)
        
        # Try to extract chart data
        chart_data = await extract_highcharts_data(page)
        
        if chart_data and len(chart_data) > 0:
            saved = await save_nav_history(pool, fund_id, chart_data)
            print(f"  ✅ Extracted {len(chart_data)} points, saved {saved}")
            return True
        else:
            print(f"  ⚠️ No chart data found")
            
            # Debug: check page content
            title = await page.title()
            print(f"  📄 Page title: {title}")
            
            return False
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

async def main():
    """Main execution."""
    print("=" * 60)
    print("🚀 STEALTH Chart Data Extractor")
    print("=" * 60)
    
    # Initialize database
    pool = await init_db()
    print("✅ Database connected")
    
    # Get funds
    funds = await get_all_fund_ids(pool)
    print(f"📊 Total funds: {len(funds)}")
    
    # Command line args
    test_mode = '--test' in sys.argv
    fund_id_arg = None
    for arg in sys.argv[1:]:
        if arg.isdigit():
            fund_id_arg = arg
            break
    
    if fund_id_arg:
        funds = [f for f in funds if f['fund_id'] == fund_id_arg]
    elif test_mode:
        funds = funds[:3]
    
    print(f"📋 Processing {len(funds)} funds")
    
    success_count = 0
    failed = []
    
    async with async_playwright() as p:
        # Launch with visible browser for debugging
        browser = await p.chromium.launch(
            headless=False,  # VISIBLE browser to pass Cloudflare
            slow_mo=100,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        )
        
        page = await context.new_page()
        
        # Apply stealth
        await stealth_async(page)
        
        # First, visit the main page to establish cookies
        print("\n🌐 Establishing session...")
        await page.goto("https://english.mubasher.info/countries/eg/funds", wait_until="domcontentloaded")
        await wait_for_cloudflare(page)
        await asyncio.sleep(3)
        
        # Process funds
        for i, fund in enumerate(funds):
            print(f"\n[{i+1}/{len(funds)}]", end="")
            
            if await process_fund(page, pool, fund):
                success_count += 1
            else:
                failed.append(fund['fund_id'])
            
            await asyncio.sleep(1)
        
        await browser.close()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"✅ Success: {success_count}/{len(funds)}")
    print(f"❌ Failed: {len(failed)}")
    if failed:
        print(f"   IDs: {failed[:20]}")
    print("=" * 60)
    
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
