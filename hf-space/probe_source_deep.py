
import asyncio
import httpx
from bs4 import BeautifulSoup
import re
import json

# URLs to Probe
base = "https://stockanalysis.com/quote/egx/COMI"
urls = [
    f"{base}/", # Overview + Profile + Key Stats
    f"{base}/statistics/", # Detailed Valuation/Metrics
    f"{base}/financials/", # Income Statement
    f"{base}/financials/balance-sheet/",
    f"{base}/financials/cash-flow-statement/",
    f"{base}/financials/ratios/",
    f"{base}/company/", # Executives?
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

async def probe_url(client, url):
    print(f"--- probing {url} ---")
    resp = await client.get(url, headers=HEADERS, follow_redirects=True)
    if resp.status_code != 200:
        print(f"Failed: {resp.status_code}")
        return

    # Extract JSON blobs
    # Looking for various data keys
    text = resp.text
    
    # 1. InfoTable (Overview)
    m = re.search(r'infoTable:(\[.*?\]),', text)
    if m:
        print("Found InfoTable Keys:")
        try:
            # This is rarely valid JSON directly due to keys not being quoted
            # Simple regex to extract keys: {t:"Key", v:...}
            keys = re.findall(r't:"(.*?)"', m.group(1))
            print(keys)
        except: pass

    # 2. Main Data Object (often 'data:{...}')
    # We look for large JSON-like structures
    # StockAnalysis often puts data in `const data = { ... }` or similar in Svelte payload
    
    # Let's verify financial tables explicitly
    soup = BeautifulSoup(text, 'html.parser')
    tables = soup.find_all('table')
    for i, t in enumerate(tables):
        # Header row
        rows = t.find_all('tr')
        if rows:
            header_cols = [th.text.strip() for th in rows[0].find_all(['th', 'td'])]
            # First few rows keys
            row_cols = [r.find('td') for r in rows[1:]]
            row_keys = [c.text.strip() for c in row_cols if c]
            
            print(f"URL: {url}")
            print(f"Table {i} Headers: {header_cols}")
            print(f"Table {i} Keys: {row_keys}")
            print("-" * 20)

async def main():
    async with httpx.AsyncClient(timeout=10.0) as client:
        for u in urls:
            await probe_url(client, u)

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
