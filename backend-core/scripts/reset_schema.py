
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def reset_table():
    print(f"Connecting to {DATABASE_URL}")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    print("Dropping fund_disclosures table...")
    try:
        await conn.execute('DROP TABLE IF EXISTS fund_disclosures CASCADE')
        print("✅ Dropped table")
    except Exception as e:
        print(f"⚠️ Drop failed: {e}")

    # Now run the schema creation part from the SQL file
    # I'll just execute the CREATE TABLE part directly here for certainty
    create_sql = '''
    CREATE TABLE IF NOT EXISTS fund_disclosures (
        id SERIAL PRIMARY KEY,
        fund_id VARCHAR(50) NOT NULL,
        disclosure_date DATE,
        title TEXT,
        sub_category VARCHAR(50),
        file_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_fund_disclosures_fund ON fund_disclosures(fund_id);
    CREATE INDEX IF NOT EXISTS idx_fund_disclosures_date ON fund_disclosures(disclosure_date DESC);
    '''
    
    print("Recreating table...")
    try:
        await conn.execute(create_sql)
        print("✅ Table recreated successfully")
    except Exception as e:
        print(f"❌ Creation failed: {e}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(reset_table())
