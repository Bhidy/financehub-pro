import asyncio
import asyncpg
from app.core.config import settings

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'chat_messages'")
    for c in cols:
        print(f"{c['column_name']}: {c['data_type']}")
    await conn.close()
    
if __name__ == '__main__':
    asyncio.run(main())
