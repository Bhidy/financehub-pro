import requests
import json

url = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
payload = {
    "message": "What is the price of COMI?",
    "session_id": "test_verification_001"
}
headers = {"Content-Type": "application/json"}

print(f"Sending request to {url}...")
try:
    response = requests.post(url, json=payload, headers=headers, timeout=20)
    response.raise_for_status()
    data = response.json()
    print(f"FULL RESPONSE: {data}")
    
    msg_text = data.get("message_text", "")
    conv_text = data.get("conversational_text", "")
    final_text = conv_text if conv_text else msg_text
    
    print("\n=== AI RESPONSE (Conversational) ===")
    print(conv_text)
    print("=== AI RESPONSE (Fallback) ===")
    print(msg_text)
    print("===================\n")
    
    # Check for Key Terms in the actual content shown to user
    text_to_check = final_text
    
    if "**Key Terms:**" in text_to_check or "**مصطلحات هامة:**" in text_to_check:
        print("❌ FAIL: 'Key Terms' section still found.")
    else:
        print("✅ PASS: 'Key Terms' section NOT found.")
        
    word_count = len(text_to_check.split())
    print(f"Word Count: {word_count}")
    
    if word_count > 60:
         print("✅ PASS: Response seems sufficiently long.")
    else:
         print("⚠️ WARNING: Response might be too short.")

except Exception as e:
    print(f"❌ ERROR: {e}")
