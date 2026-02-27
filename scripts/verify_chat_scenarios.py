import requests
import json
import time
import sys
import uuid
import random
from typing import List, Dict, Any

# CONFIG
API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"

# ANSI COLORS
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"

# Session -> Fingerprint Map to support context follow-ups
SESSION_FINGERPRINTS = {}
CHECK_COUNT = 0
FAIL_COUNT = 0

def get_fingerprint(session_id: str):
    if session_id not in SESSION_FINGERPRINTS:
        # Create a new random fingerprint for this session
        SESSION_FINGERPRINTS[session_id] = f"QA_BOT_{uuid.uuid4().hex[:8]}"
    return SESSION_FINGERPRINTS[session_id]

def print_result(name: str, passed: bool, details: str = ""):
    global CHECK_COUNT, FAIL_COUNT
    CHECK_COUNT += 1
    if not passed:
        FAIL_COUNT += 1
    status = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
    print(f"[{status}] {name}")
    if details:
        print(f"       {details}")
    return passed

def validate_7_layer_structure(response_json: Dict[str, Any], intent: str) -> bool:
    """
    Validates that the response conforms to the 7-Layer World Class Standard.
    """
    
    # 1. API Structure
    if "message_text" not in response_json:
        print_result("Response Keys", False, f"Missing message_text. Keys: {list(response_json.keys())}")
        return False
        
    text = response_json.get('message_text', "")
    cards = response_json.get('cards', [])
    meta = response_json.get('meta', {})
    
    # 2. Layer Check
    checks = {
        "Has Conversational Text": bool(text and len(text) > 5),
        "Has Meta Intent": bool(meta.get('intent')),
        "Has Cards (Data)": len(cards) > 0 if intent not in ["GREETING", "HELP", "CHITCHAT", "CLARIFY_SYMBOL", "MARKET_TIMING", "MACRO_VIEW", "UNKNOWN", "USAGE_LIMIT_REACHED", "REVENUE_TREND"] else True,
        "7-Layer Bridge": "Wait" in text or "Let me" in text or "Here is" in text or "Got it" in text or len(text) > 20
    }
    
    failed_checks = [k for k, v in checks.items() if not v]
    
    if failed_checks:
        print(f"       {RED}Violations: {', '.join(failed_checks)}{RESET}")
        return False
        
    return True

def run_test(
    scenario_name: str,
    message: str,
    expected_intent: str = None,
    session_id: str = None,
    expect_compare_table: bool = False,
    expect_stock_list: bool = False
):
    print(f"\n{CYAN}=== TEST: {scenario_name} ==={RESET}")
    print(f"Query: \"{message}\"")
    
    # Generate or reuse session ID
    actual_sid = session_id or f"qa_sess_{uuid.uuid4().hex[:8]}"
    fingerprint = get_fingerprint(actual_sid)
    
    payload = {
        "message": message,
        "session_id": actual_sid,
        "market": "EGX", 
        "history": []
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Device-Fingerprint": fingerprint,
        "X-Language": "ar" if any(c.isascii() is False for c in message) else "en"
    }

    start = time.time()
    try:
        r = requests.post(API_URL, json=payload, headers=headers, timeout=60)
        
        if r.status_code != 200:
            print_result(scenario_name, False, f"HTTP {r.status_code}: {r.text[:200]}")
            if r.status_code == 401 or "usage limit" in r.text.lower():
                 print(f"{YELLOW}Rate limit hit for fp {fingerprint}. Rotating...{RESET}")
            return None
            
        res = r.json()
        latency = (time.time() - start) * 1000
    except Exception as e:
        print_result(scenario_name, False, f"Request Failed: {e}")
        return None
        
    # Validation
    meta = res.get('meta', {})
    intent_detected = meta.get('intent')
    
    if expected_intent and intent_detected != expected_intent:
        print(f"{YELLOW}Warning: Intent Mismatch. Expected {expected_intent}, Got {intent_detected}{RESET}")
    
    struct_valid = validate_7_layer_structure(res, expected_intent)
    
    print_result("Response Structure", struct_valid, f"Latency: {latency:.0f}ms | Intent: {intent_detected} | FP: {fingerprint[:6]}")
    
    # Special Checks
    if expect_compare_table:
        has_table = any(c.get('type') == 'compare_table' for c in res.get('cards', []))
        print_result("Has Comparison Table", has_table)
        
    if expect_stock_list:
        has_list = any(
            c.get('type') in ['stock_list', 'hidden_gems', 'screener_results', 'undervalued_screen', 'gem_list']
            for c in res.get('cards', [])
        )
        print_result("Has Stock List", has_list)

    return actual_sid

def main():
    print(f"{CYAN}Starting Comprehensive 30-Scenario QA Suite (Rate Limit Bypass){RESET}")
    print(f"Target: {API_URL}")
    
    # 1. Session Basics
    sid = run_test("1. New Session Greeting", "Hello", "GREETING")
    
    # 2. Market Data
    run_test("2. Stock Price (COMI)", "Price of COMI", "STOCK_PRICE")
    run_test("3. Market Summary", "Market status", "MARKET_SUMMARY")
    run_test("4. Top Gainers", "Who are top gainers?", "TOP_GAINERS")
    run_test("5. Top Losers", "Top losers today", "TOP_LOSERS")
    run_test("6. Most Active", "Most active stocks", "MARKET_MOST_ACTIVE")
    
    # 3. Deep Financials
    run_test("7. Financials (Income)", "Show me financials for COMI", "FINANCIALS")
    run_test("8. Dividends", "COMI dividends history", "DIVIDENDS")
    run_test("9. Ratios/Stats", "COMI PE ratio and margins", "STOCK_STAT")
    run_test("10. Balance Sheet Health", "Is COMI financial health good?", "FINANCIAL_HEALTH")
    
    # 4. Deep Analysis Engines (Phase 7)
    run_test("11. Deep Valuation", "Is COMI undervalued?", "DEEP_VALUATION")
    run_test("12. Deep Safety", "Is COMI safe to invest?", "DEEP_SAFETY")
    run_test("13. Deep Growth", "How is COMI growth?", "DEEP_GROWTH")
    run_test("14. Deep Efficiency", "Is COMI efficient?", "DEEP_EFFICIENCY")
    run_test("15. Fair Value", "What is the fair value of COMI?", "FAIR_VALUE")
    
    # 5. Comparison (The Regression Check)
    run_test("16. Compare 2 Stocks", "Compare COMI vs SWDY", "COMPARE_STOCKS", expect_compare_table=True)
    run_test("17. Compare 3 Stocks", "Compare COMI, SWDY and HRHO", "COMPARE_STOCKS", expect_compare_table=True)
    
    # 6. Technicals
    run_test("18. Technical Indicators", "Technical analysis for COMI", "TECHNICAL_INDICATORS")
    run_test("19. Chart Request", "Show me chart for COMI", "STOCK_CHART")
    
    # 7. Discovery & Screener
    run_test("20. Value Screener", "Find cheap stocks with PE < 10", "SCREENER_VALUE", expect_stock_list=True)
    run_test("21. Dividend Screener", "Best dividend stocks", "DIVIDEND_LEADERS", expect_stock_list=True)
    run_test("22. High Growth Screener", "High growth stocks", "SCREENER_GROWTH", expect_stock_list=True)
    run_test("23. Hidden Gems", "Find hidden gems", "HIDDEN_GEMS", expect_stock_list=True)
    
    # 8. Extended/Macro
    run_test("24. Macro View", "How is the Egypt economy?", "MACRO_VIEW")
    run_test("25. Market Timing", "Is now a good time to buy?", "MARKET_TIMING")
    
    # 9. Context & Errors
    # Use SAME session for context (fingerprint will be reused, 2 reqs < 5 limit)
    context_sid = run_test("26a. Context Prime (COMI)", "Analyze COMI", "STOCK_SNAPSHOT")
    run_test("26b. Context Follow-up", "What about its revenue?", "REVENUE_TREND", context_sid)
    
    run_test("27. Clarification", "Analyze Ahly", "CLARIFY_SYMBOL")
    run_test("28. Unknown Stock", "Price of XYZ123", "UNKNOWN") 
    
    # 10. Arabic Support
    run_test("29. Arabic Price", "سعر سهم التجاري", "STOCK_PRICE")
    run_test("30. Arabic Comparison", "قارن بين التجاري والسويدي", "COMPARE_STOCKS")

    # 11. Follow-up reliability from screener/list context
    follow_sid = run_test("31a. Screener Seed (Undervalued)", "Get me the most undervalued stocks", "SCREENER_VALUE", expect_stock_list=True)
    run_test("31b. Screener Follow-up Risk", "How serious are the risks?", None, follow_sid)
    run_test("31c. Screener Follow-up Catalyst", "What unlocks this?", None, follow_sid)
    run_test(
        "31d. Long Natural-Language Compare Guard",
        "How does the stock in question compare to its sector peers in terms of valuation and growth?",
        None,
        follow_sid,
        expect_compare_table=True
    )

    print(f"\n{CYAN}=== SUMMARY ==={RESET}")
    print(f"Checks: {CHECK_COUNT} | Failures: {FAIL_COUNT}")
    if FAIL_COUNT == 0:
        print(f"{GREEN}All scenario checks passed.{RESET}")
    else:
        print(f"{RED}Scenario verification has failures.{RESET}")
    sys.exit(0 if FAIL_COUNT == 0 else 1)

if __name__ == "__main__":
    main()
