import psycopg2
import os

DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require"
}

def check_data():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
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
