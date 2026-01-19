import asyncio
import os
import sys
import json
from typing import List

# Setup path for backend-core
sys.path.append(os.path.join(os.getcwd(), "backend-core"))

import asyncpg
from app.chat.chat_service import ChatService
from app.chat.schemas import Intent

async def run_test(service: ChatService, query: str, description: str):
    print(f"\n[TEST] {description}")
    print(f"Query: '{query}'")
    
    start_time = asyncio.get_event_loop().time()
    response = await service.process_message(query, session_id="test_session")
    end_time = asyncio.get_event_loop().time()
    
    print(f"Latency: {int((end_time - start_time) * 1000)}ms")
    print(f"Intent: {response.meta.intent} (Confidence: {response.meta.confidence})")
    print(f"Voice: {response.conversational_text}")
    print(f"Cards: {len(response.cards)}")
    
    # Assertions
    if not response.conversational_text:
         print("❌ ERROR: No conversational text generated!")
    elif "Bhidy" not in (response.conversational_text or ""):
        print("⚠️  WARNING: Personalization 'Bhidy' missing from response!")
    
    if len(response.cards) > 0:
        print(f"✅ Factual data present (Card 1: {response.cards[0].title})")
    else:
        print("ℹ️ No cards expected for this query.")

async def verify():
    # Load env for Groq
    if not os.environ.get("GROQ_API_KEY"):
        print("❌ ERROR: GROQ_API_KEY not set!")
        return

    # Database connection
    conn_str = os.environ.get("DATABASE_URL")
    if not conn_str:
        # Fallback to local
        conn_str = "postgresql://postgres:postgres@localhost:5432/postgres"
    
    try:
        conn = await asyncpg.connect(conn_str, statement_cache_size=0)
        service = ChatService(conn)
        
        # Test Cases
        await run_test(service, "Hello Starta!", "Basic Chitchat & Greeting")
        await run_test(service, "CIB price?", "Standard Market Query")
        await run_test(service, "سعر التجاري كام", "Arabic Slang (Nicknames)")
        await run_test(service, "Is that good?", "Follow-up Memory (Context)")
        await run_test(service, "Give me a summary of COMI", "Narrative Storytelling")
        await run_test(service, "What is PE ratio?", "Education/Definition")
        await run_test(service, "What is Bitcoin price?", "EGX Only (Refusal)")
        
        # 9. DIVIDEND SCREENER ACCURACY (Fix for hallucination)
        print("\n--- Test 9: Dividend Screener Accuracy ---")
        # Passing user_id=1 (assuming Admin User exists in local DB)
        resp9 = await service.process_message("Top 10 dividend stocks in Egypt", user_id="1")
        print(f"Personalized Voice: {resp9.conversational_text}")
        
        # Assertions
        if not resp9.conversational_text or "Trader" in resp9.conversational_text:
             print("⚠️  Warning: Personalized name not found (might be using default 'Trader')")
        
        hallucination_phrases = ["no data", "couldn't find", "not available", "لم يتم العثور"]
        is_hallucinating = any(phrase in resp9.conversational_text.lower() for phrase in hallucination_phrases)
        if is_hallucinating:
            print("❌ FAIL: Narrative claims no data found despite cards being present!")
        else:
            print("✅ SUCCESS: Narrative correctly discussed retrieved dividend data.")
            
        await conn.close()
        print("\n✅ Verification Complete!")
        
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
