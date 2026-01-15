import asyncio
import os
import aiohttp
import asyncpg
from bs4 import BeautifulSoup
from datetime import datetime
import re
import json
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
# Decypha URLs
SEARCH_URL = "https://www.decypha.com/en/funds/search"
EXCEL_URL = "https://www.decypha.com/en/funds/excel"
BASE_PROFILE_URL = "https://www.decypha.com/en/fund-profile/EG/DFNMF/"

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': '_gid=GA1.2.296858900.1767716209; __utmz=136105892.1767716264.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); country=Egypt; countryCode=EG; currentPackage=""; user=Bhidy.mubasher; userDetails="{\\\"rep_phn\\\":\\\"+94112593959\\\",\\\"fnam\\\":\\\"Ahmed \\\",\\\"mail\\\":\\\"m.mostafa@mubasher.net\\\",\\\"rep_nam\\\":\\\"DFN Accounts\\\",\\\"uid\\\":\\\"222158\\\",\\\"ccon\\\":\\\"EG\\\",\\\"phn\\\":\\\"+2 01222616863\\\",\\\"company\\\":\\\"Mubasher Trade\\\",\\\"titl\\\":\\\"Mr\\\",\\\"accType\\\":\\\"1\\\",\\\"lnam\\\":\\\"Tarek \\\",\\\"rep_nam_ar\\\":\\\"               \\\",\\\"rep_mail\\\":\\\"infoplus.dev@directfn.com\\\"}"; usrAccType=1; type=c; userServices="{\\\"PRO\\\":false}"; __utma=136105892.1594976689.1767716209.1767716264.1767735405.2; __utmc=136105892; globalSelection=code%3D20%26conUrl%3DEG%26type%3Dreg%26desc%3DMENA%26regDet%3D20%252CMENA%26conDet%3DEG%252CEgypt%26exgDet%3DEGX%2CEgyptian%2BExchange; tempRandom=idsum57pqjoeemyf8h94t9; _ga_W40R8LVTWX=GS2.2.s1767737743$o3$g1$t1767737769$j34$l0$h0; _ga=GA1.2.1594976689.1767716209; _ga_3B3PQFES42=GS2.2.s1767737781$o2$g0$t1767737781$j60$l0$h0; _ga_4JPCQH97XD=GS2.1.s1767737780$o2$g1$t1767737814$j26$l0$h0; __utmt=1; __utmb=136105892.11.10.1767735405; _gat=1; _ga_1K4PXSBDPY=GS2.2.s1767735412$o1$g1$t1767738702$j60$l0$h0'
}

def clean_text(text):
    if not text: return None
    return text.strip().replace('\xa0', ' ').replace('--', '').strip()

def parse_decimal(text):
    if not text: return None
    clean = text.replace(',', '').replace('%', '').replace('EGP', '').replace('USD', '').strip()
    if clean == '' or clean == '-': return None
    try:
        return float(clean)
    except:
        return None

def parse_date(text):
    if not text: return None
    # Formats seen: 24-Jan-2011, 31 Dec 2025
    clean = clean_text(text)
    if not clean: return None
    for fmt in ['%d-%b-%Y', '%d %b %Y', '%Y-%m-%d']:
        try:
            return datetime.strptime(clean, fmt).date()
        except:
            continue
    return None

async def download_excel_summary(session):
    print("📊 Downloading Excel summary...")
    # Parameters captured from browser inspection
    payload = {
        'selectedRegion': 'MENA-20',
        'country': 'EG',
        'isFocusedCountry': 'true',
        'shariah': '-1',
        'rt': 'excel',
        'fn': 'FundDetails',
        # Headers map (hk) and headers (hd) are usually required by their backend generator
        'hd': 'Fund Name,% 3M Ch.,% 1YR Ch.,YTD%,Currency,Domicile,Fund Type,Managers,Issuers,AUM (M USD),Shariah',
        'hk': 'tikL,pc3,pc1y,ytd,cur,dom,typ,man,iss,aum,ish' 
        # Note: 'hk' keys guessed/simplified based on common patterns or previous inspection. 
        # If this fails, we rely on the scraping. But let's try a generic set.
        # Actually, let's use the exact ones if possible, but for now generic might work or just 'country=EG'
    }
    
    # Simple payload first, if they validate headers we might need exact string
    # Try minimal first
    minimal_payload = {
        'selectedRegion': 'MENA-20',
        'country': 'EG',
        'fundName': '',
        'fundClass': '-1',
        'rt': 'excel',
        'fn': 'Decypha_Funds_Export'
    }

    try:
        async with session.post(EXCEL_URL, data=minimal_payload, headers=headers) as resp:
            if resp.status == 200:
                content = await resp.read()
                # Check if it's actually an excel file (magic bytes or headers)
                if len(content) > 1000: # specific check
                    with open('decypha_funds_summary.xls', 'wb') as f:
                        f.write(content)
                    print(f"✅ Excel downloaded ({len(content)} bytes)")
                    return True
                else:
                    print(f"⚠️  Excel response too small, might be error page.")
            else:
                print(f"⚠️  Excel download failed: {resp.status}")
    except Exception as e:
        print(f"⚠️  Excel download error: {e}")
    return False

async def fetch_fund_list(session):
    print("📋 Fetching fund list...")
    funds = []
    
    # Loop through pages. Usually pages are 1-indexed.
    # Safely limit to ~20 pages (187 results / 20 per page ~= 10 pages)
    for page in range(1, 20):
        print(f"   Fetching page {page}...")
        params = {
            'selectedRegion': 'MENA-20',
            'fundName': '',
            'country': 'EG',
            'fundClass': '-1',
            'page': str(page) # Guessing param name 'page'
        }
        
        async with session.get(SEARCH_URL, params=params, headers=headers) as resp:
            if resp.status != 200:
                print(f"   ❌ Page {page} failed ({resp.status})")
                break
                
            html = await resp.text()
            soup = BeautifulSoup(html, 'html.parser')
            
            rows = soup.select('table tbody tr')
            if not rows and page > 1:
                print("   No more rows found.")
                break
            
            if not rows and page == 1:
                print(f"   ⚠️ No rows on page 1. HTML len: {len(html)}")
                print(f"   Snippet: {html[:500]}...")
                # Write to file for inspection
                with open('debug_page.html', 'w') as f:
                    f.write(html)

                
            page_funds = []
            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 2: continue
                
                link = cols[0].find('a')
                if not link: continue
                
                name = clean_text(link.text)
                href = link.get('href', '')
                symbol = href.split('/')[-1] if href else None
                
                if symbol and 'fund-profile' in href:
                    # Check duplicate
                    if not any(f['symbol'] == symbol for f in funds):
                         page_funds.append({
                            'symbol': symbol,
                            'name_en': name,
                            'url': href if href.startswith('http') else f"https://www.decypha.com{href}"
                        })
            
            if not page_funds:
                print("   No funds found on this page (end of list?).")
                break
                
            print(f"   Found {len(page_funds)} funds on page {page}")
            funds.extend(page_funds)
            
            # Simple check for "Next" button availability to stop early
            # next_btn = soup.find('a', title='Next')
            # if not next_btn: break
                
    print(f"✅ Found {len(funds)} funds total")
    return funds

async def scrape_fund_details(session, fund):
    url = fund['url']
    print(f"   Processing {fund['symbol']}...")
    
    try:
        async with session.get(url, headers=headers) as resp:
            if resp.status != 200:
                print(f"❌ Failed to fetch {url}: {resp.status}")
                return None
            html = await resp.text()
            soup = BeautifulSoup(html, 'html.parser')
            
            data = fund.copy()
            
            # --- OVERVIEW SECTION ---
            # Helper to find text by label in table
            def get_field(label, parent=None):
                scope = parent if parent else soup
                # Look for td with text, then next td
                # Or dt/dd structure
                # Try table approach common in Decypha
                elm = scope.find(lambda tag: tag.name in ['td', 'th', 'dt', 'span'] and label in tag.text)
                if elm:
                    if elm.name == 'td':
                        nxt = elm.find_next_sibling('td')
                        return clean_text(nxt.text) if nxt else None
                    # Add patterns as needed
                return None

            data['fund_classification'] = get_field('Fund Classification')
            data['geographic_focus'] = get_field('Geographic Focus')
            data['domicile'] = get_field('Domicile')
            data['eligibility'] = get_field('Eligibility')
            data['benchmark'] = get_field('Benchmark')
            data['nav_frequency'] = get_field('NAV Frequency')
            data['currency'] = get_field('Currency')
            data['fund_type'] = get_field('Type')
            data['establishing_date'] = parse_date(get_field('Establishing Date'))
            data['certificates'] = get_field('Certificates')
            data['duration_years'] = parse_decimal(get_field('Duration (Years)'))
            data['par_value'] = parse_decimal(get_field('Par Value'))
            data['fy_start'] = get_field('Start of FY')
            data['fy_end'] = get_field('End of FY')
            data['objective'] = get_field('Objective')
            data['investment_strategy'] = get_field('Investment Strategy')
            data['dividend_policy'] = get_field('Dividend policy')
            data['risk_level'] = get_field('Risk')
            
            # --- TOP HEADER ---
            # Latest NAV, Returns often in header
            header_nav = soup.select_one('.fund-header .nav-price') # adjust selector based on inspection
            # If standard selectors fail, look for generic text patterns
            
            # Try to find NAV in text if specific selector unknown
            # Assuming similar structure to overview
            
            # --- MANAGEMENT ---
            data['manager_name_en'] = get_field('Manager')
            data['issuer'] = get_field('Issuer')
            data['ipo_receiver'] = get_field('IPO Receiver')
            
            # --- FEES ---
            data['fee_subscription'] = parse_decimal(get_field('Subscription'))
            data['fee_redemption'] = parse_decimal(get_field('Redemption'))
            data['fee_management'] = parse_decimal(get_field('Management'))
            data['fee_administration'] = parse_decimal(get_field('Administration'))
            data['fee_custodian'] = parse_decimal(get_field('Custodian'))
            data['fee_performance'] = parse_decimal(get_field('Performance'))
            data['min_subscription'] = parse_decimal(get_field('Min. Subscription'))
            data['subsequent_sub'] = parse_decimal(get_field('Subsequent Sub.'))
            data['other_expenses'] = get_field('Other Expenses')

            # --- PERFORMANCE & RATIOS ---
            # Often in separate tabs, or script data
            # Look for chart JSON data
            scripts = soup.find_all('script')
            for s in scripts:
                if s.string and 'chartData' in s.string:
                    # simplistic extraction, might need regex
                    pass
            
            return data

    except Exception as e:
        print(f"❌ Error scraping {fund['symbol']}: {e}")
        return None

async def save_fund(conn, data):
    # Upsert into mutual_funds
    # We use symbol as unique key if possible, but schema uses fund_id (auto-inc) or we map symbol
    
    # Check if fund exists by symbol
    row = await conn.fetchrow('SELECT fund_id FROM mutual_funds WHERE symbol = $1', data['symbol'])
    
    if row:
        fund_id = row['fund_id']
        # Update
        await conn.execute('''
            UPDATE mutual_funds SET
                fund_name_en = $2,
                fund_classification = $3,
                geographic_focus = $4,
                domicile = $5,
                eligibility = $6,
                benchmark = $7,
                nav_frequency = $8,
                currency = $9,
                fund_type = $10,
                establishment_date = $11,
                certificates = $12,
                duration_years = $13,
                par_value = $14,
                fy_start = $15,
                fy_end = $16,
                objective = $17,
                investment_strategy = $18,
                dividend_policy = $19,
                risk_level = $20,
                manager_name_en = $21,
                issuer = $22,
                ipo_receiver = $23,
                fee_subscription = $24,
                fee_redemption = $25,
                fee_management = $26,
                fee_administration = $27,
                fee_custodian = $28,
                fee_performance = $29,
                min_subscription = $30,
                subsequent_sub = $31,
                other_expenses = $32,
                market_code = 'EGX',
                last_updated = NOW()
            WHERE fund_id = $1
        ''', fund_id, data.get('name_en'), data.get('fund_classification'), data.get('geographic_focus'),
           data.get('domicile'), data.get('eligibility'), data.get('benchmark'), data.get('nav_frequency'),
           data.get('currency'), data.get('fund_type'), data.get('establishing_date'), data.get('certificates'),
           data.get('duration_years'), data.get('par_value'), data.get('fy_start'), data.get('fy_end'),
           data.get('objective'), data.get('investment_strategy'), data.get('dividend_policy'), data.get('risk_level'),
           data.get('manager_name_en'), data.get('issuer'), data.get('ipo_receiver'),
           data.get('fee_subscription'), data.get('fee_redemption'), data.get('fee_management'),
           data.get('fee_administration'), data.get('fee_custodian'), data.get('fee_performance'),
           data.get('min_subscription'), data.get('subsequent_sub'), data.get('other_expenses')
        )
    else:
        # Insert
        await conn.execute('''
            INSERT INTO mutual_funds (
                symbol, fund_name_en, fund_classification, geographic_focus, domicile, eligibility, benchmark,
                nav_frequency, currency, fund_type, establishment_date, certificates, duration_years, par_value,
                fy_start, fy_end, objective, investment_strategy, dividend_policy, risk_level,
                manager_name_en, issuer, ipo_receiver, fee_subscription, fee_redemption, fee_management,
                fee_administration, fee_custodian, fee_performance, min_subscription, subsequent_sub, other_expenses,
                market_code, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 'EGX', NOW())
        ''', data['symbol'], data.get('name_en'), data.get('fund_classification'), data.get('geographic_focus'),
           data.get('domicile'), data.get('eligibility'), data.get('benchmark'), data.get('nav_frequency'),
           data.get('currency'), data.get('fund_type'), data.get('establishing_date'), data.get('certificates'),
           data.get('duration_years'), data.get('par_value'), data.get('fy_start'), data.get('fy_end'),
           data.get('objective'), data.get('investment_strategy'), data.get('dividend_policy'), data.get('risk_level'),
           data.get('manager_name_en'), data.get('issuer'), data.get('ipo_receiver'),
           data.get('fee_subscription'), data.get('fee_redemption'), data.get('fee_management'),
           data.get('fee_administration'), data.get('fee_custodian'), data.get('fee_performance'),
           data.get('min_subscription'), data.get('subsequent_sub'), data.get('other_expenses')
        )

async def main():
    print("🚀 Starting Decypha Scraper...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    connector = aiohttp.TCPConnector(ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        # 0. Download Excel
        await download_excel_summary(session)

        # 1. Fetch List
        funds = await fetch_fund_list(session)
        
        # 2. Scrape Details & Save
        for f in funds:
            details = await scrape_fund_details(session, f)
            if details:
                await save_fund(conn, details)
                print(f"✅ Saved {f['symbol']}")
            
            # Moderate specific rate limiting
            await asyncio.sleep(0.5)
            
    await conn.close()
    print("🏁 Scraping complete!")

if __name__ == "__main__":
    asyncio.run(main())
