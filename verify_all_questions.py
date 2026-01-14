
import asyncio
import aiohttp
import json
import sys

# Production Frontend API (Vercel)
API_URL = "https://finhub-pro.vercel.app/api/v1/ai/chat"
# API_URL = "https://bhidy-financehub-api.hf.space/api/v1/ai/chat"

# Questions to verify (Extracted from ai-analyst/page.tsx)
QUESTIONS = [
    # User Reported Issues
    "PE ratio for SWDY",
    "Compare CIB vs SWDY",
    "Financial health of CIB",
    
    # Standard Regression Tests
    "CIB price now",
    "Top gainers today",
    "Market summary"
]

async def verify_question(session, question):
    try:
        async with session.post(API_URL, json={"message": question}) as resp:
            if resp.status != 200:
                print(f"❌ {question} -> HTTP {resp.status}")
                return False
            
            data = await resp.json()
            
            # Basic validation
            cards = data.get('cards', [])
            meta = data.get('meta', {})
            version = meta.get('backend_version', 'UNKNOWN')
            print(f"   ver: {version}")
            intent = meta.get('intent', 'UNKNOWN')
            
            # Check if we got a valid response (not fallback)
            is_fallback = "I didn't understand" in data.get('message_text', '')
            
            if is_fallback:
                print(f"❌ {question} -> FALLBACK (IDK)")
                return False
                
            if intent == 'ERROR':
                print(f"❌ {question} -> ERROR INTENT: {meta.get('error', 'Unknown')}")
                return False

            # Strict check for error cards (even if intent is valid)
            error_cards = [c for c in cards if c.get('type') == 'error']
            if error_cards:
                 err_msg = error_cards[0].get('data', {}).get('error', 'Unknown Error')
                 print(f"❌ {question} -> ERROR CARD: {err_msg}")
                 return False
                
            print(f"✅ {question} -> {intent} ({len(cards)} cards)")
            return True
            
    except Exception as e:
        print(f"❌ {question} -> ERROR: {e}")
        return False

async def main():
    print(f"🔍 Starting Verification of {len(QUESTIONS)} questions...")
    print("-" * 50)
    
    results = []
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
        for q in QUESTIONS:
            success = await verify_question(session, q)
            # Add small delay to avoid rate limits
            await asyncio.sleep(0.5)
            results.append(success)
    
    print("-" * 50)
    passed = results.count(True)
    total = len(results)
    print(f"📊 SUMMARY: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")

if __name__ == "__main__":
    if sys.platform == 'win32':
        loop = asyncio.ProactorEventLoop()
        asyncio.set_event_loop(loop)
    loop = asyncio.new_event_loop()
    loop.run_until_complete(main())
