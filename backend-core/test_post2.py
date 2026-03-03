import requests
import json
import os

url = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
headers = {"Content-Type": "application/json"}
data = {
    "message": "Compare COMI with JUFO",
    "conversation_id": "test-compare-139",
    "language": "en"
}

try:
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        res = response.json()
        print(json.dumps(res, indent=2, ensure_ascii=False)[:3000])
    else:
        print(f"Error {response.status_code}: {response.text}")
except Exception as e:
    print("Request failed:", e)
