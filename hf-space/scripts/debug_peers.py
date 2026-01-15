
import asyncio
import os
from playwright.async_api import async_playwright
from scrape_egypt_playwright import login_to_decypha, BASE_URL

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        if await login_to_decypha(page, context):
            # Go directly to the peers page
            url = f"{BASE_URL}/en/peer-funds/EG/DFNMF/EGYAFMDHB"
            print(f"Navigating to {url}")
            await page.goto(url)
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(3000)
            
            print(f"Current URL: {page.url}")
            
            # Save HTML for analysis
            content = await page.content()
            with open("peers_debug.html", "w") as f:
                f.write(content)
            print("Saved peers_debug.html")
            
            # Inspect all tables
            tables = await page.query_selector_all('table')
            print(f"Found {len(tables)} tables")
            
            for i, table in enumerate(tables):
                print(f"\n--- Table {i+1} ---")
                
                # Get headers
                headers = await table.query_selector_all('th')
                header_texts = []
                for h in headers:
                    txt = await h.inner_text()
                    header_texts.append(txt.strip())
                print(f"Headers: {header_texts}")
                
                # Get rows
                rows = await table.query_selector_all('tr')
                print(f"Row count: {len(rows)}")
                
                # Show first few data rows
                for j, row in enumerate(rows[1:4]):  # First 3 data rows
                    cols = await row.query_selector_all('td')
                    col_texts = []
                    for c in cols:
                        txt = await c.inner_text()
                        col_texts.append(txt.strip()[:30])  # Truncate
                    print(f"  Row {j+1}: {col_texts}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
