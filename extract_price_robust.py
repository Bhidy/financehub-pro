
from bs4 import BeautifulSoup
import re
import sys

def extract_price(html_file):
    with open(html_file, 'r') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')
    
    print("--- Strategy 1: text-4xl ---")
    div = soup.find('div', class_=lambda c: c and 'text-4xl' in c)
    if div:
        print(f"Found via text-4xl: {div.get_text().strip()}")
    else:
        print("text-4xl NOT FOUND")

    print("\n--- Strategy 2: 'EGP' proximity ---")
    # specific to EGX
    egp = soup.find(string=re.compile("EGP"))
    if egp:
        parent = egp.parent
        print(f"Found 'EGP' in {parent.name} class={parent.get('class')}")
        print(f"Parent text: {parent.get_text()}")
        # Check parents
        print(f"Grandparent text: {parent.parent.get_text()[:100]}")

    print("\n--- Strategy 3: Big bold numbers ---")
    # Look for any number > 10 in a bold tag
    bolds = soup.find_all(class_=re.compile("bold|font-black|font-semibold"))
    for b in bolds:
        text = b.get_text().strip()
        if re.match(r'^\d+\.\d+$', text):
            val = float(text)
            if val > 10 and val < 500: # rough range for stocks
                print(f"Candidate: {text} in {b.name} class={b.get('class')}")

if __name__ == "__main__":
    extract_price('debug_page.html')
