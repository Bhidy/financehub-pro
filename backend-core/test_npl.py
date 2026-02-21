import asyncio
from app.chat.intent_router import IntentRouter
from app.chat.chat_service import get_db_pool

async def test():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        router = IntentRouter(conn)
        res = await router.route("How serious is the Non-Performing Loans (NPL) risk for DGTZ, and what would a worst-case scenario look like in terms of credit losses and impact on the company's finances")
        print(res.intent)
        print(res.entities)

asyncio.run(test())
