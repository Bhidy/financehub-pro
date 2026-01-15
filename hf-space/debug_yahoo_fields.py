import asyncio
from yahooquery import Ticker
import json

def get_full_yahoo_map(symbol):
    print(f"Analyzing Yahoo Data for: {symbol}")
    t = Ticker(symbol)
    
    # API 1: The 'Modules' Endpoint (Depth & Fundamentals)
    modules = 'summaryDetail assetProfile financialData defaultKeyStatistics price'
    all_modules = t.get_modules(modules)
    
    # API 2: The 'History' Endpoint (Time Series)
    history = t.history(period='1d')
    
    print("\n--- API 1: MODULES DATA (Snapshot) ---")
    data = all_modules.get(symbol, {})
    for mod_name, mod_data in data.items():
        print(f"\n[{mod_name}]")
        if isinstance(mod_data, dict):
            keys = list(mod_data.keys())
            # print first 5 keys and count
            print(f"Fields Available: {len(keys)}")
            for k in keys:
                 val = mod_data.get(k)
                 print(f" - {k}: {val}")
        else:
            print(f"Raw: {mod_data}")

    print("\n\n--- API 2: HISTORY DATA (Time Series) ---")
    if not history.empty:
        print("Columns:", history.columns.tolist())
        print("Last Row:", history.iloc[-1].to_dict())
    else:
        print("No history found.")

if __name__ == "__main__":
    get_full_yahoo_map("COMI.CA")
