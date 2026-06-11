#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  PHASE 5: OWNERSHIP DATA COLLECTION (Enterprise Edition)         ║
╚══════════════════════════════════════════════════════════════════╝
Collects:
- Institutional Ownership (Major funds/institutions)
- Fund Ownership (Mutual funds)
- Major Holders Breakdown (Insider vs Institution %)
"""

import sys
import psycopg2
import time
import json
from yahooquery import Ticker
from datetime import datetime

sys.stdout.reconfigure(line_buffering=True)

import os
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL environment variable not set. Set it before running this script.")


def extract_raw(val):
    if isinstance(val, dict):
        return val.get("raw")
    return val

def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  🚀 PHASE 5: OWNERSHIP DATA COLLECTION                       ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"Started: {datetime.now()}")
    print()
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ DB Connection Error: {e}")
        return

    # Create tables
    cur.execute("""
        CREATE TABLE IF NOT EXISTS institutional_holders (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            holder_name TEXT,
            shares_held BIGINT,
            percent_held NUMERIC,
            value NUMERIC,
            as_of_date DATE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(symbol, holder_name)
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ownership_breakdown (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) UNIQUE,
            insiders_percent NUMERIC,
            institutions_percent NUMERIC,
            institutions_float_percent NUMERIC,
            institutions_count INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    
    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    print(f"📊 Processing {len(symbols)} stocks...")
    print()
    
    modules = ["institutionOwnership", "fundOwnership", "majorHoldersBreakdown"]
    stats = {"institutions": 0, "funds": 0, "breakdowns": 0}
    
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
            
            # 1. Institutional Ownership
            inst_list = result.get("institutionOwnership", {}).get("ownershipList", [])
            for inst in inst_list:
                name = inst.get("organization")
                if not name: continue
                
                try:
                    cur.execute("""
                        INSERT INTO institutional_holders (symbol, holder_name, shares_held, percent_held, value, as_of_date)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (symbol, holder_name) DO UPDATE SET
                            shares_held = EXCLUDED.shares_held,
                            percent_held = EXCLUDED.percent_held,
                            value = EXCLUDED.value,
                            as_of_date = EXCLUDED.as_of_date
                    """, (sym, name,
                          extract_raw(inst.get("position")),
                          extract_raw(inst.get("pctHeld")),
                          extract_raw(inst.get("value")),
                          inst.get("reportDate")))
                    stats["institutions"] += 1
                except Exception:
                    pass
            
            # 2. Fund Ownership (same table)
            fund_list = result.get("fundOwnership", {}).get("ownershipList", [])
            for fund in fund_list:
                name = fund.get("organization")
                if not name: continue
                
                try:
                    cur.execute("""
                        INSERT INTO institutional_holders (symbol, holder_name, shares_held, percent_held, value, as_of_date)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (symbol, holder_name) DO UPDATE SET
                            shares_held = EXCLUDED.shares_held,
                            percent_held = EXCLUDED.percent_held,
                            value = EXCLUDED.value,
                            as_of_date = EXCLUDED.as_of_date
                    """, (sym, name,
                          extract_raw(fund.get("position")),
                          extract_raw(fund.get("pctHeld")),
                          extract_raw(fund.get("value")),
                          fund.get("reportDate")))
                    stats["funds"] += 1
                except Exception:
                    pass
            
            # 3. Major Holders Breakdown
            mhb = result.get("majorHoldersBreakdown", {})
            if mhb:
                try:
                    cur.execute("""
                        INSERT INTO ownership_breakdown (symbol, insiders_percent, institutions_percent, 
                                                        institutions_float_percent, institutions_count)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (symbol) DO UPDATE SET
                            insiders_percent = EXCLUDED.insiders_percent,
                            institutions_percent = EXCLUDED.institutions_percent,
                            institutions_float_percent = EXCLUDED.institutions_float_percent,
                            institutions_count = EXCLUDED.institutions_count
                    """, (sym,
                          extract_raw(mhb.get("insidersPercentHeld")),
                          extract_raw(mhb.get("institutionsPercentHeld")),
                          extract_raw(mhb.get("institutionsFloatPercentHeld")),
                          extract_raw(mhb.get("institutionsCount"))))
                    stats["breakdowns"] += 1
                except Exception:
                    pass
            
            print(f"✅ Inst:{stats['institutions']} Funds:{stats['funds']} Brkdn:{stats['breakdowns']}", flush=True)
            
        except Exception as e:
            print(f"❌ Error: {e}", flush=True)
        
        time.sleep(2)

    conn.close()
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  ✅ PHASE 5 COMPLETE!                                         ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"Institutional Holders: {stats['institutions']}")
    print(f"Fund Holders: {stats['funds']}")
    print(f"Ownership Breakdowns: {stats['breakdowns']}")

if __name__ == "__main__":
    main()
