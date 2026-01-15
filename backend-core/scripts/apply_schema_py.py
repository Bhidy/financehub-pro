
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def apply_schema():
    print(f"Connecting to {DATABASE_URL}")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    with open('schema_updates.sql', 'r') as f:
        sql = f.read()
        
    print("Applying schema updates...")
    try:
        await conn.execute(sql)
        print("✅ Schema applied successfully")
    except Exception as e:
        print(f"❌ Schema update failed: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(apply_schema())
