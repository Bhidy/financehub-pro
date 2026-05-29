import psycopg2

DB_URL = "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def check():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    print("--- MAJOR SHAREHOLDERS FOR COMI ---")
    cur.execute("""
        SELECT symbol, shareholder_name_en, ownership_percent, shares_held 
        FROM major_shareholders 
        WHERE symbol = 'COMI' OR symbol = 'COMI.CA'
        ORDER BY ownership_percent DESC
    """)
    rows = cur.fetchall()
    for r in rows:
        print(r)
        
    conn.close()

if __name__ == "__main__":
    check()
