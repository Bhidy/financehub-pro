import asyncio
import logging
import os
import sys
from dotenv import load_dotenv

# Add current directory to path so we can import from data_pipeline
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data_pipeline.stockanalysis_ingester import StockAnalysisScraper

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    logger.info("Starting Mass StockAnalysis Ingestion (100% Data Fidelity Mode)")
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL is not set")
        return

    scraper = StockAnalysisScraper(db_url)
    await scraper.connect()
    
    try:
        # Ingest all EGX stocks using the new robust Playwright engine
        # This will populate:
        # - income_statements
        # - balance_sheets
        # - cashflow_statements
        # - financial_ratios_history
        # With 100% of data (including sector-specific JSON blobs)
        
        result = await scraper.ingest_all_egx()
        
        logger.info("Ingestion Summary:")
        logger.info(f"Total Stocks Processed: {result['total_stocks']}")
        logger.info(f"Total Records Inserted: {result['totals']}")
        
        if result['errors']:
            logger.error(f"Errors encountered ({len(result['errors'])}):")
            for err in result['errors']:
                logger.error(f"  {err['symbol']}: {err['error']}")
                
    except Exception as e:
        logger.error(f"Fatal error during mass ingestion: {e}")
    finally:
        await scraper.close()
        logger.info("Ingestion session closed.")

if __name__ == "__main__":
    asyncio.run(main())
