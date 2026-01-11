import yfinance as yf
import pandas as pd

def test_ticker(symbol):
    print(f"Testing {symbol}...")
    t = yf.Ticker(symbol)
    try:
        hist = t.history(period="1mo")
        if not hist.empty:
            print(f"SUCCESS: Found history for {symbol} - {len(hist)} rows")
        else:
            print(f"FAILURE: No history for {symbol}")
            
        info = t.info
        if info and 'marketCap' in info:
             print(f"SUCCESS: Found Info for {symbol} - Market Cap: {info.get('marketCap')}")
        else:
             print(f"FAILURE: No Info for {symbol}")
             
    except Exception as e:
        print(f"ERROR: {e}")

test_ticker("COMI.CA")
test_ticker("1120.SR")
