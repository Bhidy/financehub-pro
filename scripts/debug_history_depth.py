from yahooquery import Ticker
import pandas as pd

TARGET = "EGS69082C013.CA" # COMI

def test_fetch(name, **kwargs):
    print(f"\n🧪 Testing Strategy: {name} ({kwargs})")
    try:
        tick = Ticker(TARGET, asynchronous=False)
        df = tick.history(**kwargs)
        if isinstance(df, pd.DataFrame):
            print(f"   ✅ Rows Returned: {len(df)}")
            if len(df) > 0:
                print(f"   📅 Range: {df.index[0]} to {df.index[-1]}")
                print(df.head(1))
        else:
            print(f"   ❌ Result is not a DataFrame: {type(df)}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def main():
    print(f"🕵️‍♂️ Debugging History Depth for {TARGET}")
    
    # Strategy 1: Standard 2y
    test_fetch("Period 2y", period="2y", interval="1d")
    
    # Strategy 2: Explicit Start
    test_fetch("Start 2023", start="2023-01-01", interval="1d")
    
    # Strategy 3: Max
    test_fetch("Period Max", period="max", interval="1d")
    
    # Strategy 4: 1mo (Fallback)
    test_fetch("Period 1mo", period="1mo", interval="1d")

if __name__ == "__main__":
    main()
