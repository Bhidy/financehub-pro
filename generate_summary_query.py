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

def generate_master_query():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # Get ALL tables in public schema
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = [r[0] for r in cur.fetchall()]
        
        # Build the mega query
        queries = []
        for t in tables:
            queries.append(f"SELECT '{t}' as table_name, COUNT(*) as row_count FROM \"{t}\"")
        
        final_query = "\nUNION ALL\n".join(queries) + "\nORDER BY row_count DESC;"
        
        print("\n--- EXECUTING FULL DB AUDIT ---\n", flush=True)
        cur.execute(final_query)
        results = cur.fetchall()
        
        total_rows = 0
        print(f"{'TABLE NAME':<30} | {'ROW COUNT':>15}")
        print("-" * 50)
        for row in results:
            print(f"{row[0]:<30} | {row[1]:>15,}")
            total_rows += row[1]
        
        print("-" * 50)
        print(f"{'TOTAL DB ROWS':<30} | {total_rows:>15,}")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_master_query()
