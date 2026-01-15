
import asyncio
from playwright.async_api import async_playwright

async def inspect_tabs():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False) # Visible for auth if needed, but quick check might work
        page = await browser.new_page()
        
        # Go to a known fund
        url = "https://www.decypha.com/en/fund-profile/EG/DFNMF/EGYAFMDHB"
        print(f"Navigating to {url}")
        await page.goto(url)
        await page.wait_for_timeout(3000)
        
        # Get all tab links
        tabs = await page.query_selector_all('.nav-tabs li a')
        print(f"Found {len(tabs)} tabs:")
        for tab in tabs:
            text = await tab.inner_text()
            href = await tab.get_attribute('href')
            print(f" - {text}: {href}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_tabs())
