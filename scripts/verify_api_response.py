
import requests
import json
import time

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
HEADERS = {
    "Content-Type": "application/json",
    "Accept-Language": "ar"
}

PAYLOAD = {
    "message": "قارن سهم جهينة بمنافسيه",
    "history": [],
    "market": "EGX"
}

def test_api():
    print(f"🚀 Testing Production API: {API_URL}")
    print(f"📦 Payload: {json.dumps(PAYLOAD, ensure_ascii=False)}")
    
    start_time = time.time()
    try:
        response = requests.post(API_URL, json=PAYLOAD, headers=HEADERS, timeout=60)
        duration = time.time() - start_time
        
        print(f"⏱️ Duration: {duration:.2f}s")
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ API Response Success!")
            
            # Verify critical fields
            text = data.get('conversational_text', '')
            cards = data.get('cards', [])
            
            print(f"📝 Text Length: {len(text)}")
            print(f"🃏 Cards Returned: {len(cards)}")
            
            if len(text) > 0 and len(cards) > 0:
                print("✅ Content Check: PASSED (Text and Cards present)")
                print(f"Sample Text: {text[:100]}...")
            else:
                print("⚠️ Content Check: WARNING (Empty text or cards)")
                print(f"Full Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
        else:
            print(f"❌ API Failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_api()
