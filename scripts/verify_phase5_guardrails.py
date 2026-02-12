
import sys
import os
import logging

# Add backend-core path explicitly
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend-core'))

from app.chat.guardrails.numeric_verifier import NumericVerifier
from app.chat.guardrails.market_sentiment import MarketSentimentAnalyzer, MarketTone

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Phase5Verifier")

def test_numeric_verifier():
    print("\n🔢 Testing Numeric Verifier (Hallucination Guardrails)...")
    
    # Context Data
    data_context = [
        {"type": "snapshot", "data": {"price": 100.50, "pe_ratio": 15.2, "eps": 6.61}}
    ]
    
    # Case 1: Valid Response
    response_valid = "The stock is trading at 100.50 with a P/E of 15.2."
    errors_valid = NumericVerifier.verify_response(response_valid, data_context)
    if not errors_valid:
        print("   ✅ Valid Response: PASSED (No errors found)")
    else:
        print(f"   ❌ Valid Response: FAILED (Found unexpected errors: {errors_valid})")
        
    # Case 2: Hallucinated Response
    response_hallucinated = "The EPS is 8.50, which is higher than expected." # Real EPS is 6.61
    errors_hallucinated = NumericVerifier.verify_response(response_hallucinated, data_context)
    if errors_hallucinated:
        print(f"   ✅ Hallucination Detection: PASSED (Caught: {errors_hallucinated})")
    else:
        print("   ❌ Hallucination Detection: FAILED (Did not catch 8.50 mismatch)")

def test_market_sentiment():
    print("\n🎭 Testing Market Sentiment Analyzer (Tone Steering)...")
    
    # Case 1: Crash
    crash_data = {"change_percent": -3.5}
    tone_crash = MarketSentimentAnalyzer.analyze_market_mood(crash_data)
    instruction_crash = MarketSentimentAnalyzer.get_tone_instruction(tone_crash)
    print(f"   📉 Crash (-3.5%): Tone={tone_crash}")
    if tone_crash == MarketTone.CRASH and "SERIOUS" in instruction_crash:
        print("      ✅ Logic: PASSED")
    else:
        print(f"      ❌ Logic: FAILED (Got {tone_crash})")

    # Case 2: Rally
    rally_data = {"change_percent": 2.1}
    tone_rally = MarketSentimentAnalyzer.analyze_market_mood(rally_data)
    instruction_rally = MarketSentimentAnalyzer.get_tone_instruction(tone_rally)
    print(f"   📈 Rally (+2.1%): Tone={tone_rally}")
    if tone_rally == MarketTone.BOOM and "ENERGETIC" in instruction_rally:
        print("      ✅ Logic: PASSED")
    else:
        print(f"      ❌ Logic: FAILED (Got {tone_rally})")
        
    # Case 3: Neutral
    neutral_data = {"change_percent": 0.1}
    tone_neutral = MarketSentimentAnalyzer.analyze_market_mood(neutral_data)
    print(f"   😐 Neutral (+0.1%): Tone={tone_neutral}")
    if tone_neutral == MarketTone.NEUTRAL:
        print("      ✅ Logic: PASSED")
    else:
        print(f"      ❌ Logic: FAILED (Got {tone_neutral})")

if __name__ == "__main__":
    print("🛡️  Starting Phase 5 Verification...")
    test_numeric_verifier()
    test_market_sentiment()
    print("\n✅ Verification Complete.")
