import asyncio
import asyncpg

async def run():
    conn = await asyncpg.connect("postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require", statement_cache_size=0)
    
    rows = await conn.fetch("SELECT session_id, user_id, title, updated_at FROM chat_sessions WHERE user_id = 'mohamedbhidy@gmail.com' ORDER BY updated_at DESC LIMIT 30")
    
    for r in rows:
        print(dict(r))
        
    await conn.close()

asyncio.run(run())
