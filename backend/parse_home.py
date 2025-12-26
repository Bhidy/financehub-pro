from bs4 import BeautifulSoup
import json
import re

def parse():
    try:
        with open("stock_7200.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. Search for __NEXT_DATA__
        script = soup.find("script", id="__NEXT_DATA__")
        if script:
            print("FOUND __NEXT_DATA__")
            data = json.loads(script.string)
            # Save it
            with open("backend/home_next_data.json", "w") as f:
                json.dump(data, f, indent=2)
            
            # Print keys
            print(f"Build ID: {data.get('buildId')}")
            print(f"Props: {list(data.get('props', {}).keys())}")
        else:
            print("NO __NEXT_DATA__ found")
            
        # 2. Extract Links
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/stocks/' in href or '/companies/' in href:
                links.append(href)
                
        print(f"Found {len(links)} potential stock links")
        for l in links[:10]:
            print(f"Link: {l}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse()
