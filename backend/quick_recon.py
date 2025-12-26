import urllib.request
import json
import re
import ssl

# Bypass SSL verification and set headers
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

URL = "https://www.mubasher.info"

def get_next_data():
    req = urllib.request.Request(URL, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            
            # Find __NEXT_DATA__
            match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.+?)</script>', html)
            if match:
                data = json.loads(match.group(1))
                return data
    except Exception as e:
        print(f"Error: {e}")
        return None

def analyze_schema(data, prefix=""):
    keys = []
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.append(full_key)
            if isinstance(v, (dict, list)) and len(keys) < 100: # Limit depth/breadth for summary
                 # specific deep dive for 'props' which usually holds the data
                 if k in ['props', 'pageProps', 'initialState', 'query', 'buildId']:
                     keys.extend(analyze_schema(v, full_key))
    elif isinstance(data, list) and len(data) > 0:
        # Analyze first item to guess schema of list
        keys.extend(analyze_schema(data[0], f"{prefix}[]"))
    return keys

if __name__ == "__main__":
    print("Fetching __NEXT_DATA__...")
    data = get_next_data()
    if data:
        print("Successfully extracted __NEXT_DATA__")
        
        # Save raw dump
        with open('backend/quick_dump.json', 'w') as f:
            json.dump(data, f)
            
        # Analyze schema
        schema = analyze_schema(data)
        with open('backend/schema_map.txt', 'w') as f:
            for k in schema:
                f.write(k + "\n")
        print(f"Schema mapped with {len(schema)} keys. Saved to backend/schema_map.txt")
        
        # specific check for user-requested fields
        print("\n--- CRITICAL DATA DISCOVERY ---")
        check_paths = ['props.pageProps', 'props.pageProps.dehydratedState', 'props.initialProps']
        for path in check_paths:
            parts = path.split('.')
            curr = data
            found = True
            for part in parts:
                if isinstance(curr, dict) and part in curr:
                    curr = curr[part]
                else:
                    found = False
                    break
            if found:
                print(f"[FOUND] {path} (Type: {type(curr)})")
                if isinstance(curr, dict):
                    print(f"   Keys: {list(curr.keys())[:10]}...")
            else:
                print(f"[MISSING] {path}")

    else:
        print("Failed to extract __NEXT_DATA__")
