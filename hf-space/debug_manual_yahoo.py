import requests
import json
import logging

# Configure robust logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_yahoo_manual(symbol):
    symbol = symbol.upper()
    if not symbol.endswith(".CA") and not symbol.endswith(".SR"):
        symbol = f"{symbol}.CA"
        
    print(f"Fetching raw data for: {symbol}")
    
    # Headers are critical for Yahoo
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    }
    
    # 1. Fetch Crumb (Optional but good for stability) - Skipping for now to try direct output
    
    # 2. Quote Summary (The "Everything" Endpoint)
    modules = [
        "summaryDetail",
        "assetProfile",
        "financialData",
        "defaultKeyStatistics",
        "calendarEvents",
        "incomeStatementHistory",
        "balanceSheetHistory",
        "cashflowStatementHistory",
        "earnings",
        "price",
        "esgScores",
        "upgradeDowngradeHistory",
        "majorHoldersBreakdown",
        "netSharePurchaseActivity",
        "insiderHolders",
        "institutionOwnership"
    ]
    
    url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
    params = {
        "modules": ",".join(modules),
        "formatted": "false",
        "lang": "en-US",
        "region": "US",
        "corsDomain": "finance.yahoo.com"
    }
    
    try:
        print(f"Requesting: {url}")
        r = requests.get(url, headers=headers, params=params, timeout=10)
        
        if r.status_code != 200:
            print(f"Error: {r.status_code} - {r.text[:200]}")
            return
            
        data = r.json()
        result = data.get("quoteSummary", {}).get("result", [])
        
        if not result:
            print("No 'result' in response.")
            return

        data_modules = result[0]
        print(f"\nSUCCESS! Retrieved {len(data_modules)} modules.")
        print("-" * 30)
        
        # Check specific critical fields
        ap = data_modules.get("assetProfile", {})
        sd = data_modules.get("summaryDetail", {})
        fd = data_modules.get("financialData", {})
        ks = data_modules.get("defaultKeyStatistics", {})
        
        print(f"Description: {ap.get('longBusinessSummary')[:100]}..." if ap.get('longBusinessSummary') else "Description: N/A")
        print(f"Sector: {ap.get('sector', 'N/A')}")
        print(f"Market Cap: {sd.get('marketCap', 'N/A')}")
        print(f"P/E Ratio: {sd.get('trailingPE', 'N/A')}")
        print(f"Volume: {sd.get('volume', 'N/A')}")
        print(f"Operating Margin: {fd.get('operatingMargins', 'N/A')}")
        print(f"Return on Equity: {fd.get('returnOnEquity', 'N/A')}")
        print(f"Total Cash: {fd.get('totalCash', 'N/A')}")
        print(f"Short Ratio: {ks.get('shortRatio', 'N/A')}")
        
    except Exception as e:
        print(f"CRITICAL EXCEPTION: {e}")

if __name__ == "__main__":
    fetch_yahoo_manual("COMI")
