import requests
import json
import time

url = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
headers = {"Content-Type": "application/json"}
data = {
    "message": "Compare COMI with JUFO",
    "conversation_id": "test-compare-final",
    "language": "en"
}

# Wait for container init
time.sleep(20)

try:
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        res = response.json()
        print("Got 200 OK.")
        cards = res.get("cards", [])
        for c in cards:
            print("Card Type:", c.get("type"), "| Title:", c.get("title"))
            if c.get("type") == "my_framework" or c.get("type") == "error":
                print(" -> Data Variant:", c.get("data", {}).get("variant"))
    else:
        print(f"Error {response.status_code}: {response.text}")
except Exception as e:
    print("Request failed:", e)
