import yfinance as yf
from yahooquery import Ticker
import json
import pandas as pd

# 3 Major Stocks to ensure coverage
STOCKS = ["EGS69082C013.CA", "EGS65541C012.CA", "EGS60121C018.CA"] # CIB, EFG, EAST

def probe_yfinance(sym):
    print(f"🔎 [yfinance] Probing {sym}...")
    try:
        t = yf.Ticker(sym)
        info = t.info
        return {k: v for k, v in info.items() if v is not None}
    except Exception as e:
        print(f"❌ yfinance Error: {e}")
        return {}

def probe_yahooquery(sym):
    print(f"🔎 [yahooquery] Probing {sym}...")
    try:
        t = Ticker(sym, asynchronous=False)
        data = t.all_modules
        if isinstance(data, dict) and sym in data:
            return data[sym] # This is a nested dict of modules
        return {}
    except Exception as e:
        print(f"❌ yahooquery Error: {e}")
        return {}

def flatten_dict(d, parent_key='', sep='_'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def main():
    master_keys = set()
    
    for s in STOCKS:
        # 1. YFinance
        yf_data = probe_yfinance(s)
        flat_yf = flatten_dict(yf_data, parent_key='yf')
        
        # 2. YahooQuery
        yq_data = probe_yahooquery(s)
        flat_yq = flatten_dict(yq_data, parent_key='yq')
        
        # Combine
        combined = {**flat_yf, **flat_yq}
        
        print(f"\n📊 {s}: Found {len(combined)} Total Data Points.")
        for k, v in combined.items():
            if v and str(v) != 'None' and str(v) != '{}':
                master_keys.add(k)
                # print(f"  {k}: {str(v)[:30]}")

    print(f"\n{'='*50}\n🏆 MASTER LIST: {len(master_keys)} Verified Non-Null Keys\n{'='*50}")
    sorted_keys = sorted(list(master_keys))
    for k in sorted_keys:
        print(k)

if __name__ == "__main__":
    main()
