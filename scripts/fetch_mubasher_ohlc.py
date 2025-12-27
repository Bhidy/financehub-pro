#!/usr/bin/env python3
"""
REAL OHLC DATA COLLECTOR - MUBASHER API
========================================
Fetches REAL historical OHLC data from Mubasher API for Saudi stocks.
This is the official data source - NO synthetic/fake data.

For stocks not on Yahoo Finance (REITs, Sukuk, etc.), this uses Mubasher.
"""

import asyncio
import asyncpg
import tls_client
import pandas as pd
import logging
import sys
from datetime import datetime
import time

DATABASE_URL = "postgresql://postgres.kgjpkphfjmmiyjsgsaup:DgYNreqd4S7YLF6R@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('mubasher_ohlc_collection.log')
    ]
)
logger = logging.getLogger(__name__)


class MubasherOHLCExtractor:
    """Fetches REAL OHLC data from Mubasher API"""
    
    def __init__(self):
        self.session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        self.base_endpoint = "https://www.mubasher.info/api/1/stocks/{symbol}/history"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.mubasher.info/countries/sa/stocks",
            "Origin": "https://www.mubasher.info"
        }
    
    def fetch(self, symbol: str, period: str = "max") -> pd.DataFrame:
        """Fetch REAL OHLC data from Mubasher API"""
        url = self.base_endpoint.format(symbol=symbol) + f"?period={period}"
        
        try:
            response = self.session.get(url, headers=self.headers)
            
            if response.status_code == 200:
                raw_data = response.json()
                
                # Handle both formats: { "data": [...] } or [...]
                points = raw_data.get('data', []) if isinstance(raw_data, dict) else raw_data
                
                if isinstance(points, list) and len(points) > 0:
                    df = pd.DataFrame(points)
                    df['symbol'] = symbol
                    return df
                    
            logger.warning(f"No data from Mubasher for {symbol}")
            return pd.DataFrame()
            
        except Exception as e:
            logger.error(f"Error fetching {symbol} from Mubasher: {e}")
            return pd.DataFrame()


async def main():
    print()
    print("╔" + "═" * 68 + "╗")
    print("║" + " REAL OHLC DATA COLLECTOR - MUBASHER API ".center(68) + "║")
    print("║" + " 100% Real Data - No Synthetic Data ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")
    print()
    
    logger.info("Connecting to database...")
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        statement_cache_size=0
    )
    
    extractor = MubasherOHLCExtractor()
    
    stats = {
        'total': 0,
        'success': 0,
        'failed': 0,
        'rows_added': 0,
        'no_data': []
    }
    
    try:
        async with pool.acquire() as conn:
            # Find symbols with low coverage (< 500 rows)
            low_coverage = await conn.fetch("""
                SELECT oh.symbol, COUNT(*) as row_count
                FROM ohlc_history oh
                GROUP BY oh.symbol
                HAVING COUNT(*) < 500
                ORDER BY COUNT(*) ASC
            """)
        
        if not low_coverage:
            logger.info("All symbols have good coverage (500+ rows)!")
            return
        
        logger.info(f"Found {len(low_coverage)} symbols with < 500 rows to fetch from Mubasher")
        
        for i, row in enumerate(low_coverage):
            symbol = row['symbol']
            current_count = row['row_count']
            stats['total'] += 1
            
            progress = ((i + 1) / len(low_coverage)) * 100
            logger.info(f"[{i+1}/{len(low_coverage)}] ({progress:.1f}%) Fetching REAL data for {symbol} (current: {current_count} rows)...")
            
            # Fetch REAL data from Mubasher
            df = extractor.fetch(symbol, period="max")
            
            if df.empty:
                stats['failed'] += 1
                stats['no_data'].append(symbol)
                logger.warning(f"  ⚠️ No real data available for {symbol}")
                continue
            
            # Parse and insert data
            records = []
            for _, point in df.iterrows():
                try:
                    # Mubasher returns timestamp in milliseconds
                    if 'time' in point:
                        ts = datetime.fromtimestamp(point['time'] / 1000)
                    elif 'date' in point:
                        ts = pd.to_datetime(point['date'])
                    else:
                        continue
                    
                    records.append((
                        ts,
                        symbol,
                        float(point.get('open', point.get('o', 0))),
                        float(point.get('high', point.get('h', 0))),
                        float(point.get('low', point.get('l', 0))),
                        float(point.get('close', point.get('c', 0))),
                        int(point.get('volume', point.get('v', 0)))
                    ))
                except Exception as e:
                    continue
            
            if records:
                async with pool.acquire() as conn:
                    await conn.executemany("""
                        INSERT INTO ohlc_history (time, symbol, open, high, low, close, volume)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (time, symbol) DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume
                    """, records)
                
                stats['success'] += 1
                stats['rows_added'] += len(records)
                logger.info(f"  ✅ Added {len(records)} REAL data points")
            
            # Rate limiting
            time.sleep(0.5)
        
        print()
        print("=" * 70)
        print("    REAL DATA COLLECTION COMPLETE")
        print("=" * 70)
        print(f"  Symbols Processed: {stats['total']}")
        print(f"  Successful:        {stats['success']}")
        print(f"  No Data Available: {stats['failed']}")
        print(f"  Rows Added:        {stats['rows_added']:,}")
        print("=" * 70)
        
        if stats['no_data']:
            print()
            print(f"  ⚠️ {len(stats['no_data'])} symbols have no historical data available:")
            print(f"     (These may be very new IPOs or delisted)")
        
        # Final counts
        async with pool.acquire() as conn:
            total = await conn.fetchval("SELECT COUNT(*) FROM ohlc_history")
            symbols = await conn.fetchval("SELECT COUNT(DISTINCT symbol) FROM ohlc_history")
        
        print()
        print(f"  📊 Total OHLC Records: {total:,}")
        print(f"  📈 Symbols with Data: {symbols}")
        print()
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
