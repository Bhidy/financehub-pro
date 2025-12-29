#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  PHASE 4A: QUARTERLY FINANCIALS COLLECTION (Enterprise Edition)  ║
╚══════════════════════════════════════════════════════════════════╝
Collects:
- Quarterly Balance Sheets (Assets, Liabilities, Equity)
- Quarterly Income Statements (Revenue, Net Income)
- Quarterly Cash Flows (Operating, Investing, Financing CF)

Using: yahooquery with robust error handling
"""

import sys
import psycopg2
import time
import json
from yahooquery import Ticker
from datetime import datetime

sys.stdout.reconfigure(line_buffering=True)

DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require",
    "connect_timeout": 30
}

def extract_raw(val):
    """Handle Yahoo's polymorphic data (dict vs scalar)"""
    if isinstance(val, dict):
        return val.get("raw")
    return val

def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  🚀 PHASE 4A: QUARTERLY FINANCIALS COLLECTION                ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"Started: {datetime.now()}")
    print()
    
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ DB Connection Error: {e}")
        return

    # Get all symbols
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    print(f"📊 Processing {len(symbols)} stocks...")
    print()
    
    modules = [
        "balanceSheetHistoryQuarterly",
        "incomeStatementHistoryQuarterly", 
        "cashflowStatementHistoryQuarterly"
    ]
    
    stats = {"balance": 0, "income": 0, "cashflow": 0, "errors": 0}
    
    for idx, sym in enumerate(symbols):
        print(f"[{idx+1}/{len(symbols)}] {sym}...", end=" ", flush=True)
        
        try:
            sym_sa = f"{sym}.SR"
            t = Ticker(sym_sa, asynchronous=False)
            data = t.get_modules(modules)
            result = data.get(sym_sa)
            
            if not result or isinstance(result, str):
                print("❌ No Data", flush=True)
                time.sleep(1)
                continue
            
            # 1. Balance Sheet Quarterly
            bs_list = result.get("balanceSheetHistoryQuarterly", {}).get("balanceSheetStatements", [])
            for stmt in bs_list:
                end_date = stmt.get("endDate")
                if not end_date: continue
                
                try:
                    f_year = int(end_date.split("-")[0])
                except:
                    f_year = 0
                
                total_assets = extract_raw(stmt.get("totalAssets"))
                total_liab = extract_raw(stmt.get("totalLiab"))
                total_equity = extract_raw(stmt.get("totalStockholderEquity"))
                cash = extract_raw(stmt.get("cash"))
                debt = extract_raw(stmt.get("longTermDebt"))
                
                try:
                    cur.execute("""
                        INSERT INTO financial_statements 
                        (symbol, period_type, fiscal_year, end_date, total_assets, total_liabilities, 
                         total_equity, cash, long_term_debt, raw_data, created_at)
                        VALUES (%s, 'Quarterly', %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (symbol, end_date, period_type) DO NOTHING
                    """, (sym, f_year, end_date, total_assets, total_liab, total_equity, 
                          cash, debt, json.dumps(stmt)))
                    stats["balance"] += 1
                except Exception as e:
                    pass
            
            # 2. Income Statement Quarterly
            is_list = result.get("incomeStatementHistoryQuarterly", {}).get("incomeStatementHistory", [])
            for stmt in is_list:
                end_date = stmt.get("endDate")
                if not end_date: continue
                
                try:
                    f_year = int(end_date.split("-")[0])
                except:
                    f_year = 0
                    
                rev = extract_raw(stmt.get("totalRevenue"))
                net_inc = extract_raw(stmt.get("netIncome"))
                op_inc = extract_raw(stmt.get("operatingIncome"))
                gross = extract_raw(stmt.get("grossProfit"))
                
                try:
                    cur.execute("""
                        INSERT INTO financial_statements 
                        (symbol, period_type, fiscal_year, end_date, revenue, net_income, 
                         operating_income, gross_profit, raw_data, created_at)
                        VALUES (%s, 'Quarterly-Income', %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (symbol, end_date, period_type) DO NOTHING
                    """, (sym, f_year, end_date, rev, net_inc, op_inc, gross, json.dumps(stmt)))
                    stats["income"] += 1
                except:
                    pass
            
            # 3. Cash Flow Quarterly
            cf_list = result.get("cashflowStatementHistoryQuarterly", {}).get("cashflowStatements", [])
            for stmt in cf_list:
                end_date = stmt.get("endDate")
                if not end_date: continue
                
                try:
                    f_year = int(end_date.split("-")[0])
                except:
                    f_year = 0
                    
                op_cf = extract_raw(stmt.get("totalCashFromOperatingActivities"))
                inv_cf = extract_raw(stmt.get("totalCashflowsFromInvestingActivities"))
                fin_cf = extract_raw(stmt.get("totalCashFromFinancingActivities"))
                
                try:
                    cur.execute("""
                        INSERT INTO financial_statements 
                        (symbol, period_type, fiscal_year, end_date, operating_cashflow, 
                         investing_cashflow, financing_cashflow, raw_data, created_at)
                        VALUES (%s, 'Quarterly-CashFlow', %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (symbol, end_date, period_type) DO NOTHING
                    """, (sym, f_year, end_date, op_cf, inv_cf, fin_cf, json.dumps(stmt)))
                    stats["cashflow"] += 1
                except:
                    pass
            
            total = stats["balance"] + stats["income"] + stats["cashflow"]
            print(f"✅ BS:{stats['balance']} IS:{stats['income']} CF:{stats['cashflow']} (Total: {total})", flush=True)
            
        except Exception as e:
            print(f"❌ Error: {e}", flush=True)
            stats["errors"] += 1
        
        time.sleep(2)  # Respectful rate limiting

    conn.close()
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  ✅ PHASE 4A COMPLETE!                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"Balance Sheets: {stats['balance']}")
    print(f"Income Statements: {stats['income']}")
    print(f"Cash Flows: {stats['cashflow']}")
    print(f"Errors: {stats['errors']}")

if __name__ == "__main__":
    main()
