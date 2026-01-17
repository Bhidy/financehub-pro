
import asyncio
import asyncpg
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        return

    conn = await asyncpg.connect(db_url)
    try:
        logger.info("Adding period_ending column to tables...")
        tables = ['income_statements', 'balance_sheets', 'cashflow_statements', 'financial_ratios_history']
        
        for table in tables:
            try:
                await conn.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS period_ending DATE")
                logger.info(f"Added period_ending to {table}")
            except Exception as e:
                logger.error(f"Error altering {table}: {e}")

        logger.info("Adding enterprise_value column to financial_ratios_history...")
        try:
            await conn.execute("ALTER TABLE financial_ratios_history ADD COLUMN IF NOT EXISTS enterprise_value NUMERIC")
            logger.info("Added enterprise_value to financial_ratios_history")
        except Exception as e:
            logger.error(f"Error altering financial_ratios_history: {e}")

        logger.info("Schema migration complete.")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
