import requests
import json
import logging
import sys
import uuid
import time

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Constants
CHAT_ENDPOINT = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
HEADERS = {
    "Content-Type": "application/json",
    "X-Client-Version": "6.0.0"
}

def verify_context_leak():
    session_id = f"sess_leak_test_{uuid.uuid4()}"
    
    # 1. Prime Context with JUFO
    query_1 = "Analyze Juhayna"
    logger.info(f"\n📨 [1/2] Priming Context: '{query_1}'")
    payload = {"message": query_1, "sessionId": session_id, "username": "Tester"}
    
    try:
        resp = requests.post(CHAT_ENDPOINT, json=payload, headers=HEADERS, timeout=30)
        data = resp.json()
        if "JUFO" in str(data):
            logger.info("✅ Context Primed: Juhayna (JUFO) found in response.")
        else:
            logger.warning("⚠️ Context Prime Warning: JUFO not explicitly found, but proceeding.")
            
    except Exception as e:
        logger.error(f"❌ Prime Failed: {e}")
        return

    time.sleep(1)

    # 2. Test Leakage on Unrelated Intent
    query_2 = "Market Status"
    logger.info(f"\n📨 [2/2] Testing Leakage: '{query_2}'")
    payload = {"message": query_2, "sessionId": session_id, "username": "Tester"}
    
    try:
        resp = requests.post(CHAT_ENDPOINT, json=payload, headers=HEADERS, timeout=30)
        data = resp.json()
        response_text = str(data)
        
        # CHECKS
        has_jufo = "JUFO" in response_text
        has_continuing = "Continuing with" in response_text
        
        if has_jufo or has_continuing:
            logger.error(f"❌ FAILURE: Context Leak Detected!")
            if has_jufo: logger.error("   - Found 'JUFO' in response")
            if has_continuing: logger.error("   - Found 'Continuing with...' bridge")
            logger.error(f"   Response snippet: {str(data)[:200]}...")
        else:
            logger.info(f"✅ SUCCESS: No context leak detected.")
            logger.info(f"   Response clean: No 'JUFO' or 'Continuing with...'")
            logger.info("🎉 VERIFICATION PASSED: CONTEXT_AWARE_INTENTS is working.")
            
    except Exception as e:
        logger.error(f"❌ Test Failed: {e}")

if __name__ == "__main__":
    verify_context_leak()
