from yahooquery import Ticker
import json
import sys

# CIB Egypt (Major stock, most likely to have data)
# Trying both ISIN and Symbol
TARGETS = ["EGS69082C013.CA", "COMI.CA"] 

MODULES = [
    "assetProfile", "summaryDetail", "defaultKeyStatistics", 
    "financialData", "calendarEvents", "upgradeDowngradeHistory",
    "institutionOwnership", "majorHoldersBreakdown", "earnings", "esgScores",
    "price", "quoteType", "summaryProfile", "recommendationTrend", "indexTrend"
]

def clean_dict(d):
    """Recursively remove empty/null values to see what's actually there"""
    if not isinstance(d, dict): return d
    return {k: clean_dict(v) for k, v in d.items() if v is not None and v != {}}

def main():
    print(f"🕵️‍♂️ Deep Audit for targets: {TARGETS}")
    
    for sym in TARGETS:
        print(f"\n{'='*60}\nTARGET: {sym}\n{'='*60}")
        tick = Ticker(sym, asynchronous=False)
        
        # 1. Check all modules
        data = tick.get_modules(MODULES)
        
        if isinstance(data, dict) and sym in data:
            # Flatten and print keys
            quote_data = data[sym]
            if isinstance(quote_data, str): 
                print(f"❌ Error: {quote_data}")
                continue

            # Iterate modules
            found_points = 0
            for mod, content in quote_data.items():
                clean_content = clean_dict(content)
                if clean_content:
                    print(f"\n📦 MODULE: {mod}")
                    for k, v in clean_content.items():
                        print(f"   • {k}: {str(v)[:50]}...")
                        found_points += 1
            
            print(f"\n✅ Total Data Points Found: {found_points}")
        else:
            print("❌ No Module Data returned.")

if __name__ == "__main__":
    main()
