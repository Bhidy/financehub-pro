
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def apply_fix():
    print("🛠️ Applying Schema Fix (updated_at)...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.execute('''
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ''')
        print("✅ Column 'updated_at' added successfully.")
        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(apply_fix())
