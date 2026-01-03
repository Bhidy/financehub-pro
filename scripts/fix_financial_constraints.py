import asyncio
import asyncpg
import os
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
load_dotenv()

async def fix_constraints():
    url = os.getenv('DATABASE_URL')
    conn = await asyncpg.connect(url)
    logging.info("Connected to DB. Fixing constraints...")
    
    # Drop old constraint that didn't include statement_type
    try:
        # Try dropping as constraint
        await conn.execute("ALTER TABLE financial_statements DROP CONSTRAINT IF EXISTS financial_statements_symbol_fiscal_year_period_type_key")
        logging.info("✅ Dropped constraint financial_statements_symbol_fiscal_year_period_type_key")
        
        # Try dropping as index (sometimes constraints are just unique indexes)
        await conn.execute("DROP INDEX IF EXISTS financial_statements_symbol_fiscal_year_period_type_key")
        logging.info("✅ Dropped index financial_statements_symbol_fiscal_year_period_type_key")
        
        # Drop OTHER legacy constraint found in V10 logs
        await conn.execute("ALTER TABLE financial_statements DROP CONSTRAINT IF EXISTS financial_statements_uniq")
        logging.info("✅ Dropped constraint financial_statements_uniq")
        await conn.execute("DROP INDEX IF EXISTS financial_statements_uniq")
        logging.info("✅ Dropped index financial_statements_uniq")
        
    except Exception as e:
        logging.error(f"Error dropping constraint: {e}")

    # Verify NEW index exists (created in previous step)
    # financial_statements_uniq_stmt_v2
    
    logging.info("Use pgAdmin or psql to verify financial_statements_uniq_stmt_v2 exists.")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_constraints())
