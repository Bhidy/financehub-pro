
import asyncio
import httpx
from bs4 import BeautifulSoup
from app.db.session import db
import time
import argparse

# Configuration
BASE_URL = "https://stockanalysis.com/quote/egx/{symbol}/"
search_api_url = "https://stockanalysis.com/api/search?q={symbol}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5"
}

async def fetch_metadata(client: httpx.AsyncClient, symbol: str):
    # Phase 2 Search Logic:
    # 1. Try DIRECT URL: https://stockanalysis.com/quote/egx/{symbol}/
    # 2. If 404, Try SEARCH: https://stockanalysis.com/api/search?q={symbol}
    
    url = BASE_URL.format(symbol=symbol.upper())
    
    try:
        response = await client.get(url, headers=HEADERS, follow_redirects=True)
        
        # 404? Try Search
        if response.status_code == 404:
            # print(f"   [404] Direct URL failed. Searching...")
            search_url = search_api_url.format(symbol=symbol)
            search_resp = await client.get(search_url, headers=HEADERS)
            if search_resp.status_code == 200:
                data = search_resp.json()
                if data and 'data' in data and len(data['data']) > 0:
                     # Match first result?
                     first_hit = data['data'][0]
                     # Check if 's' field starts with 'egx/'?
                     slug = first_hit.get('s')
                     if slug and 'egx/' in slug:
                          url = f"https://stockanalysis.com/quote/{slug}/"
                          # print(f"   found slug: {slug} -> {url}")
                          response = await client.get(url, headers=HEADERS, follow_redirects=True)
                     else:
                          return None, None, None, "Search result not EGX"
                else:
                     return None, None, None, "No search results"
            else:
                 return None, None, None, "Search failed"

        if response.status_code != 200:
            return None, None, None, f"Status {response.status_code}"

        text = response.text
        
        # Extract Industry from JS Object
        # Pattern: {t:"Industry",v:"VALUE"}
        # Note: The keys might not be quoted in some JS, but here they seem to be t:"Industry" (key unquoted?)
        # Snapshot showed: infoTable:[{t:"Industry",v:"Heavy Construction..."
        
        import re
        # Regex to find t:"Industry",v:"..."
        # We need to be careful with the Value which might contain quotes escaped? usually not in this simple JSON
        industry_match = re.search(r't:"Industry",v:"(.*?)"', text)
        industry = industry_match.group(1) if industry_match else None
        
        # Also try to find description
        # description:"..."
        desc_match = re.search(r'description:"(.*?)"', text)
        description = desc_match.group(1) if desc_match else None
        
        # Extract Ratios using Regex
        # data:{marketCap:"1.15B",... peRatio:"n/a",... dividendYield:"..."}
        
        def parse_val(regex, txt):
            m = re.search(regex, txt)
            if m:
                val = m.group(1)
                if val == 'n/a' or val == 'void 0': return None
                return val
            return None

        pe_str = parse_val(r'peRatio:"(.*?)"', text)
        mc_str = parse_val(r'marketCap:"(.*?)"', text)
        dy_str = parse_val(r'dividendYield:"(.*?)"', text)
        eps_str = parse_val(r'eps:"(.*?)"', text)

        # Helper to convert "1.15B" to float
        def convert_si(s):
            if not s: return None
            s = s.replace(',', '')
            multiplier = 1.0
            if s.endswith('T'): multiplier = 1e12
            elif s.endswith('B'): multiplier = 1e9
            elif s.endswith('M'): multiplier = 1e6
            elif s.endswith('K'): multiplier = 1e3
            elif s.endswith('%'): 
                multiplier = 0.01
                s = s.replace('%', '')
            
            try:
                # Remove suffix char if present
                clean = s.strip('TBMK%')
                return float(clean) * multiplier
            except:
                return None

        pe_ratio = convert_si(pe_str)
        market_cap = convert_si(mc_str)
        dividend_yield = convert_si(dy_str)
        # Note: dividendYield "4.5%" -> 0.045
        
        sector = None
        # If no explicit sector, we use Industry as Sector (Fallback)
        if industry and not sector:
            sector = industry

        # Return dict of stats
        stats = {
            'sector': sector, 
            'industry': industry, 
            'description': description,
            'pe_ratio': pe_ratio,
            'market_cap': market_cap,
            'dividend_yield': dividend_yield,
            'eps': convert_si(eps_str)
        }
        return stats, "Success"

    except Exception as e:
        return None, str(e)

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Limit number of stocks to process")
    parser.add_argument("--dry-run", action="store_true", help="Do not update DB")
    args = parser.parse_args()

    await db.connect()
    
    print("Fetching EGX Symbols...")
    rows = await db.fetch_all("SELECT symbol FROM market_tickers WHERE market_code = 'EGX' ORDER BY symbol")
    symbols = [r['symbol'] for r in rows]
    
    if args.limit:
        symbols = symbols[:args.limit]
        print(f"Limiting to {args.limit} symbols.")

    print(f"Processing {len(symbols)} symbols...")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        success_count = 0
        updated_count = 0
        
        for symbol in symbols:
            print(f"[{symbol}] Scraping...", end=" ", flush=True)
            stats, msg = await fetch_metadata(client, symbol)
            
            if stats:
                print(f"FOUND! PE:{stats.get('pe_ratio')} MC:{stats.get('market_cap')}")
                success_count += 1
                
                if not args.dry_run:
                    # UPDATE DB with Stats
                    # We update sector/industry AND stats
                    await db.execute("""
                        UPDATE market_tickers 
                        SET sector_name = COALESCE($1, sector_name), 
                            industry = COALESCE($2, industry),
                            pe_ratio = COALESCE($3, pe_ratio), 
                            market_cap = COALESCE($4, market_cap), 
                            dividend_yield = COALESCE($5, dividend_yield)
                        WHERE symbol = $6 AND market_code = 'EGX'
                    """, stats['sector'], stats['industry'], stats['pe_ratio'], 
                         stats['market_cap'], stats['dividend_yield'], symbol)
                    updated_count += 1
            else:
                print(f"Failed: {msg}")
            
            # Rate limit gentle
            time.sleep(1.0)
            
    print(f"\nCompleted. Found: {success_count}, Updated: {updated_count}")
    await db.close()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
