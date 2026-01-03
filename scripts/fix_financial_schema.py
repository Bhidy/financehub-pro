import asyncio
import asyncpg
import os
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
load_dotenv()

async def fix_schema():
    url = os.getenv('DATABASE_URL')
    conn = await asyncpg.connect(url)
    logging.info("Connected to DB. Fixing schema...")
    
    # 1. Add statement_type column
    try:
        await conn.execute("ALTER TABLE financial_statements ADD COLUMN IF NOT EXISTS statement_type TEXT")
        logging.info("✅ Added statement_type column")
        await conn.execute("ALTER TABLE financial_statements ADD COLUMN IF NOT EXISTS fiscal_quarter INTEGER")
        logging.info("✅ Added fiscal_quarter column")
        await conn.execute("ALTER TABLE financial_statements ADD COLUMN IF NOT EXISTS free_cashflow BIGINT")
        logging.info("✅ Added free_cashflow column")
    except Exception as e:
        logging.error(f"Error adding columns: {e}")

    # 2. Add Unique Index for UPSERT
    # We drop old index if name known? No, just create new one valid for the Query
    try:
        await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS financial_statements_uniq_stmt_v2 
            ON financial_statements (symbol, statement_type, period_type, fiscal_year, fiscal_quarter)
        """)
        logging.info("✅ Created unique index v2")
    except Exception as e:
        logging.error(f"Error creating index: {e}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_schema())
