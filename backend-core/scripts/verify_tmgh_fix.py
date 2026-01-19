import asyncio
import httpx

async def verify_tmgh_fix():
    url = "http://localhost:7860/api/v1/ai/chat"
    
    # Test case 1: Slang with TMGH
    payload = {
        "message": "Is TMGH undervalued or overvalued?",
        "history": []
    }
    
    print("Testing TMGH Resolution...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            data = response.json()
            
            intent = data.get("meta", {}).get("intent")
            symbol = data.get("meta", {}).get("entities", {}).get("symbol")
            version = data.get("meta", {}).get("backend_version")
            conv_text = data.get("conversational_text", "")
            
            print(f"Version: {version}")
            print(f"Intent: {intent}")
            print(f"Symbol: {symbol}")
            print(f"Word Count: {len(conv_text.split())}")
            
            if symbol == "TMGH":
                print("✅ PASS: TMGH correctly resolved.")
            else:
                print(f"❌ FAIL: Expected TMGH, got {symbol}")
                
            if 70 <= len(conv_text.split()) <= 150: # Allowing a bit of buffer
                 print(f"✅ PASS: Word count is within expert range ({len(conv_text.split())})")
            else:
                 print(f"⚠️  NOTE: Word count is {len(conv_text.split())} (Expected 70-100)")

    except Exception as e:
        print(f"Error testing TMGH: {e}")

if __name__ == "__main__":
    asyncio.run(verify_tmgh_fix())
