#!/usr/bin/env python3
"""
COMPREHENSIVE DATA GAP FILLER
==============================
Fills missing data for:
- earnings_estimates / earnings_calendar
- insider_transactions / insider_trading
- financial_statements (complete quarterly data)

Uses YahooQuery for reliable data extraction.
Connects to production Supabase database.
"""

import sys
import psycopg2
import time
import json
from datetime import datetime
from yahooquery import Ticker

sys.stdout.reconfigure(line_buffering=True)

# Production Supabase Connection
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
    """Extract raw value from Yahoo's dict format"""
    if isinstance(val, dict):
        return val.get("raw")
    return val

def safe_float(val):
    """Safely convert to float"""
    if val is None:
        return None
    try:
        return float(val)
    except:
        return None

def main():
    print("=" * 70)
    print("🚀 COMPREHENSIVE DATA GAP FILLER")
    print("=" * 70)
    
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
        print("✅ Connected to Supabase production database")
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return

    # Get all symbols
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    print(f"📊 Found {len(symbols)} stocks to process")
    
    # Track stats
    stats = {
        "earnings_added": 0,
        "insiders_added": 0,
        "financials_added": 0,
        "symbols_processed": 0,
        "errors": 0
    }

    # YahooQuery modules to fetch
    modules = [
        "incomeStatementHistory",
        "incomeStatementHistoryQuarterly",
        "balanceSheetHistory", 
        "balanceSheetHistoryQuarterly",
        "cashflowStatementHistory",
        "cashflowStatementHistoryQuarterly",
        "insiderHolders",
        "institutionOwnership",
        "earningsTrend",
        "earnings"
    ]

    for idx, sym in enumerate(symbols):
        print(f"\n[{idx+1}/{len(symbols)}] Processing {sym}...", end=" ", flush=True)
        
        try:
            sym_sa = f"{sym}.SR"
            t = Ticker(sym_sa, asynchronous=False)
            data = t.get_modules(modules)
            
            result = data.get(sym_sa)
            if isinstance(result, str):
                print(f"⚠️ {result}", flush=True)
                stats["errors"] += 1
                time.sleep(1)
                continue
                
            if not result:
                print("⚠️ No Data", flush=True)
                stats["errors"] += 1
                continue

            # ========================================
            # 1. EARNINGS DATA
            # ========================================
            earnings_history = result.get("earningsHistory", {}).get("history", [])
            earnings_trend = result.get("earningsTrend", {}).get("trend", [])
            
            for earning in earnings_history:
                try:
                    period = earning.get("quarter", {})
                    if isinstance(period, dict):
                        quarter = period.get("fmt", "")
                    else:
                        quarter = str(period)
                    
                    eps_actual = extract_raw(earning.get("epsActual"))
                    eps_estimate = extract_raw(earning.get("epsEstimate"))
                    eps_surprise = extract_raw(earning.get("epsDifference"))
                    
                    if quarter and eps_actual is not None:
                        cur.execute("""
                            INSERT INTO earnings_calendar 
                            (symbol, fiscal_quarter, eps_actual, eps_estimate, eps_surprise, created_at)
                            VALUES (%s, %s, %s, %s, %s, NOW())
                            ON CONFLICT (symbol, fiscal_quarter) 
                            DO UPDATE SET eps_actual = EXCLUDED.eps_actual,
                                          eps_estimate = EXCLUDED.eps_estimate
                        """, (sym, quarter, eps_actual, eps_estimate, eps_surprise))
                        stats["earnings_added"] += 1
                except Exception as e:
                    pass

            # ========================================
            # 2. INSIDER HOLDINGS
            # ========================================
            insiders = result.get("insiderHolders", {}).get("holders", [])
            for holder in insiders:
                try:
                    name = holder.get("name")
                    relation = holder.get("relation")
                    shares = extract_raw(holder.get("positionDirect"))
                    date_held = holder.get("positionDirectDate")
                    
                    if isinstance(date_held, dict):
                        date_held = date_held.get("fmt")
                    
                    trans_type = holder.get("transactionDescription", "HOLD")
                    if "buy" in str(trans_type).lower():
                        trans_type = "BUY"
                    elif "sell" in str(trans_type).lower():
                        trans_type = "SELL"
                    else:
                        trans_type = "HOLD"
                    
                    if name and shares:
                        cur.execute("""
                            INSERT INTO insider_trading 
                            (symbol, insider_name, insider_role, transaction_type, shares, transaction_date, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, NOW())
                            ON CONFLICT DO NOTHING
                        """, (sym, name, relation, trans_type, int(shares) if shares else 0, date_held))
                        stats["insiders_added"] += 1
                except Exception as e:
                    pass

            # ========================================
            # 3. FINANCIAL STATEMENTS (Annual + Quarterly)
            # ========================================
            
            # Annual Income Statements
            income_annual = result.get("incomeStatementHistory", {}).get("incomeStatementHistory", [])
            for stmt in income_annual:
                try:
                    end_date = stmt.get("endDate", {})
                    if isinstance(end_date, dict):
                        end_date = end_date.get("fmt", "")
                    
                    if not end_date:
                        continue
                        
                    fiscal_year = int(end_date.split("-")[0]) if end_date else 0
                    raw_json = json.dumps(stmt)
                    
                    cur.execute("""
                        INSERT INTO financial_statements 
                        (symbol, period_type, fiscal_year, end_date, 
                         revenue, net_income, operating_income, raw_data, created_at)
                        VALUES (%s, 'Annual', %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (symbol, end_date, period_type) 
                        DO UPDATE SET raw_data = EXCLUDED.raw_data
                    """, (sym, fiscal_year, end_date,
                          extract_raw(stmt.get("totalRevenue")),
                          extract_raw(stmt.get("netIncome")),
                          extract_raw(stmt.get("operatingIncome")),
                          raw_json))
                    stats["financials_added"] += 1
                except Exception as e:
                    pass
            
            # Quarterly Income Statements
            income_quarterly = result.get("incomeStatementHistoryQuarterly", {}).get("incomeStatementHistory", [])
            for stmt in income_quarterly:
                try:
                    end_date = stmt.get("endDate", {})
                    if isinstance(end_date, dict):
                        end_date = end_date.get("fmt", "")
                    
                    if not end_date:
                        continue
                        
                    fiscal_year = int(end_date.split("-")[0]) if end_date else 0
                    raw_json = json.dumps(stmt)
                    
                    cur.execute("""
                        INSERT INTO financial_statements 
                        (symbol, period_type, fiscal_year, end_date, 
                         revenue, net_income, operating_income, raw_data, created_at)
                        VALUES (%s, 'Quarterly', %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (symbol, end_date, period_type) 
                        DO UPDATE SET raw_data = EXCLUDED.raw_data
                    """, (sym, fiscal_year, end_date,
                          extract_raw(stmt.get("totalRevenue")),
                          extract_raw(stmt.get("netIncome")),
                          extract_raw(stmt.get("operatingIncome")),
                          raw_json))
                    stats["financials_added"] += 1
                except Exception as e:
                    pass

            # Balance Sheet (for Total Assets/Equity)
            balance_annual = result.get("balanceSheetHistory", {}).get("balanceSheetStatements", [])
            for stmt in balance_annual:
                try:
                    end_date = stmt.get("endDate", {})
                    if isinstance(end_date, dict):
                        end_date = end_date.get("fmt", "")
                    
                    if not end_date:
                        continue
                    
                    total_assets = extract_raw(stmt.get("totalAssets"))
                    total_equity = extract_raw(stmt.get("totalStockholderEquity"))
                    
                    cur.execute("""
                        UPDATE financial_statements 
                        SET total_assets = %s, total_equity = %s
                        WHERE symbol = %s AND end_date = %s
                    """, (total_assets, total_equity, sym, end_date))
                except Exception as e:
                    pass

            stats["symbols_processed"] += 1
            print(f"✅", flush=True)
            
        except Exception as e:
            print(f"❌ {e}", flush=True)
            stats["errors"] += 1
            
        # Rate limiting - Yahoo is sensitive
        time.sleep(2)

    conn.close()
    
    print("\n" + "=" * 70)
    print("📊 FINAL STATISTICS")
    print("=" * 70)
    print(f"  Symbols Processed: {stats['symbols_processed']}")
    print(f"  Earnings Added: {stats['earnings_added']}")
    print(f"  Insiders Added: {stats['insiders_added']}")
    print(f"  Financials Added: {stats['financials_added']}")
    print(f"  Errors: {stats['errors']}")
    print("=" * 70)
    print("✅ DATA GAP FILL COMPLETE!")

if __name__ == "__main__":
    main()
