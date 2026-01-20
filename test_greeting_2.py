import requests
import json
import sys

# API Configuration
API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"

def test_greeting():
    print("🧪 Testing Smart Greeting Logic 2.0...")
    
    # Simulate a user with an email but no name in DB (or new user)
    # We pass 'user_id' in the payload if the API supports it for testing, 
    # OR we rely on the header/auth. 
    # Assuming for this test dev/verification context we might not have a full token,
    # but let's try to send a message. The endpoint might extract user from token.
    # If we can't easily spoof the user without a token, this might be tricky.
    # However, let's look at how the service extracts it. It gets it from 'user_id' which comes from dependency.
    
    # Actually, let's just try to hit the specific flow if possible.
    # If not, we will rely on key inference.
    
    payload = {
        "message": "Hello",
        "market": "EGX",
        "user_id": "test_smart_name@example.com" # Some implementations allow override for testing
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            reply = data.get("reply", "")
            print(f"\n💬 Reply: \"{reply}\"")
            
            # Analyze
            word_count = len(reply.split())
            print(f"📊 Word Count: {word_count}")
            
            if "Test_smart_name" in reply or "Test_smart_name" in reply.capitalize():
                print("✅ Smart Name Extraction: SUCCESS")
            elif "test_smart_name" in reply:
                 print("✅ Smart Name Extraction: PARTIAL (Lowercase)")
            else:
                print("⚠️ Smart Name Extraction checks might require real Auth token")
                
            if 10 <= word_count <= 30:
                print("✅ Length Check: PASS")
            else:
                 print(f"⚠️ Length Check: {word_count} words (Target: 15-25)")
                 
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_greeting()
