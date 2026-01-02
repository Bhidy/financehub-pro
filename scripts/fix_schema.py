import psycopg2

DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "REDACTED_PASSWORD",
    "sslmode": "require"
}

conn = psycopg2.connect(**DB_PARAMS)
conn.autocommit = True
cur = conn.cursor()

try:
    print("🔧 Fixing 'fair_values' table schema...")
    cur.execute("ALTER TABLE fair_values ADD COLUMN IF NOT EXISTS upside NUMERIC;")
    cur.execute("ALTER TABLE fair_values ADD COLUMN IF NOT EXISTS rating VARCHAR(20);")
    print("✅ Schema fixed!")
except Exception as e:
    print(f"❌ Error: {e}")

conn.close()
