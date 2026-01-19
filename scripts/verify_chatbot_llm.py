
import asyncio
import os
import sys

# Add backend-core to path
sys.path.append(os.path.join(os.getcwd(), 'backend-core'))

from app.chat.llm_explainer import get_explainer

async def test_llm_explainer():
    print("=== Testing LLM Explainer Service ===")
    
    explainer = get_explainer()
    
    # 1. Dummy Data (Stock Price)
    dummy_data = [
        {
            "type": "stock_header",
            "data": {
                "symbol": "COMI",
                "name": "Commercial International Bank",
                "price": 50.2,
                "currency": "EGP",
                "change": -0.25,
                "change_percent": -0.5
            }
        },
        {
            "type": "stock_snapshot",
            "data": {
                "pe_ratio": 8.5,
                "market_cap": "150B",
                "yield": "2.5%"
            }
        }
    ]
    
    print("\n--- Test Case 1: Stock Price (English) ---")
    result_en = await explainer.generate_explanation(
        query="Price of COMI",
        intent="STOCK_PRICE",
        data=dummy_data,
        language="en"
    )
    print(f"Result:\n{result_en}")
    
    print("\n--- Test Case 2: Stock Price (Arabic) ---")
    result_ar = await explainer.generate_explanation(
        query="سعر سهم التجاري الدولي",
        intent="STOCK_PRICE",
        data=dummy_data,
        language="ar"
    )
    print(f"Result:\n{result_ar}")
    
    # 2. Robustness Test (Empty Data)
    print("\n--- Test Case 3: Empty Data (Robustness) ---")
    result_empty = await explainer.generate_explanation("test", "test", [], "en")
    print(f"Result (Should be None): {result_empty}")

    if result_en and "COMI" in result_en and result_ar:
        print("\n✅ Verification PASSED")
    else:
        print("\n❌ Verification FAILED (Check API Key or Logic)")

if __name__ == "__main__":
    try:
        asyncio.run(test_llm_explainer())
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
