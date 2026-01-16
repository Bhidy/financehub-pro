import tls_client

def probe_corp():
    session = tls_client.Session(client_identifier="chrome_120")
    
    # Check Corporate Actions
    url = "https://www.mubasher.info/api/1/corporate-actions"
    resp = session.get(url, params={"start":0, "size":100}).json()
    print(f"Corp Actions: {len(resp['rows'])} rows.")
    for r in resp['rows'][:3]:
        print(f" - {r['type']} | {r['name']} | {r['announcedAt']}")

    # Check Insider HTML
    url_html = "https://www.mubasher.info/countries/sa/market/insider-trades"
    resp_html = session.get(url_html)
    print(f"HTML Insider Page: {resp_html.status_code}")
    if "أسلاك" in resp_html.text:
        print("✅ Found data in HTML")

if __name__ == "__main__":
    probe_corp()
