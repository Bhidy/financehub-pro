#!/usr/bin/env python3
"""
PHASE 4C: CORPORATE ACTIONS & FAIR VALUES
=========================================
1. Corporate Actions: Fetches from Mubasher API (Source of Truth)
2. Fair Values: Fetches targetMeanPrice from Yahoo Finance
"""

import sys
import psycopg2
import time
import json
import requests
from yahooquery import Ticker
from datetime import datetime

sys.stdout.reconfigure(line_buffering=True)

# Supabase Connection
DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require",
    "connect_timeout": 30
}

AR_MONTHS = {
    "يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "مايو": 5, "يونيو": 6,
    "يوليو": 7, "أغسطس": 8, "سبتمبر": 9, "أكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12
}

def parse_ar_date(d_str):
    try:
        if not d_str: return None
        parts = d_str.split()
        if len(parts) >= 3:
            day = int(parts[0])
            month_ar = parts[1]
            year = int(parts[2])
            month = AR_MONTHS.get(month_ar, 1)
            return datetime(year, month, day).date()
    except:
        pass
    return None

def extract_symbol(url):
    import re
    match = re.search(r'stocks/(\d+)', url or "")
    return match.group(1) if match else None

def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  🚀 PHASE 4C: ACTIONS & FAIR VALUES                          ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return

    # 1. CORPORATE ACTIONS (Mubasher)
    print("\n📦 Fetching Corporate Actions (Mubasher)...")
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS corporate_actions (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20),
                action_type VARCHAR(100),
                description TEXT,
                announcement_date DATE,
                ex_date DATE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(symbol, action_type, announcement_date)
            )
        """)
        
        start = 0
        size = 1000
        total_actions = 0
        
        while True:
            try:
                url = f"https://www.mubasher.info/api/1/corporate-actions?start={start}&size={size}"
                headers = {"User-Agent": "Mozilla/5.0"}
                resp = requests.get(url, headers=headers, timeout=30)
                data = resp.json()
                rows = data.get('rows', [])
                
                if not rows: break
                
                for r in rows:
                    symbol = extract_symbol(r.get('url'))
                    if not symbol: continue
                    
                    try:
                        cur.execute("""
                            INSERT INTO corporate_actions 
                            (symbol, action_type, description, announcement_date, ex_date)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT DO NOTHING
                        """, (symbol, r.get('type'), 
                              r.get('description') or r.get('title'),
                              parse_ar_date(r.get('announcedAt')),
                              parse_ar_date(r.get('effectiveFrom'))))
                        total_actions += 1
                    except: pass
                
                print(f"  Fetched {len(rows)} actions (Total: {total_actions})...")
                if len(rows) < size: break
                start += size
                time.sleep(1)
                
            except Exception as e:
                print(f"  Error fetching actions: {e}")
                break
                
        print(f"✅ Corporate Actions Complete: {total_actions} records")

    except Exception as e:
        print(f"❌ Corporate Actions Failed: {e}")

    # 2. FAIR VALUES (Yahoo)
    print("\n💎 Fetching Fair Values (Yahoo Target Prices)...")
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS fair_values (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20),
                provider VARCHAR(50) DEFAULT 'Yahoo',
                fair_value NUMERIC,
                upside NUMERIC,
                rating VARCHAR(20),
                last_updated TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(symbol, provider)
            )
        """)

        cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
        symbols = [r[0] for r in cur.fetchall()]
        
        for idx, sym in enumerate(symbols):
            try:
                t = Ticker(f"{sym}.SR", asynchronous=False)
                data = t.get_modules("financialData defaultKeyStatistics")
                res = data.get(f"{sym}.SR")
                
                if isinstance(res, dict):
                    fin = res.get("financialData", {})
                    target = fin.get("targetMeanPrice", {}).get("raw")
                    current = fin.get("currentPrice", {}).get("raw")
                    rec = fin.get("recommendationKey")
                    
                    if target and current:
                        upside = ((target - current) / current) * 100
                        cur.execute("""
                            INSERT INTO fair_values (symbol, fair_value, upside, rating, last_updated)
                            VALUES (%s, %s, %s, %s, NOW())
                            ON CONFLICT (symbol, provider) 
                            DO UPDATE SET fair_value = EXCLUDED.fair_value,
                                          upside = EXCLUDED.upside,
                                          rating = EXCLUDED.rating,
                                          last_updated = NOW()
                        """, (sym, target, upside, rec))
                        print(f"  [{idx+1}/{len(symbols)}] {sym}: Target {target} ({upside:.1f}%)")
                    else:
                         print(f"  [{idx+1}/{len(symbols)}] {sym}: No target")
                
                time.sleep(0.5)
            except Exception as e:
                print(f"  [{idx+1}/{len(symbols)}] {sym}: Error")

    except Exception as e:
        print(f"❌ Fair Values Failed: {e}")

    conn.close()
    print("\n✅ PHASE 4C COMPLETE!")

if __name__ == "__main__":
    main()
