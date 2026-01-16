import tls_client
import logging

def probe_insider():
    session = tls_client.Session(client_identifier="chrome_120")
    base = "https://www.mubasher.info/api/1"
    
    endpoints = [
        "insider-trades",
        "insider-transactions",
        "insider-dealings",
        "directors-dealings",
        "directors-transactions",
        "corporate-actions",
        "market/insider-trades",
        "market/insider-transactions",
        "stock/insider",
        "stocks/insider",
        "events/insider",
        "announcements"
    ]
    
    for ep in endpoints:
        url = f"{base}/{ep}"
        try:
            resp = session.get(url)
            print(f"Probe {url}: {resp.status_code}")
            if resp.status_code == 200:
                print("✅ FOUND!")
                print(resp.text[:500])
        except Exception as e:
            print(f"Error {url}: {e}")

if __name__ == "__main__":
    probe_insider()
