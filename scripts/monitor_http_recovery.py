
import requests
import time
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', datefmt='%H:%M:%S')

URL = "https://starta.46-224-223-172.sslip.io/health"
MAX_RETRIES = 60  # 30 minutes
SLEEP_SEC = 30

print("🔍 Starting HTTP Recovery Monitor...")
print(f"Target: {URL}")

previous_state = "UNKNOWN"

for i in range(MAX_RETRIES):
    try:
        response = requests.get(URL, timeout=10)
        status = response.status_code
        
        if status == 200:
            data = response.json()
            version = data.get("version", "unknown")
            
            if "4.4.1-NO-LEARNING" in version:
                print(f"✅ [SUCCESS] DEPLOYMENT VERIFIED! Version: {version}")
                sys.exit(0)
            else:
                print(f"⏳ [{i}/{MAX_RETRIES}] Server Online (Old Version: {version}). Waiting for update...")
                # If we were previously down, this is a RECOVERY signal
                if previous_state == "DOWN":
                    print("🚀 DEPLOYMENT SUCCESS: Server has recovered!")
                    # Do not break here, as we are still waiting for the target version
                
                previous_state = "UP"
            
        else:
            print(f"⚠️ [{i}/{MAX_RETRIES}] Status: {status}")
            previous_state = "DOWN"

    except requests.exceptions.ConnectionError:
        print(f"🔻 [{i}/{MAX_RETRIES}] CONNECTION FAILED (Server Restarting?)")
        previous_state = "DOWN"
    except Exception as e:
        print(f"❌ [{i}/{MAX_RETRIES}] Error: {str(e)}")
        previous_state = "DOWN"

    time.sleep(SLEEP_SEC)
