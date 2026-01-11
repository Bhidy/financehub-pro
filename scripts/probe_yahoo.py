import yfinance as yf
from yahooquery import Ticker
import json
import pandas as pd
import sys

# Sample EGX Stocks (Blue chips)
SYMBOLS = ['COMI.CA', 'EAST.CA', 'HRHO.CA']

def probe_yfinance(symbol):
    print(f"--- Probing yfinance for {symbol} ---")
    stock = yf.Ticker(symbol)
    
    data = {}
    
    # 1. Info
    try:
        data['info'] = stock.info
    except Exception as e:
        data['info_error'] = str(e)
        
    # 2. History (1mo)
    try:
        hist = stock.history(period="1mo")
        data['history_sample'] = json.loads(hist.tail(5).to_json(orient='index', date_format='iso'))
    except Exception as e:
        data['history_error'] = str(e)
        
    # 3. Actions
    try:
        data['actions'] = json.loads(stock.actions.to_json(orient='index', date_format='iso'))
    except: pass
    
    return data

def probe_yahooquery(symbol):
    print(f"--- Probing yahooquery for {symbol} ---")
    t = Ticker(symbol)
    
    data = {}
    
    # Fetch ALL modules known to yahooquery
    modules = [
        'asset_profile', 'calendar_events', 'default_key_statistics', 'earnings',
        'earnings_history', 'earnings_trend', 'financial_data', 'fund_ownership',
        'grading_history', 'index_trend', 'insider_holders', 'insider_transactions',
        'institution_ownership', 'major_holders_breakdown', 'page_views', 'price',
        'quote_type', 'recommendation_trend', 'sec_filings', 'share_purchase_activity',
        'summary_detail', 'summary_profile', 'symbol', 'upgrade_downgrade_history'
    ]
    
    try:
        all_modules = t.get_modules(modules)
        data['modules'] = all_modules
    except Exception as e:
        data['modules_error'] = str(e)
        
    # Valuation Info
    try:
        data['valuation'] = t.valuation_measures
    except: pass
    
    return data

def main():
    report = {}
    
    for sym in SYMBOLS:
        report[sym] = {
            'yfinance': probe_yfinance(sym),
            'yahooquery': probe_yahooquery(sym)
        }
        
    with open('egx_yahoo_probe.json', 'w') as f:
        json.dump(report, f, indent=4, default=str)
        
    print("Probe complete. Saved to egx_yahoo_probe.json")

if __name__ == "__main__":
    main()
