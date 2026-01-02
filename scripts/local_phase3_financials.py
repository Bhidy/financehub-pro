#!/usr/bin/env python3
"""
PHASE 3: DEEP FINANCIALS & OWNERSHIP (YahooQuery Edition)
=========================================================
- Uses yahooquery library to handle Crumb/Cookies automatically.
- Fetches: Financial Statements, Shareholders, Earnings.
- Speed: LOW (Safety Mode).
"""

import sys
import psycopg2
import time
import json
from yahooquery import Ticker
from datetime import datetime

sys.stdout.reconfigure(line_buffering=True)

# Connection
DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require",
    "connect_timeout": 30
}

def main():
    print("🚀 STARTING PHASE 3: DEEP FINANCIALS (YahooQuery v2)...", flush=True)
    
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"DB Error: {e}")
        return

    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    
    # Process in chunks or one by one? 
    # Ticker can handle list, but for safety and logging, let's do 1 by 1 or small chunks.
    # 1 by 1 is safer for throttling.
    
    modules = [
        "incomeStatementHistory", "balanceSheetHistory", "cashflowStatementHistory",
        "insiderHolders", "institutionOwnership", "earningsTrend"
    ]

    for idx, sym in enumerate(symbols):
        print(f"[{idx+1}/{len(symbols)}] {sym} Deep Dive...", end=" ", flush=True)
        
        try:
            # APPEND .SR
            sym_sa = f"{sym}.SR"
            t = Ticker(sym_sa, asynchronous=False)
            data = t.get_modules(modules)
            
            result = data.get(sym_sa)
            if isinstance(result, str): # Error message
                print(f"❌ {result}", flush=True)
                time.sleep(1)
                continue
                
            if not result:
                print("❌ No Data", flush=True)
                continue

            def extract_raw(val):
                if isinstance(val, dict):
                    return val.get("raw")
                return val

            # 1. Financial Statements (Income)
            income_history = result.get("incomeStatementHistory", {}).get("incomeStatementHistory", [])
            print(f"  - Found {len(income_history)} Income Stmts", flush=True)
            
            count_stmts = 0
            for stmt in income_history:
                end_date = stmt.get("endDate")
                if not end_date: continue
                
                # Extract Fiscal Year (YYYY)
                try:
                    f_year = int(end_date.split("-")[0])
                except:
                    f_year = 0

                raw_json = json.dumps(stmt)
                rev = extract_raw(stmt.get("totalRevenue"))
                net_inc = extract_raw(stmt.get("netIncome"))
                op_inc = extract_raw(stmt.get("operatingIncome"))
                
                try:
                    cur.execute("""
                        INSERT INTO financial_statements (symbol, period_type, fiscal_year, end_date, revenue, net_income, operating_income, raw_data, created_at)
                        VALUES (%s, 'Annual', %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (symbol, end_date, period_type) DO NOTHING
                    """, (sym, f_year, end_date, rev, net_inc, op_inc, raw_json))
                    count_stmts += 1
                except Exception as e:
                    print(f"    Insert Err: {e}", flush=True)

            # 2. Insider Holders
            insiders = result.get("insiderHolders", {}).get("holders", [])
            count_insiders = 0
            for holder in insiders:
                name = holder.get("name")
                relation = holder.get("relation")
                shares = holder.get("positionDirect")
                date_held = holder.get("positionDirectDate")
                
                if name:
                    try:
                        cur.execute("""
                            INSERT INTO insider_trading (symbol, insider_name, insider_role, shares, transaction_date, created_at)
                            VALUES (%s, %s, %s, %s, %s, NOW())
                            ON CONFLICT DO NOTHING
                        """, (sym, name, relation, shares, date_held))
                        count_insiders += 1
                    except: pass
            
            print(f"✅ Saved {count_stmts} Stmts, {count_insiders} Insiders", flush=True)
            
        except Exception as e:
            print(f"Err: {e}", flush=True)
            
        # SAFETY SLEEP
        time.sleep(3) 

    conn.close()
    print("✅ PHASE 3 COMPLETE!")

if __name__ == "__main__":
    main()
