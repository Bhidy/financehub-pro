import tls_client
import re
import json

def fetch_and_parse(fund_id):
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )
    url = f"https://www.mubasher.info/countries/sa/funds/{fund_id}"
    print(f"Fetching {url}...")
    
    resp = session.get(url)
    if resp.status_code != 200:
        print(f"Failed: {resp.status_code}")
        return

    html = resp.text
    # Save for debug
    with open(f"backend/fund_{fund_id}.html", "w") as f:
        f.write(html)
        
    # Look for chart data pattern. Highcharts often uses "series: [{"
    # Or Next.js props
    
    # 1. Try finding JSON blob
    # Look for variable assignments like `var data = [...]`
    
    # Search for "nav" or "price" arrays
    # 2525.393 is a price we saw.
    print("Searching for price data...")
    if "2525.393" in html:
        print("✅ Found current price in HTML.")
        
    # Look for large arrays of numbers
    # Regex for array of arrays [[t, v], [t, v]]
    # or just [v, v, v]
    
    # Try finding "series"
    series_match = re.search(r'series\s*:\s*(\[\{.*?\}\])', html, re.DOTALL)
    if series_match:
        print("✅ Found Highcharts 'series' config!")
        # print(series_match.group(1)[:500])
        
    else:
        print("No 'series' found.")

if __name__ == "__main__":
    fetch_and_parse(2049)
