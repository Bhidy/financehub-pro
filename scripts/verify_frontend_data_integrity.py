import requests
import json
import time
from typing import Dict, List, Any
from datetime import datetime

# Configuration
# Configuration
# Correct Endpoint based on frontend/lib/api.ts
API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat" 
# Using a fixed session ID to maintain context if needed, or random for fresh sessions
SESSION_ID = f"qa_test_{int(time.time())}"
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "FinanceHub-Pro-QA-Agent"
}

# The 30 Test Scenarios (Mixed EN/AR)
SCENARIOS = [
    # --- Market Broad View ---
    {"q": "Market Summary", "expected_type": "market_summary"},
    {"q": "ملخص السوق", "expected_type": "market_summary", "lang": "ar"},
    {"q": "How is the EGX30 performing?", "expected_type": "market_summary"},
    
    # --- Specific Stock Analysis ---
    {"q": "Analyze COMI", "expected_type": "stock_analysis"},
    {"q": "تحليل سهم فوري", "expected_type": "stock_analysis", "lang": "ar"},
    {"q": "Give me details on HRHO", "expected_type": "stock_analysis"},
    {"q": "Is SWDY a good buy?", "expected_type": "stock_analysis"},
    {"q": "ما رأيك في سهم حديد عز؟", "expected_type": "stock_analysis", "lang": "ar"},

    # --- Comparisons ---
    {"q": "Compare COMI and HRHO", "expected_type": "comparison"},
    {"q": "مقارنة بين التجاري الدولي وهيرميس", "expected_type": "comparison", "lang": "ar"},
    {"q": "Which is better FWRY or ETEL?", "expected_type": "comparison"},
    
    # --- Financial Deep Dive ---
    {"q": "Show me financials for SWDY", "expected_type": "financials"},
    {"q": "Dividend history for TMGH", "expected_type": "dividend"},
    {"q": "القوائم المالية لسهم إي فاينانس", "expected_type": "financials", "lang": "ar"},
    
    # --- Technical/Price ---
    {"q": "Price analysis for ETEL", "expected_type": "technical"},
    {"q": "التحليل الفني للنساجون الشرقيون", "expected_type": "technical", "lang": "ar"},
    
    # --- Educational ---
    {"q": "What is ROE?", "expected_type": "educational"},
    {"q": "Explain P/E ratio", "expected_type": "educational"},
    {"q": "ما هو مكرر الربحية؟", "expected_type": "educational", "lang": "ar"},
    {"q": "How do I invest in stocks?", "expected_type": "educational"},
    
    # --- Screener/Discovery ---
    {"q": "Top gainers today", "expected_type": "screener"},
    {"q": "Undervalued stocks", "expected_type": "screener"},
    {"q": "أفضل الأسهم للشراء", "expected_type": "screener", "lang": "ar"},
    {"q": "High dividend yield stocks", "expected_type": "screener"},
    
    # --- Macro/Sector ---
    {"q": "Banking sector performance", "expected_type": "sector"},
    {"q": "Real estate sector outlook", "expected_type": "sector"},
    {"q": "أداء قطاع العقارات", "expected_type": "sector", "lang": "ar"},

    # --- Edge Cases / Specifics ---
    {"q": "Who owns ETEL?", "expected_type": "shareholders"},
    {"q": "Major shareholders of COMI", "expected_type": "shareholders"},
    {"q": "أخبار سهم فوري", "expected_type": "news", "lang": "ar"}
]

def validate_response(query: str, response: Dict, lang: str = "en") -> Dict[str, Any]:
    issues = []
    
    # 1. 7-Layer Structure Verification
    struct = response.get("structured_narrative", {}) or {}
    
    checks = {
        "Personal Greeting": struct.get("personal_greeting"),
        "Context Bridge": struct.get("context_bridge"),
        "Human Opening": struct.get("human_opening"),
        "Core Narrative": struct.get("core_narrative"),
        "Key Insight": struct.get("key_insight"), # Part of narrative usually but checked separate
        "Follow-up Prompt": struct.get("follow_up_prompt") or response.get("follow_up_prompt"),
        "Cards (Layer 5)": response.get("cards", []),
        "Learning Section (Layer 6)": response.get("learning_section", []) # Or inside narrative
    }

    # Strict check for essential layers
    if not checks["Core Narrative"]:
        issues.append("Missing Core Narrative")
    
    if not checks["Cards (Layer 5)"]:
        issues.append("Missing Data Cards")
    
    if not checks["Follow-up Prompt"]:
        issues.append("Missing Follow-up Prompt")
        
    # Check for Learning Section
    has_learning = False
    if response.get("learning_section"): has_learning = True
    for card in response.get("cards", []):
        if card.get("type") == "educational_card":
            has_learning = True
            break
            
    if not has_learning:
        issues.append("Missing Learning Section (Layer 3/6)")

    # 2. Data Integrity Checks
    cards = response.get("cards", [])
    for i, card in enumerate(cards):
        if not card.get("data"):
            issues.append(f"Card {i} ({card.get('type')}) has empty data")
        
        if lang == "ar":
            # Simple check if title exists
            title = card.get("title", "")
            # We don't fail here, just valid check presence

    return {
        "pass": len(issues) == 0,
        "issues": issues,
        "layers_present": {k: bool(v) for k, v in checks.items()},
        "cards_count": len(cards)
    }

def run_qa():
    print(f"🚀 Starting World-Class QA Validation (30 Scenarios) on {API_URL}")
    print("="*60)
    
    results = []
    
    for i, scenario in enumerate(SCENARIOS):
        q = scenario["q"]
        lang = scenario.get("lang", "en")
        print(f"Processing ({i+1}/30): {q} ...", end="", flush=True)
        
        start_time = time.time()
        try:
            payload = {
                "message": q,
                "history": [],  # Important: Frontend sends history array
                "session_id": SESSION_ID,
                "language": lang
            }
            res = requests.post(API_URL, json=payload, timeout=90) # Increased timeout for LLM generation
            
            if res.status_code != 200:
                print(f" ❌ API Error {res.status_code}")
                results.append({"q": q, "status": "FAIL", "error": f"HTTP {res.status_code}"})
                continue
                
            data = res.json()
            validation = validate_response(q, data, lang)
            duration = time.time() - start_time
            
            if validation["pass"]:
                print(f" ✅ PASS ({duration:.2f}s) | {validation['cards_count']} Cards")
                results.append({"q": q, "status": "PASS", "details": validation})
            else:
                print(f" ⚠️ WARN ({duration:.2f}s)")
                print(f"    Issues: {validation['issues']}")
                results.append({"q": q, "status": "WARN", "details": validation})
                
        except Exception as e:
            print(f" ❌ EXCEPTION: {str(e)}")
            results.append({"q": q, "status": "ERROR", "error": str(e)})
            
        # Brief pause to respect rate limits if any
        time.sleep(1)

    # Generate Report
    print("\n" + "="*60)
    print("QA SUMMARY REPORT")
    print("="*60)
    
    passed = len([r for r in results if r["status"] == "PASS"])
    warns = len([r for r in results if r["status"] == "WARN"])
    errors = len([r for r in results if r["status"] == "ERROR"])
    
    print(f"Total: {len(results)} | Passed: {passed} | Warnings: {warns} | Errors: {errors}")
    
    if warns > 0 or errors > 0:
        print("\nISSUES FOUND:")
        for r in results:
            if r["status"] != "PASS":
                print(f"- [{r['status']}] {r['q']}")
                if "details" in r:
                    print(f"  Issues: {r['details']['issues']}")
                if "error" in r:
                    print(f"  Error: {r['error']}")

    # Save detailed JSON report
    with open("qa_results.json", "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("\n Detailed report saved to qa_results.json")

if __name__ == "__main__":
    run_qa()
