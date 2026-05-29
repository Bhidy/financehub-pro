import asyncio
import asyncpg
import os

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        # Check all tables to see where ohlc data is stored
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        print("Tables in public schema:")
        for t in tables:
            print(f" - {t['table_name']}")
            
        print("\nSearching for anomalies (price < 10.0) in ohlc_data...")
        try:
            anomalies = await conn.fetch("""
                SELECT symbol, date, close 
                FROM ohlc_data 
                WHERE close < 10.0 AND symbol IN ('COMI', 'comi')
                ORDER BY date DESC
            """)
            print(f"Found {len(anomalies)} anomalies in ohlc_data for COMI:")
            for a in anomalies:
                print(f"  Symbol: {a['symbol']}, Date: {a['date']}, Close: {a['close']}")
        except Exception as e:
            print("Error checking ohlc_data:", e)
            
        print("\nSearching for anomalies (price < 10.0) in ohlc_history...")
        try:
            anomalies2 = await conn.fetch("""
                SELECT symbol, time as date, close 
                FROM ohlc_history 
                WHERE close < 10.0 AND symbol IN ('COMI', 'comi')
                ORDER BY time DESC
            """)
            print(f"Found {len(anomalies2)} anomalies in ohlc_history for COMI:")
            for a in anomalies2:
                print(f"  Symbol: {a['symbol']}, Date: {a['date']}, Close: {a['close']}")
        except Exception as e:
            print("Error checking ohlc_history:", e)
            
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
