import yfinance as yf
import requests

def test_with_headers(symbol):
    print(f"Testing {symbol} with Custom Headers...")
    
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    
    try:
        t = yf.Ticker(symbol, session=session)
        hist = t.history(period="1mo")
        if not hist.empty:
            print(f"SUCCESS: Found history for {symbol} - {len(hist)} rows")
        else:
            print(f"FAILURE: No history for {symbol}")
            
    except Exception as e:
        print(f"ERROR: {e}")

test_with_headers("COMI.CA")
