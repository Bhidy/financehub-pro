#!/usr/bin/env python3
"""
🧠 SMART DATA COLLECTOR
=======================
Resilient, 'Safe Mode' collector for Yahoo Finance.
- Concurrency: 2 Threads (to avoid rate limits)
- Features: Retries, Exponential Backoff, Session Management
- Covers: Financials, Earnings, Ownership, Actions
"""

import sys
import psycopg2
from psycopg2 import pool
import time
import json
import logging
import concurrent.futures
from yahooquery import Ticker
from datetime import datetime

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("smart_collector.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("SmartCollector")

DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require",
    "connect_timeout": 30
}

try:
    db_pool = psycopg2.pool.ThreadedConnectionPool(1, 4, **DB_PARAMS)
except Exception as e:
    logger.error(f"❌ DB Pool Error: {e}")
    sys.exit(1)

def get_db(): return db_pool.getconn()
def put_db(conn): db_pool.putconn(conn)

def extract_raw(val):
    if isinstance(val, dict): return val.get("raw")
    return val

def process_stock_safe(symbol):
    conn = get_db()
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        sym_sa = f"{symbol}.SR"
        logger.info(f"🔄 {symbol}: Fetching data...")
        
        # RETRY LOGIC
        max_retries = 3
        data = None
        
        for attempt in range(max_retries):
            try:
                t = Ticker(sym_sa, asynchronous=False)
                modules = "financialData defaultKeyStatistics incomeStatementHistory incomeStatementHistoryQuarterly recommendationTrend earningsTrend earningsHistory insiderHolders"
                d = t.get_modules(modules)
                if isinstance(d, dict) and sym_sa in d:
                    data = d[sym_sa]
                    if isinstance(data, str): # "No data found" msg
                        raise ValueError(data)
                    break
            except Exception as e:
                if attempt < max_retries - 1:
                    sleep_time = (attempt + 1) * 2
                    logger.warning(f"⚠️ {symbol}: Retry {attempt+1} after {sleep_time}s... ({e})")
                    time.sleep(sleep_time)
                else:
                    logger.error(f"❌ {symbol}: Failed after retries")
                    return

        if not data:
            logger.warning(f"⚠️ {symbol}: No Data returned")
            return

        # 1. Financials (Quarterly)
        q_stmts = data.get("incomeStatementHistoryQuarterly", {}).get("incomeStatementHistory", [])
        for stmt in q_stmts:
            end_date = stmt.get("endDate", {}).get("fmt") if isinstance(stmt.get("endDate"), dict) else stmt.get("endDate")
            if end_date:
                f_year = int(end_date.split("-")[0])
                cur.execute("""
                    INSERT INTO financial_statements (symbol, period_type, fiscal_year, end_date, revenue, net_income, raw_data, created_at)
                    VALUES (%s, 'Quarterly', %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (symbol, f_year, end_date, extract_raw(stmt.get("totalRevenue")), extract_raw(stmt.get("netIncome")), json.dumps(stmt)))

        # 2. Earnings Calendar / History
        e_hist = data.get("earningsHistory", {}).get("history", [])
        for h in e_hist:
            q = h.get("quarter", {}).get("fmt") if isinstance(h.get("quarter"), dict) else h.get("quarter")
            if q:
                cur.execute("""
                    INSERT INTO earnings_calendar (symbol, fiscal_quarter, eps_actual, eps_estimate, eps_surprise)
                    VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
                """, (symbol, q, extract_raw(h.get("epsActual")), extract_raw(h.get("epsEstimate")), extract_raw(h.get("epsDifference"))))

        # 3. Ownership (Insiders)
        holders = data.get("insiderHolders", {}).get("holders", [])
        for h in holders:
            name = h.get("name")
            if name:
                cur.execute("""
                    INSERT INTO insider_trading (symbol, insider_name, insider_role, shares, transaction_date)
                    VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
                """, (symbol, name, h.get("relation"), extract_raw(h.get("positionDirect")), 
                      h.get("positionDirectDate", {}).get("fmt") if isinstance(h.get("positionDirectDate"), dict) else h.get("positionDirectDate")))

        # 4. Fair Value (Target Price)
        fin = data.get("financialData", {})
        target = extract_raw(fin.get("targetMeanPrice"))
        current = extract_raw(fin.get("currentPrice"))
        if target and current:
             upside = ((target - current) / current) * 100
             cur.execute("""
                INSERT INTO fair_values (symbol, fair_value, upside, rating, last_updated)
                VALUES (%s, %s, %s, %s, NOW()) ON CONFLICT (symbol, provider) DO UPDATE SET fair_value=EXCLUDED.fair_value, upside=EXCLUDED.upside
             """, (symbol, target, upside, fin.get("recommendationKey")))

        logger.info(f"✅ {symbol}: Success")

    except Exception as e:
        logger.error(f"❌ {symbol} DB Error: {e}")
    finally:
        cur.close()
        put_db(conn)

def main():
    print("🧠 SMART COLLECTOR STARTED (2 THREADS)")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    put_db(conn)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(process_stock_safe, sym): sym for sym in symbols}
        for future in concurrent.futures.as_completed(futures):
            try: future.result()
            except: pass

if __name__ == "__main__":
    main()
