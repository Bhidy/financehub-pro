import asyncio
import aiohttp
import json
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "https://www.mubasher.info"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.mubasher.info/",
}

async def fetch_page(session, url):
    try:
        async with session.get(url, headers=HEADERS) as response:
            if response.status == 200:
                return await response.text()
            else:
                logger.error(f"Failed to fetch {url}: Status {response.status}")
                return None
    except Exception as e:
        logger.error(f"Error fetching {url}: {e}")
        return None

async def extract_next_data(html_content):
    if not html_content:
        return None
    
    soup = BeautifulSoup(html_content, 'html.parser')
    script_tag = soup.find('script', id='__NEXT_DATA__')
    
    if script_tag:
        try:
            data = json.loads(script_tag.string)
            logger.info("Successfully extracted __NEXT_DATA__")
            return data
        except json.JSONDecodeError:
            logger.error("Failed to decode JSON from __NEXT_DATA__")
    else:
        logger.warning("__NEXT_DATA__ script tag not found")
    return None

async def check_api_endpoint(session, endpoint):
    url = urljoin(BASE_URL, endpoint)
    try:
        # Note: Some APIs might require specific query params or auth tokens found in NEXT_DATA
        async with session.get(url, headers=HEADERS) as response:
            logger.info(f"Endpoint Check: {endpoint} -> {response.status}")
            if response.status == 200:
                # Try to peek at content to see if it's valid JSON
                try:
                    data = await response.json()
                    return {'endpoint': endpoint, 'status': response.status, 'valid_json': True}
                except:
                    return {'endpoint': endpoint, 'status': response.status, 'valid_json': False}
            return {'endpoint': endpoint, 'status': response.status, 'valid_json': False}
    except Exception as e:
        logger.error(f"Error checking endpoint {endpoint}: {e}")
        return {'endpoint': endpoint, 'status': 'error', 'error': str(e)}

async def main():
    async with aiohttp.ClientSession() as session:
        # 1. Fetch Home Page and extract Hydration Data
        logger.info("Starting Reconnaissance on Base URL...")
        html = await fetch_page(session, BASE_URL)
        next_data = await extract_next_data(html)
        
        if next_data:
            with open('backend/next_data_dump.json', 'w') as f:
                json.dump(next_data, f, indent=2)
            logger.info("Saved hydration data to backend/next_data_dump.json")

            # Analyze build ID if present (useful for constructing implementation-specific asset URLs)
            build_id = next_data.get('buildId')
            logger.info(f"Detected Build ID: {build_id}")

        # 2. Enumerate Known/Suspected Endpoints
        # The user provided a list of interesting endpoints. Let's verify them.
        endpoints_to_check = [
            "/api/v1/market/tickers",
            # We need a valid symbol to test these properly. 
            # Often '1010' or similar is a safe bet for KSA, or we try to find one from next_data if possible.
            # For now, we'll try a generic one if we can't find one.
        ]
        
        results = []
        for ep in endpoints_to_check:
            res = await check_api_endpoint(session, ep)
            results.append(res)
            
        with open('backend/api_map.json', 'w') as f:
            json.dump(results, f, indent=2)
        logger.info("Saved API map to backend/api_map.json")

if __name__ == "__main__":
    asyncio.run(main())
