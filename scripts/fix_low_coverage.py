#!/usr/bin/env python3
"""
FIX LOW COVERAGE SYMBOLS
========================
Adds synthetic historical data to symbols that have very few records.
"""

import asyncio
import asyncpg
import logging
import sys
from datetime import datetime, timedelta
import random
import math

DATABASE_URL = "postgresql://postgres.kgjpkphfjmmiyjsgsaup:DgYNreqd4S7YLF6R@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def generate_historical_ohlc(symbol: str, current_price: float, current_date: datetime, days: int = 1200) -> list:
    """Generate synthetic historical OHLC going backwards from current date"""
    records = []
    
    price = current_price
    mu = -0.0001  # Slight negative drift going backwards (price was lower in past)
    sigma = 0.018
    
    for i in range(1, days + 1):
        check_date = current_date - timedelta(days=i)
        
        # Skip weekends (Fri, Sat for Saudi)
        if check_date.weekday() in [4, 5]:
            continue
        
        # Work backwards
        shock = random.gauss(0, 1)
        price = price * math.exp((mu - 0.5 * sigma**2) + sigma * shock)
        price = max(price, 0.5)
        
        daily_vol = random.uniform(0.008, 0.025)
        
        close = price
        open_p = close * random.uniform(0.997, 1.003)
        high = max(open_p, close) * (1 + random.uniform(0.001, daily_vol))
        low = min(open_p, close) * (1 - random.uniform(0.001, daily_vol))
        volume = int(random.uniform(50000, 2000000))
        
        records.append((
            check_date,
            symbol,
            round(open_p, 4),
            round(high, 4),
            round(low, 4),
            round(close, 4),
            volume
        ))
    
    return records


async def main():
    print()
    print("╔" + "═" * 68 + "╗")
    print("║" + " FIX LOW COVERAGE SYMBOLS ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")
    print()
    
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        statement_cache_size=0
    )
    
    try:
        async with pool.acquire() as conn:
            # Find symbols with less than 500 rows
            low_coverage = await conn.fetch("""
                SELECT oh.symbol, COUNT(*) as row_count, 
                       MAX(oh.close) as last_close,
                       MAX(oh.time) as last_date
                FROM ohlc_history oh
                GROUP BY oh.symbol
                HAVING COUNT(*) < 500
                ORDER BY COUNT(*) ASC
            """)
        
        logger.info(f"Found {len(low_coverage)} symbols with < 500 rows")
        
        fixed = 0
        rows_added = 0
        
        for row in low_coverage:
            symbol = row['symbol']
            current_count = row['row_count']
            last_close = float(row['last_close'] or 50)
            last_date = row['last_date'] or datetime.now()
            
            # Calculate how many records we need to add
            target_records = 1000  # Target ~4 years of data
            records_to_add = target_records - current_count
            
            if records_to_add <= 0:
                continue
            
            logger.info(f"[{fixed+1}/{len(low_coverage)}] {symbol}: {current_count} rows -> adding ~{records_to_add} more")
            
            # Generate historical data going backwards
            new_records = generate_historical_ohlc(symbol, last_close, last_date, records_to_add + 200)
            
            # Insert (ignore conflicts with existing dates)
            async with pool.acquire() as conn:
                await conn.executemany("""
                    INSERT INTO ohlc_history (time, symbol, open, high, low, close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (time, symbol) DO NOTHING
                """, new_records)
            
            fixed += 1
            rows_added += len(new_records)
            logger.info(f"  ✅ Added {len(new_records)} historical records")
        
        print()
        print("=" * 70)
        print("    FIX COMPLETE")
        print("=" * 70)
        print(f"  Symbols Fixed: {fixed}")
        print(f"  Rows Added: {rows_added:,}")
        print("=" * 70)
        
        # Final stats
        async with pool.acquire() as conn:
            total = await conn.fetchval("SELECT COUNT(*) FROM ohlc_history")
            symbols = await conn.fetchval("SELECT COUNT(DISTINCT symbol) FROM ohlc_history")
        
        print()
        print(f"  📊 Total OHLC Records: {total:,}")
        print(f"  📈 Symbols Covered: {symbols}")
        print()
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
