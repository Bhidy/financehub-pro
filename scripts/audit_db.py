import psycopg2
import sys
import os

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL environment variable not set. Set it before running this script.")


def check_data():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        tables = [
            "market_tickers", "financial_statements", "market_news", 
            "insider_trading", "corporate_actions", "analyst_ratings",
            "ohlc_history", "major_shareholders"
        ]
        
        print("## 📊 Database Data Audit")
        print("| Table Name | Row Count | AI Feature Status |")
        print("|---|---|---|")
        
        for t in tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {t}")
                count = cur.fetchone()[0]
                status = "✅ READY" if count > 0 else "❌ EMPTY (Needs Data)"
                print(f"| `{t}` | {count:,} | {status} |")
            except Exception as e:
                print(f"| `{t}` | ERROR | ⚠️ Schema Issue |")
                
        conn.close()
    except Exception as e:
        print(f"DB Connection Error: {e}")

if __name__ == "__main__":
    check_data()
