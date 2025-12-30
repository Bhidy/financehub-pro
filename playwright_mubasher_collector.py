import sys
import json
import time
import psycopg2
from playwright.sync_api import sync_playwright

# Database Connection
DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require"
}

def get_db():
    conn = psycopg2.connect(**DB_PARAMS)
    conn.autocommit = True
    return conn

def main():
    print("🎭 STARTING PLAYWRIGHT COLLECTOR (Mubasher)...")
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    conn.close()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # Connect DB inside loop to keep it fresh or just once
        conn = get_db()
        cur = conn.cursor()

        for idx, sym in enumerate(symbols):
            print(f"[{idx+1}/{len(symbols)}] 🔄 {sym}: Fetching...", end=" ", flush=True)
            
            try:
                # 1. FINANCIALS
                # API: https://www.mubasher.info/api/1/stocks/{sym}/financial-statements
                url = f"https://www.mubasher.info/api/1/stocks/{sym}/financial-statements"
                
                # Navigate to URL (API returns JSON directly in browser)
                response = page.goto(url)
                
                if response.status == 200:
                    try:
                        data = response.json()
                        blocks = []
                        if isinstance(data, list): blocks = data
                        elif isinstance(data, dict): blocks = data.get("rows", [])
                        
                        count = 0
                        for row in blocks:
                            # Mubasher structure might vary, let's assume standard
                            # Need to map fields. For now, dump raw to save it.
                            end_date = row.get("date") or row.get("period") # Adjust based on actual JSON
                            if end_date:
                                cur.execute("""
                                    INSERT INTO financial_statements (symbol, period_type, fiscal_year, end_date, raw_data, created_at)
                                    VALUES (%s, 'Quarterly', 0, %s, %s, NOW())
                                    ON CONFLICT (symbol, end_date, period_type) DO UPDATE SET raw_data = EXCLUDED.raw_data
                                """, (sym, end_date, json.dumps(row)))
                                count += 1
                        print(f"✅ {count} Stmts", end=" ")
                    except Exception as e:
                        print(f"⚠️ JSON Parse Err: {e}", end=" ")
                else:
                    print(f"❌ Status {response.status}", end=" ")

                # 2. PROFILE / SHAREHOLDERS?
                # ... Add more if needed. For now verify Financials.

            except Exception as e:
                print(f"❌ Err: {e}", end=" ")
            
            print("", flush=True)
            time.sleep(1) # Polite delay
        
        browser.close()
        conn.close()

if __name__ == "__main__":
    main()
