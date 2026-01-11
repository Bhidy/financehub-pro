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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
    })
    return session

SYMBOLS = ['COMI.CA']

def main():
    report = {}
    session = get_session()
    
    for sym in SYMBOLS:
        print(f"--- Probing {sym} ---")
        report[sym] = {}
        
        # 1. YFINANCE PROBE
        try:
            print(".. yfinance history")
            dat = yf.Ticker(sym, session=session)
            hist = dat.history(period="5d")
            if not hist.empty:
                report[sym]['yf_history_cols'] = list(hist.columns)
                report[sym]['yf_last_price'] = hist.iloc[-1]['Close']
            else:
                report[sym]['yf_history'] = "EMPTY"
                
            print(".. yfinance info")
            try:
                report[sym]['yf_info'] = dat.info
            except Exception as e:
                report[sym]['yf_info_error'] = str(e)
                
        except Exception as e:
            report[sym]['yf_critical_error'] = str(e)
            
        time.sleep(2)
        
        # 2. YAHOOQUERY PROBE
        try:
            print(".. yahooquery modules")
            # yahooquery allows passing requests session? 
            # It uses its own logic, but let's try standard init
            t = Ticker(sym, country='Egypt') 
            
            modules = [
                'summaryProfile', 'financialData', 'defaultKeyStatistics', 
                'assetProfile', 'price'
            ]
            data = t.get_modules(modules)
            report[sym]['yq_modules'] = data
            
        except Exception as e:
            report[sym]['yq_error'] = str(e)

    # Save
    with open('egx_probe_v2.json', 'w') as f:
        json.dump(report, f, indent=4, default=str)
    print("Probe V2 Complete.")

if __name__ == "__main__":
    main()
