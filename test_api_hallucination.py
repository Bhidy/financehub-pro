import asyncio
import json
import requests
import sys

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"

def run_api_hallucination_test():
    print("⏳ Pinging Live API for Hallucination Check...")
    query = "Show me undervalued real estate stocks"
    print(f"Testing Query: {query}")
    
    payload = {
        "messages": [
            {"role": "user", "content": query}
        ],
        "user_id": "hallucination-test-x",
        "language": "en"
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=60)
        
        if response.status_code != 200:
             print(f"❌ API FAILED with status {response.status_code}")
             print(response.text)
             return
             
        data = response.json()
        
        print("\n=== TEST RESULTS: HALLUCINATION & NARRATIVE HEADER ===")
        
        # Look for Narrative
        core_text = json.dumps(data)
        
        # 1. Check for Narrative Header
        if "**Narrative**" in core_text or "Narrative:" in core_text:
            print("❌ FAIL: The word 'Narrative' was still generated in the header.")
        else:
             print("✅ PASS: No 'Narrative' header found.")
            
        # 2. Check for Hallucination Loop (ORGN's peer)
        count = core_text.count("ORGN's peer")
        if count > 2:
             print(f"❌ FAIL: The hallucination loop 'ORGN's peer' was detected {count} times.")
        else:
             print("✅ PASS: No hallucination loops detected.")
             
        print("\n✅ API responded successfully. Validating output integrity:")
        
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    run_api_hallucination_test()
