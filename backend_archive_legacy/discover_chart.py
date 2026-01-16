"""
CHART DATA DISCOVERY
Target: Single Fund Page to find History API
"""

import asyncio
from playwright.async_api import async_playwright
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

async def intercept_chart():
    api_calls = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            # Add headers?
        )
        page = await context.new_page()
        
        async def handle_request(request):
            url = request.url
            if any(x in url for x in ['google', 'facebook', 'tracker']):
                return
            
            # Capture everything that looks like data
            if request.resource_type in ['xhr', 'fetch', 'script']:
                logger.info(f"REQ: {url}")
                if '2049' in url or 'history' in url or 'chart' in url:
                    logger.info(f"🔥 POTENTIAL HIT: {url}")
                    api_calls.append({
                        'url': url,
                        'method': request.method,
                        'headers': request.headers
                    })
        
        page.on("request", handle_request)
        
        target = "https://www.mubasher.info/countries/sa/funds/2049"
        logger.info(f"Navigating to {target}")
        
        try:
            await page.goto(target, timeout=60000)
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(5000)
            
        except Exception as e:
            logger.error(f"Error: {e}")
            
        await browser.close()
        
    return api_calls

if __name__ == "__main__":
    apis = asyncio.run(intercept_chart())
    with open("backend/chart_apis.json", "w") as f:
        json.dump(apis, f, indent=2)
