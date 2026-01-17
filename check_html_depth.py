
import asyncio
import httpx
from bs4 import BeautifulSoup
from datetime import datetime

async def check_html_history_depth(symbol="COMI"):
    print(f"Checking HTML history depth for {symbol}...")
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}/history/"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"Failed: {resp.status_code}")
            return
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        table = soup.find('table')
        if not table:
            print("No table found")
            return
            
        rows = table.find_all('tr')[1:] # Skip header
        print(f"Found {len(rows)} rows in HTML table")
        
        if rows:
            last_row = rows[-1]
            cells = last_row.find_all('td')
            if cells:
                date_str = cells[0].get_text(strip=True)
                print(f"Oldest Entry in HTML: {date_str}")
        else:
            print("Table empty")

if __name__ == "__main__":
    asyncio.run(check_html_history_depth())
