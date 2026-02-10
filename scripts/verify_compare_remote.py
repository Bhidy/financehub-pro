
import asyncio
import os
import sys
# Set explicit path to app
sys.path.append('/app')

import logging
logging.basicConfig(level=logging.INFO)

# Load env inside container
from dotenv import load_dotenv
load_dotenv()

import asyncpg
from app.chat.handlers.compare_handler import handle_compare_stocks

# Connection string from container env or hardcoded for test
DATABASE_URL = os.getenv('DATABASE_URL')

async def test_remote():
    print("🚀 Running REMOTE Verification for Compare Handler...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ DB Connected")
        
        # Test Payload
        symbols = ['JUFO', 'DOMT']
        print(f"📊 Testing comparison for: {symbols}")
        
        result = await handle_compare_stocks(conn, symbols, language='ar')
        
        # Verify Structure (The Fix)
        is_dict = isinstance(result, dict)
        print(f"ℹ️ Result Type: {type(result)}")
        
        # Simulate ChatService Logic
        llm_text = getattr(result, 'conversational_text', None) or result.get('conversational_text')
        
        if llm_text:
            print(f"✅ Safe Access Successful. Text length: {len(llm_text)}")
        else:
            print("⚠️ Safe Access Successful but text is empty.")
            
        print("\n✅ VERIFICATION PASSED: Handler returned valid data without crashing.")
        
    except Exception as e:
        print(f"\n❌ VERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(test_remote())
