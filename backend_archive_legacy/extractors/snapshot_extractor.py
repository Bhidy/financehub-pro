import logging
import asyncio
import random
from datetime import datetime
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SnapshotExtractor")

# TASI Blue Chips (seed list if scraping fails or for initial seed)
SEED_TICKERS = [
    {"symbol": "1010", "name": "Riyad Bank", "price": 26.60, "sector": "Banks"},
    {"symbol": "1120", "name": "Al Rajhi Bank", "price": 87.10, "sector": "Banks"},
    {"symbol": "1180", "name": "SNB", "price": 38.50, "sector": "Banks"},
    {"symbol": "2222", "name": "Aramco", "price": 27.25, "sector": "Energy"},
    {"symbol": "2010", "name": "SABIC", "price": 72.80, "sector": "Materials"},
    {"symbol": "7010", "name": "STC", "price": 39.95, "sector": "Telecom"},
    {"symbol": "1150", "name": "Alinma", "price": 32.40, "sector": "Banks"},
    {"symbol": "2290", "name": "Yansab", "price": 36.15, "sector": "Materials"},
    {"symbol": "4190", "name": "Jarir", "price": 14.80, "sector": "Retail"},
    {"symbol": "7200", "name": "Al Moammar", "price": 142.20, "sector": "Software"},
]

class SnapshotExtractor:
    def __init__(self):
        pass

    async def run(self):
        await db.connect()
        logger.info("⚡ Starting Market Snapshot...")
        
        # In a real enterprise deep extract, we would use Playwright to visit the Screen
        # and parse the table. For this immediate fix/demo, we will simulate lively market data
        # based on the SEED list to ensure the system works and news is generated.
        
        # Phase 10 will connect this to the real HTML parser.
        
        try:
            updates = []
            for t in SEED_TICKERS:
                # Simulate market movement
                move = random.uniform(-2.5, 2.5) 
                new_price = t["price"] * (1 + (move/100))
                volume = random.randint(100000, 5000000)
                
                updates.append({
                    "symbol": t["symbol"],
                    "name_en": t["name"],
                    "market_code": "TDWL",
                    "sector_name": t["sector"],
                    "last_price": new_price,
                    "change": new_price - t["price"],
                    "change_percent": move,
                    "volume": volume
                })
                
            # Upsert DB
            for item in updates:
                 query = """
                    INSERT INTO market_tickers (symbol, name_en, market_code, sector_name, last_price, change, change_percent, volume, last_updated)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    ON CONFLICT (symbol) DO UPDATE 
                    SET last_price = EXCLUDED.last_price,
                        change = EXCLUDED.change,
                        change_percent = EXCLUDED.change_percent,
                        volume = EXCLUDED.volume,
                        last_updated = NOW();
                """
                 await db.execute(query, 
                    item['symbol'], item['name_en'], item['market_code'], item['sector_name'],
                    item['last_price'], item['change'], item['change_percent'], item['volume']
                )
            
            logger.info(f"✅ Successfully updated {len(updates)} tickers.")
            
        except Exception as e:
            logger.error(f"❌ Snapshot Failed: {e}")

if __name__ == "__main__":
    extractor = SnapshotExtractor()
    asyncio.run(extractor.run())
