
import sys
import logging
import requests
import json
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
HEADERS = {"Content-Type": "application/json"}
PAYLOAD = {
    "message": "Analyze TMGH",
    "history": [],
    "user_id": "verify_script_v2"
}

def verify_response():
    logger.info(f"📤 Sending: '{PAYLOAD['message']}'")
    try:
        response = requests.post(API_URL, json=PAYLOAD, headers=HEADERS, timeout=60)
        
        if response.status_code == 200:
            logger.info("✅ Received Response (Status: 200)")
            data = response.json()
            
            # 1. Check for Learning Section (Should be ABSENT)
            if "learning_section" in data:
                 logger.error("❌ FAILURE: 'learning_section' field is PRESENT in response.")     
                 # Don't fail immediately, check other things
            else:
                 logger.info("✅ SUCCESS: Learning Section removed.")

            # 2. Check Narrative Text for Artifacts
            narrative = data.get("narrative", "")
            narrative_text = narrative.get("content", "") if isinstance(narrative, dict) else str(narrative)
            
            if "السردية" in narrative_text:
                logger.error("❌ FAILURE: Found 'السردية' in narrative text.")
            else:
                logger.info("✅ SUCCESS: 'السردية' artifact absent.")
                
            if "()" in narrative_text:
                logger.error("❌ FAILURE: Found empty parentheses '()' in narrative text.")
            else:
                 logger.info("✅ SUCCESS: Empty parentheses '()' absent.")

            # 3. Check Line Length (Conversational Rule)
            lines = narrative_text.split('\n')
            long_lines = [l for l in lines if len(l) > 200] # Arbitrary conversational limit
            if long_lines:
                logger.warning(f"⚠️ WARNING: Found {len(long_lines)} lines longer than 200 chars. Might not be conversational.")
                for l in long_lines[:2]:
                    logger.warning(f"   Long line sample: {l[:50]}...")
            else:
                logger.info("✅ SUCCESS: All lines are within conversational limits.")

            # 4. Check Block Spacing (Newlines)
            if "\n\n" in narrative_text:
                logger.info("✅ SUCCESS: Found double newlines (block spacing).")
            else:
                logger.warning("⚠️ WARNING: No double newlines found. Block spacing might be missing.")

        else:
            logger.error(f"❌ API Error: {response.status_code} - {response.text}")

    except Exception as e:
        logger.error(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    verify_response()
