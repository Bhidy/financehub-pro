#!/usr/bin/env python3
"""
Database Migration: Rasa Chatbot Foundation Tables
===================================================
Creates the required tables for the enhanced bilingual chatbot:
1. fund_aliases - For fund name/ID resolution
2. chat_sessions - Enhanced session context
3. chat_analytics - Intent tracking and monitoring

Usage:
    python scripts/migrate_chatbot_tables.py
"""

import asyncio
import os
import asyncpg
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")

MIGRATIONS = [
    # 1. Fund Aliases Table
    """
    CREATE TABLE IF NOT EXISTS fund_aliases (
        id SERIAL PRIMARY KEY,
        alias_text VARCHAR(255) NOT NULL,
        alias_text_norm VARCHAR(255) NOT NULL,
        fund_id VARCHAR(20) NOT NULL,
        priority INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(alias_text_norm, fund_id)
    );
    CREATE INDEX IF NOT EXISTS idx_fund_aliases_norm ON fund_aliases(alias_text_norm);
    """,
    
    # 2. Chat Sessions Table (Enhanced)
    """
    CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        last_symbol VARCHAR(20),
        last_fund_id VARCHAR(20),
        last_intent VARCHAR(50),
        last_range VARCHAR(10),
        last_market VARCHAR(10),
        language VARCHAR(5) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);
    """,
    
    # 3. Chat Analytics Table
    """
    CREATE TABLE IF NOT EXISTS chat_analytics (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64),
        message_text TEXT,
        detected_intent VARCHAR(50),
        confidence DECIMAL(5,4),
        entities JSONB,
        response_time_ms INT,
        fallback_triggered BOOLEAN DEFAULT FALSE,
        language VARCHAR(5),
        created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_analytics_intent ON chat_analytics(detected_intent, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_analytics_fallback ON chat_analytics(fallback_triggered, created_at DESC);
    """
]

# Seed data for fund_aliases (Arabic + English + common variants)
FUND_ALIAS_SEEDS = [
    # Pharos Funds
    ("Pharos Investment Fund 1", "pharos investment fund 1", "2734", 10),
    ("Pharos Fund", "pharos fund", "2734", 8),
    ("فاروس", "فاروس", "2734", 10),
    ("صندوق فاروس", "صندوق فاروس", "2734", 9),
    ("Pharos", "pharos", "2734", 7),
    
    # CI Asset Management Funds
    ("CI Equity Fund", "ci equity fund", "2742", 10),
    ("CI Fund", "ci fund", "2742", 8),
    ("صندوق سي آي", "صندوق سي اي", "2742", 9),
    
    # Beltone Funds
    ("Beltone Fund", "beltone fund", "6120", 10),
    ("بلتون", "بلتون", "6120", 10),
    ("صندوق بلتون", "صندوق بلتون", "6120", 9),
    
    # HC Funds
    ("HC Equity Fund", "hc equity fund", "2756", 10),
    ("HC Fund", "hc fund", "2756", 8),
    ("اتش سي", "اتش سي", "2756", 9),
    
    # Hermes Funds
    ("EFG Hermes Fund", "efg hermes fund", "2751", 10),
    ("Hermes Fund", "hermes fund", "2751", 8),
    ("هيرميس", "هيرميس", "2751", 10),
    ("صندوق هيرميس", "صندوق هيرميس", "2751", 9),
    
    # Category keywords (for fund_search intent)
    ("shariah", "shariah", "__FILTER_SHARIAH__", 5),
    ("islamic", "islamic", "__FILTER_SHARIAH__", 5),
    ("متوافق مع الشريعة", "متوافق مع الشريعه", "__FILTER_SHARIAH__", 5),
    ("شرعي", "شرعي", "__FILTER_SHARIAH__", 5),
    ("equity", "equity", "__FILTER_EQUITY__", 5),
    ("اسهم", "اسهم", "__FILTER_EQUITY__", 5),
    ("money market", "money market", "__FILTER_MONEY__", 5),
    ("نقدي", "نقدي", "__FILTER_MONEY__", 5),
]


async def run_migrations():
    """Execute all migrations"""
    logger.info("=" * 60)
    logger.info("CHATBOT DATABASE MIGRATION")
    logger.info("=" * 60)
    
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
        
        # Seed fund_aliases
        logger.info("\n📝 Seeding fund_aliases...")
        seed_count = 0
        for alias_text, alias_norm, fund_id, priority in FUND_ALIAS_SEEDS:
            try:
                await conn.execute("""
                    INSERT INTO fund_aliases (alias_text, alias_text_norm, fund_id, priority)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (alias_text_norm, fund_id) DO NOTHING
                """, alias_text, alias_norm, fund_id, priority)
                seed_count += 1
            except Exception as e:
                pass
        logger.info(f"  ✅ Seeded {seed_count} aliases")
        
        # Verify tables
        logger.info("\n📊 Verification:")
        for table in ["fund_aliases", "chat_sessions", "chat_analytics"]:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            logger.info(f"  {table}: {count} rows")
    
    await pool.close()
    logger.info("\n✅ Migration Complete!")


if __name__ == "__main__":
    asyncio.run(run_migrations())
