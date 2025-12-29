#!/usr/bin/env python3
"""
ENTERPRISE FUNDAMENTAL DATA COLLECTOR (YahooQuery v2)
=====================================================
- Fetches Market Cap, PE, Beta, Profile using yahooquery.
- Updates 'market_tickers' and 'company_profiles'.
"""

import sys
import psycopg2
import time
import json
from yahooquery import Ticker
from datetime import datetime

sys.stdout.reconfigure(line_buffering=True)

# Connection
DB_PARAMS = {
    "host": "aws-1-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgjpkphfjmmiyjsgsaup",
    "password": "3pmFAnJfL22nJwQO",
    "sslmode": "require",
    "connect_timeout": 30
}

def main():
    print("🚀 STARTING FUNDAMENTAL DATA COLLECTION (YahooQuery v2)...", flush=True)
    
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"DB Error: {e}")
        return

    cur.execute("SELECT symbol FROM market_tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]

    # Use yahooquery modules
    modules = ["summaryDetail", "defaultKeyStatistics", "summaryProfile", "price"]

    for idx, sym in enumerate(symbols):
        print(f"[{idx+1}/{len(symbols)}] {sym} Funda...", end=" ", flush=True)
        
        try:
            # APPEND .SR for Saudi Market
            sym_sa = f"{sym}.SR"
            t = Ticker(sym_sa, asynchronous=False)
            data = t.get_modules(modules)
            result = data.get(sym_sa)

            if not result or isinstance(result, str):
                print("❌ No Data", flush=True)
                time.sleep(1)
                continue
            
            def extract_raw(val):
                if isinstance(val, dict):
                    return val.get("raw")
                return val
            
            stats = result.get("defaultKeyStatistics", {})
            summary = result.get("summaryDetail", {})
            profile = result.get("summaryProfile", {})
            price = result.get("price", {})

            # 1. Update market_tickers
            updates = {
                "market_cap": extract_raw(summary.get("marketCap")),
                "pe_ratio": extract_raw(summary.get("trailingPE")),
                "pb_ratio": extract_raw(stats.get("priceToBook")),
                "beta": extract_raw(summary.get("beta")),
                "dividend_yield": extract_raw(summary.get("dividendYield")),
                "high_52w": extract_raw(summary.get("fiftyTwoWeekHigh")),
                "low_52w": extract_raw(summary.get("fiftyTwoWeekLow")),
                "prev_close": extract_raw(summary.get("previousClose")),
                "open_price": extract_raw(summary.get("open")),
                "volume": extract_raw(summary.get("volume")),
            }
            
            sql_set = []
            vals = []
            for k, v in updates.items():
                if v is not None:
                    sql_set.append(f"{k} = %s")
                    vals.append(v)
            
            if sql_set:
                vals.append(sym)
                query = f"UPDATE market_tickers SET {', '.join(sql_set)}, last_updated = NOW() WHERE symbol = %s"
                cur.execute(query, tuple(vals))

            # 2. Upsert company_profiles
            desc = profile.get("longBusinessSummary")
            web = profile.get("website")
            addr = f"{profile.get('address1', '')}, {profile.get('city', '')} {profile.get('country', '')}"
            officers = json.dumps(profile.get("companyOfficers", []))
            
            if desc:
                cur.execute("""
                    INSERT INTO company_profiles (symbol, description, website, address, officers, last_updated)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (symbol) DO UPDATE SET
                    description = EXCLUDED.description,
                    website = EXCLUDED.website,
                    address = EXCLUDED.address,
                    officers = EXCLUDED.officers,
                    last_updated = NOW()
                """, (sym, desc, web, addr, officers))

            print("✅ Updated", flush=True)
            
        except Exception as e:
            print(f"Error: {e}", flush=True)
        
        # Sleep to be polite to Yahoo + Parallel script
        time.sleep(2)

    conn.close()
    print("✅ FUNDAMENTALS COMPLETE!")

if __name__ == "__main__":
    main()
