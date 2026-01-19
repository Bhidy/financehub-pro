
import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1"
EMAIL = "test_fix_portfolio_v2@example.com"
PASSWORD = "Password123!"

def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def main():
    s = requests.Session()
    
    # Login
    print(f"Logging in as {EMAIL}...")
    resp = s.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        # Try signup if login fails (idempotent)
        resp = s.post(f"{BASE_URL}/auth/signup", json={"email": EMAIL, "password": PASSWORD, "full_name": "Test User V2"})
        if resp.status_code == 200:
             resp = s.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    
    if resp.status_code != 200:
        print("Auth failed")
        sys.exit(1)
        
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch Full Portfolio
    print("Fetching /portfolio/full...")
    resp = s.get(f"{BASE_URL}/portfolio/full", headers=headers)
    print(f"Full Status: {resp.status_code}")
    try:
        data = resp.json()
        print("Full Data:")
        print(json.dumps(data, default=json_serial, indent=2))
    except Exception as e:
        print(f"Failed to parse Full JSON: {e}")
        print(resp.text)

    # Fetch History
    print("\nFetching /portfolio/history...")
    resp = s.get(f"{BASE_URL}/portfolio/history", headers=headers)
    print(f"History Status: {resp.status_code}")
    try:
        data = resp.json()
        print("History Data:")
        print(json.dumps(data, default=json_serial, indent=2))
        
        # Check specific crash candidates
        if isinstance(data, list) and len(data) > 0:
            item = data[0]
            if 'snapshot_date' not in item:
                print("CRITICAL: snapshot_date missing in history item")
    except Exception as e:
        print(f"Failed to parse History JSON: {e}")
        print(resp.text)

if __name__ == "__main__":
    main()
