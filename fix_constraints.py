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

def apply_constraints():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Applying Constraints...")
        
        # 1. Financial Statements
        try:
            cur.execute("""
                ALTER TABLE financial_statements 
                ADD CONSTRAINT financial_statements_uniq UNIQUE (symbol, end_date, period_type);
            """)
            print("✅ Added financial_statements_uniq")
        except Exception as e:
            print(f"⚠️ Financials: {e}")

        # 2. Insider Trading
        try:
            # Need unique constraint to avoid duplicates
            # (symbol, insider_name, transaction_date, shares) might be good enough
            cur.execute("""
                ALTER TABLE insider_trading
                ADD CONSTRAINT insider_trading_uniq UNIQUE (symbol, insider_name, transaction_date, shares);
            """)
            print("✅ Added insider_trading_uniq")
        except Exception as e:
            print(f"⚠️ Insider: {e}")
            
        conn.close()
    except Exception as e:
        print(f"Conn Err: {e}")

if __name__ == "__main__":
    apply_constraints()
