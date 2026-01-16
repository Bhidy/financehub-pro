import requests
import json

# Production API URL
url = "https://starta.46-224-223-172.sslip.io/api/v1/admin/analytics/health?period=30d"

# We need to simulate being an admin. 
# The current analytics endpoint implementation in `analytics_router.py` 
# has a `require_admin` dependency that claims "TODO: Integrate with actual auth system" 
# and currently just does `pass` (lines 106-115).
# So we might not need an auth token if the old code is running.
# Or if it requires a token, we might get a 401/403.

import time

def check_api():
    try:
        print(f"Requesting: {url}")
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # print(json.dumps(data, indent=2))
            unique = data.get('unique_users')
            print(f"Active Users (unique_users): {unique}")
            return unique
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

# Loop for 5 minutes
for i in range(30):
    val = check_api()
    if val is not None and val > 0:
        print("\n✅ SUCCESS: Active Users count updated!")
        break
    print("Waiting for deployment... (Sleeping 10s)")
    time.sleep(10)
