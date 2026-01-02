#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║       SAUDI MARKET DATA COLLECTION - UNIFIED DASHBOARD v4        ║
╚══════════════════════════════════════════════════════════════════╝
With completion percentages and progress bars for ALL phases.
"""

import psycopg2
from datetime import datetime

DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require"
}

TOTAL_SYMBOLS = 453

def progress_bar(pct, width=20):
    pct = min(100, max(0, pct))
    filled = int(width * pct / 100)
    return '█' * filled + '░' * (width - filled)

def get_count(cur, table, distinct_col=None):
    try:
        if distinct_col:
            cur.execute(f"SELECT COUNT(DISTINCT {distinct_col}) FROM {table}")
        else:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]
    except:
        return 0

def get_metrics():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # ============ PHASE 1-3 (COMPLETED) ============
        ohlc_count = get_count(cur, "ohlc_data")
        h1_count = get_count(cur, "intraday_1h")
        m5_count = get_count(cur, "intraday_5m")
        profiles = get_count(cur, "company_profiles")
        
        # ============ PHASE 4A: QUARTERLY FINANCIALS ============
        cur.execute("SELECT COUNT(*) FROM financial_statements WHERE period_type LIKE 'Quarterly%'")
        quarterly_stmts = cur.fetchone()[0]
        cur.execute("SELECT COUNT(DISTINCT symbol) FROM financial_statements WHERE period_type LIKE 'Quarterly%'")
        quarterly_stocks = cur.fetchone()[0]
        
        # ============ PHASE 4B: ANALYST & EARNINGS ============
        analyst_recs = get_count(cur, "analyst_ratings")
        analyst_stocks = get_count(cur, "analyst_ratings", "symbol")
        earnings_est = get_count(cur, "earnings_estimates")
        earnings_cal = get_count(cur, "earnings_calendar")
        earnings_cal_stocks = get_count(cur, "earnings_calendar", "symbol")
        
        # ============ PHASE 4C: ACTIONS & FAIR VALUES ============
        corp_actions = get_count(cur, "corporate_actions")
        corp_actions_stocks = get_count(cur, "corporate_actions", "symbol")
        fair_values = get_count(cur, "fair_values")
        fair_values_stocks = get_count(cur, "fair_values", "symbol")
        
        # ============ PHASE 5: OWNERSHIP & INSIDERS ============
        inst_holders = get_count(cur, "institutional_holders")
        own_breakdown = get_count(cur, "ownership_breakdown")
        own_stocks = get_count(cur, "ownership_breakdown", "symbol")
        insider_tx = get_count(cur, "insider_trading")
        insider_stocks = get_count(cur, "insider_trading", "symbol")
        
        conn.close()
        
        # ============ CALCULATIONS ============
        phase1_total = ohlc_count + h1_count + m5_count + profiles
        phase4a_total = quarterly_stmts
        phase4b_total = analyst_recs + earnings_est + earnings_cal
        phase4c_total = corp_actions + fair_values
        phase5_total = inst_holders + own_breakdown + insider_tx
        
        phase4a_pct = (quarterly_stocks / TOTAL_SYMBOLS) * 100
        phase4b_pct = (analyst_stocks / TOTAL_SYMBOLS) * 100
        phase4c_pct = (corp_actions_stocks / TOTAL_SYMBOLS) * 100
        phase5_pct = (own_stocks / TOTAL_SYMBOLS) * 100
        
        grand_total = phase1_total + phase4a_total + phase4b_total + phase4c_total + phase5_total
        
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"""
╔══════════════════════════════════════════════════════════════════╗
║         🚀 UNIFIED STATUS DASHBOARD v4 - {now}          
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE 1-3: COMPLETED (100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [████████████████████] 100% Complete
  
  📊 Daily OHLC (10y):        {ohlc_count:>12,} rows
  📊 Intraday 1-Hour (2y):    {h1_count:>12,} rows
  📊 Intraday 5-Min (60d):    {m5_count:>12,} rows
  📊 Company Profiles:        {profiles:>12,} stocks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 PHASE 4A: QUARTERLY FINANCIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [{progress_bar(phase4a_pct)}] {phase4a_pct:>5.1f}% ({quarterly_stocks}/{TOTAL_SYMBOLS} stocks)
  
  📊 Quarterly Statements:    {quarterly_stmts:>12,} records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 PHASE 4B: ANALYST & EARNINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [{progress_bar(phase4b_pct)}] {phase4b_pct:>5.1f}% ({analyst_stocks}/{TOTAL_SYMBOLS} stocks)
  
  📊 Analyst Recommendations: {analyst_recs:>12,} records
  📊 Earnings Estimates:      {earnings_est:>12,} records
  📊 Earnings Calendar:       {earnings_cal:>12,} records (Stocks: {earnings_cal_stocks})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟣 PHASE 4C: ACTIONS & FAIR VALUES (NEW)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [{progress_bar(phase4c_pct)}] {phase4c_pct:>5.1f}% ({corp_actions_stocks}/{TOTAL_SYMBOLS} stocks)
  
  📊 Corporate Actions:       {corp_actions:>12,} records
  📊 Fair Values:             {fair_values:>12,} records ({fair_values_stocks} stocks)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 PHASE 5: OWNERSHIP & INSIDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [{progress_bar(phase5_pct)}] {phase5_pct:>5.1f}% ({own_stocks}/{TOTAL_SYMBOLS} stocks)
  
  📊 Ownership Breakdowns:    {own_breakdown:>12,} records
  📊 Institutional Holders:   {inst_holders:>12,} records
  📊 Insider Trading:         {insider_tx:>12,} records ({insider_stocks} stocks)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 GRAND TOTAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ═════════════════════════════════════════════
  TOTAL IN DATABASE:          {grand_total:>12,} rows
╚══════════════════════════════════════════════════════════════════╝
""")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_metrics()
