import requests

def test():
    symbol = 'COMI'
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}/history/"
    print(f"Scraping {url}...")
    resp = requests.get(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    print(f"Status: {resp.status_code}")
    if resp.status_code != 200:
        return
    
    print("Page length:", len(resp.text))
    idx = resp.text.find('<table')
    if idx == -1:
        print("No table tag found")
        return
    
    print("Table found at index:", idx)
    table_html = resp.text[idx:idx+10000]
    print(table_html[:2000])

if __name__ == '__main__':
    test()
