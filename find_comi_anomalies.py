import requests
import re

def test():
    symbol = 'COMI'
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}/history/"
    print(f"Scraping {url}...")
    resp = requests.get(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    if resp.status_code != 200:
        print("Failed to fetch page")
        return
    
    tbody_start = resp.text.find('<tbody>')
    tbody_end = resp.text.find('</tbody>')
    if tbody_start == -1 or tbody_end == -1:
        print("Tbody not found")
        return
        
    tbody_html = resp.text[tbody_start:tbody_end]
    rows_html = re.findall(r'<tr[^>]*>(.*?)</tr>', tbody_html, re.DOTALL)
    print("Total rows extracted:", len(rows_html))
    
    for row in rows_html[:100]:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if len(cells) >= 6:
            def clean(s):
                s = re.sub(r'<!--.*?-->', '', s)
                s = re.sub(r'<[^>]*>', '', s)
                return s.strip()
            
            date = clean(cells[0])
            open_p = clean(cells[1])
            high_p = clean(cells[2])
            low_p = clean(cells[3])
            close_p = clean(cells[4])
            print(f"Date: {date}, O: {open_p}, H: {high_p}, L: {low_p}, C: {close_p}")

if __name__ == '__main__':
    test()
