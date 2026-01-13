import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Click on 'Company Profile' menu to go to company profile section.
        frame = context.pages[-1]
        # Click on 'Company Profile' menu to navigate to company profile section
        elem = frame.locator('xpath=html/body/aside/nav/a[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on the 'Financials' tab to verify financial statements are loaded and displayed correctly.
        frame = context.pages[-1]
        # Click on 'Financials' tab to view financial statements
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[2]/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on the 'Overview' tab to check for detailed stock information and historical charts.
        frame = context.pages[-1]
        # Click on 'Overview' tab to view detailed stock information and historical charts
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on the '1D' button (index 22) to load the 1-day intraday chart and verify if the chart displays 1-minute bars and accurate data.
        frame = context.pages[-1]
        # Click on '1D' button to load 1-day intraday chart with 1-minute bars
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[2]/div[3]/div/div/div[3]/div/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Check the 'Ownership' tab to verify additional relevant data is present and accurate.
        frame = context.pages[-1]
        # Click on 'Ownership' tab to verify additional relevant data
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[2]/div[2]/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on the 'Analysts' tab to verify analyst ratings and related data are present and accurate.
        frame = context.pages[-1]
        # Click on 'Analysts' tab to verify analyst ratings and related data
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[2]/div[2]/button[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Saudi Arabian Oil Co.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=23.44 SAR').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=+0.03 (0.13%)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Energy').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=TADAWUL').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=buy').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Yahoo Finance Consensus').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=28.52').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Market Breadth').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Advancing').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=33').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Declining').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=16').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Unchanged').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=توزيع أرباح نقدية').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2025-11-18').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2025-08-20').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2025-05-22').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2025-03-18').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    