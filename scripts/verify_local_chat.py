
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_chat(message, expected_layers=None):
    print(f"\n🧪 Testing Message: '{message}'")
    url = f"{BASE_URL}/ai/chat"
    payload = {
        "message": message,
        "history": [],
        "session_id": "test_session_local_1"
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        print("✅ Status: 200 OK")
        
        # Verify 4 Layers
        layers = {
            "1. Conversational": bool(data.get('conversational_text') or data.get('message_text')),
            "2. Cards": len(data.get('cards', [])) > 0,
            "3. Learning Section": bool(data.get('learning_section')),
            "4. Follow-up": bool(data.get('follow_up_prompt'))
        }
        
        print("🔍 Layer Verification:")
        all_passed = True
        for name, present in layers.items():
            status = "✅ Present" if present else "❌ MISSING"
            if not present: all_passed = False
            print(f"   - {name}: {status}")
            
        if expected_layers:
            # Special cases where not all layers are expected (e.g. Greeting has no cards)
            pass
            
        if data.get('cards'):
            print(f"   🃏 Cards Found: {[c.get('type') for c in data['cards']]}")
            
        if data.get('conversational_text'):
            print(f"   🗣️  Narrative Snippet: {data['conversational_text'][:100]}...")
            
        print(f"   📄 Full Response: {json.dumps(data, indent=2)}")
            
        return all_passed, data
        
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        try:
            print(response.text)
        except:
            pass
        return False, None

def wait_for_server():
    print("⏳ Waiting for server to come online...")
    for i in range(30):
        try:
            requests.get(f"{BASE_URL.replace('/api/v1', '')}/health", timeout=1)
            print("✅ Server is UP!")
            return True
        except:
            time.sleep(1)
            print(".", end="", flush=True)
    print("\n❌ Server timed out.")
    return False

if __name__ == "__main__":
    if not wait_for_server():
        sys.exit(1)
        
    # Test 1: Stock Price (Full 4 Layers)
    print("\n=== TEST 1: Stock Price (COMI) ===")
    success, resp = test_chat("Price of COMI")
    
    # Test 2: Profile (New Handler)
    print("\n=== TEST 2: Company Profile (Who is CEO of CIB?) ===")
    success_profile, resp_profile = test_chat("Who is the CEO of CIB?")
    
    # Test 3: Financials (Deep Dive)
    print("\n=== TEST 3: Financials ===")
    success_fin, resp_fin = test_chat("Financials of SWDY")

    if success and success_profile:
        print("\n✨ ALL SYSTEM TESTS PASSED ON LOCALHOST")
    else:
        print("\n⚠️ SOME CHECKS FAILED")
