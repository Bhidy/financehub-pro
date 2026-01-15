#!/usr/bin/env python3
"""
Database Migration: Chat History Support
========================================
Enhances chat tables to support full history:
1. Adds 'title' to chat_sessions
2. Creates chat_messages table for storing full conversation

Usage:
    python scripts/migrate_chat_history.py
"""

import asyncio
import os
import asyncpg
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")

MIGRATIONS = [
    # 1. Add title to chat_sessions if not exists
    """
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='title') THEN 
            ALTER TABLE chat_sessions ADD COLUMN title VARCHAR(255);
        END IF;
    END $$;
    """,
    
    # 2. Create chat_messages table
    """
    CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
    """
]

async def run_migrations():
    """Execute all migrations"""
    logger.info("=" * 60)
    logger.info("CHAT HISTORY MIGRATION")
    logger.info("=" * 60)
    
    if not DATABASE_URL:
        logger.error("DATABASE_URL not set!")
        return

    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    async with pool.acquire() as conn:
        # Run table creation
        for i, migration in enumerate(MIGRATIONS, 1):
            logger.info(f"\n[{i}/{len(MIGRATIONS)}] Running migration...")
            try:
                await conn.execute(migration)
                logger.info("  ✅ Success")
            except Exception as e:
                logger.warning(f"  ⚠️ Warning: {e}")
                
        # Verify schema
        logger.info("\n📊 Verification:")
        try:
            columns = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_sessions'")
            cols = [c['column_name'] for c in columns]
            logger.info(f"  chat_sessions columns: {cols}")
            
            msg_count = await conn.fetchval("SELECT COUNT(*) FROM chat_messages")
            logger.info(f"  chat_messages rows: {msg_count}")
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            
    await pool.close()
    logger.info("\n✅ Migration Complete!")


if __name__ == "__main__":
    asyncio.run(run_migrations())
