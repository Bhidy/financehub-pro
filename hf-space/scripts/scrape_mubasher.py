
import asyncio
import os
import csv
import aiohttp
import asyncpg
from datetime import datetime
from playwright.async_api import async_playwright
from dotenv import load_dotenv
import io
import ssl

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
# Credentials
MUBASHER_USER = "m.mostafa@mubasher.net"
MUBASHER_PASS = "bhidy1234"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

BASE_URL = "https://english.mubasher.info"
LIST_URL = f"{BASE_URL}/countries/eg/funds"
LOGIN_URL = f"{BASE_URL}/login?country=eg"
CSV_BASE_URL = "https://static.mubasher.info/File.MubasherCharts/File.Mutual_Fund_Charts_Dir/priceChartFund_{fund_id}.csv"

async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL, statement_cache_size=0)

def clean_text(text):
    if not text: return None
    return text.strip().replace('\xa0', ' ')

def parse_decimal(text):
    if not text: return None
    clean = str(text).replace(',', '').replace('%', '').replace('EGP', '').replace('USD', '').strip()
    if not clean or clean == '-' or clean == '--': return None
    try:
        return float(clean)
    except:
        return None

def parse_date(text):
    if not text: return None
    clean = clean_text(text)
    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d']:
        try:
            return datetime.strptime(clean, fmt).date()
        except:
            continue
    return None

async def login(page):
    """Authenticate with Mubasher."""
    print("🔑 Logging in...")
    try:
        await page.goto(LOGIN_URL)
        await page.wait_for_timeout(3000)
        
        frame_element = await page.wait_for_selector('iframe[src*="community"]', timeout=10000)
        if frame_element:
            frame = await frame_element.content_frame()
            if frame:
                print("   Found Login Iframe. Filling credentials...")
                await frame.fill('input[type="email"]', MUBASHER_USER)
                await frame.fill('input[type="password"]', MUBASHER_PASS)
                await frame.click('button.btn-submit')
                print("   Clicked Sign In. Waiting for redirect...")
                await page.wait_for_timeout(5000)
                print("   ✅ Login logic completed.")
                return True
    except Exception as e:
        print(f"   ⚠️ Login Failed/Skipped: {e}")
    return False

async def scrape_census(page):
    """Scrape the main list of funds."""
    funds = []
    print("📋 Starting Census (List Page)...")
    await page.goto(LIST_URL)
    
    try:
        await page.wait_for_selector('tr.mi-table__tbody-tr', timeout=20000)
    except:
        print("   ⚠️ Timeout waiting for table rows. Checking for spinner...")
        
    await page.wait_for_timeout(2000)

    while True:
        rows = await page.query_selector_all('tr.mi-table__tbody-tr')
        print(f"   Scanning {len(rows)} funds on current page...")
        
        for row in rows:
            cols = await row.query_selector_all('td')
            if len(cols) >= 5:
                link_elem = await cols[0].query_selector('a')
                if link_elem:
                    url = await link_elem.get_attribute('href')
                    name = await link_elem.inner_text()
                    fund_id = url.split('/')[-1] if url else None
                    
                    market = await cols[1].inner_text()
                    manager = await cols[2].inner_text()
                    owner = await cols[3].inner_text()
                    price_text = await cols[4].inner_text()
                    
                    date_text = None
                    if len(cols) >= 7:
                         date_text = await cols[6].inner_text()
                    
                    if fund_id:
                        funds.append({
                            'fund_id': fund_id,
                            'name': clean_text(name),
                            'market': clean_text(market),
                            'manager': clean_text(manager),
                            'owner': clean_text(owner),
                            'latest_nav': parse_decimal(price_text),
                            'last_update_date': parse_date(date_text),
                            'url': f"{BASE_URL}{url}"
                        })

        next_btn = await page.query_selector('ul.cd-pagination li a:has-text("Next")')
        if not next_btn:
            next_btn = await page.query_selector('.pagination .next a')
            
        if next_btn and await next_btn.is_visible():
            print("   ➡️ Next page...")
            await next_btn.click()
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(2000)
        else:
            print("   ⛔ No more pages.")
            break
            
    if not funds:
        print("   ⚠️ DOM extraction failed. Trying Regex Fallback...")
        import re
        content = await page.content()
        matches = re.findall(r'/countries/EG/funds/(\d+)', content)
        unique_ids = set(matches)
        print(f"   Found {len(unique_ids)} IDs via Regex.")
        
        for fid in unique_ids:
            funds.append({
                'fund_id': fid,
                'name': f"Fund {fid}",
                'market': 'Egypt',
                'manager': 'Unknown',
                'owner': 'Unknown',
                'latest_nav': 0,
                'last_update_date': datetime.now().date(),
                'url': f"{BASE_URL}/countries/EG/funds/{fid}"
            })

    print(f"✅ Census complete. Found {len(funds)} funds.")
    return funds

async def get_existing_funds_from_db(conn):
    """Fallback: Get all fund IDs from DB."""
    print("   ⚠️ fetching existing funds from DB as fallback...")
    rows = await conn.fetch('SELECT fund_id, fund_name FROM mutual_funds')
    funds = []
    for r in rows:
        funds.append({
            'fund_id': r['fund_id'],
            'name': r['fund_name'],
            'url': f"{BASE_URL}/countries/EG/funds/{r['fund_id']}",
            'market': 'Egypt', 'manager': 'Unknown', 'owner': 'Unknown',
            'latest_nav': 0, 'last_update_date': datetime.now().date()
        })
    return funds

async def extract_highcharts_history(page):
    """Extract history from Highcharts object."""
    try:
        try:
            max_btn = page.locator('button:has-text("Max"), a:has-text("Max")').first
            if await max_btn.count() > 0 and await max_btn.is_visible():
                print("   Clicking Max button...")
                await max_btn.click()
                await page.wait_for_timeout(2000) 
        except:
            pass 

        data = await page.evaluate('''() => {
            if (window.Highcharts && window.Highcharts.charts && window.Highcharts.charts[0]) {
                const series = window.Highcharts.charts[0].series.find(s => s.name === 'Value' || s.name === 'Price' || s.name === 'NAV') || window.Highcharts.charts[0].series[0];
                if (series && series.options.data) {
                    return series.options.data;
                }
                if (series && series.data) {
                     return series.data.map(p => ({x: p.x, y: p.y}));
                }
            }
            return null;
        }''')
        
        history = []
        if data:
            print(f"   Found {len(data)} data points from Chart.")
            for point in data:
                ts = None
                val = None
                if isinstance(point, list) and len(point) >= 2:
                    ts = point[0]
                    val = point[1]
                elif isinstance(point, dict):
                    ts = point.get('x') or point.get('date')
                    val = point.get('y') or point.get('value')
                
                if ts and val is not None:
                     try:
                        dt = datetime.fromtimestamp(ts / 1000.0).date()
                        history.append({'date': dt, 'nav': float(val)})
                     except: pass
        return history
    except Exception as e:
        print(f"   ⚠️ Chart Extraction Error: {e}")
        return []

async def scrape_profile_and_history(page, url):
    """Scrape details and history from profile page."""
    data = {}
    history = []
    try:
        await page.goto(url)
        await page.wait_for_timeout(2000)
        
        labels = ['YTD Profit', '1 Year Profit', '3 Year Profit', '5 Year Profit']
        keys = ['ytd_return', 'one_year_return', 'returns_3y', 'returns_5y']
        
        for i, label in enumerate(labels):
            val_el = page.locator(f'xpath=//td[contains(., "{label}")]/following-sibling::td').first
            if await val_el.count() > 0:
                val = await val_el.inner_text()
                if val:
                    data[keys[i]] = parse_decimal(val)
        
        history = await extract_highcharts_history(page)
        
    except Exception as e:
        print(f"   ⚠️ Profile Error: {e}")
        
    return data, history

async def save_fund_data(conn, fund, history, profile_data):
    """Save all data to DB."""
    # 1. Upsert Fund
    await conn.execute('''
        INSERT INTO mutual_funds (fund_id, fund_name, market, manager_name, owner, latest_nav, last_update_date, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (fund_id) DO UPDATE SET
            latest_nav = EXCLUDED.latest_nav,
            last_update_date = EXCLUDED.last_update_date,
            market = EXCLUDED.market,
            manager_name = EXCLUDED.manager_name,
            owner = EXCLUDED.owner,
            updated_at = NOW()
    ''', fund['fund_id'], fund['name'], fund['market'], fund['manager'], fund['owner'], fund['latest_nav'], fund['last_update_date'])
    
    # 2. Update Profile Data
    if profile_data:
        await conn.execute('''
            UPDATE mutual_funds SET
                ytd_return = COALESCE($2, ytd_return),
                one_year_return = COALESCE($3, one_year_return),
                returns_3y = COALESCE($4, returns_3y),
                returns_5y = COALESCE($5, returns_5y)
            WHERE fund_id = $1
        ''', fund['fund_id'], profile_data.get('ytd_return'), profile_data.get('one_year_return'), profile_data.get('returns_3y'), profile_data.get('returns_5y'))

    # 3. Batch Insert History
    if history:
        records = [(fund['fund_id'], h['date'], h['nav']) for h in history]
        await conn.executemany('''
            INSERT INTO nav_history (fund_id, date, nav)
            VALUES ($1, $2, $3)
            ON CONFLICT (fund_id, date) DO NOTHING
        ''', records)
        print(f"   Saved {len(records)} history points.")

async def main(test_mode=False):
    print("🚀 Mubasher Scraper Started (Authenticated Mode)")
    conn = await get_db_connection()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent=HEADERS['User-Agent'],
            viewport={'width': 1280, 'height': 720}
        )
        page = await context.new_page()
        
        await login(page)

        all_funds = await scrape_census(page)
        if not all_funds:
            all_funds = await get_existing_funds_from_db(conn)

        if test_mode:
            all_funds = all_funds[:3]
            print("⚠️ TEST MODE: Processing first 3 funds only.")
        
        for i, fund in enumerate(all_funds):
            print(f"[{i+1}/{len(all_funds)}] Processing {fund['name']} ({fund['fund_id']})...")
            
            # Resume Logic: Skip if we have substantial history
            try:
                # Check actual data presence, not just metadata timestamp
                history_count = await conn.fetchval("SELECT count(*) FROM nav_history WHERE fund_id = $1", fund['fund_id'])
                
                # Also check metadata date to ensure it's not stale from last month
                meta_row = await conn.fetchrow("SELECT updated_at FROM mutual_funds WHERE fund_id = $1", fund['fund_id'])
                
                is_fresh = False
                if meta_row and meta_row['updated_at']:
                     is_fresh = meta_row['updated_at'].date() >= datetime.now().date()

                if history_count > 10 and is_fresh:
                    print(f"   ⏭️ Skipping (Found {history_count} points & updated today).")
                    continue
                elif history_count > 10:
                     print(f"   ⚠️ History exists ({history_count}) but metadata stale. Re-scraping to update...")
                else:
                     # 0 history or stale
                     pass

            except Exception as e:
                print(f"   ⚠️ Resume check failed: {e}")



            
            profile_data, history = {}, []
            if fund.get('url'):
                 profile_data, history = await scrape_profile_and_history(page, fund['url'])
            
            await save_fund_data(conn, fund, history, profile_data)
                
        await browser.close()
    
    await conn.close()
    print("🏁 Scraping Complete.")

if __name__ == "__main__":
    import sys
    test = '--test' in sys.argv
    asyncio.run(main(test))
