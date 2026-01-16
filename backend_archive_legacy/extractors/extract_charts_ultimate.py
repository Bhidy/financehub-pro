#!/usr/bin/env python3
"""
ULTIMATE Chart Data Extractor - CSV-based via Browser Context
Bypasses Cloudflare by fetching CSV from within the browser session.

This is the DEFINITIVE solution that:
1. Navigates to a fund page to establish session
2. Uses browser's fetch() to grab the static CSV (bypasses Cloudflare)
3. Parses CSV and saves to PostgreSQL

CSV URL Pattern: https://static.mubasher.info/File.MubasherCharts/File.Mutual_Fund_Charts_Dir/priceChartFund_{fund_id}.csv
CSV Format: YYYY/MM/DD/HH:mm:ss, Value
"""

import asyncio
import os
import sys
import json
import csv
import io
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import asyncpg
from playwright.async_api import async_playwright, Page

DATABASE_URL = os.getenv("DATABASE_URL")
CSV_BASE_URL = "https://static.mubasher.info/File.MubasherCharts/File.Mutual_Fund_Charts_Dir"

class UltimateChartExtractor:
    """Extracts ALL chart data using browser-based CSV fetching."""
    
    def __init__(self):
        self.db_pool = None
        self.page = None
        self.session_established = False
        self.extracted = 0
        self.failed = []
        
    async def init_db(self):
        """Initialize database connection."""
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL not set")
        self.db_pool = await asyncpg.create_pool(
            DATABASE_URL, 
            min_size=2, 
            max_size=10,
            statement_cache_size=0  # Required for pgbouncer compatibility
        )
        print("✅ Database connected")
        
    async def get_all_funds(self) -> List[Dict]:
        """Get all funds from database."""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT fund_id, fund_name, market_code 
                FROM mutual_funds 
                ORDER BY fund_id
            """)
            return [dict(row) for row in rows]
    
    async def get_nav_counts(self) -> Dict[str, int]:
        """Get current NAV history counts per fund."""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT fund_id, COUNT(*) as cnt 
                FROM nav_history 
                GROUP BY fund_id
            """)
            return {row['fund_id']: row['cnt'] for row in rows}
    
    async def establish_session(self, page: Page):
        """Navigate to main page to establish Cloudflare session."""
        print("\n🌐 Establishing browser session...")
        
        # Visit the main funds page
        await page.goto("https://english.mubasher.info/countries/eg/funds", 
                        wait_until="domcontentloaded", timeout=60000)
        
        # Wait for Cloudflare challenge to complete
        for i in range(60):
            try:
                title = await page.title()
                content = await page.content()
                
                if 'Just a moment' in title or 'Cloudflare' in content[:3000]:
                    print(f"  ⏳ Cloudflare challenge... ({i+1}s)")
                    await asyncio.sleep(1)
                else:
                    print(f"  ✅ Session established after {i}s")
                    self.session_established = True
                    return True
            except:
                await asyncio.sleep(1)
        
        print("  ❌ Failed to establish session")
        return False
    
    async def fetch_csv_via_browser(self, page: Page, fund_id: str) -> Optional[str]:
        """Fetch CSV content using browser's fetch() to bypass Cloudflare."""
        csv_url = f"{CSV_BASE_URL}/priceChartFund_{fund_id}.csv"
        
        try:
            csv_content = await page.evaluate(f"""
                async () => {{
                    try {{
                        const response = await fetch("{csv_url}");
                        if (!response.ok) return null;
                        return await response.text();
                    }} catch (e) {{
                        return null;
                    }}
                }}
            """)
            return csv_content
        except Exception as e:
            print(f"  ❌ Fetch error: {e}")
            return None
    
    def parse_csv_data(self, csv_content: str) -> List[Tuple[str, datetime, float]]:
        """Parse CSV content into NAV records."""
        records = []
        
        if not csv_content:
            return records
            
        lines = csv_content.strip().split('\n')
        
        for line in lines:
            try:
                parts = line.split(',')
                if len(parts) >= 2:
                    date_str = parts[0].strip()
                    value_str = parts[1].strip()
                    
                    # Parse date: YYYY/MM/DD/HH:mm:ss
                    try:
                        date = datetime.strptime(date_str, "%Y/%m/%d/%H:%M:%S").date()
                    except:
                        # Try alternative format
                        date = datetime.strptime(date_str.split('/')[0:3], "%Y/%m/%d").date()
                    
                    value = float(value_str)
                    records.append((date, value))
                    
            except Exception as e:
                continue
                
        return records
    
    async def save_nav_history(self, fund_id: str, records: List[Tuple]) -> int:
        """Save NAV history to database."""
        if not records:
            return 0
            
        async with self.db_pool.acquire() as conn:
            db_records = [(fund_id, date, float(value)) for date, value in records]
            
            await conn.executemany("""
                INSERT INTO nav_history (fund_id, date, nav)
                VALUES ($1, $2, $3)
                ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
            """, db_records)
            
            return len(db_records)
    
    async def extract_fund(self, page: Page, fund: Dict) -> bool:
        """Extract chart data for a single fund."""
        fund_id = fund['fund_id']
        fund_name = fund.get('fund_name', '')[:35]
        
        print(f"  📊 Fund {fund_id}: {fund_name}...", end=" ")
        
        # Fetch CSV via browser
        csv_content = await self.fetch_csv_via_browser(page, fund_id)
        
        if not csv_content or len(csv_content) < 20:
            print("❌ No CSV data")
            return False
            
        # Check if it's HTML (Cloudflare block)
        if '<html' in csv_content[:100].lower():
            print("❌ Blocked by Cloudflare")
            return False
        
        # Parse CSV
        records = self.parse_csv_data(csv_content)
        
        if not records:
            print("❌ Parse failed")
            return False
            
        # Save to database
        saved = await self.save_nav_history(fund_id, records)
        
        if saved > 0:
            print(f"✅ {saved} points ({records[0][0]} to {records[-1][0]})")
            return True
        else:
            print("❌ Save failed")
            return False
    
    async def run(self, fund_ids: List[str] = None, limit: int = None):
        """Main execution."""
        print("=" * 70)
        print("🚀 ULTIMATE Chart Data Extractor - CSV via Browser")
        print("=" * 70)
        
        # Initialize database
        await self.init_db()
        
        # Get funds
        all_funds = await self.get_all_funds()
        nav_counts = await self.get_nav_counts()
        
        print(f"📊 Total funds in database: {len(all_funds)}")
        
        # Filter funds
        if fund_ids:
            funds = [f for f in all_funds if f['fund_id'] in fund_ids]
        else:
            # Prioritize funds with little/no data
            funds = sorted(all_funds, key=lambda f: nav_counts.get(f['fund_id'], 0))
        
        if limit:
            funds = funds[:limit]
            
        print(f"📋 Processing {len(funds)} funds")
        
        # Launch browser
        async with async_playwright() as p:
            print("\n🌐 Launching browser...")
            
            browser = await p.chromium.launch(
                headless=False,  # Visible to pass Cloudflare
                slow_mo=50,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                ]
            )
            
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 800},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            )
            
            page = await context.new_page()
            
            # Establish session
            if not await self.establish_session(page):
                print("❌ Could not establish session. Exiting.")
                await browser.close()
                return
            
            # Wait for cookies to settle
            await asyncio.sleep(3)
            
            # Process all funds
            print(f"\n📊 Extracting chart data for {len(funds)} funds...")
            
            for i, fund in enumerate(funds):
                print(f"\n[{i+1}/{len(funds)}]", end="")
                
                if await self.extract_fund(page, fund):
                    self.extracted += 1
                else:
                    self.failed.append(fund['fund_id'])
                
                # Small delay to be polite
                if (i + 1) % 10 == 0:
                    await asyncio.sleep(1)
            
            await browser.close()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 EXTRACTION SUMMARY")
        print("=" * 70)
        print(f"✅ Successfully extracted: {self.extracted}/{len(funds)}")
        print(f"❌ Failed: {len(self.failed)}")
        if self.failed:
            print(f"   Failed IDs: {self.failed[:30]}{'...' if len(self.failed) > 30 else ''}")
        print("=" * 70)
        
        # Close database
        await self.db_pool.close()


async def main():
    """Entry point."""
    extractor = UltimateChartExtractor()
    
    # Parse arguments
    fund_ids = None
    limit = None
    
    for arg in sys.argv[1:]:
        if arg == '--all':
            limit = None
        elif arg == '--test':
            fund_ids = ['2665']
            limit = 1
        elif arg.startswith('--limit='):
            limit = int(arg.split('=')[1])
        elif arg.isdigit():
            fund_ids = [arg]
            limit = 1
    
    await extractor.run(fund_ids=fund_ids, limit=limit)


if __name__ == "__main__":
    asyncio.run(main())
