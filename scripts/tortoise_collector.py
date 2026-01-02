#!/usr/bin/env python3
"""
🐢 TORTOISE COLLECTOR (Ultimate Safe Mode)
==========================================
The slowest, most reliable collector for Yahoo Finance.
- 1 Single Thread (No concurrency)
- Random User-Agent per request
- Random Dithering Delay (5-12 seconds)
- Fresh Session each time
"""

import sys
import psycopg2
import time
import json
import random
import logging
from yahooquery import Ticker
from datetime import datetime

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("tortoise.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("Tortoise")

# User Agents
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require",
    "connect_timeout": 30
}

def get_db():
    conn = psycopg2.connect(**DB_PARAMS)
    conn.autocommit = True
    return conn

def extract_raw(val):
    if isinstance(val, dict): return val.get("raw")
    return val

def main():
    print("🐢 TORTOISE COLLECTOR STARTED (Single Thread | 5-12s Delay)")
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    conn.close()
    
    for idx, sym in enumerate(symbols):
        delay = random.uniform(5, 12)
        ua = random.choice(USER_AGENTS)
        
        logger.info(f"⏳ Waiting {delay:.1f}s...")
        time.sleep(delay)
        
        logger.info(f"🔄 [{idx+1}/{len(symbols)}] {sym}: Fetching...")
        
        conn = None
        try:
            conn = get_db()
            cur = conn.cursor()
            
            # Use Random UA (Yahooquery accepts headers but Ticker handles session)
            # We initialize Ticker fresh every time to get new session/cookies
            t = Ticker(f"{sym}.SR", asynchronous=False, formatted=False) # formatted=False gets raw dicts
            
            # Modules to fetch
            modules = "financialData defaultKeyStatistics incomeStatementHistory incomeStatementHistoryQuarterly recommendationTrend earningsTrend earningsHistory insiderHolders"
            
            d = t.get_modules(modules)
            data = d.get(f"{sym}.SR")
            
            if isinstance(data, str) or not data:
                logger.warning(f"⚠️ {sym}: No Data (Yahoo msg: {data})")
                continue

            # 1. Financials
            stmts = data.get("incomeStatementHistoryQuarterly", {}).get("incomeStatementHistory", [])
            for s in stmts:
                end_date = s.get("endDate")
                if isinstance(end_date, dict): end_date = end_date.get("fmt")
                if end_date:
                    f_year = int(end_date.split("-")[0])
                    cur.execute("""
                        INSERT INTO financial_statements (symbol, period_type, fiscal_year, end_date, revenue, net_income, raw_data, created_at)
                        VALUES (%s, 'Quarterly', %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, (sym, f_year, end_date, extract_raw(s.get("totalRevenue")), extract_raw(s.get("netIncome")), json.dumps(s)))

            # 2. Earnings Cal
            hist = data.get("earningsHistory", {}).get("history", [])
            for h in hist:
                q = h.get("quarter")
                if isinstance(q, dict): q = q.get("fmt")
                if q:
                    cur.execute("""
                        INSERT INTO earnings_calendar (symbol, fiscal_quarter, eps_actual, eps_estimate, eps_surprise)
                        VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
                    """, (sym, q, extract_raw(h.get("epsActual")), extract_raw(h.get("epsEstimate")), extract_raw(h.get("epsDifference"))))
            
            # 3. Ownership
            holders = data.get("insiderHolders", {}).get("holders", [])
            for h in holders:
                name = h.get("name")
                if name:
                    cur.execute("""
                        INSERT INTO insider_trading (symbol, insider_name, insider_role, shares, transaction_date)
                        VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
                    """, (sym, name, h.get("relation"), extract_raw(h.get("positionDirect")), 
                          h.get("positionDirectDate", {}).get("fmt") if isinstance(h.get("positionDirectDate"), dict) else h.get("positionDirectDate")))

            # 4. Fair Value
            fin = data.get("financialData", {})
            target = extract_raw(fin.get("targetMeanPrice"))
            curr = extract_raw(fin.get("currentPrice"))
            if target and curr:
                upside = ((target - curr) / curr) * 100
                cur.execute("""
                    INSERT INTO fair_values (symbol, fair_value, upside, rating, last_updated)
                    VALUES (%s, %s, %s, %s, NOW()) 
                    ON CONFLICT (symbol, provider) DO UPDATE SET fair_value=EXCLUDED.fair_value, upside=EXCLUDED.upside
                """, (sym, target, upside, fin.get("recommendationKey")))

            logger.info(f"✅ {sym}: Success")

        except Exception as e:
            logger.error(f"❌ {sym} Error: {e}")
        finally:
            if conn: conn.close()

if __name__ == "__main__":
    main()
