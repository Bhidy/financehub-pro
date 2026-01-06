
import yfinance as yf
import json

def test_egypt():
    # Test valid EGX symbols with .CA suffix (Cairo Exchange)
    symbols = ['COMI.CA', 'SWDY.CA', 'HRHO.CA', 'EAST.CA']
    print(f"Fetching: {symbols}")
    
    tickers = yf.Tickers(' '.join(symbols))
    
    for sym in symbols:
        try:
            info = tickers.tickers[sym].info
            price = info.get('currentPrice') or info.get('regularMarketPrice')
            print(f"{sym}: {price} {info.get('currency')}")
        except Exception as e:
            print(f"{sym}: Failed - {e}")
    print("DONE")

if __name__ == "__main__":
    test_egypt()
