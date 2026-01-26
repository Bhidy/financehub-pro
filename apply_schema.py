import asyncio
import asyncpg
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def apply_schema():
    # Load database URL
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Fallback for local testing if env var not set, though it should be
        # Attempt to read from .env if possible, but for now assuming it's available or we fail
        logger.error("DATABASE_URL is not set.")
        return

    logger.info("Connecting to database...")
    try:
        conn = await asyncpg.connect(db_url)
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        return

    try:
        # Read the schema file
        with open("backend-core/app/db/rich_financials_schema.sql", "r") as f:
            schema_sql = f.read()

        logger.info("Applying schema...")
        await conn.execute(schema_sql)
        logger.info("Schema applied successfully!")

    except Exception as e:
        logger.error(f"Error applying schema: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(apply_schema())
