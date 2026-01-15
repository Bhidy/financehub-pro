#!/usr/bin/env python3
"""
Analytic Patch: Add user_id to chat_interactions
=================================================
Corrects the schema issue where user_id was missing from chat_interactions,
causing analytics to report 0 active users.

Usage:
    python scripts/patch_analytics_schema.py
"""

import asyncio
import os
import asyncpg
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")

async def run_patch():
    """Add user_id column to chat_interactions if missing"""
    logger.info("=" * 60)
    logger.info("ANALYTICS SCHEMA PATCH")
    logger.info("=" * 60)
    
    if not DATABASE_URL:
        logger.error("DATABASE_URL is not set!")
        return

    try:
        pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
        
        async with pool.acquire() as conn:
            # 1. Check if column exists
            logger.info("Checking chat_interactions schema...")
            
            # Check if user_id column exists
            check_query = """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='chat_interactions' AND column_name='user_id'
            """
            exists = await conn.fetchval(check_query)
            
            if not exists:
                logger.info("⚠️ 'user_id' column MISSING. Adding it now...")
                try:
                    await conn.execute("""
                        ALTER TABLE chat_interactions 
                        ADD COLUMN user_id VARCHAR(100)
                    """)
                    logger.info("✅ 'user_id' column added successfully.")
                    
                    # Add index for performance
                    await conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_chat_interactions_user 
                        ON chat_interactions(user_id)
                    """)
                    logger.info("✅ Index created on user_id.")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to alter table: {e}")
            else:
                logger.info("✅ 'user_id' column already exists.")

            # 2. Verify Schema
            logger.info("\nVerifying final schema...")
            columns = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='chat_interactions'")
            col_names = [c['column_name'] for c in columns]
            logger.info(f"Columns: {col_names}")
            
            if 'user_id' in col_names:
                logger.info("🎉 SUCCESS: Schema is correct.")
            else:
                logger.error("❌ FAILURE: Schema is still missing user_id.")

        await pool.close()
        
    except Exception as e:
        logger.error(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_patch())
