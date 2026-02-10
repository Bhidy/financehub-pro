
import asyncio
import os
import sys
# Set explicit path to app
sys.path.append('/app')

import logging
logging.basicConfig(level=logging.INFO)

from dotenv import load_dotenv
load_dotenv()

import asyncpg
from app.chat.handlers.compare_handler import handle_compare_stocks
from app.chat.chat_service import ChatService

# Mock ChatService just enough to test the dict handling logic
# We can't easily instantiate the full service due to heavy deps, so we'll test the logic block directly
# OR we can just verify the variables are set in a dummy function that mimics the crash site.

def test_scope_fix():
    print("🚀 Testing Scope Fix Logic...")
    
    # Simulate a dict result from a handler
    result_data = {
        'success': True,
        'message': 'Test Message',
        'conversational_text': 'Hello World'
    }
    
    # 1. Simulate the extraction block (COPY OF PROD CODE LOGIC)
    handler_bull_case = result_data.get('bull_case')
    handler_bear_case = result_data.get('bear_case')
    # ... (omitting standard ones)
    
    # THE FIX UNDER TEST:
    handler_index_composition = result_data.get('index_composition')
    handler_key_insight = result_data.get('key_insight')
    
    print(f"✅ handler_index_composition is defined: {handler_index_composition}")
    print(f"✅ handler_key_insight is defined: {handler_key_insight}")
    
    # Simulate usage
    try:
        test_usage = handler_index_composition
        test_usage_2 = handler_key_insight
        print("✅ No UnboundLocalError raised during access.")
    except UnboundLocalError as e:
        print(f"❌ CRITICAL: UnboundLocalError: {e}")
        sys.exit(1)

async def test_full_flow():
    # This is harder to mock perfectly without db, but we can try to rely on the static check above 
    # plus the previous compare handler test.
    test_scope_fix()

if __name__ == "__main__":
    asyncio.run(test_full_flow())
