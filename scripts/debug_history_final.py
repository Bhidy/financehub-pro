import requests
import yfinance as yf

def test_url(sym):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=1y&interval=1d"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    print(f"\n🌍 Testing {sym}...")
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"   Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                 pts = len(data['chart']['result'][0].get('timestamp', []))
                 print(f"   ✅ SUCCESS: {pts} points")
            else:
                 print(f"   ⚠️ Empty Result")
        else:
             print(f"   ❌ FAILED. Response: {r.text[:200]}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    test_url("COMI.CA")
    test_url("EGS69082C013.CA")
