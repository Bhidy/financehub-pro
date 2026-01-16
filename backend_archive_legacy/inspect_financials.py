import tls_client

session = tls_client.Session(client_identifier="chrome_120")
url = "https://www.mubasher.info/markets/TDWL/stocks/2222/financial-statements"

resp = session.get(url, headers={
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})

with open("backend/financials_raw.html", "w") as f:
    f.write(resp.text)

print("Saved raw HTML to backend/financials_raw.html")
