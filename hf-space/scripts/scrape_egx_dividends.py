
import asyncio
import httpx
from bs4 import BeautifulSoup
from app.db.session import db
import time
import argparse
from datetime import datetime

# Configuration
BASE_URL = "https://stockanalysis.com/quote/egx/{symbol}/dividend/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

async def fetch_dividends(client: httpx.AsyncClient, symbol: str):
    url = BASE_URL.format(symbol=symbol.upper())
    try:
        response = await client.get(url, headers=HEADERS, follow_redirects=True)
        if response.status_code != 200:
            return []

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Locate Dividend Table
        # Usually checking <table> with rows
        cutoff_date = datetime(2021, 1, 1) # Only recent history (5 years)
        dividends = []
        
        table = soup.find('table')
        if not table: return []
        
        rows = table.find_all('tr')[1:] # Skip header
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 2: continue
            
            # Extract Ex-Date
            date_str = cols[0].text.strip()
            amount_str = cols[1].text.strip() # "0.50" or "0.50 EGP"
            
            # Parse Date
            try:
                # Format: "Jan 01, 2024" or "2024-01-01"
                ex_date = datetime.strptime(date_str, "%b %d, %Y")
            except:
                continue
                
            if ex_date < cutoff_date: break # Stop if too old
            
            # Parse Amount
            try:
                amount = float(amount_str.replace('EGP', '').strip())
            except:
                amount = 0.0
                
            dividends.append({
                'symbol': symbol,
                'ex_date': ex_date,
                'amount': amount,
                'type': 'Cash' # Default
            })
            
        return dividends

    except Exception as e:
        print(f"Error {symbol}: {e}")
        return []

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    await db.connect()
    print("Fetching EGX Symbols for Dividend Scrape...")
    rows = await db.fetch_all("SELECT symbol FROM market_tickers WHERE market_code = 'EGX'")
    symbols = [r['symbol'] for r in rows]
    
    if args.limit: symbols = symbols[:args.limit]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        total_inserted = 0
        for symbol in symbols:
            print(f"[{symbol}] Getting dividends...", end=" ", flush=True)
            divs = await fetch_dividends(client, symbol)
            
            if divs:
                print(f"Found {len(divs)} payouts.")
                for d in divs:
                    # Insert ignore dupes
                    # Assuming table dividend_history (symbol, ex_date, amount)
                    exist = await db.fetch_one("""
                        SELECT 1 FROM dividend_history 
                        WHERE symbol=$1 AND ex_date=$2
                    """, d['symbol'], d['ex_date'])
                    
                    if not exist:
                        await db.execute("""
                            INSERT INTO dividend_history (symbol, ex_date, amount, type)
                            VALUES ($1, $2, $3, 'Cash')
                        """, d['symbol'], d['ex_date'], d['amount'])
                        total_inserted += 1
            else:
                print("None.")
            
            time.sleep(0.5)

    print(f"Total inserted: {total_inserted}")
    await db.close()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
