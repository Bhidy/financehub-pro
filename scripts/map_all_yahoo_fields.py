import yfinance as yf
from yahooquery import Ticker
import json
import pandas as pd
import requests

# Target: Telecom Egypt (ISIN Ticker which we know works)
SYMBOL = 'EGS48031C016.CA'

def get_session():
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    return session

def flatten_json(y):
    out = {}
    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + '.')
        elif type(x) is list:
            pass # Ignore lists for key mapping (too dynamic), or just note existence
        else:
            out[name[:-1]] = x
    flatten(y)
    return out

def main():
    print(f"--- MAPPING ALL DATA FOR {SYMBOL} ---")
    session = get_session()
    
    report = {
        'yahooquery': {},
        'yfinance': {}
    }
    
    # 1. YahooQuery Modules (The Gold Mine)
    t = Ticker(SYMBOL)
    modules = [
        'assetProfile', 'balanceSheetHistory', 'balanceSheetHistoryQuarterly', 
        'calendarEvents', 'cashflowStatementHistory', 'cashflowStatementHistoryQuarterly', 
        'defaultKeyStatistics', 'earnings', 'earningsHistory', 'earningsTrend', 
        'esgScores', 'financialData', 'fundOwnership', 'fundPerformance', 
        'fundProfile', 'indexTrend', 'incomeStatementHistory', 
        'incomeStatementHistoryQuarterly', 'industryTrend', 'insiderHolders', 
        'insiderTransactions', 'institutionOwnership', 'majorHoldersBreakdown', 
        'pageViews', 'price', 'quoteType', 'recommendationTrend', 'secFilings', 
        'netSharePurchaseActivity', 'sectorTrend', 'summaryDetail', 
        'summaryProfile', 'topHoldings', 'upgradeDowngradeHistory'
    ]
    
    try:
        yq_data = t.get_modules(modules)
        if isinstance(yq_data, dict) and SYMBOL in yq_data:
            core = yq_data[SYMBOL]
            # Flatten to get unique keys
            flat = flatten_json(core)
            report['yahooquery'] = sorted(list(flat.keys()))
            print(f"YahooQuery Keys Found: {len(report['yahooquery'])}")
            
            # Save raw sample for type checking
            report['yahooquery_sample'] = core
    except Exception as e:
        report['yahooquery_error'] = str(e)

    # 2. YFinance Info (Supplementary)
    try:
        yf_tick = yf.Ticker(SYMBOL, session=session)
        yf_info = yf_tick.info
        report['yfinance'] = sorted(list(yf_info.keys()))
        print(f"YFinance Keys Found: {len(report['yfinance'])}")
    except Exception as e:
        report['yfinance_error'] = str(e)
        
    with open('yahoo_master_map.json', 'w') as f:
        json.dump(report, f, indent=4, default=str)
    
    print("Saved to yahoo_master_map.json")

if __name__ == "__main__":
    main()
