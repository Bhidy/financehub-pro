
import asyncio
import aiohttp
import os
import random
import json
import psycopg2
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

# Browser-like headers (borrowed from browser subagent)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": "_gid=GA1.2.296858900.1767716209; __utmz=136105892.1767716264.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utma=136105892.1594976689.1767716209.1767716264.1767735405.2; _ga=GA1.2.1594976689.1767716209; _ga_3B3PQFES42=GS2.2.s1767737781$o2$g0$t1767737781$j60$l0$h0; _ga_4JPCQH97XD=GS2.1.s1767737780$o2$g1$t1767737814$j26$l0$h0; _ga_1K4PXSBDPY=GS2.2.s1767735412$o1$g1$t1767741543$j60$l0$h0; user=222158; userDetails=%7B%22userName%22%3A%22Bhidy.mubasher%22%2C%22id%22%3A222158%2C%22email%22%3A%22m.mostafa%40mubasher.net%22%2C%22firstName%22%3A%22Bhidy%22%2C%22lastName%22%3A%22mubasher%22%7D; usrAccType=; globalSelection=code%3D20%26conUrl%3DEG%26type%3Dreg%26desc%3DMENA%26regDet%3D20%252CMENA%26conDet%3DEG%252CEgypt%26exgDet%3DEGX%2CEgyptian%2BExchange; _ga_W40R8LVTWX=GS2.2.s1767742636$o5$g1$t1767742751$j39$l0$h0"
}

def connect_db():
    return psycopg2.connect(DB_URL)

def get_funds():
    conn = connect_db()
    cur = conn.cursor()
    # Get funds that don't have investments yet? or just all EGY funds
    cur.execute("SELECT symbol, fund_name_en FROM mutual_funds WHERE market_code = 'EGX' ORDER BY symbol")
    rows = cur.fetchall()
    conn.close()
    return rows

async def fetch_page(session, url):
    try:
        async with session.get(url, headers=HEADERS, ssl=False, allow_redirects=True) as response:
            if response.status == 200:
                html = await response.text()
                # Check for "0 tables" trap - if HTML is short or title indicates block
                return html
            print(f"❌ Failed to fetch {url}: {response.status}")
            return None
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        return None

def parse_investments_html(html, symbol, conn):
    soup = BeautifulSoup(html, 'html.parser')
    cur = conn.cursor()
    
    tables = soup.find_all('table')
    print(f"   found {len(tables)} tables")
    
    if len(tables) == 0:
        # Debug Dump
        with open(f"debug_{symbol}.html", "w", encoding="utf-8") as f:
            f.write(html)
        print(f"   ⚠️ Dumped HTML to debug_{symbol}.html")
    
    inserted_alloc = 0
    
    for table in tables:
        # Check if this table is Asset Allocation
        # Look for 'Asset Class' or 'Percentage' in header
        headers = [th.get_text(strip=True).lower() for th in table.find_all('th')]
        
        # Heuristic for Asset Allocation Table
        is_allocation = 'asset' in headers or 'sector' in headers # 'Asset Class' or similar
        
        if is_allocation:
            rows = table.find_all('tr')[1:] # Skip header
            for tr in rows:
                cols = tr.find_all('td')
                if len(cols) < 2: continue
                
                asset = cols[0].get_text(strip=True)
                val_str = cols[1].get_text(strip=True).replace('%', '').strip()
                
                try:
                    pct = float(val_str)
                    # Insert
                    # Schema: fund_id, as_of_date (default now), asset_type, percentage
                    # Check duplication logic? UNIQUE(fund_id, asset_type, as_of_date)
                    try:
                        cur.execute("""
                            INSERT INTO fund_investments (fund_id, asset_type, percentage)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (fund_id, asset_type, as_of_date) DO UPDATE 
                            SET percentage = EXCLUDED.percentage
                        """, (symbol, asset, pct))
                        inserted_alloc += 1
                    except Exception as e:
                        print(f"      Item Insert Error: {e}")
                        conn.rollback()
                        
                except ValueError:
                    continue
            conn.commit()
            if inserted_alloc > 0:
                print(f"   ✅ Saved {inserted_alloc} allocation items")
                # return # Stop after finding the allocation table? 
                       # Wait, there might be other tables like Top 10

async def process_funds():
    funds = get_funds()
    print(f"🚀 Processing {len(funds)} funds...")
    
    conn = connect_db()
    
    async with aiohttp.ClientSession() as session:
        for idx, (symbol, name) in enumerate(funds):
            print(f"[{idx+1}/{len(funds)}] Processing {symbol}...")
            
            # URL: https://www.decypha.com/en/fund-investments/EG/DFNMF/{SYMBOL}
            url = f"https://www.decypha.com/en/fund-investments/EG/DFNMF/{symbol}"
            
            html = await fetch_page(session, url)
            if html:
                parse_investments_html(html, symbol, conn)
            
            # Be nice to the server
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
    conn.close()

if __name__ == "__main__":
    asyncio.run(process_funds())
