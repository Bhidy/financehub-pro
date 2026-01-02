import requests
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.mubasher.info/markets/SA/stocks/1010",
    "Origin": "https://www.mubasher.info"
}

endpoints = [
    "https://www.mubasher.info/api/1/stocks/1010/financial-statements",
    "https://www.mubasher.info/api/1/stocks/1010/profile",
    "https://www.mubasher.info/api/1/stocks/1010/shareholders"
]

print("Testing Mubasher API connectivity...")

for url in endpoints:
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"[{resp.status_code}] {url}")
        if resp.status_code == 200:
            print(f"  > Success! Length: {len(resp.content)}")
    except Exception as e:
        print(f"❌ Error: {e}")
