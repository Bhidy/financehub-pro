import requests
import json

url = "https://starta.46-224-223-172.sslip.io/api/v1/chat"
headers = {"Content-Type": "application/json"}
data = {
    "message": "Compare between QNBE and SAUD",
    "conversation_id": "test-compare-126",
    "language": "en"
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print(e)
