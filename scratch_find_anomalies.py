import asyncio
import asyncpg

async def run():
    conn = await asyncpg.connect("postgres://postgres.kgjpkphfjmmiyjsgsaup:REDACTED_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require", statement_cache_size=0)
    
    # Fetch all symbols
    symbols = [r['symbol'] for r in await conn.fetch("SELECT DISTINCT symbol FROM ohlc_data")]
    print(f"Total symbols found: {len(symbols)}")
    
    anomalies = []
    
    for symbol in symbols:
        # Get average close price and min close price for the symbol
        stats = await conn.fetchrow("""
            SELECT AVG(close) as avg_price, MIN(close) as min_price, MAX(close) as max_price
            FROM ohlc_data 
            WHERE symbol = $1
        """, symbol)
        
        if stats and stats['avg_price'] and stats['min_price']:
            avg_p = float(stats['avg_price'])
            min_p = float(stats['min_price'])
            max_p = float(stats['max_price'])
            
            # If the minimum price is less than 25% of the average price, it's highly likely an anomaly
            if min_p < avg_p * 0.25 and avg_p > 5.0:
                # Fetch the anomalous rows
                bad_rows = await conn.fetch("""
                    SELECT date, open, high, low, close 
                    FROM ohlc_data 
                    WHERE symbol = $1 AND close < $2
                    ORDER BY date
                """, symbol, avg_p * 0.25)
                
                print(f"\n⚠️ ANOMALY DETECTED FOR {symbol} (Avg: {avg_p:.2f}, Min: {min_p:.2f})")
                for row in bad_rows:
                    print(f"  Date: {row['date']}, O: {row['open']}, H: {row['high']}, L: {row['low']}, C: {row['close']}")
                    anomalies.append((symbol, row['date']))
                    
    print(f"\nTotal anomalous records detected: {len(anomalies)}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
