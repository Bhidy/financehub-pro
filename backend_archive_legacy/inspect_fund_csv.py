import requests
import tls_client

session = tls_client.Session(
    client_identifier="chrome_120",
    random_tls_extension_order=True
)

fid = "2049"
url = f"https://static.mubasher.info/File.MubasherCharts/File.Mutual_Fund_Charts_Dir/priceChartFund_{fid}.csv"

print(f"Fetching {url}...")
resp = session.get(url, headers={
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.mubasher.info/",
    "Origin": "https://www.mubasher.info"
})

if resp.status_code == 200:
    print("Success!")
    print(resp.text[:500]) # Print first 500 chars
else:
    print(f"Error: {resp.status_code}")
