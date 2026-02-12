
import requests
import json
import sys

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
HEADERS = {
    "Content-Type": "application/json",
    "X-Device-Fingerprint": "verify_script_7layer"
}

def verify_live():
    query = "What is your analysis of COMI under current market conditions?"
    print(f"🚀 Sending Query: '{query}'")
    
    try:
        payload = {"message": query, "history": []}
        resp = requests.post(API_URL, json=payload, headers=HEADERS, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            intent = data.get("meta", {}).get("intent")
            print(f"✅ Intent: {intent}")
            
            # Check Structured Narrative
            structured = data.get("structured_narrative")
            if structured:
                print("\n✅ Structured Narrative FOUND:")
                print(json.dumps(structured, indent=2, ensure_ascii=False))
                
                # Check specifics
                if structured.get("key_insight"):
                    print(f"\n🧠 Key Insight: {structured['key_insight'][:100]}...")
                else:
                    print("\n⚠️ Key Insight MISSING in structured narrative")
                    
                if structured.get("risk_warning"):
                     print(f"\n⚠️ Risk Warning: {structured['risk_warning']}")
            else:
                print("\n❌ Structured Narrative MISSING in response")
                print("Full keys:", data.keys())
                
        else:
            print(f"❌ HTTP Error {resp.status_code}: {resp.text}")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    verify_live()
