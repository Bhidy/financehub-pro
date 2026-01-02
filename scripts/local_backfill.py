#!/usr/bin/env python3
"""
ENTERPRISE DATA COLLECTION v6.4 - SELF-HEALING & ETERNAL
========================================================
- Includes ALL previous evasive tactics
- ADDS: Database Auto-Reconnect logic
- Capable of running for 24+ hours without crashing
- Resumes automatically on network failure
"""

import sys
import psycopg2
import psycopg2.extras
from datetime import datetime
import requests
import json
import time
import random

sys.stdout.reconfigure(line_buffering=True)

# Connection details
DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require",
    "connect_timeout": 30
}

stats = {"ohlc": 0, "h1": 0, "m5": 0, "done": 0, "fail": 0}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

conn = None
cur = None

def connect_db():
    """Connect or Reconnect to Database"""
    global conn, cur
    try:
        if conn:
            conn.close()
    except: pass
    
    attempts = 0
    while attempts < 10:
        try:
            print(f"🔌 Connecting to DB (Attempt {attempts+1})...", flush=True)
            conn = psycopg2.connect(**DB_PARAMS)
            conn.autocommit = True
            cur = conn.cursor()
            print("✅ Connected!", flush=True)
            return True
        except Exception as e:
            print(f"❌ DB Conn Fail: {e}", flush=True)
            time.sleep(5)
            attempts += 1
    return False

def check_db_connection():
    """Verify DB connection is alive, reconnect if not"""
    global conn, cur
    try:
        cur.execute("SELECT 1")
    except Exception:
        print("⚠️ DB Connection Lost! Reconnecting...", flush=True)
        connect_db()

def fetch_raw_data_debug(sym, range_, interval):
    """Fetch data with detailed debug logging"""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}.SR?range={range_}&interval={interval}&includeAdjustedClose=true"
    
    max_retries = 3
    for attempt in range(max_retries):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "*/*",
            "Origin": "https://finance.yahoo.com"
        }
        
        try:
            r = requests.get(url, headers=headers, timeout=5)
            
            if r.status_code == 200:
                data = r.json()
                result = data.get("chart", {}).get("result", [None])[0]
                if not result: return None
                
                timestamps = result.get("timestamp", [])
                indicators = result.get("indicators", {}).get("quote", [None])[0]
                
                if not indicators: return None
                
                opens = indicators.get("open", [])
                highs = indicators.get("high", [])
                lows = indicators.get("low", [])
                closes = indicators.get("close", [])
                volumes = indicators.get("volume", [])
                
                records = []
                for i in range(len(timestamps)):
                    if opens[i] is None: continue
                    records.append((
                        sym,                            # symbol
                        datetime.fromtimestamp(timestamps[i]), # date/timestamp
                        opens[i], highs[i], lows[i], closes[i], int(volumes[i])
                    ))
                return records
            elif r.status_code == 404:
                return None
            else:
                time.sleep(1)
                
        except Exception as e:
            time.sleep(0.5)
            continue
            
    return None

def main():
    print("=" * 60, flush=True)
    print("  🚀 ENTERPRISE DATA COLLECTION v6.4 (SELF-HEALING)", flush=True)
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print("=" * 60, flush=True)
    
    if not connect_db():
        print("Fatal: Could not connect to DB.")
        return
    
    # Get symbols
    try:
        cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
        symbols = [r[0] for r in cur.fetchall()]
        total = len(symbols)
        print(f"📊 {total} stocks found\n", flush=True)
    except Exception as e:
        print(f"Failed to fetch symbols: {e}")
        return
    
    # Start loop
    start_index = 0
    # Optional: logic to skip processed if needed, but ON CONFLICT is safer
    
    for idx, sym in enumerate(symbols):
        # RESUME LOGIC: Skip stocks already processed successfully
        if sym < "2287":
            continue

        records = 0
        print(f"[{idx+1}/{total}] {sym}...", end=" ", flush=True)
        
        # Ensure DB is alive before processing
        check_db_connection()
        
        # 1. Daily OHLC
        batch = fetch_raw_data_debug(sym, "10y", "1d")
        if batch:
            ohlc_batch = [(r[0], r[1].date(), r[2], r[3], r[4], r[5], r[6]) for r in batch]
            try:
                psycopg2.extras.execute_batch(cur, """
                    INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (symbol, date) DO NOTHING
                """, ohlc_batch, page_size=1000)
                stats["ohlc"] += len(batch)
                records += len(batch)
            except Exception as e:
                print(f"DB Err (OHLC): {e}", flush=True)
                check_db_connection() # Reconnect if error was connection related
        
        # 2. Intraday 1h
        batch = fetch_raw_data_debug(sym, "730d", "60m")
        if batch:
            try:
                psycopg2.extras.execute_batch(cur, """
                    INSERT INTO intraday_1h (symbol, timestamp, open, high, low, close, volume)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (symbol, timestamp) DO NOTHING
                """, batch, page_size=1000)
                stats["h1"] += len(batch)
                records += len(batch)
            except Exception as e:
                check_db_connection()
            
        # 3. Intraday 5m
        batch = fetch_raw_data_debug(sym, "60d", "5m")
        if batch:
            try:
                psycopg2.extras.execute_batch(cur, """
                    INSERT INTO intraday_5m (symbol, timestamp, open, high, low, close, volume)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (symbol, timestamp) DO NOTHING
                """, batch, page_size=1000)
                stats["m5"] += len(batch)
                records += len(batch)
            except Exception as e:
                check_db_connection()
        
        stats["done"] += 1
        total_all = stats["ohlc"] + stats["h1"] + stats["m5"]
        print(f"✅ {records:,} recs (Total: {total_all:,})", flush=True)
        
        if records > 0:
            time.sleep(1.0) # Sleep longer after heavy inserts
        else:
            time.sleep(0.1) # Skip fast

    print(f"\n✅ COMPLETE! Total: {total_all:,}")
    if conn: conn.close()

if __name__ == "__main__":
    main()
