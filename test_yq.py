from yahooquery import Ticker

def test_yq(symbol):
    print(f"Testing {symbol} with YahooQuery...")
    t = Ticker(symbol)
    try:
        # Fetch history
        df = t.history(period='1mo', interval='1d')
        if not df.empty:
            print(f"SUCCESS: Found history for {symbol} - {len(df)} rows")
            print(df.head())
        else:
            print(f"FAILURE: No history for {symbol}")
            # check if it's an error in string format
            print(f"Response: {df}")
            
        summary = t.summary_detail
        if summary and isinstance(summary, dict) and symbol in summary:
             if isinstance(summary[symbol], dict) and 'marketCap' in summary[symbol]:
                 print(f"SUCCESS: Found Info for {symbol} - Market Cap: {summary[symbol]['marketCap']}")
             else:
                 print(f"FAILURE: No marketCap for {symbol}. Data: {summary[symbol]}")
        else:
             print(f"FAILURE: No Summary for {symbol}")
             
    except Exception as e:
        print(f"ERROR: {e}")

test_yq("COMI.CA")
