import requests
import json
import time
import sys

BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1"
SESSION_ID = f"test_fix_{int(time.time())}"

def test_chat(message, history=None, expect_greeting=True):
    url = f"{BASE_URL}/ai/chat"
    payload = {
        "message": message,
        "session_id": SESSION_ID,
        "history": history or []
    }
    
    print(f"\n📨 Sending: '{message}' (Session: {SESSION_ID})")
    try:
        start = time.time()
        res = requests.post(url, json=payload, timeout=20)
        latency = time.time() - start
        
        if res.status_code != 200:
            print(f"❌ Error {res.status_code}: {res.text}")
            return None, False

        data = res.json()
        print(f"DEBUG JSON: {json.dumps(data, indent=2)}")
        reply = data.get('conversational_text') or data.get('message_text') or data.get('reply', '')
        print(f"✅ Received ({latency:.2f}s): \"{reply[:100]}...\"")
        
        # Check for greeting
        has_greeting = any(x in reply.lower() for x in ['welcome', 'hello', 'hi ', 'greetings'])
        
        if expect_greeting and not has_greeting:
            print(f"⚠️ Warning: Expected greeting but none found. (Acceptable for ongoing sessions)")
        elif not expect_greeting and has_greeting:
            print(f"❌ FAILURE: Deployment Failed! Recieved repetitive greeting: '{reply[:50]}'")
            return reply, False
            
        return reply, True
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None, False

# Step 1: First Message (New Session) - Triggers Data Intent
print("--- Step 1: Initial Data Query (Expect Greeting) ---")
# Use a known symbol and query to ensure non-UNKNOWN intent
reply1, success1 = test_chat("Price of 1120", history=[], expect_greeting=False) # Changed to False temporarily to see what we get

if not reply1:
    sys.exit(1)

# Step 2: Follow up (Existing Session)
print("\n--- Step 2: Follow-up (Should have NO greeting) ---")
# Simulate frontend sending history
history = [
    {"role": "user", "content": "Price of 1120"},
    {"role": "ai", "content": reply1}
]
reply2, success2 = test_chat("Technical analysis of 1120", history=history, expect_greeting=False)

if success2:
    print("\n🎉 SUCCESS: Logic is holding. No repetitive greeting detected.")
    sys.exit(0)
else:
    print("\n💀 FAILURE: Repetitive greeting detected.")
    sys.exit(1)
