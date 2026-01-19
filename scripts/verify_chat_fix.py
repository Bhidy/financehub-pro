
import requests
import json
import time

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1"
SESSION_ID = f"verify_sess_{int(time.time())}"

def test_chat():
    print(f"🧪 Starting Chat Verification (Session: {SESSION_ID})")
    
    # 1. First Message (Expect Greeting)
    print("\n[1] Sending First Message: 'Hello'")
    history = []
    payload = {
        "message": "Hello",
        "session_id": SESSION_ID,
        "history": history + [{"role": "user", "content": "Hello"}]
    }
    
    try:
        r1 = requests.post(f"{API_URL}/ai/chat", json=payload)
        r1.raise_for_status()
        data1 = r1.json()
        reply1 = data1.get('reply') or data1.get('message_text', '')
        
        print(f"   Response: {reply1[:100]}...")
        if "Welcome" in reply1 or "Hello" in reply1:
            print("   ✅ Greeting detected (Authorized for 1st message)")
        else:
            print("   ⚠️ No greeting in 1st message (Acceptable, but check logic)")
            
        # Update history logic like frontend
        history.append({"role": "user", "content": "Hello"})
        history.append({"role": "ai", "content": reply1})
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return

    # 2. Second Message (Expect NO Greeting, Strict Structure)
    print("\n[2] Sending Second Message: 'What is the price of CIB?'")
    msg2 = "What is the price of CIB?"
    payload2 = {
        "message": msg2,
        "session_id": SESSION_ID,
        "history": history + [{"role": "user", "content": msg2}]
    }
    
    try:
        r2 = requests.post(f"{API_URL}/ai/chat", json=payload2)
        r2.raise_for_status()
        data2 = r2.json()
        reply2 = data2.get('reply') or data2.get('message_text', '')  # Note: API returns message_text usually mapped to reply
        cards = data2.get('cards', [])
        actions = data2.get('actions', [])
        
        print(f"   Response: {reply2}")
        
        # CHECKS
        failed = False
        
        # Check A: No Greeting
        forbidden = ["Welcome back", "Hello", "Hi ", "Greetings"]
        for bad in forbidden:
            if bad.lower() in reply2.lower():
                print(f"   ❌ FAILED: Found forbidden greeting '{bad}'")
                failed = True
        if not failed:
            print("   ✅ strict 'No Greeting' check passed")
            
        # Check B: Length
        words = len(reply2.split())
        print(f"   ℹ️ Word count: {words}")
        if words > 50:
             print("   ⚠️ WARNING: Response might be too long (>50 words)")
             
        # Check C: Structure (Cards)
        if cards:
            print(f"   ✅ Cards present ({len(cards)})")
        else:
            print("   ❌ FAILED: No data cards found")
            
        # Check D: Definitions (in text or separate?)
        # My implementation of 'fact_explanations' adds them to the response object, but how are they rendered?
        # The frontend renders them. The API should return them in 'fact_explanations'.
        facts = data2.get('fact_explanations', {})
        if facts:
             print(f"   ✅ Definitions present ({len(facts)})")
        else:
             print("   ⚠️ No definitions returned (Check if needed for this query)")

    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_chat()
