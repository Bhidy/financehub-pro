import psycopg2
import json

DB_URL = "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def check():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    print("--- SCHEMAS FOR financial_ratios ---")
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'financial_ratios'
    """)
    cols = cur.fetchall()
    print("Columns in financial_ratios:")
    for c in cols:
        print(c)
        
    print("\n--- DATA FOR COMI IN financial_ratios ---")
    cur.execute("""
        SELECT * FROM financial_ratios 
        WHERE symbol = 'COMI' OR symbol = 'COMI.CA' 
        ORDER BY date DESC 
        LIMIT 1
    """)
    rows = cur.fetchall()
    if rows:
        print("COMI record count:", len(rows))
        # print col-value pairs
        col_names = [c[0] for c in cols]
        for col, val in zip(col_names, rows[0]):
            print(f"{col}: {val}")
    else:
        print("No COMI ratios record found!")
        
    conn.close()

if __name__ == "__main__":
    check()
