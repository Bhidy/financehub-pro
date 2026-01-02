import yfinance as yf
import time

print("Testing yfinance library...")
try:
    ticker = yf.Ticker("1010.SR")
    
    # 1. Info
    print("Fetching Info...")
    info = ticker.info
    print(f"Info keys: {len(info)}")
    
    # 2. Financials
    print("Fetching Financials...")
    fin = ticker.quarterly_financials
    print(f"Financials Shape: {fin.shape if hasattr(fin, 'shape') else 'None'}")
    
    # 3. Ownership
    print("Fetching Major Holders...")
    holders = ticker.major_holders
    print(f"Holders: {holders}")

    print("✅ yfinance seems successfully connected!")

except Exception as e:
    print(f"❌ yfinance Failed: {e}")
