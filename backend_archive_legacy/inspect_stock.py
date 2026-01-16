from bs4 import BeautifulSoup

def inspect():
    try:
        with open("stock_7200.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Print title
        print(f"Title: {soup.title.string if soup.title else 'No Title'}")
        
        # Print first 500 chars of text
        text = soup.get_text(separator=' ', strip=True)
        print(f"Text Preview: {text[:500]}")
        
        # Check scripts
        print("\\n--- SCRIPTS ---")
        for s in soup.find_all('script'):
            if s.string:
                content = s.string.strip()
                if len(content) > 50:
                    print(f"Script (len={len(content)}): {content[:100]}...")
                    if "price" in content or "open" in content:
                        print("  >> FOUND KEYWORD IN SCRIPT")
        print("--- END SCRIPTS ---")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
