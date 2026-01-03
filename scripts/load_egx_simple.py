"""
Simplified EGX Loader - Direct Database Insertion
==================================================
Uses raw SQL with explicit parameters to avoid pgbouncer prepared statement issues.
"""

import asyncio
import asyncpg
import os
import sys
import logging
from datetime import datetime
from typing import List, Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from backend.extractors.stockanalysis.client import StockAnalysisClient

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL')
logger.info(f"Database: {DATABASE_URL[:50]}...")

async def main():
    client = StockAnalysisClient(rate_limit_delay=1.0)
    
    # Connect with statement_cache_size=0
    logger.info("Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    logger.info("✅ Connected")
    
    # Phase 1: Get all stocks
    logger.info("Fetching EGX stocks...")
    stocks = client.get_egx_stocks()
    logger.info(f"Found {len(stocks)} stocks")
    
    # Phase 2: Insert tickers one by one with explicit SQL
    logger.info("Inserting tickers...")
    inserted = 0
    for stock in stocks:
        try:
            # Use a direct SQL string to avoid prepared statement issues
            sql = """
                INSERT INTO market_tickers (symbol, name_en, sector_name, market_code, currency,
                    market_cap, last_price, change_percent, volume, pe_ratio, dividend_yield, revenue, net_income, last_updated)
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
            """
            await conn.execute(sql,
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
            inserted += 1
        except Exception as e:
            logger.error(f"Ticker {stock['symbol']}: {e}")
    
    logger.info(f"✅ Inserted {inserted} tickers")
    
    # Phase 3: Insert OHLC data
    logger.info("Loading OHLC data...")
    total_ohlc = 0
    
    for i, stock in enumerate(stocks):
        symbol = stock['symbol']
        try:
            history = client.get_stock_history(symbol)
            if not history:
                continue
            
            count = 0
            for record in history:
                try:
                    sql = """
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
                    """
                    date_val = datetime.strptime(record['date'], '%Y-%m-%d').date() if isinstance(record['date'], str) else record['date']
                    await conn.execute(sql,
                        symbol,
                        date_val,
                        record.get('open'),
                        record.get('high'),
                        record.get('low'),
                        record.get('close'),
                        record.get('adj_close'),
                        record.get('volume'),
                        record.get('change_percent')
                    )
                    count += 1
                except Exception as e:
                    pass  # Skip individual record errors
            
            total_ohlc += count
            logger.info(f"[{i+1}/{len(stocks)}] {symbol}: {count} OHLC")
            
        except Exception as e:
            logger.error(f"Error loading {symbol}: {e}")
    
    logger.info(f"✅ Inserted {total_ohlc} OHLC records")
    
    # Summary
    await conn.close()
    logger.info("=" * 50)
    logger.info("EXTRACTION COMPLETE")
    logger.info(f"Tickers: {inserted}")
    logger.info(f"OHLC: {total_ohlc}")
    logger.info("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
