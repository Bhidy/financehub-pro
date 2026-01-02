import psycopg2
import sys

# Connection
DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require"
}

def get_metrics():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # 1. Backfill Progress (Stocks with OHLC data)
        cur.execute("SELECT count(DISTINCT symbol) FROM ohlc_data")
        stocks_with_data = cur.fetchone()[0]
        
        # 2. Fundamentals Progress (Stocks with Profiles)
        cur.execute("SELECT count(*) FROM company_profiles")
        stocks_with_profile = cur.fetchone()[0]

        # 3. Total Records
        cur.execute("SELECT count(*) FROM ohlc_data")
        ohlc_count = cur.fetchone()[0]
        
        cur.execute("SELECT count(*) FROM intraday_1h")
        h1_count = cur.fetchone()[0]
        
        cur.execute("SELECT count(*) FROM intraday_5m")
        m5_count = cur.fetchone()[0]
        
        total_records = ohlc_count + h1_count + m5_count
        
        # Calculations
        TOTAL_SYMBOLS = 453
        remaining = TOTAL_SYMBOLS - stocks_with_data
        percent_done = (stocks_with_data / TOTAL_SYMBOLS) * 100
        
        # Estimate: ~1.5 mins per stock (mix of 1min fast and 5min slow periods)
        est_minutes = remaining * 1.5
        est_hours = est_minutes / 60
        
        print("\n" + "="*60)
        print(f"📊 LIVE BACKFILL STATUS REPORT")
        print("="*60)
        
        print(f"\n✅ PROGRESS STATUS")
        print(f"  • Price Backfill:    [{'█' * int(percent_done/5)}{'.' * (20 - int(percent_done/5))}] {percent_done:.1f}%")
        print(f"  • Stocks Processed:  {stocks_with_data} / {TOTAL_SYMBOLS}")
        print(f"  • Stocks Remaining:  {remaining}")
        
        print(f"\n📦 COLLECTED DATA BREAKDOWN")
        print(f"  • Daily OHLC:        {ohlc_count:>10,} rows")
        print(f"  • Intraday 1h:       {h1_count:>10,} rows")
        print(f"  • Intraday 5m:       {m5_count:>10,} rows")
        print(f"  -------------------------------")
        print(f"  • TOTAL NEW RECORDS: {total_records:>10,}")
        print(f"  • FUNDAMENTALS DONE: {stocks_with_profile:>10} / {TOTAL_SYMBOLS} stocks")
        
        print(f"\n⏳ ESTIMATION (Approx)")
        print(f"  • Est. Time Left:    ~{est_hours:.1f} Hours")
        if remaining > 0:
            print(f"  • Target Finish:     Happening Soon 🚀")
        else:
            print(f"  • Status:            COMPLETE ✅")
            
        print("="*60 + "\n")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_metrics()
