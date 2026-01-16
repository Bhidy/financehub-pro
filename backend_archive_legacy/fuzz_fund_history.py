import tls_client
import logging

def fuzz_params():
    session = tls_client.Session(client_identifier="chrome_120")
    base_url = "https://www.mubasher.info/api/1/funds/2049/history"
    
    params = [
        {},
        {"period": "1y"},
        {"range": "1y"},
        {"type": "line"},
        {"from": "2024-01-01", "to": "2025-01-01"},
        {"limit": "100"},
        {"interval": "1d"}
    ]
    
    # Also try variations of URL
    urls = [
        "https://www.mubasher.info/api/1/funds/2049/history",
        "https://www.mubasher.info/api/1/funds/2049/performance",
        "https://www.mubasher.info/api/1/funds/2049/chart",
    ]
    
    for url in urls:
        print(f"--- Fuzzing {url} ---")
        for p in params:
            try:
                resp = session.get(url, params=p)
                print(f"Params: {p} => Code: {resp.status_code}")
                if resp.status_code == 200:
                    print("SUCCESS!!!!!!")
                    print(resp.text[:200])
                    return
            except:
                pass

if __name__ == "__main__":
    fuzz_params()
