import asyncio
import asyncpg
import os

async def run():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        return
        
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    # Get all distinct symbols in the table
    rows = await conn.fetch("SELECT DISTINCT symbol FROM ohlc_data")
    symbols = [r['symbol'] for r in rows]
    print(f"Checking {len(symbols)} symbols in ohlc_data...")
    
    total_deleted = 0
    
    for symbol in symbols:
        # Get all records for this symbol
        records = await conn.fetch("SELECT date, close FROM ohlc_data WHERE symbol = $1", symbol)
        if len(records) < 5:
            continue
            
        closes = []
        for r in records:
            if r['close'] is not None:
                try:
                    val = float(r['close'])
                    if val > 0:
                        closes.append(val)
                except Exception:
                    pass
                    
        if not closes:
            continue
            
        sorted_closes = sorted(closes)
        median_close = sorted_closes[len(sorted_closes) // 2]
        
        # If the median is extremely low, it might be a penny stock, so skip threshold
        if median_close <= 2.0:
            continue
            
        # Identify bad dates
        bad_dates = []
        for r in records:
            if r['close'] is not None:
                try:
                    val = float(r['close'])
                    if val < median_close * 0.25:
                        bad_dates.append(r['date'])
                except Exception:
                    pass
                
        if bad_dates:
            print(f"⚠️ Stock {symbol} (Median: {median_close:.2f}) has {len(bad_dates)} anomalies:")
            for d in bad_dates:
                print(f"  - Date: {d}")
                
            # Delete anomalies
            result = await conn.execute(
                "DELETE FROM ohlc_data WHERE symbol = $1 AND date = any($2::date[])",
                symbol, bad_dates
            )
            print(f"  - Deleted anomalies: {result}")
            total_deleted += len(bad_dates)
            
    print(f"✅ Database Clean Up Complete! Total anomalous rows deleted: {total_deleted}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
