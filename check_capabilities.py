import sys
from yahooquery import Ticker
import json

# Major Saudi Stocks to test (Al Rajhi, SABIC, Aramco)
SYMBOLS = ['1120.SR', '2010.SR', '2222.SR']

def check_modules():
    print("--- PROBING SAUDI MARKET DATA CAPABILITIES ---")
    
    # List of common Yahoo Finance modules
    # https://yahooquery.dpguthrie.com/guide/ticker/modules/
    modules = [
        'assetProfile', 'balanceSheetHistory', 'balanceSheetHistoryQuarterly',
        'calendarEvents', 'cashflowStatementHistory', 'cashflowStatementHistoryQuarterly',
        'defaultKeyStatistics', 'earnings', 'earningsHistory', 'earningsTrend',
        'esgScores', 'financialData', 'fundOwnership', 'fundPerformance', 'fundProfile',
        'indexTrend', 'incomeStatementHistory', 'incomeStatementHistoryQuarterly',
        'industryTrend', 'insiderHolders', 'insiderTransactions', 'institutionOwnership',
        'majorHoldersBreakdown', 'pageViews', 'price', 'quoteType',
        'recommendationTrend', 'secFilings', 'netSharePurchaseActivity',
        'sectorTrend', 'summaryDetail', 'summaryProfile', 'topHoldings',
        'upgradeDowngradeHistory'
    ]
    
    t = Ticker(SYMBOLS[0], asynchronous=False) # Use 1120.SR
    
    # Fetch ALL modules
    print(f"Fetching {len(modules)} modules for {SYMBOLS[0]}...")
    try:
        data = t.get_modules(modules)
        
        # Analyze what is present
        stock_data = data.get(SYMBOLS[0], {})
        
        if isinstance(stock_data, str):
            print(f"Error: {stock_data}")
            return

        present_modules = []
        missing_modules = []
        
        for mod in modules:
            val = stock_data.get(mod)
            if val and isinstance(val, dict) and len(val) > 0:
                present_modules.append(mod)
            # Sometimes it returns a list
            elif val and isinstance(val, list) and len(val) > 0:
                present_modules.append(mod)
            else:
                missing_modules.append(mod)
                
        print(f"\n✅ AVAILABLE MODULES ({len(present_modules)}):")
        for m in present_modules:
            print(f" - {m}")
            
        print(f"\n❌ UNAVAILABLE / EMPTY ({len(missing_modules)}):")
        for m in missing_modules:
            print(f" - {m}")
            
        # detailed check for financials
        print("\n--- SAMPLE FINANCIALS (Income Statement) ---")
        inc = stock_data.get('incomeStatementHistory', {})
        print(json.dumps(inc, indent=2)[:500] + "...")

    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    check_modules()
