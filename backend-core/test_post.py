import requests
import json
import os

url = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
headers = {"Content-Type": "application/json"}
data = {
    "message": "Compare COMI with JUFO",
    "conversation_id": "test-compare-131",
    "language": "en"
}

try:
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        res = response.json()
        print("Got 200 OK. Parsing cards...")
        cards = res.get("cards", [])
        for c in cards:
            if c.get("type") in ["comparison_table", "compare_table"]:
                 print("HEADERS:", c.get("headers"))
                 rows = c.get("rows", [])
                 if rows:
                     print("FIRST ROW VALUES:", rows[0].get("values"))
                 else:
                     print("NO ROWS FOUND")
                 break
        else:
            print("NO COMPARE CARD RETURNED. Cards length:", len(cards))
            print("First Card Type:", cards[0].get("type") if cards else "None")
    else:
        print(f"Error {response.status_code}: {response.text}")
except Exception as e:
    print("Request failed:", e)
