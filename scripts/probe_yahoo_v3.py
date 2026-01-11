import yfinance as yf
from yahooquery import Ticker
import json
import requests
import sys
import time

# Robust Session to avoid 429
def get_session():
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    return session

SYMBOLS = ['EGS48031C016.CA'] # Telecom Egypt ISIN Ticker from Search

def main():
    report = {}
    session = get_session()
    
    for sym in SYMBOLS:
        print(f"--- Probing V3 {sym} ---")
        report[sym] = {}
        
        # 1. YAHOOQUERY PROBE (Try this first, it's the main hope for fundamentals)
        try:
            print(".. yahooquery modules")
            # REMOVED country argument
            t = Ticker(sym) 
            
            modules = [
                'summaryProfile', 'financialData', 'defaultKeyStatistics', 
                'assetProfile', 'price', 'calendarEvents', 'earnings',
                'recommendationTrend'
            ]
            data = t.get_modules(modules)
            
            # Check for error in response
            if isinstance(data, dict):
                if isinstance(data.get(sym), str): # Error string
                     report[sym]['yq_modules_result'] = "ERROR_STRING: " + data[sym]
                else:
                    report[sym]['yq_modules_result'] = "SUCCESS"
                    report[sym]['yq_keys'] = list(data.get(sym, {}).keys())
                    # Sample some data
                    report[sym]['yq_price'] = data.get(sym, {}).get('price', {})
            else:
                 report[sym]['yq_modules_result'] = "UNKNOWN_TYPE"
            
        except Exception as e:
            report[sym]['yq_error'] = str(e)

        time.sleep(1)

    # Save
    with open('egx_probe_v3.json', 'w') as f:
        json.dump(report, f, indent=4, default=str)
    print("Probe V3 Complete.")

if __name__ == "__main__":
    main()
