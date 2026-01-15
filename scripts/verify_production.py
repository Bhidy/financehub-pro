import requests
import sys
import time

BACKEND_URL = "https://starta.46-224-223-172.sslip.io"
# Note: Frontend URL might take a moment to propagate, so we check the endpoint logic mainly
FRONTEND_URL = "https://finhub-pro.vercel.app"

def check_endpoint(name, url, expected_code=200, check_json=True):
    print(f"Testing {name}...", end=" ")
    try:
        start = time.time()
        res = requests.get(url, timeout=10)
        elapsed = time.time() - start
        
        if res.status_code != expected_code:
            print(f"❌ FAILED (Status {res.status_code})")
            print(f"   Response: {res.text[:200]}")
            return False
            
        if check_json:
            try:
                data = res.json()
                # Basic validation
                if isinstance(data, list) and len(data) == 0:
                     print(f"⚠️ EMPTY LIST (Time: {elapsed:.2f}s)")
                else:
                     print(f"✅ OK (Time: {elapsed:.2f}s)")
            except ValueError:
                print(f"❌ INVALID JSON (Time: {elapsed:.2f}s)")
                return False
        else:
            print(f"✅ OK (Time: {elapsed:.2f}s)")
            
        return True
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("=== LIVE PRODUCTION VERIFICATION ===")
    
    # 1. Backend Health
    if not check_endpoint("Backend Health", f"{BACKEND_URL}/health"):
        print("CRITICAL: Backend appears down!")
        sys.exit(1)
        
    # 2. Tickers (Used by MarketTicker)
    check_endpoint("Tickers API", f"{BACKEND_URL}/api/v1/tickers")
    
    # 3. Market Summary (Used by Dashboard)
    check_endpoint("Market Summary", f"{BACKEND_URL}/api/v1/market-summary")
    
    # 4. TASI History (The Fix)
    check_endpoint("TASI History", f"{BACKEND_URL}/api/v1/history/TASI")
    
    # 5. Frontend Availability
    check_endpoint("Frontend App", FRONTEND_URL, check_json=False)

    print("\n=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    main()
