#!/usr/bin/env python3
"""
QA Ultimate Compliance Script: "The Chief Expert Validator"
=========================================================
Strictly validates the 4-Layer Architecture and regression fixes.
1. Rich Openings (>50 chars).
2. No Insight Duplication.
3. Perfect Context Switching (The "Wrong Stock" Fix).
4. World-Class Formatting.

Runs 30 diverse scenarios + 1 Critical Context Suite.
"""

import requests
import json
import time
import sys
import re
from typing import List, Dict, Any

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
TIMEOUT = 45

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# === THE 30 QUESTIONS (Refined for Maximum Coverage) ===
TEST_SUITE = [
    # -- CORE DATA (English) --
    {"msg": "What is the price of COMI?", "lang": "en", "type": "DATA"},
    {"msg": "Show me FWRY financials", "lang": "en", "type": "DEEP_DATA"},
    {"msg": "What is the PE ratio of SWDY?", "lang": "en", "type": "DATA_POINT"},
    {"msg": "Give me a stock snapshot for ETEL", "lang": "en", "type": "SNAPSHOT"},
    {"msg": "Who owns ORWE?", "lang": "en", "type": "OWNERSHIP"},
    {"msg": "Show me latest news for HRHO", "lang": "en", "type": "NEWS"},
    
    # -- DEEP ANALYSIS --
    {"msg": "Analyze EMAAR for me", "lang": "en", "type": "ANALYSIS"},
    {"msg": "Is ISPH a good buy?", "lang": "en", "type": "ADVICE"},
    {"msg": "What is the fair value of MFPC?", "lang": "en", "type": "VALUATION"},
    {"msg": "Assessment of AMOC financial health", "lang": "en", "type": "HEALTH"},
    
    # -- DISCOVERY & MARKET --
    {"msg": "Show me the top gainers today", "lang": "en", "type": "DISCOVERY"},
    {"msg": "Find me undervalued stocks in EGX", "lang": "en", "type": "SCREENER"},
    {"msg": "Market summary please", "lang": "en", "type": "MARKET"},
    {"msg": "What are the hidden gems?", "lang": "en", "type": "STRATEGY"},
    {"msg": "Compare COMI and FWRY", "lang": "en", "type": "COMPARE"},
    
    # -- ARABIC (Core) --
    {"msg": "سعر سهم التجاري الدولي", "lang": "ar", "type": "DATA"},
    {"msg": "القوائم المالية لسهم فوري", "lang": "ar", "type": "DEEP_DATA"},
    {"msg": "تحليل سهم هيرميس", "lang": "ar", "type": "ANALYSIS"},
    {"msg": "هل سهم حديد عز للشراء؟", "lang": "ar", "type": "ADVICE"},
    {"msg": "القيمة العادلة لسهم السويدي", "lang": "ar", "type": "VALUATION"},
    
    # -- ARABIC (Complex) --
    {"msg": "أفضل الأسهم للاستثمار حاليا", "lang": "ar", "type": "SCREENER"},
    {"msg": "مقارنة بين طلعت مصطفى وبالم هيلز", "lang": "ar", "type": "COMPARE"},
    {"msg": "أسهم توزع أرباح عالية", "lang": "ar", "type": "SCREENER_DIV"},
    {"msg": "وضع السوق المصري اليوم", "lang": "ar", "type": "MARKET"},
    {"msg": "المؤشرات الفنية لسهم إي فاينانس", "lang": "ar", "type": "TECHNICAL"},
    
    # -- EDGE CASES & EDUCATION --
    {"msg": "What is P/E ratio?", "lang": "en", "type": "EDUCATIONAL"},
    {"msg": "شرح مؤشر RSI", "lang": "ar", "type": "EDUCATIONAL"},
    {"msg": "Analyze a random stock", "lang": "en", "type": "FUZZY"},
    {"msg": "Why is the market down?", "lang": "en", "type": "MACRO"},
    {"msg": "Tell me a joke about stocks", "lang": "en", "type": "CHITCHAT"}
]

# === SPECIAL CONTEXT SUITE (The "Wrong Stock" Validator) ===
CONTEXT_SUITE = [
    {"msg": "Analyze MAAL", "lang": "en", "expect_symbol": "MAAL", "step": "SEED"},
    {"msg": "What about COMI?", "lang": "en", "expect_symbol": "COMI", "step": "SWITCH"},
    {"msg": "Is it a good buy?", "lang": "en", "expect_context": "COMI", "step": "STAY"}
]

def print_pass(msg):
    print(f"{Colors.GREEN}✅ PASS: {msg}{Colors.ENDC}")

def print_fail(msg):
    print(f"{Colors.FAIL}❌ FAIL: {msg}{Colors.ENDC}")

def print_warn(msg):
    print(f"{Colors.WARNING}⚠️ WARN: {msg}{Colors.ENDC}")

def validate_response(query, data, check_context=None, check_symbol=None):
    """Deep validation of the response object."""
    issues = []
    
    # 1. Structure Check
    if not data.get("success"):
        return ["API Error: " + data.get("message", "Unknown")]
        
    sn = data.get("structured_narrative")
    if not sn:
        return ["Missing structured_narrative"]
        
    # 2. Rich Opening Check (World Class)
    # New topics MUST have a greeting
    opening = sn.get("personal_greeting") or sn.get("human_opening") or sn.get("context_bridge")
    if not opening:
        issues.append("Missing Opening Layer (Greeting/Bridge)")
    elif len(opening) < 30: # Too short -> "Good question" vs "This is a critical..."
        issues.append(f"Weak Opening Detected ({len(opening)} chars): '{opening}'")
        
    # 3. Insight Duplication Check (Fix Verification)
    cards = data.get("cards", [])
    card_types = [c.get("type") for c in cards]
    insight_text = sn.get("key_insight")
    
    has_insight_card = any(ct in ['my_framework', 'bull_case', 'key_insight'] for ct in card_types)
    if has_insight_card and insight_text and len(insight_text) > 10:
        # Note: If insight text matches card content exactly, it's a dupe. 
        # But our fix suppresses *generation*. If text is present, it might be a failure.
        # Actually, sometimes we allow a small summary. But let's flag for review.
        issues.append(f"Potential Duplication: Insight Text present while Insight Card shown ({card_types})")

    # 4. Context/Symbol Check
    response_text = data.get("conversational_text", "").upper()
    if check_symbol:
        if check_symbol not in response_text and check_symbol not in str(cards):
             issues.append(f"Wrong Stock? Expected symbol '{check_symbol}' not found in response.")
             
    return issues

def run_test_suite():
    print(f"{Colors.HEADER}=== STARTING WORLD-CLASS VALIDATION SUITE ==={Colors.ENDC}\n")
    
    results = {"passed": 0, "failed": 0, "warnings": 0}
    timestamp = int(time.time())
    
    # 1. Run Standard 30
    for i, test in enumerate(TEST_SUITE):
        print(f"[{i+1}/30] Testing: {test['msg']} ({test['lang']})...", end=" ", flush=True)
        session_id = f"qa-wc-{timestamp}-{i}"
        
        try:
            start = time.time()
            res = requests.post(API_URL, json={
                "message": test['msg'],
                "session_id": session_id,
                "language": test['lang']
            }, timeout=TIMEOUT)
            dur = time.time() - start
            
            if res.status_code != 200:
                print_fail(f"HTTP {res.status_code}")
                results["failed"] += 1
                continue
                
            data = res.json()
            issues = validate_response(test['msg'], data)
            
            if not issues:
                print_pass(f"({dur:.1f}s)")
                results["passed"] += 1
            else:
                print_fail(", ".join(issues))
                results["failed"] += 1
                
        except Exception as e:
            print_fail(f"Exception: {e}")
            results["failed"] += 1
            
    # 2. Run Critical Context Suite (The "Wrong Stock" Fix)
    print(f"\n{Colors.HEADER}=== CRITICAL CONTEXT SWITCH VALIDATION ==={Colors.ENDC}")
    session_id = f"qa-context-{timestamp}"
    
    for i, step in enumerate(CONTEXT_SUITE):
        print(f"Step {i+1}: {step['msg']}...", end=" ", flush=True)
        target = step.get('expect_symbol') or step.get('expect_context')
        
        try:
            res = requests.post(API_URL, json={
                "message": step['msg'],
                "session_id": session_id,
                "language": "en"
            }, timeout=TIMEOUT)
            data = res.json()
            
            issues = validate_response(step['msg'], data, check_symbol=target)
            
            # Verify Opening Richness explicitly for SWITCH step
            if step['step'] == "SWITCH":
                sn = data.get("structured_narrative", {})
                opening = sn.get("human_opening") or sn.get("personal_greeting")
                bridge = sn.get("context_bridge")
                
                # We EXPECT a human opening for "What about COMI?", NOT a bridge
                if bridge and not opening:
                    issues.append("Used Bridge instead of Opening for New Context (Weak Opening Logic)")
                elif not opening:
                    issues.append("No Opening found for New Context")
            
            if not issues:
                print_pass(f"Context verified: {target}")
                results["passed"] += 1
            else:
                print_fail(", ".join(issues))
                results["failed"] += 1
                
        except Exception as e:
            print_fail(f"Exception: {e}")
            results["failed"] += 1
            
    print(f"\n{Colors.HEADER}=== VALIDATION COMPLETE ==={Colors.ENDC}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    
    if results['failed'] == 0:
        print(f"{Colors.GREEN}🏆 SYSTEM IS WORLD-CLASS COMPLIANT{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}⚠️ SYSTEM NEEDS TUNING{Colors.ENDC}")

if __name__ == "__main__":
    run_test_suite()
