import requests
import time

# TARGETING HTTPS (The Frontend Path)
BASE_URL = "https://starta.46-224-223-172.sslip.io"

def check(name, path):
    url = f"{BASE_URL}{path}"
    print(f"[{name}] Checking {url} ...")
    try:
        # Verify=True is crucial here because Frontend requires valid SSL
        response = requests.get(url, timeout=10, verify=True)
        print(f"✅ PASS: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

print("=== DIAGNOSING FRONTEND CONNECTIVITY (HTTPS) ===")
check("Health", "/health")
check("API", "/api/v1/admin/analytics/health?period=30d")
print("================================================")
