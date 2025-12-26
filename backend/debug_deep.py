from playwright.sync_api import sync_playwright
import json
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = context.new_page()

    # Log all requests
    page.on("response", lambda response: print(f"Response: {response.status} {response.url}"))

    print("Navigating to ROOT...")
    try:
        page.goto("https://www.mubasher.info/", timeout=60000)
        page.wait_for_timeout(5000)
        
        # Screenshot root
        page.screenshot(path="backend/debug_root.png")
        print("Screenshot saved to backend/debug_root.png")

        # Find ALL links
        links = page.evaluate("""() => {
            return Array.from(document.querySelectorAll('a')).map(a => ({text: a.innerText, href: a.href}))
        }""")
        
        print(f"Found {len(links)} total links.")
        with open("backend/found_links.txt", "w") as f:
            for link in links:
                f.write(f"{link['text']} -> {link['href']}\n")
        
        for link in links[:20]: # Print top 20
            print(f"Link: {link['text']} -> {link['href']}")
            
        # Try to find a link with 'companies' or 'stocks'
        stock_links = [l for l in links if 'companies' in l['href'] or 'stocks' in l['href']]
        if stock_links:
             target = stock_links[0]['href']
             print(f"Follow up target: {target}")
             page.goto(target, timeout=60000)
             page.wait_for_timeout(5000)
            
             page.screenshot(path="backend/debug_profile.png")
            
             # Try to get NEXT DATA
             try:
                next_data = page.evaluate('() => document.getElementById("__NEXT_DATA__").innerText')
                print("FOUND __NEXT_DATA__!")
                with open("backend/deep_next_data.json", "w") as f:
                    f.write(next_data)
             except:
                print("Could not find __NEXT_DATA__ in DOM")
            
    except Exception as e:
        print(f"Error: {e}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
