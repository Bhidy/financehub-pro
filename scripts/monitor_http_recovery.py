
import time
import requests
import sys

# Configuration
URL = "https://starta.46-224-223-172.sslip.io/health"
MAX_RETRIES = 60
SLEEP_SEC = 10

print("🔍 Starting HTTP Recovery Monitor...")
print(f"Target: {URL}")

# State tracking
previous_state = "UNKNOWN"

for i in range(MAX_RETRIES):
    try:
        response = requests.get(URL, timeout=5)
        status = response.status_code
        
        if status == 200:
            data = response.json()
            version = data.get("version", "unknown")
            
            if "4.4.2-ITS-FIX" in version:
                print(f"✅ [SUCCESS] DEPLOYMENT VERIFIED! Version: {version}")
                sys.exit(0)
            else:
                print(f"⏳ [{i}/{MAX_RETRIES}] Server Online (Old Version: {version}). Waiting for update...")
            
            previous_state = "UP"
            
        else:
            print(f"⚠️ [{i}/{MAX_RETRIES}] Status: {status}")
            previous_state = "DOWN"
            
    except Exception as e:
        print(f"❌ [{i}/{MAX_RETRIES}] Connection Failed: {e}")
        previous_state = "DOWN"
        
    time.sleep(SLEEP_SEC)

print("❌ TIMEOUT: Deployment did not complete in time.")
sys.exit(1)
