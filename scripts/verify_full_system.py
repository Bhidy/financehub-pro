import requests
import json
import time

# TARGETING HTTPS (The Frontend Path)
BASE_URL = "https://starta.46-224-223-172.sslip.io"

def check(name, method, path, expected_status=[200], params=None, json_body=None):
    url = f"{BASE_URL}{path}"
    print(f"[{name}] Checking {method} {url} ...")
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=json_body, timeout=10)
        
        status = response.status_code
        if status in expected_status:
            print(f"✅ PASS: {status}")
            return True, response
        else:
            print(f"❌ FAIL: Expected {expected_status}, Got {status}")
            print(f"   Response: {response.text[:200]}")
            return False, response
    except Exception as e:
        print(f"❌ CRITICAL: Request failed - {e}")
        return False, None

print("=== STARTING FULL SYSTEM QA ===")

# 1. System Health
success, res = check("Health", "GET", "/health")

# 2. Public API - AI Intents (Proxy for general API health)
success, res = check("AI Intents", "GET", "/api/v1/ai/intents")

# 3. Auth - Google Login URL
success, res = check("Google Auth URL", "GET", "/api/v1/auth/google/url")

# 4. Analytics - Active Sessions (The Fix)
success, res = check("Analytics Fix", "GET", "/api/v1/admin/analytics/health", params={"period": "30d"})
if success and res:
    data = res.json()
    users = data.get("unique_users")
    print(f"   📊 Unique Users (Active Sessions): {users}")
    if users == 19:
        print("   ✅ DATA VERIFIED: Count is 19")
    else:
        print(f"   ⚠️ DATA MISMATCH: Expected 19, Got {users}")

# 5. Chatbot - History (Protected Endpoint)
# Expect 401 or 403 because we are not sending a token. 
# Getting 401 means the endpoint exists and auth middleware is working.
# Getting 404 would be bad. 500 would be bad.
success, res = check("Chat History (Auth Check)", "GET", "/api/v1/ai/history", expected_status=[401, 403])

print("=== QA COMPLETE ===")
