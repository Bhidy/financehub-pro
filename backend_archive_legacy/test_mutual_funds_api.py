import tls_client
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FundProber")

def probe_fund_history(fund_id):
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.mubasher.info/",
        "Accept": "application/json"
    }

    endpoints = [
        f"https://www.mubasher.info/api/1/funds/{fund_id}/chart",
        f"https://www.mubasher.info/api/1/funds/{fund_id}/chart/1y",
        f"https://www.mubasher.info/api/1/funds/{fund_id}/performance",
        f"https://www.mubasher.info/api/1/funds/{fund_id}/historical-data",
        f"https://www.mubasher.info/api/1/funds/{fund_id}", # Retrying
    ]

    for url in endpoints:
        logger.info(f"Probing {url}...")
        try:
            resp = session.get(url, headers=headers)
            logger.info(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                logger.info("✅ SUCCESS!")
                return
            else:
                logger.info("❌ Failed")
        except Exception as e:
            logger.error(e)
        
        time.sleep(1)

if __name__ == "__main__":
    probe_fund_history(2049)
