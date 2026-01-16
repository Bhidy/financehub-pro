import tls_client
import json
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WAF_TEST")

def test_bypass():
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )

    endpoints = [
        "https://www.mubasher.info/api/1/market/tickers",
        "https://www.mubasher.info/api/v1/market/tickers",
        "https://www.mubasher.info/api/1/stocks/1010/history?period=max", # Specific stock
        "https://www.mubasher.info/api/1/service/market-summary" # Public data
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.mubasher.info/countries/sa/stocks",
        "Origin": "https://www.mubasher.info",
        "Accept-Language": "en-US,en;q=0.9"
    }

    for url in endpoints:
        logger.info(f"Testing {url} ...")
        
        try:
            response = session.get(url, headers=headers)
            logger.info(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                logger.info(f"SUCCESS! {url}")
                try:
                    data = response.json()
                    logger.info(f"Data Sample: {str(data)[:200]}")
                    return True # Stop on first success for now
                except:
                    logger.warning("Not valid JSON")
            else:
                logger.warn(f"Failed. Status: {response.status_code}")
                
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"Exception: {e}")

    return False

if __name__ == "__main__":
    test_bypass()
