from playwright.sync_api import sync_playwright
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = context.new_page()

    # Store found APIs
    found_apis = []

    def handle_response(response):
        if "api" in response.url and response.status == 200:
            try:
                # We only care about JSON responses
                if "application/json" in response.headers.get("content-type", ""):
                    print(f"DTO [200]: {response.url}")
                    found_apis.append({
                        "url": response.url,
                        "headers": response.request.headers
                    })
            except:
                pass

    page.on("response", handle_response)

    print("Navigating to Mubasher...")
    try:
        page.goto("https://www.mubasher.info/countries/sa/stocks", timeout=60000)
        page.wait_for_timeout(10000) # Wait for hydration
    except Exception as e:
        print(f"Navigation Error: {e}")

    print(f"Found {len(found_apis)} API calls.")
    
    if found_apis:
        print("--- Sample Header Signature ---")
        # Print headers of the first API call to see what we are missing
        print(json.dumps(found_apis[0]['headers'], indent=2))
        
        # Save all found to file
        with open("backend/valid_apis.json", "w") as f:
            json.dump(found_apis, f, indent=2)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
