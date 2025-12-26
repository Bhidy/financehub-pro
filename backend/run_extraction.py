import asyncio
import logging
import os
from extractors.ohlc import OHLCExtractor
import pandas as pd

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Output Directory
OUTPUT_DIR = "data/ohlc"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Target Tickers (Sample Set - In real usage this comes from the Ticker API)
TARGETS = [
    "1010", # Riyad Bank
    "1120", # Al Rajhi
    "2222", # Aramco
    "2010", # SABIC
    "1180", # SNB
]

async def run_jobs():
    logger.info("Starting Batch Extraction Job...")
    extractor = OHLCExtractor()
    
    total = len(TARGETS)
    success = 0
    
    for i, ticker in enumerate(TARGETS):
        logger.info(f"[{i+1}/{total}] Processing {ticker}...")
        df = await extractor.extract(ticker, period="max")
        
        if not df.empty:
            # Save to Parquet for efficiency, or CSV for readability
            output_path = f"{OUTPUT_DIR}/{ticker}.csv"
            df.to_csv(output_path, index=False)
            logger.info(f"Saved {len(df)} rows to {output_path}")
            success += 1
        else:
            logger.error(f"Failed to extract {ticker}")
            
        # Polite delay between requests even with bypass
        await asyncio.sleep(1)

    logger.info(f"Job Complete. Success: {success}/{total}")

if __name__ == "__main__":
    asyncio.run(run_jobs())
