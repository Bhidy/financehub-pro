
import asyncio
import os
import sys
from dotenv import load_dotenv
import asyncpg

# Add backend to path to import handlers
sys.path.append(os.path.join(os.getcwd(), 'backend-core'))

# Mock the logger
import logging
logging.basicConfig(level=logging.INFO)

# Load environment
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://postgres:***REMOVED-CREDENTIAL***@46.224.223.172:5432/mubasher_db' # Use tunnel or direct if possible

# Import the handler (after path setup)
from app.chat.handlers.compare_handler import handle_compare_stocks
from app.chat.schemas import ChatResponse

async def test_compare_handler():
    print("🚀 Testing COMPARE_STOCKS Handler...")
    
    # 1. Connect to DB (Try local tunnel if prod URL fails, but script likely runs where env is set)
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ DB Connected")
    except Exception as e:
        print(f"❌ DB Connection Failed: {e}")
        return

    try:
        # 2. Run Handler
        result = await handle_compare_stocks(conn, ['JUFO', 'DOMT'], language='ar')
        
        # 3. Simulate ChatService Access (The Crash Point)
        print("\n🔍 Verifying ChatService Compatibility...")
        
        # This was the crashing line in chat_service.py:
        # if not handler_framework_card and result.conversational_text:
        
        is_dict = isinstance(result, dict)
        print(f"Result Type: {type(result)}")
        
        # Simulate the FIX
        llm_text = getattr(result, 'conversational_text', None) or result.get('conversational_text')
        
        if llm_text:
            print(f"✅ conversational_text accessed successfully: {llm_text[:50]}...")
        else:
            print("⚠️ conversational_text is missing (but no crash)")
            
        if is_dict:
            print("ℹ️ Handler returns DICT (legacy behavior confirmed)")
        else:
            print("ℹ️ Handler returns OBJECT")

        print("\n✅ Test Passed: No AttributeError")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(test_compare_handler())
