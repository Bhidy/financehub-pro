import tls_client
import re
import json

# Target Major Stocks (High probability of having deep data)
# 2222: Aramco, 1120: Al Rajhi
SYMBOLS = ["2222", "1120"]

session = tls_client.Session(client_identifier="chrome_120")

def probe_financials(symbol):
    print(f"\n--- Probing Financials for {symbol} ---")
    
    # 1. Main Financials Tab
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/financial-statements"
    print(f"Fetching: {url}")
    try:
        resp = session.get(url, headers={"User-Agent": "Mozilla/5.0"})
        if "Highcharts" in resp.text:
            print("[+] Highcharts Library Found in Source.")
        
        # Look for Income Statement Data
        inc_match = re.search(r'var\s+incomeStatement\s*=\s*(\[.*?\]);', resp.text, re.DOTALL)
        if inc_match:
            print("[SUCCESS] Found 'incomeStatement' variable!")
        else:
            print("[-] No explicit 'incomeStatement' var found.")

        # Look for Generic Data Series
        series_match = re.findall(r'series:\s*(\[\{.*?\}\])', resp.text, re.DOTALL)
        if series_match:
            print(f"[+] Found {len(series_match)} charting series blobs.")
            # Print first few chars of first blob
            print(f"Sample: {series_match[0][:100]}...")

        # 2. Check for Table Data (Financial Table)
        # Often rendered as HTML table
        if "<table" in resp.text:
            print("[+] HTML Table tags found. Data might be rendered in server-side HTML.")

    except Exception as e:
        print(f"[ERROR] {e}")

def probe_fund_holdings(fund_id):
    print(f"\n--- Probing Holdings for Fund {fund_id} ---")
    url = f"https://www.mubasher.info/funds/{fund_id}"
    try:
        resp = session.get(url, headers={"User-Agent": "Mozilla/5.0"})
        # Look for "Fees" or "Holdings" keywords
        if "Management Fee" in resp.text or "رسوم الإدارة" in resp.text:
            print("[+] Found 'Management Fee' text.")
        
        if "Top Holdings" in resp.text or "أكبر الحيازات" in resp.text:
            print("[+] Found 'Top Holdings' text.")

    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    for s in SYMBOLS:
        probe_financials(s)
    
    # Probe a known fund (Al Rajhi or similar)
    probe_fund_holdings("fund_048")
