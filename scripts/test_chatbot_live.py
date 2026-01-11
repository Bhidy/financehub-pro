import requests
import json

API_URL = "https://bhidy-financehub-api.hf.space/api/v1/ai/chat"
# Use a guest footprint
HEADERS = {
    "Content-Type": "application/json",
    "X-Device-Fingerprint": "test_script_v1"
}

QUESTIONS = [
    "What is the price of COMI?",
    "Show me the chart for SWDY",
    "Top gainers today",
    "Help",
    "Tell me about EFG Hermes" 
]

def test_questions():
    print(f"🤖 Testing Chatbot at {API_URL}...")
    
    for q in QUESTIONS:
        print(f"\n❓ Asking: '{q}'")
        try:
            payload = {"message": q, "history": []}
            resp = requests.post(API_URL, json=payload, headers=HEADERS, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                intent = data.get("meta", {}).get("intent")
                reply = data.get("message_text")
                print(f"✅ Intent: {intent}")
                # print(f"📝 Reply: {reply[:100]}...")
                if "error" in reply.lower():
                     print("❌ Content Error in reply")
            else:
                print(f"❌ HTTP Error {resp.status_code}: {resp.text}")
                
        except Exception as e:
            print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_questions()
