#!/usr/bin/env python3
"""
ULTIMATE Chart Data Extractor using Playwright
Extracts ALL historical NAV data from Mubasher fund pages via Highcharts.

This is the DEFINITIVE solution that bypasses Cloudflare by using a real browser.
"""

import asyncio
import os
import sys
import json
from datetime import datetime
from typing import Optional, Dict, List, Any
import asyncpg
from playwright.async_api import async_playwright, Page, Browser

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")

class ChartDataExtractor:
    """Extracts chart data from Mubasher fund pages using Playwright."""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.db_pool: Optional[asyncpg.Pool] = None
        self.extracted_count = 0
        self.failed_funds = []
        
    async def init_db(self):
        """Initialize database connection pool."""
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable not set")
        self.db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        print("✅ Database connection pool established")
        
    async def get_all_funds(self) -> List[Dict]:
        """Get all funds from database."""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT fund_id, fund_name, market_code 
                FROM mutual_funds 
                ORDER BY fund_id
            """)
            return [dict(row) for row in rows]
    
    async def get_funds_needing_data(self) -> List[Dict]:
        """Get funds that have little or no NAV history."""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT mf.fund_id, mf.fund_name, mf.market_code,
                       COALESCE(nav_counts.cnt, 0) as nav_count
                FROM mutual_funds mf
                LEFT JOIN (
                    SELECT fund_id, COUNT(*) as cnt 
                    FROM nav_history 
                    GROUP BY fund_id
                ) nav_counts ON mf.fund_id = nav_counts.fund_id
                WHERE COALESCE(nav_counts.cnt, 0) < 100
                ORDER BY COALESCE(nav_counts.cnt, 0) ASC, mf.fund_id
            """)
            return [dict(row) for row in rows]
    
    async def extract_chart_data_from_page(self, page: Page, fund_id: str) -> Optional[List[Dict]]:
        """Extract chart data from Highcharts on the page."""
        try:
            # Wait for page to load and Highcharts to initialize
            await page.wait_for_load_state("networkidle", timeout=30000)
            await asyncio.sleep(2)  # Extra time for chart to render
            
            # Execute JavaScript to extract Highcharts data
            chart_data = await page.evaluate("""
                () => {
                    if (window.Highcharts && window.Highcharts.charts) {
                        // Find the chart with NAV data
                        for (const chart of window.Highcharts.charts) {
                            if (chart && chart.series && chart.series[0] && chart.series[0].options && chart.series[0].options.data) {
                                const data = chart.series[0].options.data;
                                if (data.length > 0) {
                                    // Return all data points
                                    return data.map(point => ({
                                        timestamp: point[0],
                                        value: point[1]
                                    }));
                                }
                            }
                        }
                    }
                    return null;
                }
            """)
            
            if chart_data and len(chart_data) > 0:
                print(f"  ✅ Extracted {len(chart_data)} data points from Highcharts")
                return chart_data
            else:
                print(f"  ⚠️ No Highcharts data found, trying alternative methods...")
                
                # Alternative: Try to find data in page scripts
                script_data = await page.evaluate("""
                    () => {
                        // Look for embedded JSON data in script tags
                        const scripts = document.querySelectorAll('script');
                        for (const script of scripts) {
                            const content = script.textContent;
                            if (content && content.includes('series') && content.includes('data')) {
                                // Try to find data arrays
                                const matches = content.match(/\\[\\[\\d+,\\s*[\\d.]+\\]/g);
                                if (matches && matches.length > 10) {
                                    return matches.slice(0, 100);  // Return sample
                                }
                            }
                        }
                        return null;
                    }
                """)
                
                if script_data:
                    print(f"  ⚠️ Found embedded script data (sample): {script_data[:3]}")
                    
                return None
                
        except Exception as e:
            print(f"  ❌ Error extracting chart data: {e}")
            return None
    
    async def save_nav_history(self, fund_id: str, chart_data: List[Dict]) -> int:
        """Save extracted NAV history to database."""
        if not chart_data:
            return 0
            
        async with self.db_pool.acquire() as conn:
            # Prepare data for bulk insert
            records = []
            for point in chart_data:
                try:
                    # Convert timestamp (milliseconds) to date
                    ts = point.get('timestamp')
                    value = point.get('value')
                    
                    if ts and value is not None:
                        date = datetime.utcfromtimestamp(ts / 1000).date()
                        records.append((fund_id, date, float(value)))
                except Exception as e:
                    continue
            
            if not records:
                return 0
            
            # Use UPSERT to avoid duplicates
            inserted = await conn.executemany("""
                INSERT INTO nav_history (fund_id, nav_date, nav_value)
                VALUES ($1, $2, $3)
                ON CONFLICT (fund_id, nav_date) DO UPDATE SET nav_value = EXCLUDED.nav_value
            """, records)
            
            print(f"  💾 Saved {len(records)} NAV records to database")
            return len(records)
    
    async def process_fund(self, page: Page, fund: Dict) -> bool:
        """Process a single fund - navigate and extract chart data."""
        fund_id = fund['fund_id']
        fund_name = fund.get('fund_name', 'Unknown')
        market_code = fund.get('market_code', 'EG')
        
        # Determine country code for URL
        country = 'EG' if market_code == 'EGX' else 'SA'
        url = f"https://english.mubasher.info/countries/{country}/funds/{fund_id}"
        
        print(f"\n📊 Processing Fund {fund_id}: {fund_name[:50]}...")
        print(f"  🌐 URL: {url}")
        
        try:
            # Navigate to fund page
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # Extract chart data
            chart_data = await self.extract_chart_data_from_page(page, fund_id)
            
            if chart_data:
                # Save to database
                saved = await self.save_nav_history(fund_id, chart_data)
                if saved > 0:
                    self.extracted_count += 1
                    return True
            else:
                self.failed_funds.append(fund_id)
                
            return False
            
        except Exception as e:
            print(f"  ❌ Error processing fund {fund_id}: {e}")
            self.failed_funds.append(fund_id)
            return False
    
    async def run(self, fund_ids: Optional[List[str]] = None, limit: int = None):
        """Main execution method."""
        print("=" * 60)
        print("🚀 ULTIMATE Chart Data Extractor (Playwright)")
        print("=" * 60)
        
        # Initialize database
        await self.init_db()
        
        # Get funds to process
        if fund_ids:
            funds = [{'fund_id': fid, 'fund_name': '', 'market_code': 'EGX'} for fid in fund_ids]
        else:
            print("\n📋 Getting funds needing chart data...")
            funds = await self.get_funds_needing_data()
            
        if limit:
            funds = funds[:limit]
            
        print(f"📊 Found {len(funds)} funds to process")
        
        if not funds:
            print("✅ All funds have sufficient NAV history!")
            return
        
        # Launch browser
        async with async_playwright() as p:
            print("\n🌐 Launching browser...")
            self.browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ]
            )
            
            context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale='en-US',
            )
            
            page = await context.new_page()
            
            # Process each fund
            for i, fund in enumerate(funds):
                print(f"\n[{i+1}/{len(funds)}]", end="")
                await self.process_fund(page, fund)
                
                # Small delay between requests
                await asyncio.sleep(1)
            
            await self.browser.close()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 EXTRACTION SUMMARY")
        print("=" * 60)
        print(f"✅ Successfully extracted: {self.extracted_count} funds")
        print(f"❌ Failed: {len(self.failed_funds)} funds")
        if self.failed_funds:
            print(f"   Failed IDs: {self.failed_funds[:20]}{'...' if len(self.failed_funds) > 20 else ''}")
        print("=" * 60)
        
        # Close database pool
        if self.db_pool:
            await self.db_pool.close()


async def main():
    """Entry point."""
    extractor = ChartDataExtractor()
    
    # Check for command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--test':
            # Test with a single fund
            await extractor.run(fund_ids=['2665'], limit=1)
        elif sys.argv[1] == '--all':
            # Process all funds
            await extractor.run()
        elif sys.argv[1].isdigit():
            # Process specific fund ID
            await extractor.run(fund_ids=[sys.argv[1]], limit=1)
        else:
            print(f"Usage: {sys.argv[0]} [--test | --all | <fund_id>]")
    else:
        # Default: process funds needing data
        await extractor.run(limit=10)


if __name__ == "__main__":
    asyncio.run(main())
