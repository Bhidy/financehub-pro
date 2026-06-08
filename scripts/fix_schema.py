import psycopg2
import sys
import os

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL environment variable not set. Set it before running this script.")


conn = psycopg2.connect(DATABASE_URL)
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
