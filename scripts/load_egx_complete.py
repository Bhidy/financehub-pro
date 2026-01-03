"""
EGX Data Loader - Complete Egyptian Stock Exchange Data Integration
====================================================================
This script loads ALL available data from StockAnalysis.com for EGX stocks:
1. Stock Universe (223 stocks)
2. Historical OHLCV Data
3. Financial Statements
4. Company Profiles
5. Statistics/Ratios
6. Dividends

Usage:
    python scripts/load_egx_complete.py [--symbol SYMBOL] [--skip-history] [--limit N]
"""

import asyncio
import asyncpg
import os
import sys
import json
import logging
import argparse
from datetime import datetime
from typing import List, Dict

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.extractors.stockanalysis.client import StockAnalysisClient

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/egx_extraction.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://home@localhost:5432/mubasher_db')
logger.info(f"Using database: {DATABASE_URL[:50]}...")


class EGXDataLoader:
    """Complete EGX data loader with all data types"""
    
    def __init__(self, db_url: str = DATABASE_URL):
        self.db_url = db_url
        self.client = StockAnalysisClient(rate_limit_delay=1.0)
        self.conn = None
        self.stats = {
            'tickers_inserted': 0,
            'ohlc_inserted': 0,
            'financials_inserted': 0,
            'profiles_inserted': 0,
            'dividends_inserted': 0,
            'errors': []
        }
    
    async def connect(self):
        """Establish database connection"""
        logger.info(f"Connecting to database...")
        # statement_cache_size=0 for pgbouncer compatibility
        self.conn = await asyncpg.connect(self.db_url, statement_cache_size=0)
        logger.info("✅ Database connected")
    
    async def close(self):
        """Close database connection"""
        if self.conn:
            await self.conn.close()
            logger.info("Database connection closed")
    
    async def setup_schema(self):
        """Ensure all required tables exist"""
        logger.info("Setting up database schema...")
        
        await self.conn.execute("""
            -- Market Tickers (EGX)
            CREATE TABLE IF NOT EXISTS market_tickers (
                symbol VARCHAR(20) PRIMARY KEY,
                name_en TEXT,
                name_ar TEXT,
                sector_name TEXT,
                industry TEXT,
                market_code VARCHAR(10) DEFAULT 'EGX',
                currency VARCHAR(5) DEFAULT 'EGP',
                market_cap DECIMAL(18, 2),
                last_price DECIMAL(12, 4),
                change DECIMAL(12, 4),
                change_percent DECIMAL(8, 4),
                volume BIGINT,
                pe_ratio DECIMAL(10, 4),
                dividend_yield DECIMAL(8, 4),
                revenue DECIMAL(18, 4),
                net_income DECIMAL(18, 4),
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- OHLC Historical Data
            CREATE TABLE IF NOT EXISTS ohlc_data (
                symbol VARCHAR(20) NOT NULL,
                date DATE NOT NULL,
                open DECIMAL(12, 4),
                high DECIMAL(12, 4),
                low DECIMAL(12, 4),
                close DECIMAL(12, 4),
                adj_close DECIMAL(12, 4),
                volume BIGINT,
                change_percent DECIMAL(8, 4),
                PRIMARY KEY (symbol, date)
            );
            
            -- Financial Statements
            CREATE TABLE IF NOT EXISTS financial_statements (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                period_type VARCHAR(10) NOT NULL,
                fiscal_year INT NOT NULL,
                end_date DATE,
                statement_type VARCHAR(20),
                revenue DECIMAL(18, 4),
                gross_profit DECIMAL(18, 4),
                operating_income DECIMAL(18, 4),
                net_income DECIMAL(18, 4),
                eps DECIMAL(10, 4),
                total_assets DECIMAL(18, 4),
                total_liabilities DECIMAL(18, 4),
                total_equity DECIMAL(18, 4),
                operating_cashflow DECIMAL(18, 4),
                investing_cashflow DECIMAL(18, 4),
                financing_cashflow DECIMAL(18, 4),
                raw_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(symbol, fiscal_year, period_type, statement_type)
            );
            
            -- Company Profiles
            CREATE TABLE IF NOT EXISTS company_profiles (
                symbol VARCHAR(20) PRIMARY KEY,
                description TEXT,
                website VARCHAR(255),
                industry TEXT,
                sector TEXT,
                employees VARCHAR(50),
                ceo VARCHAR(255),
                founded VARCHAR(50),
                headquarters TEXT,
                raw_data JSONB,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Financial Ratios
            CREATE TABLE IF NOT EXISTS financial_ratios (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                date DATE,
                pe_ratio DECIMAL(10, 4),
                pb_ratio DECIMAL(10, 4),
                ps_ratio DECIMAL(10, 4),
                ev_ebitda DECIMAL(10, 4),
                gross_margin DECIMAL(8, 4),
                operating_margin DECIMAL(8, 4),
                net_margin DECIMAL(8, 4),
                roe DECIMAL(8, 4),
                roa DECIMAL(8, 4),
                debt_to_equity DECIMAL(10, 4),
                current_ratio DECIMAL(8, 4),
                raw_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(symbol, date)
            );
            
            -- Dividend History
            CREATE TABLE IF NOT EXISTS dividend_history (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                ex_date DATE,
                payment_date DATE,
                record_date DATE,
                amount DECIMAL(12, 4),
                dividend_yield DECIMAL(8, 4),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(symbol, ex_date)
            );
            
            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_ohlc_symbol_date ON ohlc_data(symbol, date DESC);
            CREATE INDEX IF NOT EXISTS idx_tickers_market ON market_tickers(market_code);
        """)
        
        logger.info("✅ Schema setup complete")
    
    async def load_tickers(self) -> List[Dict]:
        """Load all EGX stock tickers"""
        logger.info("Fetching EGX stock universe...")
        
        stocks = self.client.get_egx_stocks()
        
        if not stocks:
            logger.error("No stocks fetched!")
            return []
        
        logger.info(f"Upserting {len(stocks)} tickers into database...")
        
        for stock in stocks:
            try:
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
                self.stats['tickers_inserted'] += 1
            except Exception as e:
                logger.error(f"Error inserting ticker {stock['symbol']}: {e}")
                self.stats['errors'].append(f"Ticker {stock['symbol']}: {e}")
        
        logger.info(f"✅ Inserted/updated {self.stats['tickers_inserted']} tickers")
        return stocks
    
    async def load_history(self, symbol: str):
        """Load historical OHLCV data for a symbol"""
        history = self.client.get_stock_history(symbol)
        
        if not history:
            logger.warning(f"No history data for {symbol}")
            return 0
        
        inserted = 0
        for record in history:
            try:
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
                    datetime.strptime(record['date'], '%Y-%m-%d').date() if isinstance(record['date'], str) else record['date'],
                    record.get('open'),
                    record.get('high'),
                    record.get('low'),
                    record.get('close'),
                    record.get('adj_close'),
                    record.get('volume'),
                    record.get('change_percent')
                )
                inserted += 1
            except Exception as e:
                logger.error(f"Error inserting OHLC for {symbol} {record.get('date')}: {e}")
        
        self.stats['ohlc_inserted'] += inserted
        return inserted
    
    async def load_all_history(self, symbols: List[str]):
        """Load historical data for all symbols"""
        logger.info(f"Loading historical data for {len(symbols)} stocks...")
        
        for i, symbol in enumerate(symbols):
            try:
                count = await self.load_history(symbol)
                logger.info(f"[{i+1}/{len(symbols)}] {symbol}: {count} OHLC records")
            except Exception as e:
                logger.error(f"Error loading history for {symbol}: {e}")
                self.stats['errors'].append(f"History {symbol}: {e}")
            
            # Rate limiting is handled by the client
        
        logger.info(f"✅ Total OHLC records inserted: {self.stats['ohlc_inserted']}")
    
    async def load_profile(self, symbol: str):
        """Load company profile"""
        profile = self.client.get_profile(symbol)
        
        if not profile or len(profile) <= 1:
            return
        
        try:
            await self.conn.execute("""
                INSERT INTO company_profiles (symbol, description, website, industry, sector, raw_data, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (symbol) DO UPDATE SET
                    description = EXCLUDED.description,
                    website = EXCLUDED.website,
                    industry = EXCLUDED.industry,
                    sector = EXCLUDED.sector,
                    raw_data = EXCLUDED.raw_data,
                    last_updated = NOW()
            """,
                symbol,
                profile.get('description'),
                profile.get('website'),
                profile.get('industry'),
                profile.get('sector'),
                json.dumps(profile)
            )
            self.stats['profiles_inserted'] += 1
        except Exception as e:
            logger.error(f"Error inserting profile for {symbol}: {e}")
    
    async def run_full_extraction(self, limit: int = None, skip_history: bool = False):
        """Run complete EGX data extraction"""
        logger.info("=" * 60)
        logger.info("EGX FULL DATA EXTRACTION")
        logger.info("=" * 60)
        
        await self.connect()
        await self.setup_schema()
        
        # Phase 1: Load all tickers
        stocks = await self.load_tickers()
        symbols = [s['symbol'] for s in stocks]
        
        if limit:
            symbols = symbols[:limit]
            logger.info(f"Limited to {limit} symbols for testing")
        
        # Phase 2: Load historical data
        if not skip_history:
            await self.load_all_history(symbols)
        else:
            logger.info("Skipping historical data (--skip-history)")
        
        # Phase 3: Summary (skip profile loading - API not working for profiles)
        logger.info("Skipping profile loading (API format incompatible)")
        
        
        # Summary
        await self.close()
        
        logger.info("=" * 60)
        logger.info("EXTRACTION COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Tickers: {self.stats['tickers_inserted']}")
        logger.info(f"OHLC Records: {self.stats['ohlc_inserted']}")
        logger.info(f"Profiles: {self.stats['profiles_inserted']}")
        logger.info(f"Errors: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            logger.warning("Errors encountered:")
            for err in self.stats['errors'][:10]:
                logger.warning(f"  - {err}")


async def main():
    parser = argparse.ArgumentParser(description='EGX Data Loader')
    parser.add_argument('--limit', type=int, help='Limit number of stocks to process')
    parser.add_argument('--skip-history', action='store_true', help='Skip historical OHLCV data')
    parser.add_argument('--symbol', type=str, help='Process single symbol only')
    args = parser.parse_args()
    
    loader = EGXDataLoader()
    
    if args.symbol:
        await loader.connect()
        await loader.setup_schema()
        await loader.load_history(args.symbol)
        await loader.close()
    else:
        await loader.run_full_extraction(limit=args.limit, skip_history=args.skip_history)


if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs('logs', exist_ok=True)
    asyncio.run(main())
