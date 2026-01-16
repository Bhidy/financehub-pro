import tls_client
import json

def fuzz_insider():
    session = tls_client.Session(client_identifier="chrome_120")
    url = "https://www.mubasher.info/api/1/insider-trades"
    
    params_list = [
        {},
        {"start": 0, "size": 100},
        {"page": 0},
        {"year": 2025},
        {"country": "sa"},
        {"market": "TDWL"}
    ]
    
    for p in params_list:
        try:
            resp = session.get(url, params=p).json()
            rows = resp.get('rows', [])
            print(f"Params {p}: {len(rows)} rows. Pages: {resp.get('numberOfPages')}")
            if rows:
                print(f"Sample: {rows[0]['updatedAt']} - {rows[0]['name']}")
        except Exception as e:
            print(f"Error {p}: {e}")

if __name__ == "__main__":
    fuzz_insider()
