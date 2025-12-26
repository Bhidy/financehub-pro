"""
Inspect mubasher.info page structure to find correct selectors
"""
import asyncio
from playwright.async_api import async_playwright

async def inspect_page():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Visible browser to see what happens
        page = await browser.new_page()
        
        print("Navigating to mubasher.info...")
        await page.goto("https://www.mubasher.info/countries/sa/stocks", timeout=60000)
        
        print("Waiting for page to load...")
        await page.wait_for_load_state("networkidle", timeout=60000)
        
        # Take screenshot
        await page.screenshot(path="mubasher_page.png")
        print("Screenshot saved: mubasher_page.png")
        
        # Get page content
        content = await page.content()
        with open("mubasher_page.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("Page HTML saved: mubasher_page.html")
        
        # Try to find stock data in various ways
        print("\nLooking for stock data...")
        
        # Check for API calls
        print("\nChecking network requests...")
        await page.wait_for_timeout(5000)  # Wait for any XHR calls
        
        # Try to execute JavaScript to get data
        data = await page.evaluate("""
            () => {
                // Look for stock data in window object
                const stocks = [];
                
                // Check if data is in global variables
                if (window.__INITIAL_STATE__) {
                    stocks.push({source: '__INITIAL_STATE__', data: window.__INITIAL_STATE__});
                }
                
                if (window.__NUXT__) {
                    stocks.push({source: '__NUXT__', data: window.__NUXT__});
                }
                
                // Look for Vue/React data
                const root = document.querySelector('#__nuxt') || document.querySelector('#app') || document.body;
                
                // Try to find stock rows
                const rows = document.querySelectorAll('[class*="stock"], [class*="ticker"], tr');
                stocks.push({source: 'row_count', count: rows.length});
                
                return stocks;
            }
        """)
        
        print("Data found:", data)
        
        print("\nPress Enter to close browser...")
        input()
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_page())
