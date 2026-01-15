
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'mutual_funds'")
cols = [row[0] for row in cur.fetchall()]
print(f"COLUMNS: {cols}")
conn.close()
