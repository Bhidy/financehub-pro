import asyncio
import asyncpg
import sys
import os
from dotenv import load_dotenv

load_dotenv()

databases = [
    # Fallback to hardcoded if env is missing
    os.getenv("DATABASE_URL", "postgresql://postgres:StartaProdDb321!@46.224.223.172:5432/postgres")
]

async def main():
    for db_url in databases:
        try:
            print(f"Connecting to {db_url.split('@')[-1]}...")
            conn = await asyncpg.connect(db_url)
            cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'chat_messages'")
            print("CHAT_MESSAGES COLUMNS:")
            for c in cols:
                print(f"- {c['column_name']}: {c['data_type']}")
            await conn.close()
            return
        except Exception as e:
            print(f"Connection failed: {e}")
            
if __name__ == '__main__':
    asyncio.run(main())
