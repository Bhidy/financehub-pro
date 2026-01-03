"""
EGX Production Data Loader - Enterprise Grade
==============================================
Features:
- Intelligent upsert with change tracking
- Incremental updates (only fetches new data)
- Rate limiting and retry logic
- Comprehensive logging
- Safe for concurrent execution
- pgbouncer compatible

Usage:
    # Full refresh (initial load or re-sync)
    python scripts/egx_production_loader.py --full
    
    # Daily update (prices only, fast)
    python scripts/egx_production_loader.py --daily
    
    # Single symbol update
    python scripts/egx_production_loader.py --symbol COMI
"""

import asyncio
import asyncpg
import os
import sys
import logging
import argparse
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from backend.extractors.stockanalysis.client import StockAnalysisClient

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/egx_production.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('EGXLoader')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")


class EGXProductionLoader:
    """
    Production-grade EGX data loader with intelligent updates.
    """
    
    def __init__(self):
        self.client = StockAnalysisClient(rate_limit_delay=1.0)
        self.conn: Optional[asyncpg.Connection] = None
        self.stats = {
            'tickers_updated': 0,
            'tickers_new': 0,
            'ohlc_new': 0,
            'ohlc_updated': 0,
            'errors': 0,
            'start_time': datetime.now()
        }
    
    async def connect(self):
        """Connect to database with pgbouncer compatibility"""
        logger.info("Connecting to production database...")
        self.conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
        logger.info("✅ Connected to production database")
    
    async def close(self):
        """Close database connection"""
        if self.conn:
            await self.conn.close()
            logger.info("Database connection closed")
    
    async def ensure_schema(self):
        """Ensure all required columns exist"""
        logger.info("Verifying schema...")
        
        # Add any missing columns
        columns_to_add = [
            ("market_tickers", "market_cap", "DECIMAL(18, 2)"),
            ("market_tickers", "pe_ratio", "DECIMAL(10, 4)"),
            ("market_tickers", "dividend_yield", "DECIMAL(8, 4)"),
            ("market_tickers", "revenue", "DECIMAL(18, 4)"),
            ("market_tickers", "net_income", "DECIMAL(18, 4)"),
            ("market_tickers", "industry", "TEXT"),
            ("ohlc_data", "adj_close", "DECIMAL(12, 4)"),
            ("ohlc_data", "change_percent", "DECIMAL(8, 4)"),
        ]
        
        for table, column, dtype in columns_to_add:
            try:
                await self.conn.execute(f"""
                    ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {dtype}
                """)
            except Exception:
                pass  # Column might already exist
        
        logger.info("✅ Schema verified")
    
    async def get_last_ohlc_date(self, symbol: str) -> Optional[date]:
        """Get the most recent OHLC date for a symbol"""
        result = await self.conn.fetchval("""
            SELECT MAX(date) FROM ohlc_data WHERE symbol = $1
        """, symbol)
        return result
    
    async def update_tickers(self) -> List[str]:
        """Fetch and upsert all EGX tickers, return list of symbols"""
        logger.info("Fetching EGX stock universe...")
        stocks = self.client.get_egx_stocks()
        
        if not stocks:
            logger.error("Failed to fetch stocks")
            return []
        
        logger.info(f"Processing {len(stocks)} tickers...")
        symbols = []
        
        for stock in stocks:
            try:
                # Check if symbol exists
                existing = await self.conn.fetchval(
                    "SELECT 1 FROM market_tickers WHERE symbol = $1",
                    stock['symbol']
                )
                
                await self.conn.execute("""
                    INSERT INTO market_tickers (
                        symbol, name_en, sector_name, market_code, currency,
                        market_cap, last_price, change_percent, volume,
                        pe_ratio, dividend_yield, revenue, net_income, last_updated
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                    ON CONFLICT (symbol) DO UPDATE SET
                        name_en = EXCLUDED.name_en,
                        sector_name = EXCLUDED.sector_name,
                        market_code = EXCLUDED.market_code,
                        market_cap = EXCLUDED.market_cap,
                        last_price = EXCLUDED.last_price,
                        change_percent = EXCLUDED.change_percent,
                        volume = EXCLUDED.volume,
                        pe_ratio = EXCLUDED.pe_ratio,
                        dividend_yield = EXCLUDED.dividend_yield,
                        revenue = EXCLUDED.revenue,
                        net_income = EXCLUDED.net_income,
                        last_updated = NOW()
                """,
                    stock['symbol'],
                    stock['name_en'],
                    stock.get('sector_name'),
                    stock['market_code'],
                    stock['currency'],
                    stock.get('market_cap'),
                    stock.get('last_price'),
                    stock.get('change_percent'),
                    int(stock.get('volume') or 0),
                    stock.get('pe_ratio'),
                    stock.get('dividend_yield'),
                    stock.get('revenue'),
                    stock.get('net_income')
                )
                
                if existing:
                    self.stats['tickers_updated'] += 1
                else:
                    self.stats['tickers_new'] += 1
                
                symbols.append(stock['symbol'])
                
            except Exception as e:
                logger.error(f"Error upserting {stock['symbol']}: {e}")
                self.stats['errors'] += 1
        
        logger.info(f"✅ Tickers: {self.stats['tickers_new']} new, {self.stats['tickers_updated']} updated")
        return symbols
    
    async def update_ohlc(self, symbol: str, full_refresh: bool = False) -> int:
        """Update OHLC data for a symbol. Returns count of new records."""
        try:
            # Get last date we have for this symbol
            last_date = await self.get_last_ohlc_date(symbol)
            
            # Fetch history from API
            history = self.client.get_stock_history(symbol)
            
            if not history:
                return 0
            
            new_count = 0
            updated_count = 0
            
            for record in history:
                try:
                    record_date = datetime.strptime(record['date'], '%Y-%m-%d').date() if isinstance(record['date'], str) else record['date']
                    
                    # Skip old records unless doing full refresh
                    if not full_refresh and last_date and record_date <= last_date:
                        continue
                    
                    # Check if record exists
                    existing = await self.conn.fetchval(
                        "SELECT 1 FROM ohlc_data WHERE symbol = $1 AND date = $2",
                        symbol, record_date
                    )
                    
                    await self.conn.execute("""
                        INSERT INTO ohlc_data (symbol, date, open, high, low, close, adj_close, volume, change_percent)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (symbol, date) DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            adj_close = EXCLUDED.adj_close,
                            volume = EXCLUDED.volume,
                            change_percent = EXCLUDED.change_percent
                    """,
                        symbol,
                        record_date,
                        record.get('open'),
                        record.get('high'),
                        record.get('low'),
                        record.get('close'),
                        record.get('adj_close'),
                        record.get('volume'),
                        record.get('change_percent')
                    )
                    
                    if existing:
                        updated_count += 1
                    else:
                        new_count += 1
                    
                except Exception as e:
                    self.stats['errors'] += 1
            
            self.stats['ohlc_new'] += new_count
            self.stats['ohlc_updated'] += updated_count
            
            return new_count + updated_count
            
        except Exception as e:
            logger.error(f"Error fetching OHLC for {symbol}: {e}")
            self.stats['errors'] += 1
            return 0
    
    async def run_full_sync(self):
        """Full sync - update all tickers and OHLC data"""
        logger.info("=" * 60)
        logger.info("🚀 EGX FULL SYNC STARTED")
        logger.info("=" * 60)
        
        await self.connect()
        await self.ensure_schema()
        
        # Update all tickers
        symbols = await self.update_tickers()
        
        # Update OHLC for all symbols
        total = len(symbols)
        for i, symbol in enumerate(symbols, 1):
            count = await self.update_ohlc(symbol, full_refresh=True)
            if count > 0 or i % 20 == 0:
                logger.info(f"[{i}/{total}] {symbol}: {count} records")
        
        await self.close()
        self._print_summary()
    
    async def run_daily_update(self):
        """Daily update - only fetch new data since last update"""
        logger.info("=" * 60)
        logger.info("📅 EGX DAILY UPDATE STARTED")
        logger.info("=" * 60)
        
        await self.connect()
        await self.ensure_schema()
        
        # Update all tickers (prices change daily)
        symbols = await self.update_tickers()
        
        # Only fetch new OHLC data
        total = len(symbols)
        for i, symbol in enumerate(symbols, 1):
            count = await self.update_ohlc(symbol, full_refresh=False)
            if count > 0:
                logger.info(f"[{i}/{total}] {symbol}: {count} new records")
        
        await self.close()
        self._print_summary()
    
    async def run_single_symbol(self, symbol: str):
        """Update a single symbol"""
        logger.info(f"Updating single symbol: {symbol}")
        
        await self.connect()
        await self.ensure_schema()
        
        count = await self.update_ohlc(symbol.upper(), full_refresh=True)
        logger.info(f"{symbol}: {count} records")
        
        await self.close()
    
    def _print_summary(self):
        """Print execution summary"""
        elapsed = (datetime.now() - self.stats['start_time']).total_seconds()
        
        logger.info("=" * 60)
        logger.info("📊 EXTRACTION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"🏦 Tickers: {self.stats['tickers_new']} new, {self.stats['tickers_updated']} updated")
        logger.info(f"📈 OHLC: {self.stats['ohlc_new']} new, {self.stats['ohlc_updated']} updated")
        logger.info(f"❌ Errors: {self.stats['errors']}")
        logger.info(f"⏱️ Duration: {elapsed:.1f} seconds")
        logger.info("=" * 60)


async def main():
    parser = argparse.ArgumentParser(description='EGX Production Data Loader')
    parser.add_argument('--full', action='store_true', help='Full sync of all data')
    parser.add_argument('--daily', action='store_true', help='Daily incremental update')
    parser.add_argument('--symbol', type=str, help='Update single symbol')
    args = parser.parse_args()
    
    os.makedirs('logs', exist_ok=True)
    
    loader = EGXProductionLoader()
    
    if args.symbol:
        await loader.run_single_symbol(args.symbol)
    elif args.daily:
        await loader.run_daily_update()
    else:
        # Default to full sync
        await loader.run_full_sync()


if __name__ == "__main__":
    asyncio.run(main())
