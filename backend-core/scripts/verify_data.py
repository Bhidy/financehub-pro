
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

print("🔍 Verifying Mutual Funds Data...")
cur.execute("SELECT count(*) FROM mutual_funds")
count = cur.fetchone()[0]
print(f"Total Funds: {count}")

cur.execute("SELECT count(*) FROM mutual_funds WHERE return_ytd IS NOT NULL")
ytd_count = cur.fetchone()[0]
print(f"Funds with YTD Return: {ytd_count}")

cur.execute("SELECT symbol, fund_name, return_ytd, aum, fee_management FROM mutual_funds WHERE return_ytd IS NOT NULL LIMIT 5")
rows = cur.fetchall()
print("Sample Data (with YTD):")
for r in rows:
    print(r)

conn.close()
