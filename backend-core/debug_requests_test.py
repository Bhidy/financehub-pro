import requests
import json

def test_yahoo_direct():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    modules = [
        "summaryDetail", "assetProfile", "financialData", "defaultKeyStatistics",
        "price", "esgScores", "majorHoldersBreakdown", "netSharePurchaseActivity",
        "insiderHolders", "institutionOwnership"
    ]
    
    url = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL"
    params = {"modules": ",".join(modules), "formatted": "false"}
    
    print(f"Requesting {url}...")
    try:
        r = requests.get(url, headers=headers, params=params, timeout=10)
        print(f"Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            result = data.get("quoteSummary", {}).get("result", [])
            if result:
                m = result[0]
                print("--- Asset Profile ---")
                print(json.dumps(m.get('assetProfile'), indent=2))
                print("--- Financial Data ---")
                print(json.dumps(m.get('financialData'), indent=2))
            else:
                print("No result in JSON")
        else:
            print(f"Error: {r.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_yahoo_direct()
