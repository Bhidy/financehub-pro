import asyncio
import os
import sys
# Add project root and backend-core to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend-core'))
    
from app.chat.intent_router import create_router
from app.chat.schemas import Intent

async def test_routing():
    print("🧠 Initializing Intent Router...")
    router = create_router()
    
    test_cases = [
        ("Is TMGH undervalued?", Intent.DEEP_VALUATION),
        ("What is the fair value of SWDY?", Intent.FAIR_VALUE),
        ("Is COMI financially safe?", Intent.DEEP_SAFETY),
        ("Does PHDC have high growth potential?", Intent.DEEP_GROWTH),
        ("Show me the safest stocks in EGX", Intent.SCREENER_SAFETY),
    ]
    
    print("\n🧪 Testing Routing Logic:")
    for query, expected_intent in test_cases:
        # Context simulation
        context = {'last_symbol': None, 'last_market': 'EGX'}
        result = router.route(query, context)
        
        status = "✅" if result.intent == expected_intent else "❌"
        print(f"{status} '{query}' -> {result.intent} (Expected: {expected_intent}) | Conf: {result.confidence}")

if __name__ == "__main__":
    # Add project root to path
    sys.path.append(os.getcwd())
    asyncio.run(test_routing())
