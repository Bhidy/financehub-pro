import requests
import tls_client

session = tls_client.Session(
    client_identifier="chrome_120",
    random_tls_extension_order=True
)

url = "https://www.mubasher.info/countries/SA/funds/2045" # Riyad American Equity Fund

print(f"Fetching {url}...")
resp = session.get(url, headers={
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.google.com/"
})

if resp.status_code == 200:
    with open("backend/fund_raw.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
    print("Saved to backend/fund_raw.html")
else:
    print(f"Error: {resp.status_code}")
