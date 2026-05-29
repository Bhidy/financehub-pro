import psycopg2

DB_URL = "postgres://postgres.kgjpkphfjmmiyjsgsaup:REDACTED_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def check():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    print("--- INCOME STATEMENTS FOR COMI ---")
    cur.execute("""
        SELECT fiscal_year, period_type, period_ending, currency, revenue, cost_of_revenue, gross_profit, operating_income, net_income, eps, ebitda 
        FROM income_statements 
        WHERE symbol = 'COMI' 
        ORDER BY fiscal_year DESC, period_ending DESC 
        LIMIT 5
    """)
    rows = cur.fetchall()
    for r in rows:
        print(r)
        
    print("\n--- BALANCE SHEETS FOR COMI ---")
    cur.execute("""
        SELECT fiscal_year, period_type, period_ending, total_assets, total_liabilities, total_equity, book_value_per_share 
        FROM balance_sheets 
        WHERE symbol = 'COMI' 
        ORDER BY fiscal_year DESC, period_ending DESC 
        LIMIT 5
    """)
    rows = cur.fetchall()
    for r in rows:
        print(r)
        
    print("\n--- CASHFLOW STATEMENTS FOR COMI ---")
    cur.execute("""
        SELECT fiscal_year, period_type, period_ending, cash_from_operating, cash_from_investing, cash_from_financing, free_cashflow 
        FROM cashflow_statements 
        WHERE symbol = 'COMI' 
        ORDER BY fiscal_year DESC, period_ending DESC 
        LIMIT 5
    """)
    rows = cur.fetchall()
    for r in rows:
        print(r)

    conn.close()

if __name__ == "__main__":
    check()
