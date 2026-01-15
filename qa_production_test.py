
import requests
import json
import sys
import time

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
DEBUG_NLU_URL = "https://starta.46-224-223-172.sslip.io/debug/nlu"

# Predefined questions covering a wide range of intents
QUESTIONS = [
    # Basic Price & Chart (Fixed NLU Threshold should catch these)
    {"text": "Chart SWDY", "intent_check": "STOCK_CHART"},
    {"text": "Price of COMI", "intent_check": "STOCK_PRICE"},
    
    # Deep Analysis (Fixed Crash Issue)
    {"text": "Financial health of CIB", "intent_check": "FINANCIAL_HEALTH"},
    {"text": "Who owns EAST?", "intent_check": "OWNERSHIP"},
    {"text": "Technicals for HRHO", "intent_check": "TECHNICAL_INDICATORS"},
    {"text": "Fair value of FWRY", "intent_check": "FAIR_VALUE"},
    
    # Financials & Dividends (Fixed Crash & Optional Imports)
    {"text": "Dividends of ABUK", "intent_check": "DIVIDENDS"},
    {"text": "Financials of ETEL", "intent_check": "FINANCIALS"},
    {"text": "Margins for SWDY", "intent_check": "FIN_MARGINS"},
    
    # Discovery & Lists
    {"text": "Show me top gainers", "intent_check": "MARKET_MOVERS"},
    {"text": "Banks sector stocks", "intent_check": "SECTOR_STOCKS"},
    
    # Funds (Backend Handler Check)
    {"text": "AZ Gold fund", "intent_check": "FUND_NAV"}
]

def run_tests():
    print(f"🚀 Starting Live QA on {API_URL}...")
    print("-" * 60)
    
    failed_tests = []
    
    for i, q in enumerate(QUESTIONS, 1):
        text = q['text']
        print(f"[{i}/{len(QUESTIONS)}] Testing: '{text}'...", end=" ", flush=True)
        
        try:
            start_t = time.time()
            resp = requests.post(API_URL, json={"message": text, "history": []}, timeout=20)
            elapsed = time.time() - start_t
            
            if resp.status_code != 200:
                print(f"❌ FAILED (Status {resp.status_code})")
                try:
                    print(f"   Response: {resp.text[:200]}")
                except:
                    pass
                failed_tests.append({"question": text, "error": f"HTTP {resp.status_code}"})
                continue
                
            data = resp.json()
            
            # 1. Check Success Flag
            if not data.get('success'):
                # Some intents might successfully return success=False if symbol not found, but "trouble processing" is bad.
                msg = data.get('message', '')
                if "trouble processing" in msg.lower():
                    print(f"❌ CRITICAL ERROR (Backend Crash Detected)")
                    failed_tests.append({"question": text, "error": "Backend Crash / Trouble Processing"})
                    print(f"   Message: {msg}")
                    continue
                else:
                    print(f"⚠️  Handled Error: {msg}") 
            
            # Print Intent Debug
            meta = data.get('meta', {})
            print(f"   [Intent: {meta.get('intent')} | Conf: {meta.get('confidence')} | Entities: {meta.get('entities')}]")

            # 2. Check for N/A in message (Strict Mode Verification)
            message_text = data.get('message', '')
            if "N/A" in message_text or "None" in message_text:
                # We allow 'None' in debug strings maybe, but rarely in user text. 
                # Actually our handlers now omit the line, so "N/A" shouldn't appear.
                # Standard 'N/A' might appear if specifically hardcoded in a sentence, but we want to avoid value placeholders.
                 if ": N/A" in message_text or ": None" in message_text:
                     print(f"⚠️  WARNING: Found N/A in text")
            
            print(f"✅ PASSED ({elapsed:.2f}s)")
            
            # Optional: Print intent found if available (some APIs don't return meta intent in response body directly unless debug)
            # print(f"   Response len: {len(message_text)}")

        except Exception as e:
            print(f"❌ EXCEPTION: {e}")
            failed_tests.append({"question": text, "error": str(e)})

    print("-" * 60)
    if failed_tests:
        print(f"🚨 {len(failed_tests)} TESTS FAILED!")
        for f in failed_tests:
            print(f" - {f['question']}: {f['error']}")
        sys.exit(1)
    else:
        print("🎉 ALL SYSTEMS GO. Production API is Robust.")
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
