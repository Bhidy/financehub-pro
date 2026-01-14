
import requests
import json
import sys
import time

# Use the correct endpoint
API_URL = "https://bhidy-financehub-api.hf.space/api/v1/ai/chat"

# 1. Define Seed Questions (The "Predefined" set covering all capabilities)
SEEDS = [
    # Stock Basics
    "Price of COMI",
    "Chart SWDY", 
    "Snapshot of EAST",
    
    # Deep Analysis
    "Financial health of CIB",
    "Fair value of FWRY",
    "Technicals for HRHO",
    "Ownership of ORWE",
    
    # Financials
    "Financials of ETEL",
    "Dividends of ABUK",
    "Margins for SWDY",
    "Revenue trend of AUTO",
    
    # Discovery / Screener
    "Top gainers",
    "Top losers",
    "Banks sector stocks", 
    "High dividend stocks",
    
    # Funds
    "AZ Gold fund",
    "Top performing funds",
    
    # Compare
    "Compare COMI vs SWDY"
]

def call_chat(message):
    """Call the chat API and return full json."""
    try:
        resp = requests.post(API_URL, json={"message": message, "history": []}, timeout=25)
        if resp.status_code == 200:
            return resp.json()
        print(f"   [HTTP {resp.status_code}] Error for '{message}'")
        return None
    except Exception as e:
        print(f"   [Exception] {e} for '{message}'")
        return None

def run_comprehensive_qa():
    print(f"🚀 STARTING COMPREHENSIVE QA (Depth=2) on {API_URL}")
    print("=" * 70)
    
    passed = 0
    failed = 0
    warnings = 0
    
    # Track unique actions to verify (prevent duplicates)
    actions_to_verify = set()
    
    # Phase 1: Seed Questions
    print(f"\nPhase 1: Verifying {len(SEEDS)} Seed Questions...")
    print("-" * 70)
    
    for q in SEEDS:
        print(f"❓ Query: '{q}'")
        data = call_chat(q)
        
        if not data:
            print(f"❌ FAILED: API Error")
            failed += 1
            continue
            
        success = data.get('success', False)
        # Check backend 'trouble processing' generic message
        msg = data.get('message', '')
        if "trouble processing" in msg.lower():
            print(f"❌ FAILED: Backend Processing Error")
            failed += 1
            continue
            
        if not success:
            # Some searches might return success=False if not found, usually acceptable if message explains it
            if "not found" in msg.lower() or "not match" in msg.lower():
                 print(f"⚠️  WARNING: Data Not Found (Logic OK)")
                 warnings += 1
            else:
                 print(f"❌ FAILED: Success=False")
                 print(f"   Response: {json.dumps(data, ensure_ascii=False)[:300]}")
                 failed += 1
                 continue
        else:
            print(f"✅ PASS | Intent: {data.get('meta', {}).get('intent')}")
            passed += 1
            
        # Collect Actions
        actions = data.get('actions', [])
        if actions:
            print(f"   found {len(actions)} actions")
            for a in actions:
                payload = a.get('payload')
                if payload:
                    actions_to_verify.add(payload)
    
    # Phase 2: Action Verification
    print(f"\nPhase 2: Verifying {len(actions_to_verify)} Derived Actions...")
    print("-" * 70)
    
    # Limit to first 20 unique actions to save time, covering diversity
    sorted_actions = sorted(list(actions_to_verify))
    
    for i, payload in enumerate(sorted_actions):
        # Skip simple ones we already tested like "Chart SWDY" if possible, but testing exact payload is good
        print(f"👉 Action {i+1}/{len(sorted_actions)}: '{payload}'")
        
        data = call_chat(payload)
        
        if not data:
            print(f"❌ FAILED: API Error")
            failed += 1
            continue
            
        success = data.get('success', False)
        msg = data.get('message', '')
        
        if "trouble processing" in msg.lower():
            print(f"❌ FAILED: Backend Processing Error")
            failed += 1
            continue
            
        if not success:
             if "not found" in msg.lower():
                 print(f"⚠️  WARNING: Data Not Found")
                 warnings += 1
             else:
                 print(f"❌ FAILED: Success=False")
                 failed += 1
        else:
             print(f"✅ PASS | Intent: {data.get('meta', {}).get('intent')}")
             passed += 1
             
    print("=" * 70)
    print(f"📊 SUMMARY: {passed} Passed | {failed} Failed | {warnings} Warnings")
    
    if failed > 0:
        print("🚨 CRITICAL ISSUES DETECTED")
        sys.exit(1)
    else:
        print("✅ ALL CHECKS PASSED. System is Robust.")
        sys.exit(0)

if __name__ == "__main__":
    run_comprehensive_qa()
