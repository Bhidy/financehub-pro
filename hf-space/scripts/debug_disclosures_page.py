
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
            # Go to profile first
            url = f"{BASE_URL}/en/fund-profile/EG/DFNMF/EGYAFMDHB"
            print(f"Navigating to {url}")
            await page.goto(url)
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(2000)
            
            # Click Disclosures tab
            print("Clicking Disclosures link...")
            # Try specific selectors found in debug_layout
            # A [Disclosures] () -> https://www.decypha.com/en/disclosures/fund/EG/DFNMF/EGYAFMDHB/*
            # It might be in the side nav
            
            link = await page.query_selector('div.side-nav-container a:has-text("Disclosures")')
            if not link:
                print("Side nav link not found, trying generic...")
                link = await page.query_selector('a:has-text("Disclosures")')
                
            if link:
                href = await link.get_attribute('href')
                print(f"Found link href: {href}")
                await link.click()
                await page.wait_for_load_state('networkidle')
                await page.wait_for_timeout(3000)
            else:
                print("❌ Disclosures link NOT found")
            
            print(f"Current URL: {page.url}")
            print(f"Page Title: {await page.title()}")
            
            print("\n--- Links & Table Rows ---")
            elements = await page.evaluate('''() => {
                const rows = Array.from(document.querySelectorAll('tr'));
                const links = Array.from(document.querySelectorAll('a'));
                
                return {
                    rows: rows.map(r => r.innerText.replace(/\\n/g, ' | ')),
                    links: links.map(a => ({text: a.innerText, href: a.href})).filter(l => l.href.includes('.pdf') || l.text.includes('Report'))
                }
            }''')
            
            print("--- ROWS ---")
            for r in elements['rows'][:20]:
                print(f"ROW: {r}")
                
            print("\n--- PDF/Report LINKS ---")
            for l in elements['links']:
                print(f"LINK: [{l['text']}] -> {l['href']}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
