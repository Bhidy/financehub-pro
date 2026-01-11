import yfinance as yf
import requests
import json
import pandas as pd
from datetime import datetime

TARGET = "EGS69082C013.CA"

def test_yfinance_direct():
    print("\n🧪 Testing YFinance (Direct)...")
    try:
        t = yf.Ticker(TARGET)
        hist = t.history(period="1y")
        print(f"   ✅ Rows: {len(hist)}")
        if not hist.empty: print(hist.head(1))
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_raw_api():
    print("\n🧪 Testing Raw API (v8/chart)...")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{TARGET}?range=2y&interval=1d"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    
    try:
        r = requests.get(url, headers=headers, timeout=10)
        data = r.json()
        
        if 'chart' in data and 'result' in data['chart']:
            res = data['chart']['result'][0]
            timestamps = res.get('timestamp', [])
            print(f"   ✅ Rows Found (Raw JSON): {len(timestamps)}")
        else:
            print(f"   ❌ Bad Response: {data.keys()}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_yfinance_direct()
    test_raw_api()
