from yahooquery import Ticker
import json

def test_yq():
    print("Testing yahooquery for COMI.CA...")
    t = Ticker('COMI.CA')
    
    print("--- Summary Detail ---")
    try:
        sd = t.summary_detail
        print(json.dumps(sd, indent=2, default=str))
    except Exception as e:
        print(f"Error summary_detail: {e}")

    print("--- Asset Profile ---")
    try:
        ap = t.asset_profile
        print(json.dumps(ap, indent=2, default=str))
    except Exception as e:
        print(f"Error asset_profile: {e}")

    print("--- Financial Data ---")
    try:
        fd = t.financial_data
        print(json.dumps(fd, indent=2, default=str))
    except Exception as e:
        print(f"Error financial_data: {e}")

if __name__ == "__main__":
    test_yq()
