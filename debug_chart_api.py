import tls_client
import json

session = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://english.mubasher.info/countries/eg/funds",
    "Origin": "https://english.mubasher.info"
}

# Test Beltone EGX33 ETF (Symbol: XT30 - specific fund ID needed)
# Using a few IDs from the logs to test: 2708, 2709, and maybe a known one if we have it
fund_ids = ["6149", "2708", "2709"]

for fid in fund_ids:
    url = f"https://english.mubasher.info/api/1/funds/{fid}/chart?type=ytd"
    print(f"Testing {fid}...")
    try:
        resp = session.get(url, headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Data Length: {len(data) if isinstance(data, list) else 'Not a list'}")
            print(f"Sample: {json.dumps(data[:2]) if isinstance(data, list) and len(data) > 0 else data}")
        else:
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)
