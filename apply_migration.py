
import asyncio
import asyncpg
import os
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def apply_migration(filename):
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL is not set.")
        return

    logger.info(f"Connecting to database to apply {filename}...")
    try:
        conn = await asyncpg.connect(db_url)
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        return

    try:
        with open(filename, "r") as f:
            sql = f.read()

        logger.info("Applying SQL...")
        await conn.execute(sql)
        logger.info("Migration applied successfully!")

    except Exception as e:
        logger.error(f"Error applying migration: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python apply_migration.py <sql_file>")
        sys.exit(1)
    asyncio.run(apply_migration(sys.argv[1]))
