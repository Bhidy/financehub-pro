import psycopg2
import os
import sys

# Connection
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL environment variable not set. Set it before running this script.")


def check_phase3_tables():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        tables = [
            'financial_statements', 'major_shareholders', 
            'insider_trading', 'analyst_ratings', 'earnings_history'
        ]
        
        for t in tables:
            print(f"\n--- {t} ---")
            try:
                cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}'")
                cols = cur.fetchall()
                if not cols:
                    print("(Table not found or empty schema)")
                for c in cols:
                    print(f"  {c[0]}: {c[1]}")
            except Exception as e:
                print(f"  Error: {e}")
                
        conn.close()
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    check_phase3_tables()
