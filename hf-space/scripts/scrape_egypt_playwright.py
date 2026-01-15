#!/usr/bin/env python3
"""
Playwright-based Decypha Scraper
Uses real browser session for authentication
"""

import asyncio
import os
import re
import json
import asyncpg
from datetime import datetime
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

# Decypha login credentials
DECYPHA_EMAIL = "m.mostafa@mubasher.net"
DECYPHA_PASSWORD = "bhidy1234"

# URL patterns
BASE_URL = "https://www.decypha.com"
FUND_URLS = {
    'profile': f'{BASE_URL}/en/fund-profile/EG/DFNMF/{{symbol}}',
    'performance': f'{BASE_URL}/en/fund-performance/EG/DFNMF/{{symbol}}',
    'ratios': f'{BASE_URL}/en/fund-ratios/EG/DFNMF/{{symbol}}',
}


def clean_text(text):
    if not text:
        return None
    return text.strip().replace('\xa0', ' ').replace('--', '').strip() or None


def parse_decimal(text):
    if not text:
        return None
    clean = str(text).replace(',', '').replace('%', '').replace('EGP', '').replace('USD', '').strip()
    if clean == '' or clean == '-' or clean == '--':
        return None
    try:
        return float(clean)
    except:
        return None


def parse_date(text):
    if not text:
        return None
    clean = clean_text(text)
    if not clean:
        return None
    for fmt in ['%d-%b-%Y', '%d %b %Y', '%Y-%m-%d', '%d-%B-%Y']:
        try:
            return datetime.strptime(clean, fmt).date()
        except:
            continue
    return None


async def login_to_decypha(page, context):
    """Login to Decypha website."""
    print("🔐 Logging in to Decypha...")
    
    # Go to homepage
    await page.goto(f"{BASE_URL}/en/home")
    await page.wait_for_load_state('networkidle')
    await page.wait_for_timeout(2000)
    
    # Check if we need to login
    try:
        sign_in_visible = await page.locator('a:has-text("Sign In")').first.is_visible()
        if not sign_in_visible:
            # check for username to confirm
            page_content = await page.content()
            if 'Bhidy.mubasher' in page_content:
                print("✅ Already logged in (Sign In hidden, Username found)")
                return True
    except:
        pass # proceed to login attempts

    print("   Starting login flow...")
    
    # Click Sign In link
    try:
        sign_in = page.locator('a:has-text("Sign In")').first
        await sign_in.wait_for(timeout=10000)
        await sign_in.click()
        print("   Clicked Sign In")
        
        # Wait for login modal to appear
        await page.wait_for_selector('#username1', timeout=10000)
        await page.wait_for_timeout(500)
        
        # Fill credentials
        await page.fill('#username1', DECYPHA_EMAIL)
        await page.fill('#password1', DECYPHA_PASSWORD)
        print("   Filled credentials")
        
        # Click login button
        await page.click('#loginBtn1')
        print("   Clicked login button")
        
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(5000)
        
        # Verify login by checking page content
        page_content = await page.content()
        if 'Bhidy.mubasher' in page_content or 'Logout' in page_content:
            print("✅ Login successful")
            # Save storage state for future runs
            storage_path = os.path.join(os.path.dirname(__file__), 'decypha_session.json')
            await context.storage_state(path=storage_path)
            print(f"   Saved session to {storage_path}")
            return True
        else:
            # Debug: check what's on page
            print("   Login verification failed - Page content might be guest/promo")
    except Exception as e:
        print(f"   Login error: {e}")
    
    print("❌ Login failed")
    return False


async def ensure_authenticated(page):
    """Check if we are still authenticated, if not, throw error or return False."""
    if await page.query_selector('.register:has-text("Sign In")'):
        return False
    # Check for specific guest markers if needed
    return True


async def scrape_fund_profile(page, symbol):
    """Scrape a single fund's profile data."""
    data = {'symbol': symbol}
    
    # Navigate to fund profile
    url = FUND_URLS['profile'].format(symbol=symbol)
    print(f"   📄 Navigating to {url}")
    await page.goto(url)
    await page.wait_for_load_state('networkidle')
    await page.wait_for_timeout(1500)
    
    # Extract header data
    try:
        # NAV value from #fund_snapshot span
        nav_elem = await page.query_selector('#fund_snapshot span')
        if nav_elem:
            nav_text = await nav_elem.inner_text()
            data['latest_nav'] = parse_decimal(nav_text)
            print(f"   NAV: {data['latest_nav']}")
        
        # As Of Date
        as_of_elem = await page.query_selector('.last_update .b_lbl')
        if as_of_elem:
            as_of_text = await as_of_elem.inner_text()
            date_match = re.search(r'(\d{1,2}[- ]\w{3}[- ]\d{4})', as_of_text)
            if date_match:
                data['as_of_date'] = parse_date(date_match.group(1))
        
        # 1Y Return
        y1_elem = await page.query_selector('.side-right .col-12:nth-child(1) .chart_fig .fig_3')
        if y1_elem:
            data['one_year_return'] = parse_decimal(await y1_elem.inner_text())
            print(f"   1Y Return: {data['one_year_return']}%")
        
        # YTD Return
        ytd_elem = await page.query_selector('.side-right .col-12:nth-child(2) .chart_fig .fig_3')
        if ytd_elem:
            data['ytd_return'] = parse_decimal(await ytd_elem.inner_text())
        
        # Extract overview fields using ul.info structure
        info_items = await page.query_selector_all('ul.info li')
        for item in info_items:
            caption_elem = await item.query_selector('.info_caption')
            value_elem = await item.query_selector('.info_txt')
            
            if caption_elem and value_elem:
                caption = clean_text(await caption_elem.inner_text())
                value = clean_text(await value_elem.inner_text())
                
                if caption:
                    if 'Fund Classification' in caption:
                        data['fund_classification'] = value
                    elif 'Domicile' in caption:
                        data['domicile'] = value
                    elif 'Currency' in caption:
                        data['currency'] = value
                    elif 'NAV Frequency' in caption:
                        data['nav_frequency'] = value
                    elif 'Type' in caption and 'Fund' not in caption:
                        data['fund_type'] = value
                    elif 'Establishing Date' in caption:
                        data['establishment_date'] = parse_date(value)
                    elif 'Manager' in caption:
                        data['manager_name_en'] = value
                    elif 'Issuer' in caption:
                        data['issuer'] = value
                    elif 'Eligibility' in caption:
                        data['eligibility'] = value
        
    except Exception as e:
        print(f"   ❌ Error extracting profile: {e}")
    
    return data


async def scrape_fund_performance(page, symbol):
    """Scrape fund performance tab."""
    data = {}
    
    url = FUND_URLS['performance'].format(symbol=symbol)
    print(f"   📊 Navigating to performance tab...")
    await page.goto(url)
    await page.wait_for_load_state('networkidle')
    await page.wait_for_timeout(1000)
    
    # Extract performance fields from table rows
    try:
        rows = await page.query_selector_all('table tr')
        for row in rows:
            cells = await row.query_selector_all('td, th')
            if len(cells) >= 2:
                label = clean_text(await cells[0].inner_text())
                value = parse_decimal(await cells[1].inner_text())
                
                if label:
                    if '1M' in label or 'One Month' in label:
                        data['returns_1m'] = value
                    elif '3M' in label or 'Three Month' in label:
                        data['returns_3m'] = value
                    elif '3Y' in label or 'Three Year' in label:
                        data['returns_3y'] = value
                    elif '5Y' in label or 'Five Year' in label:
                        data['returns_5y'] = value
    except Exception as e:
        print(f"   ⚠️ Performance extraction error: {e}")
    
    return data


async def scrape_fund_ratios(page, symbol):
    """Scrape fund ratios tab."""
    data = {}
    
    url = FUND_URLS['ratios'].format(symbol=symbol)
    print(f"   📈 Navigating to ratios tab...")
    await page.goto(url)
    await page.wait_for_load_state('networkidle')
    await page.wait_for_timeout(1000)
    
    try:
        rows = await page.query_selector_all('table tr')
        for row in rows:
            cells = await row.query_selector_all('td, th')
            if len(cells) >= 2:
                label = clean_text(await cells[0].inner_text())
                value = parse_decimal(await cells[1].inner_text())
                
                if label:
                    if 'Sharpe' in label:
                        data['sharpe_ratio'] = value
                    elif 'Alpha' in label:
                        data['alpha'] = value
                    elif 'Beta' in label:
                        data['beta'] = value
                    elif 'R-Squared' in label or 'R²' in label:
                        data['r_squared'] = value
                    elif 'Treynor' in label:
                        data['treynor_ratio'] = value
                    elif 'Volatility' in label and 'Monthly' in label:
                        data['volatility_monthly'] = value
                    elif 'Volatility' in label and 'Annual' in label:
                        data['volatility_annual'] = value
    except Exception as e:
        print(f"   ⚠️ Ratios extraction error: {e}")
    
    return data


async def scrape_fund_disclosures(page, symbol):
    """Scrape fund disclosures/news tab."""
    disclosures = []
    
    # Try multiple potential URL patterns or clicking the tab
    # Based on typical Decypha structure, it might be 'fund-news' or a tab click
    
    print(f"   📑 Checking disclosures for {symbol}...")
    
    try:
        # Strategy 1: Look for "Disclosures" tab/link on current profile page
        # We assume we are already on profile or can get there. 
        if "fund-profile" not in page.url:
             await page.goto(FUND_URLS['profile'].format(symbol=symbol))
             await page.wait_for_load_state('networkidle')

        # Try specific side nav link first (most reliable)
        tab = await page.query_selector('div.side-nav-container a:has-text("Disclosures")')
        if not tab:
            tab = await page.query_selector('a:has-text("Disclosures")')
        if not tab:
            tab = await page.query_selector('a:has-text("News")')
            
        if tab:
            print("   Found Disclosures/News tab, clicking...")
            await tab.click()
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(2000)
            
            # Extract data from table
            # Use general tr selector as specific table selector proved unreliable
            rows = await page.query_selector_all('tr')

            for row in rows:
                cells = await row.query_selector_all('td')
                if len(cells) >= 3:
                     # Layout: Date | Title | Category | File
                     date_text = await cells[0].inner_text()
                     title_text = await cells[1].inner_text()
                     # category = await cells[2].inner_text() 
                     
                     # File link usually in last cell
                     file_link_elem = await cells[-1].query_selector('a')
                     if not file_link_elem and len(cells) > 3:
                         # Try cell 3 if 4 exists etc.
                         file_link_elem = await row.query_selector('a[href]')
                         
                     if file_link_elem:
                         url = await file_link_elem.get_attribute('href')
                         
                         date_val = parse_date(date_text)
                         if not date_val and len(cells) > 1:
                             # Try next cell
                             date_val = parse_date(await cells[1].inner_text())
                         
                         # Fallback for date if URL looks good (contains 'documents' or 'pdf')
                         is_document = url and ('documents' in url or '.pdf' in url)
                         if not date_val and is_document:
                             date_val = datetime.now().date()

                         # Validate URL
                         if url and 'javascript' not in url and url != '#' and date_val:
                             full_url = f"{BASE_URL}{url}" if url.startswith('/') else url
                             
                             title_clean = clean_text(title_text)
                             if not title_clean and len(cells) > 2:
                                 title_clean = clean_text(await cells[2].inner_text())
                             
                             if not title_clean:
                                 title_clean = clean_text(await file_link_elem.inner_text())

                             disclosures.append({
                                 'date': date_val,
                                 'title': title_clean or "Disclosure",
                                 'url': full_url,
                                 'type': 'Disclosure' 
                             })
            
            # Fallback if table didn't yield anything
            if not disclosures:
                 print("   No standard disclosure table rows processed, looking for any PDF links...")
                 links = await page.query_selector_all('a[href$=".pdf"]')
                 for link in links:
                     url = await link.get_attribute('href')
                     title = await link.inner_text()
                     disclosures.append({
                         'date': datetime.now().date(),
                         'title': clean_text(title),
                         'url': f"{BASE_URL}{url}" if url.startswith('/') else url,
                         'type': 'PDF'
                     })
                            
            print(f"   Found {len(disclosures)} disclosures")
            
    except Exception as e:
        print(f"   ⚠️ Disclosure extraction error: {e}")
        
    return {'disclosures': disclosures}

async def scrape_fund_investments(page, symbol):
    investments = []
    print(f"   📊 Checking investments for {symbol}...")
    
    try:
        # Navigate to investments page directly
        url = f"{BASE_URL}/en/fund-investments/EG/DFNMF/{symbol}"
        if page.url != url:
            await page.goto(url)
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(2000)
            
        # Parse all tables
        tables = await page.query_selector_all('table')
        print(f"   Found {len(tables)} tables")
        
        for table in tables:
            # Check headers to identify table type
            headers_elems = await table.query_selector_all('th')
            headers = [await h.inner_text() for h in headers_elems]
            headers_lower = [h.lower() for h in headers]
            
            is_allocation = any('asset' in h for h in headers_lower) or any('sector' in h for h in headers_lower)
            is_holdings = any('company' in h for h in headers_lower) or any('symbol' in h for h in headers_lower)
            
            inv_type = 'Asset Allocation' if is_allocation else 'Top Holding' if is_holdings else 'Unknown'
            
            if inv_type != 'Unknown':
                rows = await table.query_selector_all('tr')
                # Skip header
                for row in rows[1:]:
                    cols = await row.query_selector_all('td')
                    if len(cols) >= 2:
                        name_text = await cols[0].inner_text()
                        
                        # Percentage parsing
                        pct_text = await cols[1].inner_text()
                        if len(cols) > 2 and inv_type == 'Top Holding':
                             # Often: Symbol | Company Name | % OR Company Name | %
                             # If 3 cols: Name | Symbol | % ? Or Symbol | Name | % ?
                             # Be careful. Usually last col is %
                             pct_text = await cols[-1].inner_text()
                        
                        pct_val = parse_percentage(pct_text)
                        
                        if name_text and pct_val is not None:
                             item = {
                                 'type': inv_type,
                                 'name': clean_text(name_text),
                                 'percentage': pct_val,
                                 'symbol': None
                             }
                             
                             investments.append(item)
    
        print(f"   Found {len(investments)} investment items")

    except Exception as e:
        print(f"   ⚠️ Investment extraction error: {e}")
        
    return {'investments': investments}

async def scrape_fund_peers(page, symbol):
    peers = []
    print(f"   👥 Checking peers for {symbol}...")
    try:
        # Navigate directly to peer funds URL
        peer_url = f"{BASE_URL}/en/peer-funds/EG/DFNMF/{symbol}"
        await page.goto(peer_url)
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(3000)
        
        # The peer data is in a table with 7 columns: Ticker, Icon, Fund, YTD%, 1Y%, AUM, Manager
        # It's typically the 3rd table (index 2) with actual data rows
        tables = await page.query_selector_all('table')
        print(f"   Found {len(tables)} tables on peers page")
        
        for table in tables:
            rows = await table.query_selector_all('tr')
            if len(rows) > 2:  # Has data rows (not just header)
                for row in rows:
                    cols = await row.query_selector_all('td')
                    if len(cols) >= 5:  # Data row with enough columns
                        # Column 2 = Fund name, Column 3 = YTD, Column 4 = 1Y
                        name = await cols[2].inner_text()
                        name = clean_text(name)
                        
                        ytd_text = await cols[3].inner_text()
                        oney_text = await cols[4].inner_text()
                        
                        ytd = parse_decimal(ytd_text)
                        oney = parse_decimal(oney_text)
                        
                        if name and len(name) > 3:
                            peers.append({
                                'name': name,
                                'rank': str(len(peers) + 1),
                                'symbol': None,
                                'ytd': ytd,
                                'one_year': oney
                            })
        
        print(f"   Found {len(peers)} peers")
    except Exception as e:
        print(f"   ⚠️ Peers extraction error: {e}")
    return {'peers': peers}

async def scrape_fund_actions(page, symbol):
    actions = []
    print(f"   📅 Checking corporate actions for {symbol}...")
    try:
        # Check actions tab
        act_link = await page.query_selector('a:has-text("Corporate Actions")') 
        # Or "Dividends"?
        if not act_link:
            act_link = await page.query_selector('a:has-text("Dividends")')
            
        if act_link:
             # Check visibility before clicking to avoid timeout
             is_visible = await act_link.is_visible()
             if is_visible:
                 await act_link.click()
                 await page.wait_for_load_state('networkidle')
                 await page.wait_for_timeout(2000)
                 
                 await page.wait_for_timeout(2000)
                 
                 rows = await page.query_selector_all('table tr')
                 for row in rows[1:]:
                     cols = await row.query_selector_all('td')
                     if len(cols) >= 3:
                         # Date | Type | Value
                         date_str = await cols[0].inner_text()
                         action_type = await cols[1].inner_text()
                         val_str = await cols[2].inner_text()
                         
                         actions.append({
                             'date': parse_date(date_str) or datetime.now().date(),
                             'type': clean_text(action_type),
                             'value': parse_percentage(val_str), # Reusing float parser
                             'description': f"{action_type} - {val_str}"
                         })
                 print(f"   Found {len(actions)} actions")
    except Exception as e:
         print(f"   ⚠️ Actions extraction error: {e}")
    return {'actions': actions}


async def save_fund(conn, data):
    """Save fund data to database."""
    symbol = data['symbol']
    
    # Check if fund exists
    row = await conn.fetchrow('SELECT fund_id FROM mutual_funds WHERE symbol = $1', symbol)
    
    if row:
        fund_id = row['fund_id']
        await conn.execute('''
            UPDATE mutual_funds SET
                latest_nav = COALESCE($2, latest_nav),
                as_of_date = COALESCE($3, as_of_date),
                one_year_return = COALESCE($4, one_year_return),
                ytd_return = COALESCE($5, ytd_return),
                fund_classification = COALESCE($6, fund_classification),
                domicile = COALESCE($7, domicile),
                currency = COALESCE($8, currency),
                fund_type = COALESCE($9, fund_type),
                establishment_date = COALESCE($10, establishment_date),
                manager_name_en = COALESCE($11, manager_name_en),
                returns_1m = COALESCE($12, returns_1m),
                returns_3m = COALESCE($13, returns_3m),
                returns_3y = COALESCE($14, returns_3y),
                returns_5y = COALESCE($15, returns_5y),
                sharpe_ratio = COALESCE($16, sharpe_ratio),
                alpha = COALESCE($17, alpha),
                beta = COALESCE($18, beta),
                last_updated = NOW()
            WHERE fund_id = $1
        ''', fund_id,
            data.get('latest_nav'), data.get('as_of_date'),
            data.get('one_year_return'), data.get('ytd_return'),
            data.get('fund_classification'), data.get('domicile'),
            data.get('currency'), data.get('fund_type'),
            data.get('establishment_date'), data.get('manager_name_en'),
            data.get('returns_1m'), data.get('returns_3m'),
            data.get('returns_3y'), data.get('returns_5y'),
            data.get('sharpe_ratio'), data.get('alpha'), data.get('beta')
        )
        # Update disclosures
        if 'disclosures' in data and data['disclosures']:
            for d in data['disclosures']:
                # Avoid duplicates
                existing = await conn.fetchval(
                    'SELECT id FROM fund_disclosures WHERE fund_id = $1 AND file_url = $2',
                    fund_id, d['url']
                )
                if not existing:
                    await conn.execute('''
                        INSERT INTO fund_disclosures (fund_id, disclosure_date, title, sub_category, file_url)
                        VALUES ($1, $2, $3, $4, $5)
                    ''', fund_id, d['date'], d['title'], d.get('type', 'General'), d['url'])
            print(f"   Saved {len(data['disclosures'])} disclosures")

        # Update investments
        if 'investments' in data and data['investments']:
             # Use upsert logic
             for inv in data['investments']:
                 await conn.execute('''
                     INSERT INTO fund_investments (fund_id, investment_type, name, percentage, as_of_date)
                     VALUES ($1, $2, $3, $4, CURRENT_DATE)
                     ON CONFLICT (fund_id, investment_type, name, as_of_date) 
                     DO UPDATE SET percentage = EXCLUDED.percentage
                 ''', fund_id, inv['type'], inv['name'], inv['percentage'])
             print(f"   Saved {len(data['investments'])} investment items")

        # Update Peers
        if 'peers' in data and data['peers']:
             # Clear existing peers for today to avoid duplicates on rerun
             await conn.execute('DELETE FROM fund_peers WHERE fund_id=$1 AND as_of_date=CURRENT_DATE', fund_id)
             
             for p in data['peers']:
                 await conn.execute('''
                     INSERT INTO fund_peers (fund_id, peer_fund_name, peer_rank, as_of_date)
                     VALUES ($1, $2, $3, CURRENT_DATE)
                 ''', fund_id, p['name'], int(p['rank']) if p['rank'].isdigit() else None)
             print(f"   Saved {len(data['peers'])} peers")

        # Update Actions
        if 'actions' in data and data['actions']:
             for a in data['actions']:
                 # Avoid dupes?
                 exist = await conn.fetchval(
                     'SELECT id FROM fund_actions WHERE fund_id=$1 AND action_date=$2 AND action_type=$3',
                     fund_id, a['date'], a['type']
                 )
                 if not exist:
                     await conn.execute('''
                         INSERT INTO fund_actions (fund_id, action_date, action_type, action_value, description)
                         VALUES ($1, $2, $3, $4, $5)
                     ''', fund_id, a['date'], a['type'], a['value'], a['description'])
             print(f"   Saved {len(data['actions'])} actions")

        print(f"✅ Updated {symbol}")
    else:
        print(f"⚠️ Fund {symbol} not found in database, skipping insert")


async def main(test_symbol=None):
    """Main scraper entry point."""
    print("🚀 Decypha Playwright Scraper")
    print("=" * 50)
    
    # Connect to database with pgbouncer compatibility
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    async with async_playwright() as p:
        # Launch browser (visible mode for reliable auth)
        browser = await p.chromium.launch(headless=False)
        
        # Try to load saved session
        storage_path = os.path.join(os.path.dirname(__file__), 'decypha_session.json')
        if os.path.exists(storage_path):
            print(f"📂 Loading saved session from {storage_path}")
            context = await browser.new_context(storage_state=storage_path)
        else:
            context = await browser.new_context()
        
        page = await context.new_page()
        
        # Login
        if not await login_to_decypha(page, context):
            print("❌ Failed to login, exiting")
            await browser.close()
            return
        
        # Get fund list
        if test_symbol:
            symbols = [test_symbol]
            print(f"📋 Test mode: scraping {test_symbol}")
        else:
            # Load from JSON
            json_path = os.path.join(os.path.dirname(__file__), '..', 'decypha_funds_list.json')
            if os.path.exists(json_path):
                with open(json_path, 'r') as f:
                    funds = json.load(f)
                symbols = [f['symbol'] for f in funds]
            else:
                symbols = []
            print(f"📋 Found {len(symbols)} funds")
        
        # Scrape each fund
        for i, symbol in enumerate(symbols):
            print(f"\n[{i+1}/{len(symbols)}] Processing {symbol}...")
            
            # Scrape all tabs
            data = await scrape_fund_profile(page, symbol)
            perf_data = await scrape_fund_performance(page, symbol)
            data.update(perf_data)
            ratios_data = await scrape_fund_ratios(page, symbol)
            data.update(ratios_data)
            
            # Scrape Disclosures
            disc_data = await scrape_fund_disclosures(page, symbol)
            data.update(disc_data)
            
            # Scrape Investments
            inv_data = await scrape_fund_investments(page, symbol)
            data.update(inv_data)

            # Scrape Peers
            peers_data = await scrape_fund_peers(page, symbol)
            data.update(peers_data)
            
            # Scrape Actions
            act_data = await scrape_fund_actions(page, symbol)
            data.update(act_data)
            
            # Save to database
            await save_fund(conn, data)
            
            # Rate limiting
            await asyncio.sleep(1)
        
        await browser.close()
    
    await conn.close()
    print("\n🏁 Scraping complete!")


if __name__ == "__main__":
    import sys
    test_symbol = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(main(test_symbol))
