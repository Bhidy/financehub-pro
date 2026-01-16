import yfinance as yf
import tls_client

def check_yahoo_details():
    print("--- Yahoo Upgrades/Downgrades ---")
    try:
        ticker = yf.Ticker("1120.SR")
        up = ticker.upgrades_downgrades
        if up is not None and not up.empty:
            print(up.tail())
            print("✅ YAHOO FIRMS FOUND!")
        else:
            print("❌ Yahoo Firms Empty for 1120.SR")
    except Exception as e:
        print(f"Yahoo Err: {e}")

def probe_argaam():
    print("\n--- Probing Argaam ---")
    session = tls_client.Session(client_identifier="chrome_120")
    url = "https://www.argaam.com/en/company/analyst-estimates/marketid/3"
    try:
        resp = session.get(url)
        print(f"Argaam Status: {resp.status_code}")
        if "Al Rajhi Capital" in resp.text:
            print("✅ Argaam HTML contains Analyst names!")
        else:
            print("❌ Argaam HTML opaque.")
    except Exception as e:
        print(e)
        
if __name__ == "__main__":
    check_yahoo_details()
    probe_argaam()
