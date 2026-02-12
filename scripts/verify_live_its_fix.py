
import requests
import json
import time

# User ID from previous context or a test ID
USER_ID = "1" 
SESSION_ID = f"verify_its_{int(time.time())}"
API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"

def verify_live_fix():
    print(f"--- 🧪 Verifying Live Fix on Production ---")
    print(f"Target: {API_URL}")
    
    payload = {
        "message": "Compare JUFO to its competitors",
        "user_id": USER_ID,
        "session_id": SESSION_ID,
        "model": "llama-3.3-70b-versatile" 
    }
    
    try:
        print(f"Sending request: '{payload['message']}'...")
        start_time = time.time()
        response = requests.post(API_URL, json=payload, timeout=30)
        duration = time.time() - start_time
        
        print(f"⏱️ Latency: {duration:.2f}s")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # print(json.dumps(data, indent=2))
            
            # Check for success
            if not data.get('success'):
                print("❌ API returned success=False")
                print(f"Error: {data.get('error')}")
            
            # Check for correct cards
            cards = data.get('cards', [])
            card_types = [c.get('type') for c in cards]
            print(f"Received Card Types: {card_types}")
            
            # 1. Verify ITS Removal
            # The narrative should NOT mention "ITS" as a stock.
            # Ideally we get a comparison card or data for JUFO.
            
            # 2. Verify World Class Layers (Greeting, Follow-up)
            # The narrative in the response should contain the 4-layer structure?
            # Actually, the 4-layer structure is inside the 'narrative' or 'conversational_text' 
            # returned in the 'message' field of the response? (Need to check API contract)
            # Usually strict structure is: Greeting -> Content -> Follow-up
            
            narrative = data.get('message', '')
            print(f"Narrative Length: {len(narrative)}")
            print(f"Narrative Preview: {narrative[:100]}...")
            
            has_greeting = "Got it" in narrative or "Welcome" in narrative or "Here is" in narrative # Adjust based on actual greeting logic
            
            # Check for "Could not find: ITS"
            if "Could not find: ITS" in narrative or "Could not find: its" in narrative:
                 print("❌ FAIL: 'ITS' still treated as symbol.")
            else:
                 print("✅ PASS: 'ITS' not in error message (or no error).")

            # Check for Comparison
            if 'comparison_table' in card_types or 'competitor_analysis' in card_types:
                print("✅ PASS: Comparison card received.")
            elif 'financial_explorer' in card_types:
                 print("⚠️ NOTE: Received Financial Explorer (maybe just JUFO Data?)")
            
        else:
            print(f"❌ HTTP Error: {response.text}")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    verify_live_fix()
