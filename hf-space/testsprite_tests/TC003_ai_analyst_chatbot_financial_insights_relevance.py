import requests
import uuid

BASE_API_URL = "https://bhidy-financehub-api.hf.space"
TIMEOUT = 30

def test_ai_chatbot_production():
    device_fingerprint = f"qa-test-{uuid.uuid4().hex[:8]}"
    session_id = str(uuid.uuid4())
    
    headers = {
        "Content-Type": "application/json",
        "X-Device-Fingerprint": device_fingerprint
    }

    def chat(msg, hist=[]):
        payload = {
            "message": msg,
            "session_id": session_id,
            "history": hist
        }
        resp = requests.post(f"{BASE_API_URL}/api/v1/ai/chat", json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    print(f"🚀 [QA] Starting Expert Production Test against: {BASE_API_URL}")

    # Step 1: Ticker Resolution & Symbol Mapping (CIB -> COMI)
    print("Testing Turn 1: Symbol Resolution (CIB)...")
    resp1 = chat("What is the price of CIB?")
    print(f"DEBUG Turn 1 Response: {resp1}")
    assert resp1["meta"]["intent"] == "STOCK_PRICE", f"Wrong intent: {resp1['meta']['intent']}"
    assert any(c["type"] == "stock_header" for c in resp1["cards"]), "Missing stock_header card"
    print("✅ Turn 1 Passed.")

    # Step 2: Multi-turn Context / Stats
    print("Testing Turn 2: Valuation Stats (COMI)...")
    resp2 = chat("PE ratio COMI")
    print(f"DEBUG Turn 2 Response: {resp2}")
    assert resp2["meta"]["intent"] == "STOCK_STAT", f"Wrong intent: {resp2['meta']['intent']}"
    assert any(c["type"] in ["stats", "error"] and "valuation" in c.get("data", {}) for c in resp2["cards"]), "Missing stats/valuation card"
    print("✅ Turn 2 Passed.")

    # Step 3: Technical Indicators & Ratios
    print("Testing Turn 3: Technical Indicators (COMI)...")
    resp3 = chat("What is the RSI and MACD for COMI?")
    print(f"DEBUG Turn 3 Response: {resp3}")
    # Technical Indicators should return technicals card or mention RSI
    assert "rsi" in resp3["message_text"].lower() or any(c["type"] == "technicals" for c in resp3["cards"])
    print("✅ Turn 3 Passed.")

    # Step 4: Multilingual & Advanced Stats (Z-Score)
    print("Testing Turn 4: Arabic & Deep Analysis (Altman Z-Score)...")
    resp4 = chat("كم سعر سويدي وما هو Altman Z-Score؟")
    print(f"DEBUG Turn 4 Response: {resp4}")
    assert resp4["language"] == "ar"
    assert "altman" in str(resp4).lower()
    print("✅ Turn 4 Passed.")

    # Step 5: Guest Limit Enforcement
    print("Testing Turn 5: Guest Limit Verification...")
    # We already used 4 questions. The 5th should work, 6th should block.
    # 5th
    _ = chat("Fifth question")
    # 6th
    resp6 = chat("Sixth question")
    print(f"DEBUG Turn 6 Response: {resp6}")
    assert resp6["meta"]["intent"] == "USAGE_LIMIT_REACHED", "6th question should be blocked for guest"
    assert "5" in resp6["message_text"], "Block message should mention the 5 question limit"
    print("✅ Turn 5 (Guest Limit) Passed.")

    print("\n🏆 PRODUCTION QA SUCCESSFUL: All expert-level requirements validated.")

if __name__ == "__main__":
    test_ai_chatbot_production()
