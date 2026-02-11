
import requests
import json
import logging
import sys
import uuid

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

def verify_removal():
    session_id = f"sess_{uuid.uuid4()}"
    query = "Analyze TMGH"
    
    payload = {
        "message": query,
        "sessionId": session_id,
        "username": "Tester",
        "userId": "user_123"
    }
    
    logger.info(f"📤 Sending: '{query}'")
    
    try:
        response = requests.post(CHAT_ENDPOINT, json=payload, headers=HEADERS, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for generic learning_section field
            learning_section = data.get("learning_section")
            
            # Check for cards with type 'educational' or title containing 'Learning'
            cards = data.get("cards", [])
            has_learning_card = any(
                c.get("type") == "educational" or 
                "learning" in str(c.get("title", "")).lower() or
                "what these numbers mean" in str(c.get("title", "")).lower() or 
                "ماذا تعني هذه الأرقام" in str(c.get("title", ""))
                for c in cards
            )
            
            logger.info(f"✅ Received Response (Status: 200)")
            
            if learning_section:
                logger.error(f"❌ FAILURE: 'learning_section' field is PRESENT in response.")
                logger.error(json.dumps(learning_section, indent=2))
            else:
                logger.info(f"✅ SUCCESS: 'learning_section' field is MISSING (as expected).")
                
            if has_learning_card:
                logger.error(f"❌ FAILURE: Found Educational/Learning Cards.")
            else:
                logger.info(f"✅ SUCCESS: No Educational Cards found.")
                
            if not learning_section and not has_learning_card:
                logger.info("🎉 VERIFICATION PASSED: Learning Section is completely removed.")
            else:
                logger.error("🛑 VERIFICATION FAILED: Learning Section still persists.")
                
        else:
            logger.error(f"Request failed with status {response.status_code}")
            logger.error(response.text)
            
    except Exception as e:
        logger.error(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_removal()
