import asyncio
import os
import sys

# Add backend-core to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.chat.followup_engine import FollowUpEngine

async def main():
    print("Testing FollowUpEngine...")
    engine = FollowUpEngine()
    
    ai_response = "Commercial International Bank (COMI) reported strong Q3 earnings with a net profit margin of 35%. " \
                  "The stock is currently trading at 85 EGP, up 2% today. " \
                  "However, there are some concerns about rising non-performing loans in the corporate sector."
                  
    history = [
        {"role": "user", "content": "How is COMI doing?"}
    ]
    
    intent = {"intent": "Analysis"}
    symbol = "COMI"
    
    print("\n[Input]")
    print(f"Symbol: {symbol}")
    print(f"Intent: {intent}")
    print(f"AI Response Snippet: {ai_response[:100]}...\n")
    
    print("Generating follow-ups...")
    followups = await engine.generate(ai_response, history, intent, symbol)
    
    print("\n[Results]")
    if followups:
        for i, f in enumerate(followups):
            print(f"{i+1}. [{f.get('type')}] {f.get('text')}")
            print(f"   Payload: {f.get('payload')}")
    else:
        print("No follow-ups generated.")
        
    # Test Arabic
    print("\n\nTesting Arabic...")
    ai_response_ar = "سجل البنك التجاري الدولي (COMI) أرباحا قوية في الربع الثالث بهامش ربح صافي بلغ 35٪. " \
                     "يتم تداول السهم حاليا عند 85 جنيها مصريا، بارتفاع 2٪ اليوم. " \
                     "ومع ذلك، هناك بعض المخاوف بشأن ارتفاع القروض المتعثرة في قطاع الشركات."
                     
    history_ar = [
        {"role": "user", "content": "كيف حال البنك التجاري؟"}
    ]
    
    followups_ar = await engine.generate(ai_response_ar, history_ar, intent, symbol)
    
    print("\n[Arabic Results]")
    if followups_ar:
        for i, f in enumerate(followups_ar):
            print(f"{i+1}. [{f.get('type')}] {f.get('text')}")
            print(f"   Payload: {f.get('payload')}")
    else:
        print("No follow-ups generated.")

if __name__ == "__main__":
    asyncio.run(main())
