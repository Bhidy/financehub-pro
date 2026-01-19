
import requests
import sys

BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1"
EMAIL = "test_fix_portfolio_v2@example.com"
PASSWORD = "Password123!"

def main():
    s = requests.Session()
    
    # 1. Try Login
    print(f"Logging in as {EMAIL}...")
    resp = s.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        # Try Signup
        print("Trying signup...")
        resp = s.post(f"{BASE_URL}/auth/signup", json={"email": EMAIL, "password": PASSWORD, "full_name": "Test User V2"})
        if resp.status_code != 200:
            print(f"Signup failed: {resp.text}")
            sys.exit(1)
            
    data = resp.json()
    token = data.get("access_token")
    if not token:
        print("No token found in response")
        sys.exit(1)
        
    print(f"Got token: {token[:10]}...")
    
    # 2. Fetch Portfolio
    print("Fetching /portfolio/full...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = s.get(f"{BASE_URL}/portfolio/full", headers=headers)
    
    print(f"Status Code: {resp.status_code}")
    if resp.status_code == 200:
        print("SUCCESS! Portfolio Loaded.")
        print(resp.json())
    else:
        print("FAILURE!")
        print(resp.text)
        sys.exit(1)

if __name__ == "__main__":
    main()
