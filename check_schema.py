import psycopg2
import sys

DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require"
}

try:
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()
    
    # Check market_tickers
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'market_tickers'")
    print("\n--- market_tickers ---")
    for col in cur.fetchall():
        print(col)

    # Check company_profiles
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'company_profiles'")
    print("\n--- company_profiles ---")
    for col in cur.fetchall():
        print(col)

    conn.close()
except Exception as e:
    print(e)
