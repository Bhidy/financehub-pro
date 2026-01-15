
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def apply_schema():
    print("🛠️ Applying Mubasher Schema Updates...")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Create nav_history table
        print("   Creating nav_history table...")
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS nav_history (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(50) REFERENCES mutual_funds(fund_id),
                date DATE NOT NULL,
                nav DECIMAL(12,4) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(fund_id, date)
            );
        ''')
        
        # Alter mutual_funds table
        print("   Altering mutual_funds table...")
        await conn.execute('''
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS market VARCHAR(50),
            ADD COLUMN IF NOT EXISTS owner VARCHAR(255),
            ADD COLUMN IF NOT EXISTS last_update_date DATE;
        ''')
        
        print("✅ Schema applied successfully.")
        
    except Exception as e:
        print(f"❌ Error applying schema: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(apply_schema())
