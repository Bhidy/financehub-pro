
import requests
import json
import logging
import uuid
import time

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1"
CHAT_ENDPOINT = f"{BASE_URL}/ai/chat"
HEADERS = {"Content-Type": "application/json"}

def reproduce_bug():
    session_id = str(uuid.uuid4())
    user_id = "repro_user_v1"
    
    logger.info(f"Initialized Repro Session: {session_id}")
    
    # query = "compare tmgh and comi"
    query = "compare tmgh and comi"
    
    payload = {
        "message": query,
        "userId": user_id,
        "sessionId": session_id,
        "platform": "web"
    }
    
    logger.info(f"📤 Sending: '{query}'")
    
    try:
        # STEP 1: POLLUTE CONTEXT WITH JUFO
        logger.info("😈 STEP 1: Polluting context with JUFO...")
        payload_jufo = {
            "message": "Analyze JUFO",
            "sessionId": session_id, # Changed from session_id to sessionId for consistency
            "username": "Tester",
            "userId": user_id # Changed from user_id to userId for consistency
        }
        resp_jufo = requests.post(CHAT_ENDPOINT, json=payload_jufo, headers=HEADERS, timeout=60) # Added headers and timeout
        if resp_jufo.status_code == 200:
            logger.info("✅ Context polluted with JUFO.")
        else:
            logger.error(f"❌ Failed to pollute context: {resp_jufo.text}")

        # STEP 2: TRIGGER BUG
        logger.info("⚡ STEP 2: Sending comparison query...")
        # payload.update({"sessionId": session_id}) # Ensure same session - payload already has sessionId
        response = requests.post(CHAT_ENDPOINT, json=payload, headers=HEADERS, timeout=60) # Added headers and timeout
        
        logger.info(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            message_text = data.get("message_text", "").lower() # Changed from "message" to "message_text" and added .lower()
            cards = data.get("cards", [])
            
            logger.info(f"✅ Received Response (Status: 200)")
            logger.info(f"📊 Intent: {data.get('meta', {}).get('intent')}")
            logger.info(f"🔍 Entities: {json.dumps(data.get('meta', {}).get('entities'), indent=2)}")
            
            # Check for TMGH/COMI (Ticker or Name)
            # names: TMGH -> Talaat Moustafa, COMI -> Commercial International
            has_tmgh = "tmgh" in message_text or "tmgh" in str(cards).lower() or "talaat" in message_text or "talaat" in str(cards).lower()
            has_comi = "comi" in message_text or "comi" in str(cards).lower() or "commercial" in message_text or "commercial" in str(cards).lower()
            
            # Check for JUFO Hallucination
            has_jufo = "jufo" in message_text or "juhayna" in message_text
            if "jufo" in str(cards).lower() or "juhayna" in str(cards).lower(): # Added .lower()
                 # Only count as bug if TMGH/COMI are MISSING. If they are present, JUFO might be just history?
                 # No, response text should NOT talk about JUFO.
                 pass

            if has_tmgh and has_comi:
                logger.info("✅ SUCCESS: Found both TMGH and COMI in response.")
            else:
                logger.error("❌ FAILURE: Missing TMGH or COMI.")
                logger.error(f"   Has TMGH: {has_tmgh}")
                logger.error(f"   Has COMI: {has_comi}")
                logger.error(f"   Response Content: {json.dumps(data, indent=2)}")
                
            if has_jufo and not (has_tmgh and has_comi):
                logger.error("❌ CRITICAL BUG: Found JUFO/Juhayna instead of targets! Context Pollution confirmed.")
            elif has_jufo:
                 logger.warning("⚠️ JUFO found in response but targets also present (Ambiguous).")

        else:
            logger.error(f"Request failed with status {response.status_code}")
            logger.error(response.text)
                
    except Exception as e:
        logger.error(f"❌ Error: {e}")

if __name__ == "__main__":
    reproduce_bug()
