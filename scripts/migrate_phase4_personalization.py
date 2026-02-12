
import asyncio
import asyncpg
import os
import sys

# Add backend-core to path to get config if needed, or just use env var
# For this script we'll rely on DATABASE_URL env var or fallback to local
DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def migrate():
    print(f"🚀 Starting Phase 4 Migration on: {DB_URL.split('@')[-1]}")
    
    try:
        conn = await asyncpg.connect(DB_URL)
        
        # 1. Enable pgvector
        print("🔌 Enabling pgvector extension...")
        try:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            print("✅ pgvector enabled.")
        except Exception as e:
            print(f"⚠️ Could not enable pgvector (Might need superuser or already active): {e}")

        # 2. user_profiles
        print("👤 Creating user_profiles table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                sophistication_score FLOAT DEFAULT 0.0 CHECK (sophistication_score >= 0.0 AND sophistication_score <= 1.0),
                risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'balanced', 'aggressive')) DEFAULT 'balanced',
                investment_horizon TEXT CHECK (investment_horizon IN ('short', 'medium', 'long')) DEFAULT 'medium',
                last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("✅ user_profiles table ready.")

        # 3. user_memories
        print("🧠 Creating user_memories table...")
        
        # Check if vector type exists
        vector_exists = await conn.fetchval("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector')")
        embedding_type = "VECTOR(1536)" if vector_exists else "JSONB" 
        # Fallback to JSONB for local dev without extension
        
        print(f"   Using embedding type: {embedding_type}")

        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS user_memories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_id TEXT,
                memory_type TEXT CHECK (memory_type IN ('preference', 'fact', 'summary', 'interaction')),
                content TEXT NOT NULL,
                embedding {embedding_type},
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                metadata JSONB DEFAULT '{{}}'::jsonb
            );
        """)
        
        # Add index only if vector exists
        if vector_exists:
            print("🔍 Creating vector index...")
            try:
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS user_memories_embedding_idx 
                    ON user_memories 
                    USING hnsw (embedding vector_cosine_ops);
                """)
                print("✅ Vector index created.")
            except Exception as e:
                 print(f"⚠️ Could not create vector index: {e}")
        else:
            print("⚠️ Skipping vector index (pgvector not active).")

        print("✅ User Memories table ready.")
        
        await conn.close()
        print("🎉 Phase 4 Migration Complete!")
        
    except Exception as e:
        print(f"❌ Migration Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(migrate())
