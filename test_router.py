import asyncio
import os
import sys
sys.path.append("/Users/home/Documents/Info Site/mubasher-deep-extract/backend-core")

from app.chat.intent_router import IntentRouter
from app.chat.schemas import ChatRequest

async def main():
    router = IntentRouter(None)  # Skip LLM context for now
    
    test_cases = [
        ("deep dive on saudi cement", "en"),
        ("deep dive on mb eng", "en"),
        ("deep dive on ams", "en"),
        ("deep dive on comi", "en"),
    ]
    
    for msg, lang in test_cases:
        req = ChatRequest(message=msg, language=lang, session_id="test")
        intent, conf, ext, _, _ = await router.route(req)
        print(f"Message: '{msg}' -> Intent: {intent.value} (Conf: {conf})")
        print(f"Entities: {ext}\n")

if __name__ == "__main__":
    asyncio.run(main())
