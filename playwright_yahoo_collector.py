import sys
import json
import time
import re
import psycopg2
from playwright.sync_api import sync_playwright

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
    print("🎭 PLAYWRIGHT YAHOO COLLECTOR (STEALTH MODE) STARTING...", flush=True)
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    conn.close()

    with sync_playwright() as p:
        # STEALTH ARGS
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )
        # Try Mobile UA - often less strict
        context = browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844}
        )
        # Block heavy assets
        page = context.new_page()
        page.route("**/*.{png,jpg,jpeg,svg,css,woff,woff2,ttf}", lambda route: route.abort())

        conn = get_db()
        cur = conn.cursor()

        for idx, sym in enumerate(symbols):
            try:
                print(f"[{idx+1}/{len(symbols)}] 🔄 {sym}:", end=" ", flush=True)
                
                # Strategy 1: Direct Link with robust wait
                url_fin = f"https://finance.yahoo.com/quote/{sym}.SR/financials"
                try:
                    # Faster load strategy but wait for stability
                    response = page.goto(url_fin, timeout=60000, wait_until="domcontentloaded")
                    
                    # Handle "Agree" to cookies if present
                    if page.locator("button[name='agree']").is_visible():
                        page.click("button[name='agree']", timeout=5000)
                    
                    # Wait for redirects to settle
                    try: page.wait_for_load_state("networkidle", timeout=10000) 
                    except: pass

                    # Validation: Check if we are actually on the Quote page
                    title = page.title()
                    
                    # Strategy 2: If redirected to Home, try "Human Click-Path"
                    if "Yahoo Finance" in title and sym not in title:
                        print(f"⚠️ Redir to Home. Retrying via Summary...", end=" ", flush=True)
                        page.goto(f"https://finance.yahoo.com/quote/{sym}.SR", timeout=60000)
                        page.wait_for_timeout(3000) # Human pause
                        
                        # Debug: See what the Summary page looks like in Mobile
                        try: page.screenshot(path=f"debug_mobile_summary_{sym}.png")
                        except: pass

                        # Yahoo Mobile often puts Financials in a scrollable tab list
                        # Search for the link with href ending in /financials
                        try:
                            page.locator("a[href*='/financials']").first.click(timeout=5000)
                        except:
                            print(f"⚠️ 'Financials' link not found via Selector. Trying Menu...", end=" ", flush=True)
                            # Sometimes it's under QuoteNav
                            page.locator("section[data-test='quote-nav'] >> text=Financials").click()
                        
                        page.wait_for_load_state("networkidle", timeout=15000)
                    
                    content = page.content()
                    match = re.search(r'root\.App\.main\s*=\s*({.*?"context":.*?});', content)
                    
                    if match:
                        data = json.loads(match.group(1))
                        stores = data.get("context", {}).get("dispatcher", {}).get("stores", {})
                        
                        # 1. Statements
                        qt_stmts = stores.get("QuoteSummaryStore", {}).get("incomeStatementHistoryQuarterly", {}).get("incomeStatementHistory", [])
                        count_fin = 0
                        for s in qt_stmts:
                            end_date = s.get("endDate", {}).get("fmt")
                            if end_date:
                                f_year = int(end_date.split("-")[0])
                                rev = s.get("totalRevenue", {}).get("raw")
                                net = s.get("netIncome", {}).get("raw")
                                cur.execute("""
                                    INSERT INTO financial_statements (symbol, period_type, fiscal_year, end_date, revenue, net_income, raw_data, created_at)
                                    VALUES (%s, 'Quarterly', %s, %s, %s, %s, %s, NOW())
                                    ON CONFLICT (symbol, end_date, period_type) DO NOTHING
                                """, (sym, f_year, end_date, rev, net, json.dumps(s)))
                                count_fin += 1
                        print(f"💰 Fin:{count_fin}", end=" ", flush=True)

                        # 2. Earnings & 3. Ownership (Same as before)
                        # ... [Abbreviated for speed, logic is same as previous file] ...
                        
                        # Just verify fin first to confirm bypass.
                        
                    else:
                        print("⚠️ No JSON", end=" ", flush=True)
                        with open(f"debug_yahoo_{sym}.html", "w", encoding="utf-8") as f:
                            f.write(content)

                except Exception as e:
                    print(f"❌ Nav Err: {e}")
                    try:
                        print(f"PAGE TITLE: {page.title()}")
                        print(f"PAGE BODY: {page.content()[:500]}")
                        page.screenshot(path=f"debug_yahoo_{sym}_error.png")
                    except: pass

                print("", flush=True)

            except Exception as e:
                print(f"❌ Loop Err: {e}", flush=True)
            
            time.sleep(5) # Higher delay for safety

        browser.close()
        conn.close()

if __name__ == "__main__":
    main()
