
import sys
import os

# Add backend-core to path
sys.path.append('/Users/home/Documents/Info Site/mubasher-deep-extract/backend-core')

from app.chat.intent_router import create_router
from app.chat.schemas import Intent

def test_intents():
    router = create_router()
    
    test_cases = [
        ("Chart SPIN", Intent.STOCK_CHART),
        ("show SPIN chart", Intent.STOCK_CHART),
        ("SPIN shareholders", Intent.OWNERSHIP),
        ("who owns SPIN", Intent.OWNERSHIP),
        ("Price of SPIN", Intent.STOCK_PRICE),
    ]
    
    print(f"{'Message':<25} | {'Expected':<20} | {'Detected':<20} | {'Conf':<5} | {'Status'}")
    print("-" * 80)
    
    all_passed = True
    for msg, expected in test_cases:
        result = router.route(msg)
        passed = result.intent == expected and result.confidence >= 0.9
        status = "✅ PASS" if passed else "❌ FAIL"
        if not passed: all_passed = False
        
        print(f"{msg:<25} | {expected.value:<20} | {result.intent.value:<20} | {result.confidence:<5.2f} | {status}")
    
    if all_passed:
        print("\nAll intent tests passed!")
    else:
        print("\nSome tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    test_intents()
