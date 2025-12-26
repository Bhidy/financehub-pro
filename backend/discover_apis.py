"""
REAL DATA DISCOVERY TOOL v4
Target: Saudi Exchange (Tadawul) Official Site
"""

import asyncio
from playwright.async_api import async_playwright
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

async def intercept_tadawul():
    api_calls = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Mobile Viewport sometimes exposes simpler APIs
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            viewport={'width': 390, 'height': 844}
        )
        page = await context.new_page()
        
        async def handle_request(request):
            url = request.url
            if request.resource_type in ["fetch", "xhr"]:
                api_calls.append({
                    'method': request.method,
                    'url': url,
                    'headers': request.headers
                })
        
        page.on("request", handle_request)
        
        url = "https://www.saudiexchange.sa/wps/portal/tadawul/markets/funds"
        logger.info(f"Navigating to {url}...")
        
        try:
            await page.goto(url, timeout=60000)
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(5000)
            
            title = await page.title()
            logger.info(f"Page Title: {title}")
            
        except Exception as e:
            logger.error(f"Navigation failed: {e}")
            
        await browser.close()
        
    return api_calls

if __name__ == "__main__":
    apis = asyncio.run(intercept_tadawul())
    
    # Filter for interesting
    interesting = [x for x in apis if 'json' in x['url'] or 'api' in x['url'] or 'execute' in x['url']]
    
    unique_urls = sorted(list(set([call['url'] for call in interesting])))
    
    print("\n" + "="*80)
    print(f"DISCOVERED TADAWUL ENDPOINTS ({len(unique_urls)}):")
    print("="*80)
    for url in unique_urls:
        print(url)
