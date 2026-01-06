
import json
from bs4 import BeautifulSoup
import re

try:
    with open('debug_response.json', 'r') as f:
        data = json.load(f)
        html = data.get('html', '')
        
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Search for "EGP"
    print("--- Searching for EGP ---")
    egp_elements = soup.find_all(string=re.compile("EGP"))
    for el in egp_elements:
        print(f"Found EGP in {el.parent.name}: '{el.strip()}' class={el.parent.get('class')}")
        
    # 2. Search for "103"
    print("\n--- Searching for 103 ---")
    price_elements = soup.find_all(string=re.compile("103"))
    for el in price_elements:
        print(f"Found 103 in {el.parent.name}: '{el.strip()}' class={el.parent.get('class')}")

    # 3. Search for "Last Price"
    print("\n--- Searching for 'Last Price' ---")
    lp_elements = soup.find_all(string=re.compile("Last Price"))
    for el in lp_elements:
        print(f"Found Last Price in {el.parent.name}: '{el.strip()}' parent class={el.parent.get('class')}")
        # Print next sibling or parent's next sibling
        try:
            print(f"  Parent content: {el.parent.parent.get_text()[:100]}")
        except: pass

    # 4. Print all "market-value" classes (common in finance sites)
    print("\n--- Market Value Classes ---")
    for div in soup.find_all(class_=re.compile("price|value|last", re.I)):
        print(f"Found price-like class: {div.get_text()} class={div.get('class')}")


except Exception as e:
    print(f"Error: {e}")
