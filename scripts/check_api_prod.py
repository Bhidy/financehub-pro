import requests
import json

url = "https://bhidy-financehub-api.hf.space/api/v1/ai/chat"

def check_intent(message):
    print(f"\nTesting message: '{message}'")
    payload = {"message": message, "history": []}
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            actions = data.get("actions", [])
            labels = [a['label'] for a in actions]
            print(f"Actions: {labels}")
            
            if "🔗 Full Profile" in labels:
                 print("❌ FAILURE: 'Full Profile' Detecteden!")
            else:
                 print("✅ PASS: No 'Full Profile' link.")
        else:
            print(f"Error: {response.status_code}")
    except Exception as e:
        print(f"Exception: {e}")

# check_intent("COMI")
check_intent("COMI dividends")
# check_intent("COMI financials")

