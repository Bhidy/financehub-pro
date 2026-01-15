
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
            url = f"{BASE_URL}/en/fund-profile/EG/DFNMF/EGYAFMDHB"
            print(f"Navigating to {url}")
            await page.goto(url)
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(5000) # Wait longer
            
            content = await page.content()
            with open("fund_profile_dump.html", "w") as f:
                f.write(content)
            print("Saved fund_profile_dump.html")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
