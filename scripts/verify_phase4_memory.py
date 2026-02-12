
import asyncio
import asyncpg
import os
import sys
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend-core path explicitly
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend-core'))

from app.chat.memory_manager import MemoryManager
from app.chat.sophistication_analyzer import SophisticationAnalyzer
from app.chat.schemas import Intent

DB_URL = "postgresql://home@localhost:5432/mubasher_db"

async def test_memory_flow():
    print("🧠 Starting Phase 4 Verification...")
    
    conn = await asyncpg.connect(DB_URL)
    
    # 1. Setup Test User
    print("\n👤 Setting up Test User...")
    email = "test_memory_user@example.com"
    user_id = await conn.fetchval("SELECT id FROM users WHERE email = $1", email)
    if not user_id:
        user_id = await conn.fetchval("""
            INSERT INTO users (email, full_name, hashed_password, role, is_active) 
            VALUES ($1, 'Memory Tester', 'dummy_hash', 'user', true) 
            RETURNING id
        """, email)
    print(f"   User ID: {user_id}")

    # 2. Test Sophistication Update
    print("\n🎓 Testing Sophistication Profiling...")
    # Simulate a NOVICE query
    score = await SophisticationAnalyzer.update_user_sophistication(conn, user_id, Intent.HELP)
    print(f"   Score after HELP (Novice): {score:.4f} ({SophisticationAnalyzer.get_level(score)})")
    
    # Simulate an EXPERT query
    score = await SophisticationAnalyzer.update_user_sophistication(conn, user_id, Intent.DEEP_VALUATION)
    print(f"   Score after DEEP_VALUATION (Expert): {score:.4f} ({SophisticationAnalyzer.get_level(score)})")

    # 3. Test Memory Storage
    print("\n💾 Testing Memory Storage...")
    memory_content = "User is interested in high-dividend banking stocks like CIB and QNBA."
    success = await MemoryManager.add_memory(
        conn, user_id, memory_content, memory_type="preference"
    )
    print(f"   Storage Success: {success}")

    # 4. Test Memory Retrieval
    print("\n🔍 Testing Memory Retrieval...")
    query = "What banking stocks should I look at?"
    memories = await MemoryManager.retrieve_relevant_memories(conn, user_id, query)
    
    print(f"   Retrieved {len(memories)} memories.")
    for m in memories:
        print(f"   - Match: {m['content']} (Sim: {m.get('similarity', 0):.2f})")
        
    if len(memories) > 0 and "high-dividend banking" in memories[0]['content']:
        print("\n✅ VERIFICATION PASSED: Memory system is operational.")
    else:
        print("\n❌ VERIFICATION FAILED: Could not retrieve injected memory.")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(test_memory_flow())
