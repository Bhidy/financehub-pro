
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def main():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("Creating fund_peers table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS fund_peers (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(50) NOT NULL,
                peer_fund_name TEXT,
                peer_symbol VARCHAR(50),
                peer_rank INTEGER,
                comparison_metric VARCHAR(50),
                metric_value DECIMAL(16,4),
                as_of_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        print("Creating indices...")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_fund_peers_fund ON fund_peers(fund_id);")
        
        # Verify fund_actions exists too (Phase 1 legacy)
        print("Verifying fund_actions table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS fund_actions (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(50) NOT NULL,
                action_date DATE,
                action_type VARCHAR(20),  
                action_value DECIMAL(12,4),
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        print("✅ Schema applied successfully.")
        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
