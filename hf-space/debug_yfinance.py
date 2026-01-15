import yfinance as yf
import json

def analyze_yfinance_egx(symbol):
    print(f"=== ANALYZING: {symbol} ===")
    t = yf.Ticker(symbol)
    
    # 1. INFO API
    print("\n--- API 1: CORPORATE & FUNDAMENTAL DATA (Info) ---")
    info = t.info
    if info:
        keys = sorted(list(info.keys()))
        print(f"Total Fields Available: {len(keys)}")
        
        # Categorize them for the report
        categories = {
            "Profile": ['sector', 'industry', 'website', 'city', 'longBusinessSummary'],
            "Valuation": ['marketCap', 'trailingPE', 'forwardPE', 'priceToBook', 'enterpriseValue'],
            "Financials": ['totalRevenue', 'netIncomeToCommon', 'operatingMargins', 'totalDebt'],
            "Trading": ['volume', 'averageVolume', 'dayHigh', 'fiftyTwoWeekHigh', 'bid', 'ask']
        }
        
        for cat, fields in categories.items():
            print(f"\n[{cat} Sample]")
            for f in fields:
                val = info.get(f, 'N/A')
                print(f"  {f}: {val}")
                
        print("\nAll Fields List (Snippet):")
        print(keys[:10], "...")
    else:
        print("ERROR: No info returned.")

    # 2. HISTORY API
    print("\n--- API 2: MARKET TIME-SERIES (History) ---")
    hist = t.history(period="5d")
    if not hist.empty:
        print("Columns:", hist.columns.tolist())
        print("Last Record:")
        print(hist.iloc[-1])
    else:
        print("ERROR: No history returned.")

if __name__ == "__main__":
    analyze_yfinance_egx("COMI.CA")
