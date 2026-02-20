import asyncio
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend-core')))
from app.chat.chat_service import ChatService

async def run_edge_cases():
    chat_service = ChatService()
    
    print("\n--- TEST: SHOW EXTRACTION ---")
    query1 = "Show me what's inside the COMI score"
    res1 = await chat_service.process_message(query1, "test-123")
    print(f"Intent: {res1.intent.value if res1.intent else 'None'}")
    if res1.score_breakdown:
        print("✅ SUCCESS: Score breakdown returned!")
    else:
        print(f"❌ FAIL: Score Breakdown missing. Text: {res1.message_text[:150]}")
        
    print("\n--- TEST: UNDERVALUATION SCREENER ---")
    query2 = "Get me the most undervalued stocks"
    res2 = await chat_service.process_message(query2, "test-124")
    print(f"Intent: {res2.intent.value if res2.intent else 'None'}")
    if res2.undervalued_screen:
        print("✅ SUCCESS: Undervalued screener returned!")
    else:
        print(f"❌ FAIL: Undervalued screener missing. Text: {res2.message_text[:150]}")

if __name__ == "__main__":
    asyncio.run(run_edge_cases())
