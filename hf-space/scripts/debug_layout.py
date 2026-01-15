
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
            # Go to profile
            url = f"{BASE_URL}/en/fund-profile/EG/DFNMF/EGYAFMDHB"
            print(f"Navigating to {url}")
            await page.goto(url)
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(3000)
            
            print(f"Current URL: {page.url}")
            print(f"Page Title: {await page.title()}")
            
            print(f"Current URL: {page.url}")
            print(f"Page Title: {await page.title()}")
            
            print("\n--- Relevant Links ---")
            elements = await page.evaluate('''() => {
                return Array.from(document.querySelectorAll('a, li, button, div')).map(e => ({
                    tag: e.tagName,
                    text: e.innerText.trim(),
                    href: e.href || '',
                    class: e.className
                })).filter(e => e.text.length > 0)
            }''')
            
            keywords = ['Profile', 'Performance', 'Ratios', 'News', 'Disclosures', 'Report', 'Fact Sheet', 'Documents']
            for e in elements:
                if any(k in e['text'] for k in keywords):
                    print(f"{e['tag']} [{e['text']}] ({e['class']}) -> {e['href']}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
