
from yahooquery import Ticker
import pandas as pd

print("Testing YahooQuery for 1010.SR...")
try:
    t = Ticker("1010.SR")
    df = t.history(period="1y", interval="1d")
    print(f"Result type: {type(df)}")
    if isinstance(df, pd.DataFrame):
        print(f"Columns: {df.columns}")
        print(f"Rows: {len(df)}")
        print(df.head())
    else:
        print(f"Result: {df}")
except Exception as e:
    print(f"Error: {e}")
