import requests
import json
import uuid
import sys

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def log(msg, type="info"):
    if type == "info": print(f"{Colors.OKBLUE}[INFO] {msg}{Colors.ENDC}")
    elif type == "success": print(f"{Colors.OKGREEN}[PASS] {msg}{Colors.ENDC}")
    elif type == "fail": print(f"{Colors.FAIL}[FAIL] {msg}{Colors.ENDC}")
    elif type == "header": print(f"\n{Colors.HEADER}{Colors.BOLD}=== {msg} ==={Colors.ENDC}")

def test_health():
    log("Testing System Health...", "header")
    try:
        r = requests.get(f"{BASE_URL}/")
        if r.status_code == 200:
            log(f"Health Check: {r.json()}", "success")
        else:
            log(f"Health Check Failed: {r.status_code}", "fail")
    except Exception as e:
        log(f"Server is likely down. Error: {e}", "fail")
        sys.exit(1)

def test_auth():
    log("Testing Authentication & Security...", "header")
    
    # 1. Signup
    email = f"qa_test_{uuid.uuid4().hex[:8]}@financehub.pro"
    password = "StrongPassword123!"
    full_name = "QA Automation Bot"
    
    log(f"Attempting Signup for {email}...")
    r = requests.post(f"{API_URL}/auth/signup", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    
    if r.status_code == 200:
        log("Signup Successful", "success")
    else:
        log(f"Signup Failed: {r.text}", "fail")
        return None

    # 2. Login
    log("Attempting Login...")
    r = requests.post(f"{API_URL}/auth/token", data={
        "username": email,
        "password": password
    })
    
    if r.status_code == 200:
        token = r.json()["access_token"]
        log("Login Successful (JWT Obtained)", "success")
        return token
    else:
        log(f"Login Failed: {r.text}", "fail")
        return None

def test_protected_routes(token):
    log("Testing Protected Routes (Architecture)...", "header")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Portfolio
    r = requests.get(f"{API_URL}/portfolio", headers=headers)
    if r.status_code == 200:
        data = r.json()
        log(f"Portfolio Access Authorized. Cash: {data.get('cash_balance')}", "success")
    else:
        log(f"Portfolio Access Denied: {r.status_code}", "fail")

def test_market_data():
    log("Testing Market Data API...", "header")
    r = requests.get(f"{API_URL}/tickers")
    if r.status_code == 200:
        data = r.json()
        log(f"Tickers Fetched. Count: {len(data)}", "success")
        if len(data) > 0:
            log(f"Sample: {data[0]['symbol']} - {data[0]['last_price']}", "info")
    else:
        log(f"Tickers Fetch Failed: {r.status_code}", "fail")

def test_ai_analyst():
    log("Testing AI Analyst (Phase 3)...", "header")
    
    # 1. Basic Chat
    payload = {"message": "Hello", "history": []}
    r = requests.post(f"{API_URL}/ai/chat", json=payload)
    if r.status_code == 200:
        log("AI Chat Basic Response OK", "success")
    else:
        log(f"AI Chat Failed: {r.text}", "fail")

    # 2. Technical Analysis (Mock Trigger)
    log("Testing Technical Analysis Tool...")
    payload = {"message": "Is Al Rajhi overbought?", "history": []}
    r = requests.post(f"{API_URL}/ai/chat", json=payload)
    
    if r.status_code == 200:
        data = r.json()
        if data.get("data") and "technical_analysis" in data["data"]:
            ta = data["data"]["technical_analysis"]
            log(f"Technical Analysis Triggered Successfully", "success")
            log(f"RSI: {ta.get('rsi')}", "info")
            log(f"Trend: {ta.get('trend')}", "info")
        else:
            log("Technical Analysis Data Missing in Response", "fail")
    else:
        log(f"Technical Analysis Request Failed: {r.text}", "fail")

if __name__ == "__main__":
    test_health()
    token = test_auth()
    if token:
        test_protected_routes(token)
    test_market_data()
    test_ai_analyst()
    print("\n")
