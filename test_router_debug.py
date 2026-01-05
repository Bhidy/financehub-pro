
import asyncio
import sys
import os

# Add hf-space to path
sys.path.append(os.path.join(os.getcwd(), 'hf-space'))

from app.chat.intent_router import create_router
from app.chat.schemas import Intent

def test_router():
    router = create_router()
    
    test_cases = [
        "What is the Fair Value of SWDY?",
        "Check financial health of CIB (Altman Z)",
        "RSI for SWDY",
        "Who owns CIB?",
        "Is SWDY overvalued?"
    ]
    
    print("--- Testing Intent Router ---")
    for msg in test_cases:
        # Mock context
        context = {'last_symbol': None} 
        result = router.route(msg, context)
        print(f"Query: '{msg}'")
        print(f"  -> Intent: {result.intent}")
        print(f"  -> Confidence: {result.confidence}")
        print(f"  -> Entities: {result.entities}")
        print("-" * 30)

if __name__ == "__main__":
    test_router()
