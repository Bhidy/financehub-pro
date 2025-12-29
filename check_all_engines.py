#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║       SAUDI MARKET DATA COLLECTION - UNIFIED DASHBOARD v3        ║
╚══════════════════════════════════════════════════════════════════╝
With completion percentages and progress bars.
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

# Expected records per phase (for percentage calculation)
EXPECTED = {
    "phase4a": 453 * 12,  # ~12 quarterly statements per stock (4 quarters × 3 types)
    "phase4b": 453 * 8,   # ~8 analyst/earnings records per stock
    "phase5": 453 * 12,   # ~12 ownership records per stock
}

def progress_bar(pct, width=20):
    filled = int(width * pct / 100)
    return '█' * filled + '░' * (width - filled)

def get_metrics():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # ============ PHASE 1-3 (COMPLETED) ============
        cur.execute("SELECT COUNT(*) FROM ohlc_data")
        ohlc_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM intraday_1h")
        h1_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM intraday_5m")
        m5_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM company_profiles")
        profiles = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM financial_statements WHERE period_type = 'Annual'")
        annual_stmts = cur.fetchone()[0]
        
        # ============ PHASE 4A: QUARTERLY FINANCIALS ============
        cur.execute("SELECT COUNT(*) FROM financial_statements WHERE period_type LIKE 'Quarterly%'")
        quarterly_stmts = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(DISTINCT symbol) FROM financial_statements WHERE period_type LIKE 'Quarterly%'")
        quarterly_stocks = cur.fetchone()[0]
        
        # ============ PHASE 4B: ANALYST DATA ============
        try:
            cur.execute("SELECT COUNT(*) FROM analyst_ratings")
            analyst_recs = cur.fetchone()[0]
            cur.execute("SELECT COUNT(DISTINCT symbol) FROM analyst_ratings")
            analyst_stocks = cur.fetchone()[0]
        except:
            analyst_recs = 0
            analyst_stocks = 0
        
        try:
            cur.execute("SELECT COUNT(*) FROM earnings_estimates")
            earnings_est = cur.fetchone()[0]
        except:
            earnings_est = 0
            
        try:
            cur.execute("SELECT COUNT(*) FROM earnings_history")
            earnings_hist = cur.fetchone()[0]
        except:
            earnings_hist = 0
        
        # ============ PHASE 5: OWNERSHIP ============
        try:
            cur.execute("SELECT COUNT(*) FROM institutional_holders")
            inst_holders = cur.fetchone()[0]
        except:
            inst_holders = 0
            
        try:
            cur.execute("SELECT COUNT(*) FROM ownership_breakdown")
            own_breakdown = cur.fetchone()[0]
        except:
            own_breakdown = 0
        
        # ============ LEGACY DATA ============
        cur.execute("SELECT COUNT(*) FROM ohlc_history")
        legacy_ohlc = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM nav_history")
        legacy_nav = cur.fetchone()[0]
        
        conn.close()
        
        # ============ CALCULATIONS ============
        phase1_total = ohlc_count + h1_count + m5_count
        phase4a_total = quarterly_stmts
        phase4b_total = analyst_recs + earnings_est + earnings_hist
        phase5_total = inst_holders + own_breakdown
        legacy_total = legacy_ohlc + legacy_nav
        grand_total = phase1_total + annual_stmts + profiles + phase4a_total + phase4b_total + phase5_total + legacy_total
        
        # Percentages (based on stocks processed)
        phase4a_pct = (quarterly_stocks / TOTAL_SYMBOLS) * 100
        phase4b_pct = (analyst_stocks / TOTAL_SYMBOLS) * 100
        phase5_pct = (own_breakdown / TOTAL_SYMBOLS) * 100
        
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"""
╔══════════════════════════════════════════════════════════════════╗
║         🚀 UNIFIED STATUS DASHBOARD v3 - {now}          
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE 1-3: COMPLETED (100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [{progress_bar(100)}] 100% Complete
  
  📊 Daily OHLC (10y):        {ohlc_count:>12,} rows
  📊 Intraday 1-Hour (2y):    {h1_count:>12,} rows
  📊 Intraday 5-Min (60d):    {m5_count:>12,} rows
  📊 Company Profiles:        {profiles:>12,} stocks
  📊 Annual Financials:       {annual_stmts:>12,} reports
  ─────────────────────────────────────────────
  SUBTOTAL:                   {phase1_total + annual_stmts + profiles:>12,} rows

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
  📊 Earnings History:        {earnings_hist:>12,} records
  ─────────────────────────────────────────────
  SUBTOTAL:                   {phase4b_total:>12,} records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 PHASE 5: OWNERSHIP DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [{progress_bar(phase5_pct)}] {phase5_pct:>5.1f}% ({own_breakdown}/{TOTAL_SYMBOLS} stocks)
  
  📊 Institutional Holders:   {inst_holders:>12,} records
  📊 Ownership Breakdowns:    {own_breakdown:>12,} records
  ─────────────────────────────────────────────
  SUBTOTAL:                   {phase5_total:>12,} records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 LEGACY DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 OHLC History:            {legacy_ohlc:>12,} rows
  📊 NAV History:             {legacy_nav:>12,} rows
  ─────────────────────────────────────────────
  SUBTOTAL:                   {legacy_total:>12,} rows

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
