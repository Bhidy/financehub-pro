import sys
import os

# Add backend-core to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend-core"))

from app.chat.intent_router import IntentRouter
import asyncio

async def test():
    router = IntentRouter()
    res = router.route("Chart TMGH 6M")
    print("Intent:", res.intent)
    print("Entities:", res.entities)

if __name__ == "__main__":
    asyncio.run(test())
