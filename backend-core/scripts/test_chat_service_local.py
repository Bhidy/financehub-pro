import asyncio
import os
import sys
import json

# Add backend-core to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.chat.chat_service import ChatService

async def get_response(query: str, lang: str = "en"):
    print(f"\n=========================================")
    print(f"Testing Query: '{query}' (Lang: {lang})")
    print(f"=========================================")
    
    chat_service = ChatService()
    try:
        response = await chat_service.process_message(
            message=query,
            session_id="local_test_123",
            user_id="test_user",
            language=lang,
            history=[]
        )
        
        print(f"\n[Response Text]")
        print(response.message_text)
        
        print(f"\n[Cards]")
        if response.cards:
            for card in response.cards:
                print(f"- {card.get('type')}: {card.get('title', 'No Title')}")
        else:
            print("No cards returned.")
            
        print(f"\n[Structured Narrative]")
        if response.structured_narrative:
            sn = response.structured_narrative.dict()
            for k, v in sn.items():
                if v:
                    print(f"- {k}: YES")
        
        print(f"\n[Bull/Bear Cases]")
        if response.bull_case:
            print("- Bull Case: YES")
        if response.bear_case:
            print("- Bear Case: YES")
            
        print(f"\n[Disclaimer Card / Learning Section]")
        if response.disclaimer_card:
            print("- Disclaimer Card: YES")
        if response.learning_section:
            print("- Learning Section: YES")
            
        print(f"\n[Follow-Ups]")
        if response.followups:
            for i, f in enumerate(response.followups):
                print(f"{i+1}. [{f.get('type')}] {f.get('text')}")
        else:
            print("No follow-ups generated.")
            
    except Exception as e:
        print(f"Error processing message: {e}")

async def main():
    queries = [
        {"q": "Technical analysis for SWDY", "lang": "en"},
        {"q": "Analyze COMI", "lang": "en"},
        {"q": "COMI vs ADIB", "lang": "en"}
    ]
    
    for item in queries:
        await get_response(item["q"], item["lang"])
        print("\n\n")

if __name__ == "__main__":
    asyncio.run(main())
