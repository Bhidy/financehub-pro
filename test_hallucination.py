import asyncio
import os
import sys

# Change to the root dir for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend-core')))
from app.chat.chat_service import ChatService
from app.database import init_db

async def run_hallucination_test():
    print("⏳ Initializing Database Pool...")
    pool = await init_db()
    try:
        service = ChatService(pool)
        
        print("\n=== TEST: HALLUCINATION & NARRATIVE HEADER ===")
        # The user's screenshot showed it was an undervalued/real estate query 
        # that spawned the ORGN's peer loop.
        query = "Show me undervalued real estate stocks"
        print(f"Testing Query: {query}")
        
        res = await service.process_message(query, "hallucination-test-1", language="en")
        
        print(f"\nIntent Recognized: {res.intent.value if res.intent else 'None'}")
        
        # Check Structured Narrative for the word "Narrative"
        if res.structured_narrative:
            core_text = res.structured_narrative.core_narrative
            
            # 1. Check for Narrative Header
            if "**Narrative**" in core_text or "Narrative:" in core_text:
                print("❌ FAIL: The word 'Narrative' was still generated in the header.")
            else:
                print("✅ PASS: No 'Narrative' header found.")
                
            # 2. Check for Hallucination Loop (ORGN's peer)
            if "ORGN's competitor, ORGN's peer" in core_text:
                print("❌ FAIL: The hallucination loop 'ORGN's peer, ORGN's competitor' was detected.")
            else:
                print("✅ PASS: No hallucination loops detected.")
                
            print("\n--- Output Snippet ---")
            print(core_text[:500] + "...\n[TRUNCATED]")
                
        else:
             print("❌ FAIL: No structured narrative returned.")
             
    finally:
        await pool.close()
        print("🔌 Database Pool Closed.")

if __name__ == "__main__":
    asyncio.run(run_hallucination_test())
