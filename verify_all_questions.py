
import asyncio
import aiohttp
import json
import sys

# Production Frontend API (Vercel)
API_URL = "https://finhub-pro.vercel.app/api/v1/ai/chat"

# Questions to verify (Extracted from ai-analyst/page.tsx)
QUESTIONS = [
    # Popular
    "CIB price now",
    "Top gainers today",
    "Market summary",
    "RSI for SWDY",
    
    # Valuation
    "Is CIB overvalued?", 
    "What is the Fair Value of SWDY?",
    "Show PEG Ratio for COMI",
    "EV/EBITDA for CIB",
    
    # Health
    "Check financial health of CIB",
    "SWDY Debt to Equity ratio",
    "Does COMI have enough cash?",
    "Piotroski F-Score for CIB",
    
    # Growth
    "CIB revenue growth last 3 years",
    "Net Income trend for SWDY",
    "COMI profit margin analysis",
    "Compare growth: CIB vs SWDY",
    
    # Dividends
    "Show dividend history for CIB",
    "What is the yield of SWDY?",
    "COMI payout ratio",
    "Best dividend stocks in EGX30",
    
    # Ownership
    "Who owns CIB?",
    "Insider trading in SWDY",
    "COMI major shareholders"
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
            intent = meta.get('intent', 'UNKNOWN')
            
            # Check if we got a valid response (not fallback)
            is_fallback = "I didn't understand" in data.get('message_text', '')
            
            if is_fallback:
                print(f"❌ {question} -> FALLBACK (IDK)")
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
