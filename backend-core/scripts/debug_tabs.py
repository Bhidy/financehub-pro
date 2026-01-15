
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
            await page.wait_for_timeout(2000)
            
            # Find all links in the main content area or nav tabs
            links = await page.evaluate('''() => {
                const anchors = Array.from(document.querySelectorAll('a'));
                return anchors
                    .filter(a => a.href.includes('/en/fund-'))
                    .map(a => ({text: a.innerText, href: a.href}));
            }''')
            
            print("\nFound Fund Links:")
            for link in links:
                print(f" - [{link['text']}]({link['href']})")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
