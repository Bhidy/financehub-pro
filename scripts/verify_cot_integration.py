
import asyncio
import sys
import os
from unittest.mock import MagicMock, patch, AsyncMock

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ChatService
# Note: Adjust path based on where this script is run
try:
    from backend_core.app.chat.chat_service import ChatService
    from backend_core.app.chat.schemas import Intent
except ImportError:
    backend_core_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend-core")
    if backend_core_path not in sys.path:
        sys.path.append(backend_core_path)
    from app.chat.chat_service import ChatService
    from app.chat.schemas import Intent

# Mock Data
MOCK_CONVO_TEXT = """
[THOUGHT_PROCESS]
User is asking for COMI analysis. The stock is undervalued with strong fundamentals. I should highlight the banking sector growth.
The key insight is that COMI is trading below fair value despite record profits.

[BULL_CASE]
- Point 1
- Point 2

Here is the analysis for COMI...
"""

async def run_test():
    print("🧪 Starting CoT Integration Verification...")
    
    # Mock Connection
    mock_conn = MagicMock()
    mock_conn.fetchval = AsyncMock(return_value=0) # Mock counts
    mock_conn.execute = AsyncMock()
    
    # Initialize ChatService
    service = ChatService(mock_conn)
    
    # Mock internal components to avoid DB calls and actual LLM
    service._get_user_name = AsyncMock(return_value="TestUser")
    service.context_store = MagicMock()
    service.context_store.get.return_value = None
    service.context_store.set = MagicMock()
    
    service._dispatch_handler = AsyncMock(return_value={
        'success': True, 
        'cards': [{'type': 'data_card', 'data': {}}],
        'conversational_text': None 
    })
    
    # Mock self.resolver
    service.resolver = MagicMock()
    # Mock resolve to return a dummy object with symbol attribute
    mock_symbol = MagicMock()
    mock_symbol.symbol = "COMI"
    mock_symbol.market_code = "EGX"
    service.resolver.resolve = AsyncMock(return_value=mock_symbol) 

    # We need to mock 'get_explainer' to return our MOCK_CONVO_TEXT
    with patch('app.chat.chat_service.get_explainer') as mock_get_explainer:
        mock_explainer_instance = MagicMock()
        mock_explainer_instance.generate_narrative = AsyncMock(return_value=MOCK_CONVO_TEXT)
        mock_get_explainer.return_value = mock_explainer_instance
        
        # We also need to mock ResponseComposer.compose_premium_response to check if it gets called with detected_insight
        with patch('app.chat.chat_service.ResponseComposer') as mock_composer_cls:
            # Setup return value for compose_premium_response
            # It returns (full_text, structured_narrative, opening_category)
            mock_structured = MagicMock()
            mock_structured.key_insight = "Extracted Insight" 
            mock_composer_cls.compose_premium_response.return_value = ("Final Text", mock_structured, "opening")
            
            # Execute process_message
            # We bypass _log_analytics to avoid complexity
            service._log_analytics = AsyncMock()
            service._build_response = MagicMock(return_value="Final ChatResponse")
            service._enforce_response_language = MagicMock(return_value="Final ChatResponse")
            
            # We need to ensure we hit the PHASE 2/3 logic blocks
            # Intent must be allowed (e.g. STOCK_PRICE)
            # history=None -> new session logic
            
            print("🚀 Executing process_message...")
            try:
                await service.process_message(
                    message="Analyze COMI",
                    intent=Intent.STOCK_PRICE, # We need to mock intent detection? 
                    # process_message calls self.resolver... and _dispatch_handler with intent via routing?
                    # No, process_message parses intent using 'router'.
                    # We need to mock 'router'.
                )
            except Exception as e:
                # process_message is complex to invoke directly because it does intent routing inside.
                # Let's target the logic block directly if possible?
                # Or just mock the router.
                pass

            # Update: ChatService.process_message calls self.nlu.parse(...)
            # We need to mock self.nlu
            service.nlu = MagicMock()
            service.nlu.parse = AsyncMock(return_value=(Intent.STOCK_PRICE, 1.0, {'symbol':'COMI'}, "normalized"))
            
            # Mock resolver
            service.resolver = MagicMock()
            service.resolver.resolve = AsyncMock(return_value=None) 
            
            # Run again
            await service.process_message(message="Analyze COMI")
            
            # VERIFY
            # Check if compose_premium_response was called
            print("🔍 Verifying compose_premium_response call...")
            call_args = mock_composer_cls.compose_premium_response.call_args
            if call_args:
                kwargs = call_args.kwargs
                detected_insight = kwargs.get('detected_insight')
                print(f"   Captured detected_insight: {detected_insight}")
                
                expected_insight = "User is asking for COMI analysis. The stock is undervalued with strong fundamentals. I should highlight the banking sector growth.\nThe key insight is that COMI is trading below fair value despite record profits."
                
                if detected_insight and "User is asking" in detected_insight:
                    print("✅ CoT Insight Successfully Passed to Composer!")
                else:
                    print(f"❌ Verification Failed. Expected insight starting with 'User is asking...', got: {detected_insight}")
            else:
                print("❌ compose_premium_response was NOT called.")

if __name__ == "__main__":
    asyncio.run(run_test())
