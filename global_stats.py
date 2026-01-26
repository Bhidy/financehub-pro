
import psycopg2
import os

DB_URL = "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def get_stats():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    tables = ['financial_statements', 'income_statements', 'balance_sheets', 'cashflow_statements']
    
    print("=== GLOBAL STATS ===")
    for t in tables:
        table_name = f"public.{t}"
        cur.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cur.fetchone()[0]
        
        cur.execute(f"SELECT COUNT(DISTINCT symbol) FROM {table_name}") # 'symbol' or 'ticker'
        # financial_statements uses 'symbol', others might too. I saw 'symbol' in previous schema dump.
        tickers = cur.fetchone()[0]
        
        print(f"Table: {t}")
        print(f"  Total Rows: {count}")
        print(f"  Distinct Tickers: {tickers}")
        
    conn.close()

if __name__ == "__main__":
    get_stats()
