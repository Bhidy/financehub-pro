import asyncio
from backend_core.app.chat.chat_service import get_chat_service
from backend_core.app.chat.schemas import ChatResponse
from backend_core.app.db.database import get_db

async def test_mich():
    print("Testing 'mich valuation'")
    async for conn in get_db():
        service = get_chat_service(conn)
        res = await service.process_message("mich valuation", session_id="test_session", language="en")
        print(f"Final response: {res.text}")
        print(f"Cards: {res.cards}")
        break

if __name__ == "__main__":
    asyncio.run(test_mich())
