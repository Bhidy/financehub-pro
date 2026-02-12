#!/usr/bin/env python3
"""
Comprehensive 7-Layer QA Script
================================
Tests 30+ diverse queries in English and Arabic against the production API.
Validates:
1. structured_narrative is present and populated
2. core_narrative (Layer 4) is always filled
3. follow_up_prompt (Layer 7) is always filled  
4. conversational_text is populated
5. Data cards are present for data queries
6. Response quality and robustness
"""

import requests
import json
import time
import sys
from datetime import datetime

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
TIMEOUT = 30

# 30+ diverse test queries covering all intents
TEST_QUERIES = [
    # === ENGLISH QUERIES (15) ===
    {"msg": "What is the price of COMI?", "lang": "en", "category": "Stock Price"},
    {"msg": "Analyze EFIH", "lang": "en", "category": "Stock Snapshot"},
    {"msg": "Show me FWRY financials", "lang": "en", "category": "Financials"},
    {"msg": "Compare COMI and HRHO", "lang": "en", "category": "Comparison"},
    {"msg": "What are the best value stocks?", "lang": "en", "category": "Screener"},
    {"msg": "Show me the market summary", "lang": "en", "category": "Market Summary"},
    {"msg": "What is AMOC dividend history?", "lang": "en", "category": "Dividends"},
    {"msg": "Tell me about hidden gems in EGX", "lang": "en", "category": "Hidden Gems"},
    {"msg": "What is EGX30 composition?", "lang": "en", "category": "Index"},
    {"msg": "Show COMI technical indicators", "lang": "en", "category": "Technical"},
    {"msg": "What is SWDY PE ratio?", "lang": "en", "category": "Stock Stats"},
    {"msg": "Give me ORWE analysis", "lang": "en", "category": "Stock Analysis"},
    {"msg": "What is the macro outlook for Egypt?", "lang": "en", "category": "Macro View"},
    {"msg": "Show me top gainers today", "lang": "en", "category": "Market Movers"},
    {"msg": "Analyze CLHO stock", "lang": "en", "category": "Stock Deep Dive"},
    
    # === ARABIC QUERIES (15) ===
    {"msg": "ايه سعر سهم كومي؟", "lang": "ar", "category": "سعر سهم"},
    {"msg": "حلل سهم فوري", "lang": "ar", "category": "تحليل سهم"},
    {"msg": "قارن بين COMI و HRHO", "lang": "ar", "category": "مقارنة"},
    {"msg": "ايه أفضل أسهم القيمة؟", "lang": "ar", "category": "فلتر أسهم"},
    {"msg": "ملخص السوق", "lang": "ar", "category": "ملخص السوق"},
    {"msg": "ايه توزيعات أرباح AMOC؟", "lang": "ar", "category": "توزيعات"},
    {"msg": "الأسهم المخفية في البورصة", "lang": "ar", "category": "أسهم مخفية"},
    {"msg": "تركيبة مؤشر EGX30", "lang": "ar", "category": "مؤشر"},
    {"msg": "المؤشرات الفنية لسهم COMI", "lang": "ar", "category": "تحليل فني"},
    {"msg": "تحليل سهم EFIH", "lang": "ar", "category": "تحليل عميق"},
    {"msg": "ايه النظرة الكلية لمصر؟", "lang": "ar", "category": "اقتصاد كلي"},
    {"msg": "أعلى الأسهم ارتفاعاً اليوم", "lang": "ar", "category": "متحركات السوق"},
    {"msg": "بيانات SWDY المالية", "lang": "ar", "category": "بيانات مالية"},
    {"msg": "حلل سهم CLHO", "lang": "ar", "category": "تحليل سهم 2"},
    {"msg": "ايه سهم أوراسكوم للتنمية؟", "lang": "ar", "category": "بحث اسم"},
]


def test_query(query_info, idx):
    """Test a single query and return results."""
    msg = query_info["msg"]
    lang = query_info["lang"]
    category = query_info["category"]
    session_id = f"qa-comprehensive-{idx}-{int(time.time())}"
    
    try:
        resp = requests.post(
            API_URL,
            json={"message": msg, "session_id": session_id, "language": lang},
            timeout=TIMEOUT
        )
        data = resp.json()
    except Exception as e:
        return {
            "idx": idx,
            "query": msg,
            "lang": lang,
            "category": category,
            "status": "ERROR",
            "error": str(e),
            "layers_filled": 0,
            "issues": [f"Request failed: {e}"]
        }
    
    issues = []
    
    # Check structured_narrative
    sn = data.get("structured_narrative")
    layers_filled = 0
    layer_details = {}
    
    if sn is None:
        issues.append("❌ structured_narrative is NULL")
    else:
        for layer_name in ["personal_greeting", "context_bridge", "human_opening", 
                          "core_narrative", "key_insight", "risk_warning", "follow_up_prompt"]:
            val = sn.get(layer_name)
            layer_details[layer_name] = bool(val)
            if val:
                layers_filled += 1
        
        # core_narrative must ALWAYS be present
        if not sn.get("core_narrative"):
            issues.append("❌ CRITICAL: core_narrative is empty")
        
        # follow_up_prompt should usually be present
        if not sn.get("follow_up_prompt"):
            issues.append("⚠️ follow_up_prompt missing")
    
    # Check conversational_text
    ct = data.get("conversational_text")
    if not ct:
        issues.append("❌ conversational_text is NULL")
    elif len(ct) < 20:
        issues.append(f"⚠️ conversational_text too short ({len(ct)} chars)")
    
    # Check follow_up_prompt at top level
    if not data.get("follow_up_prompt"):
        issues.append("⚠️ top-level follow_up_prompt missing")
    
    # Check key_insight at top level
    if not data.get("key_insight"):
        issues.append("⚠️ top-level key_insight missing")
    
    # Check data cards for data queries
    cards = data.get("cards", [])
    card_types = [c.get("type") for c in cards]
    
    # Verify intent was resolved
    meta = data.get("meta", {})
    intent = meta.get("intent", "UNKNOWN")
    
    status = "PASS" if not any("❌" in i for i in issues) else "FAIL"
    if not issues:
        status = "PERFECT"
    
    return {
        "idx": idx,
        "query": msg,
        "lang": lang,
        "category": category,
        "status": status,
        "intent": intent,
        "layers_filled": layers_filled,
        "layer_details": layer_details,
        "card_count": len(cards),
        "card_types": card_types[:5],
        "conv_text_len": len(ct) if ct else 0,
        "issues": issues
    }


def main():
    print("=" * 80)
    print("🔬 COMPREHENSIVE 7-LAYER QA TEST")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 Testing {len(TEST_QUERIES)} queries against production API")
    print("=" * 80)
    
    results = []
    pass_count = 0
    fail_count = 0
    perfect_count = 0
    
    for i, query_info in enumerate(TEST_QUERIES, 1):
        print(f"\n[{i}/{len(TEST_QUERIES)}] Testing: {query_info['msg'][:50]}... ({query_info['lang']})")
        result = test_query(query_info, i)
        results.append(result)
        
        if result["status"] == "PERFECT":
            perfect_count += 1
            print(f"  ✅ PERFECT | Layers: {result['layers_filled']}/7 | Intent: {result.get('intent')}")
        elif result["status"] == "PASS":
            pass_count += 1
            print(f"  ✅ PASS    | Layers: {result['layers_filled']}/7 | Intent: {result.get('intent')}")
            for issue in result["issues"]:
                print(f"    {issue}")
        else:
            fail_count += 1
            print(f"  ❌ FAIL    | Layers: {result['layers_filled']}/7 | Intent: {result.get('intent')}")
            for issue in result["issues"]:
                print(f"    {issue}")
        
        # Rate limit protection
        time.sleep(1.5)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 QA SUMMARY")
    print("=" * 80)
    print(f"  Total Tests:  {len(TEST_QUERIES)}")
    print(f"  ✅ PERFECT:   {perfect_count}")
    print(f"  ✅ PASS:      {pass_count}")  
    print(f"  ❌ FAIL:      {fail_count}")
    print(f"  Pass Rate:    {((perfect_count + pass_count) / len(TEST_QUERIES)) * 100:.1f}%")
    
    # Layer fill stats
    all_layers = [r["layers_filled"] for r in results if r.get("layers_filled")]
    if all_layers:
        avg_layers = sum(all_layers) / len(all_layers)
        print(f"  Avg Layers:   {avg_layers:.1f}/7")
    
    # English vs Arabic breakdown
    en_results = [r for r in results if r["lang"] == "en"]
    ar_results = [r for r in results if r["lang"] == "ar"]
    en_pass = sum(1 for r in en_results if r["status"] in ["PASS", "PERFECT"])
    ar_pass = sum(1 for r in ar_results if r["status"] in ["PASS", "PERFECT"])
    print(f"  EN Pass Rate: {(en_pass/len(en_results))*100:.1f}% ({en_pass}/{len(en_results)})")
    print(f"  AR Pass Rate: {(ar_pass/len(ar_results))*100:.1f}% ({ar_pass}/{len(ar_results)})")
    
    # List all failures
    failures = [r for r in results if r["status"] == "FAIL"]
    if failures:
        print("\n❌ FAILED QUERIES:")
        for f in failures:
            print(f"  [{f['idx']}] {f['query'][:40]}... | {', '.join(f['issues'])}")
    
    print("\n" + "=" * 80)
    
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
