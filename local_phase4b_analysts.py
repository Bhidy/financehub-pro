#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  PHASE 4B: ANALYST & EARNINGS DATA (Enterprise Edition)          ║
╚══════════════════════════════════════════════════════════════════╝
Collects:
- Recommendation Trends (Buy/Hold/Sell counts)
- Earnings Estimates (EPS forecasts)
- Earnings History (Actual vs Estimates)
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
    if isinstance(val, dict):
        return val.get("raw")
    return val

def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  🚀 PHASE 4B: ANALYST & EARNINGS COLLECTION                  ║")
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

    # Create tables if not exist
    cur.execute("""
        CREATE TABLE IF NOT EXISTS analyst_ratings (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            period VARCHAR(20),
            strong_buy INTEGER,
            buy INTEGER,
            hold INTEGER,
            sell INTEGER,
            strong_sell INTEGER,
            raw_data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(symbol, period)
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS earnings_estimates (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            period VARCHAR(50),
            period_type VARCHAR(20),
            avg_estimate NUMERIC,
            low_estimate NUMERIC,
            high_estimate NUMERIC,
            num_analysts INTEGER,
            growth NUMERIC,
            raw_data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(symbol, period)
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS earnings_history (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            quarter_date DATE,
            eps_actual NUMERIC,
            eps_estimate NUMERIC,
            surprise NUMERIC,
            surprise_percent NUMERIC,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(symbol, quarter_date)
        )
    """)
    
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    print(f"📊 Processing {len(symbols)} stocks...")
    print()
    
    modules = ["recommendationTrend", "earningsTrend", "earningsHistory"]
    stats = {"recs": 0, "estimates": 0, "history": 0}
    
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
            
            # 1. Recommendation Trends
            rec_trend = result.get("recommendationTrend", {}).get("trend", [])
            for rec in rec_trend:
                period = rec.get("period")
                if not period: continue
                
                try:
                    cur.execute("""
                        INSERT INTO analyst_ratings (symbol, period, strong_buy, buy, hold, sell, strong_sell, raw_data)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (symbol, period) DO NOTHING
                    """, (sym, period, 
                          extract_raw(rec.get("strongBuy")),
                          extract_raw(rec.get("buy")),
                          extract_raw(rec.get("hold")),
                          extract_raw(rec.get("sell")),
                          extract_raw(rec.get("strongSell")),
                          json.dumps(rec)))
                    stats["recs"] += 1
                except:
                    pass
            
            # 2. Earnings Trend (Estimates)
            earnings_trend = result.get("earningsTrend", {}).get("trend", [])
            for est in earnings_trend:
                period = est.get("period")
                if not period: continue
                
                eps_est = est.get("earningsEstimate", {})
                
                try:
                    cur.execute("""
                        INSERT INTO earnings_estimates (symbol, period, period_type, avg_estimate, low_estimate, 
                                                        high_estimate, num_analysts, growth, raw_data)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (symbol, period) DO NOTHING
                    """, (sym, period, est.get("endDate"),
                          extract_raw(eps_est.get("avg")),
                          extract_raw(eps_est.get("low")),
                          extract_raw(eps_est.get("high")),
                          extract_raw(eps_est.get("numberOfAnalysts")),
                          extract_raw(eps_est.get("growth")),
                          json.dumps(est)))
                    stats["estimates"] += 1
                except:
                    pass
            
            # 3. Earnings History
            earn_hist = result.get("earningsHistory", {}).get("history", [])
            for eh in earn_hist:
                q_date = eh.get("quarter")
                if not q_date: continue
                
                try:
                    cur.execute("""
                        INSERT INTO earnings_history (symbol, quarter_date, eps_actual, eps_estimate, 
                                                      surprise, surprise_percent)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (symbol, quarter_date) DO NOTHING
                    """, (sym, q_date,
                          extract_raw(eh.get("epsActual")),
                          extract_raw(eh.get("epsEstimate")),
                          extract_raw(eh.get("epsDifference")),
                          extract_raw(eh.get("surprisePercent"))))
                    stats["history"] += 1
                except:
                    pass
            
            print(f"✅ Recs:{stats['recs']} Ests:{stats['estimates']} Hist:{stats['history']}", flush=True)
            
        except Exception as e:
            print(f"❌ Error: {e}", flush=True)
        
        time.sleep(2)

    conn.close()
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  ✅ PHASE 4B COMPLETE!                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"Recommendations: {stats['recs']}")
    print(f"Earnings Estimates: {stats['estimates']}")
    print(f"Earnings History: {stats['history']}")

if __name__ == "__main__":
    main()
