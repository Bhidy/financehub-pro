
import asyncio
import logging
import tls_client
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PHDC_Debug")

class DebugClient:
    def __init__(self):
        self.session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        }

    def get_screener_data(self):
        logger.info("Fetching from Screener API...")
        # Exact URL from market_loader.py
        url = (f"https://stockanalysis.com/api/screener/a/f?"
               f"m=marketCap&s=desc&"
               f"c=s,n,marketCap,price,change,volume,revenue,netIncome,peRatio,dividendYield,sector&"
               f"f=exchangeCode-is-EGX,subtype-is-stock&i=symbols")
        try:
            resp = self.session.get(url, headers=self.headers)
            data = resp.json()
            for row in data['data']['data']:
                if 'PHDC' in row.get('s', ''):
                    return row
        except Exception as e:
            logger.error(f"Screener Error: {e}")
        return None

    def get_quote_page(self):
        logger.info("Fetching from Quote Page HTML...")
        url = "https://stockanalysis.com/quote/egx/PHDC"
        try:
            resp = self.session.get(url, headers=self.headers)
            # Simple text parsing to find the price to avoid bs4 dependency if not needed, or verify raw html
            html = resp.text
            # Look for price in meta tags or specific classes
            # <div class="text-4xl font-bold inline-block">8.44</div>
            if '8.44' in html:
                logger.info("Found 8.44 in HTML")
            elif '8.40' in html:
                logger.info("Found 8.40 in HTML")
            
            return html[:500] # Return snippet
        except Exception as e:
            logger.error(f"Quote Error: {e}")
        return None

def main():
    client = DebugClient()
    
    # 1. API
    screener_data = client.get_screener_data()
    print(f"\n--- Screener API Data for PHDC ---")
    print(json.dumps(screener_data, indent=2))
    
    # 2. Page
    client.get_quote_page()

if __name__ == "__main__":
    main()
