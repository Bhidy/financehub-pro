import pandas as pd
import logging
import tls_client
import json
import asyncio

logger = logging.getLogger(__name__)

class OHLCExtractor:
    def __init__(self, engine=None):
        # engine is unused in this direct implementation for now, 
        # but kept for signature compatibility if we expand.
        self.session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        self.base_endpoint = "https://www.mubasher.info/api/1/stocks/{symbol}/history"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.mubasher.info/countries/sa/stocks",
        }

    async def extract(self, symbol, period="max"):
        url = self.base_endpoint.format(symbol=symbol) + f"?period={period}"
        
        # tls_client is blocking, so we run it in a thread to not block the async loop
        loop = asyncio.get_event_loop()
        try:
            response = await loop.run_in_executor(None, self._fetch, url)
            
            if response.status_code == 200:
                raw_data = response.json()
                
                # Mubasher API typically returns { "data": [...] } or sometimes just [...]
                # We need to handle both
                points = raw_data.get('data', []) if isinstance(raw_data, dict) else raw_data
                
                if isinstance(points, list):
                    # Add symbol to each row for identification
                    for point in points:
                        point['symbol'] = symbol
                    
                    df = pd.DataFrame(points)
                    logger.info(f"Extracted {len(df)} rows for {symbol}")
                    return df
                else:
                    logger.warning(f"Unexpected data format for {symbol}")
            else:
                logger.error(f"Failed to fetch OHLC for {symbol}: Status {response.status_code}")
                
        except Exception as e:
            logger.error(f"Exception fetching {symbol}: {e}")
            
        return pd.DataFrame()

    def _fetch(self, url):
        return self.session.get(url, headers=self.headers)
