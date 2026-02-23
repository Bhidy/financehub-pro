import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.chat.schemas import Intent
from app.chat.chat_service import ChatService

async def test():
    class MockConn: pass
    
    # We only need the _apply_intent_overrides method, so we can mock the rest
    service = ChatService(MockConn())
    
    intent = Intent.SCREENER_VALUE
    entities = {}
    message = "mich valuation"
    
    new_intent, new_entities = service._apply_intent_overrides(message, intent, entities)
    print(f"Original: {intent.value} | New: {new_intent.value} | Entities: {new_entities}")

asyncio.run(test())
