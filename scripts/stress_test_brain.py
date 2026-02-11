#!/usr/bin/env python3
"""
Brain Stress Test (Remote Production)
=====================================
Verifies the "Enterprise Brain" features on the live production server.
1. Universal Screener (Dynamic SQL)
2. Context Memory (Follow-ups)
3. CFA Persona (Response Structure)

Usage: python3 scripts/stress_test_brain.py
"""

import requests
import uuid
import time
import json
import logging

# Configuration
API_URL = "https://starta.46-224-223-172.sslip.io/api/v1"
# API_URL = "http://localhost:8000/api/v1" # Local Debug
CHAT_ENDPOINT = f"{API_URL}/ai/chat"
HEADERS = {"Content-Type": "application/json"}

# Logging Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("BrainTest")

class BrainTester:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.user_id = "test_user_vip"
        logger.info(f"Initialized Test Session: {self.session_id}")

    def send_message(self, message: str) -> dict:
        """Send a message to the chatbot API."""
        payload = {
            "message": message,
            "userId": self.user_id,
            "sessionId": self.session_id,
            "platform": "web"
        }
        
        start_time = time.time()
        try:
            response = requests.post(CHAT_ENDPOINT, json=payload, headers=HEADERS, timeout=60)
            latency = time.time() - start_time
            response.raise_for_status()
            data = response.json()
            logger.info(f"✅ Sent: '{message}' | Latency: {latency:.2f}s | Status: {response.status_code}")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ API Request Failed: {e}")
            if e.response:
                logger.error(f"Response: {e.response.text}")
            return None

    def verify_universal_screener(self):
        """Test Case 1: Complex Universal Screener Query."""
        logger.info("\n🧪 TEST 1: Universal Screener (Dynamic SQL)...")
        query = "Show me cheap industrial stocks with high growth"
        data = self.send_message(query)
        
        if not data: return False
        
        # Validation
        success = True
        
        # 1. Check for Screener Cards
        cards = data.get("cards", [])
        screener_card = next((c for c in cards if c.get("type") in ["SCREENER_RESULTS", "screener_results"]), None)
        
        if not screener_card:
            logger.error("❌ Failed: No SCREENER_RESULTS card found.")
            logger.error(f"Response Dump: {json.dumps(data, indent=2)}")
            success = False
        else:
            logger.info("✅ Found Screener Results Card.")
            items = screener_card.get("data", {}).get("items", [])
            logger.info(f"   - Returned {len(items)} stocks.")
            if len(items) > 0:
                logger.info(f"   - Top pick: {items[0].get('symbol')}")
        
        # 2. Check for CFA Persona Structure in Narrative
        narrative = data.get("message", "")
        required_tags = ["[BULL_CASE]", "[BEAR_CASE]", "[FRAMEWORK]", "[LEARNING]"]
        missing_tags = [tag for tag in required_tags if tag not in narrative]
        
        if missing_tags:
            logger.warning(f"⚠️ Narrative missing strict 4-layer tags: {missing_tags}")
            # Note: Screener intents might have different structure than analysis, 
            # but CFA persona should still apply broadly. We'll be lenient on screener but strict on analysis.
        
        return success

    def verify_context_memory(self):
        """Test Case 2: Contextual Refinement (Follow-up)."""
        logger.info("\n🧪 TEST 2: Context Memory (Refinement)...")
        # Relies on state from Test 1
        query = "Filter them by low debt"
        data = self.send_message(query)
        
        if not data: return False
        
        success = True
        cards = data.get("cards", [])
        screener_card = next((c for c in cards if c.get("type") in ["SCREENER_RESULTS", "screener_results"]), None)
        
        if not screener_card:
            logger.error("❌ Failed: Contextual filter did not return new screener results.")
            logger.error(f"Response Dump: {json.dumps(data, indent=2)}")
            success = False
        else:
            logger.info("✅ Found Refined Results.")
            # Verify narrative mentions debt
            if "debt" in data.get("message", "").lower():
                logger.info("✅ Narrative acknowledges 'debt' filter.")
            else:
                logger.warning("⚠️ Narrative did not explicitly mention 'debt'.")
                
        return success

    def verify_cfa_analysis(self):
        """Test Case 3: CFA Persona Analysis."""
        logger.info("\n🧪 TEST 3: CFA Persona (Analysis)...")
        query = "COMI Financials" 
        data = self.send_message(query)
        
        if not data: return False
        
        success = True
        narrative = data.get("message", "")
        
        # Strict Structural Check
        required_tags = ["[BULL_CASE]", "[BEAR_CASE]", "[FRAMEWORK]", "[LEARNING]"]
        missing = []
        for tag in required_tags:
            if tag not in narrative:
                missing.append(tag)
        
        if missing:
            logger.error(f"❌ Narrative FAILED CFA Structure Check. Missing: {missing}")
            logger.error(f"Response Dump: {json.dumps(data, indent=2)}")
            return False
        else:
            logger.info("✅ Narrative passed CFA Structure Check (All 4 Layers present).")
            
        # Check for NO Definitions (Heuristic)
        forbidden_phrases = ["is a measure of", "refers to", "can be defined as"]
        for phrase in forbidden_phrases:
            if phrase in narrative.lower():
                logger.warning(f"⚠️ Potential definition detected: '{phrase}'")
                
        return success

    def run_suite(self):
        results = {
            "screener": self.verify_universal_screener(),
            "context": self.verify_context_memory(),
            "cfa_persona": self.verify_cfa_analysis()
        }
        
        logger.info("\n" + "="*30)
        logger.info("TEST SUITE RESULTS")
        logger.info("="*30)
        passed = 0
        for test, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            logger.info(f"{test.ljust(15)}: {status}")
            if result: passed += 1
            
        logger.info(f"\nOverall: {passed}/{len(results)} Passed")
        
        if passed == len(results):
            logger.info("🚀 READY FOR ENTERPRISE LAUNCH.")
            return True
        else:
            logger.error("💥 SYSTEM FAILED VERIFICATION.")
            return False

if __name__ == "__main__":
    tester = BrainTester()
    tester.run_suite()
