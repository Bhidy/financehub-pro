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

def check_phase3_tables():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
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
