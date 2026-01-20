import requests
import time
import sys

TARGET_VERSION = "4.2.1-GREETING-FIX"
URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
PAYLOAD = {"message": "ping"}

print(f"Waiting for backend version: {TARGET_VERSION}")

for i in range(30):  # Wait up to 5 minutes (30 * 10s)
    try:
        response = requests.post(URL, json=PAYLOAD, timeout=5)
        if response.status_code == 200:
            data = response.json()
            meta = data.get("meta", {})
            version = meta.get("backend_version", "UNKNOWN")
            print(f"Attempt {i+1}: Version = {version}")
            
            if version == TARGET_VERSION:
                print("✅ Deployment Verified!")
                sys.exit(0)
        else:
            print(f"Attempt {i+1}: Status {response.status_code}")
            
    except Exception as e:
        print(f"Attempt {i+1}: Error {e}")
        
    time.sleep(10)

print("❌ Timeout waiting for deployment.")
sys.exit(1)
