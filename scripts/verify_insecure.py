import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://starta.46-224-223-172.sslip.io/api/v1/admin/analytics/health"
params = {"period": "30d"}

try:
    print(f"Requesting: {url}")
    response = requests.get(url, params=params, verify=False, timeout=10)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Active Users (unique_users): {data.get('unique_users', 'N/A')}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
