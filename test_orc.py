import sys
import os
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), "backend-core"))

from app.chat.claude_orchestrator import get_claude_orchestrator

async def test():
    orchestrator = get_claude_orchestrator()
    res = await orchestrator.classify("Chart TMGH 6M", "test_session_123")
    print("Intent:", res.intent)
    print("Entities:", res.entities)

if __name__ == "__main__":
    asyncio.run(test())
