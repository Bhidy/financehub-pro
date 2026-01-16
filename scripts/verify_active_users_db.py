import asyncio
import os
import asyncpg
from datetime import datetime, timedelta

# Default to the production URL found in .env (I will inject this or read it)
# For safety, I'll ask the script to read it from the file directly if not set.

async def verify_active_users():
    # Load env vars manually to avoid dependency issues
    db_url = None
    try:
        with open("backend-core/.env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    db_url = line.strip().split("=", 1)[1].strip('"').strip("'")
    except Exception as e:
        print(f"Could not read .env: {e}")
        return

    if not db_url:
        print("DATABASE_URL not found in backend-core/.env")
        return

    print(f"Connecting to DB...")
    
    try:
        conn = await asyncpg.connect(db_url)
        print("Connected!")

        # Calculate time range (last 30 days)
        now = datetime.utcnow()
        start = now - timedelta(days=30)
        
        # Query 1: Total Users
        total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
        print(f"Total Users in DB: {total_users}")

        # Query 2: Active Users (Login or Created in last 30 days)
        active_users = await conn.fetchval("""
            SELECT COUNT(*) FROM users 
            WHERE (last_login >= $1 AND last_login <= $2) 
               OR (created_at >= $1 AND created_at <= $2)
        """, start, now)
        print(f"Active Users (Last 30 Days): {active_users}")
        
        # Query 3: Users with last_login set (sanity check)
        users_with_login = await conn.fetchval("SELECT COUNT(*) FROM users WHERE last_login IS NOT NULL")
        print(f"Users with last_login set: {users_with_login}")

        await conn.close()
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_active_users())
