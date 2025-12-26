import asyncpg
from typing import Optional, List, Dict, Any
from app.core.config import settings

class Database:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        if not self._pool:
            if not settings.DATABASE_URL:
                print("WARNING: No DATABASE_URL set. Database features will be disabled.")
                return
                
            try:
                # Railway/Supabase requires SSL for external connections
                # We try with ssl='require' first, which is standard for cloud Postgres
                self._pool = await asyncpg.create_pool(
                    dsn=settings.DATABASE_URL,
                    min_size=1,
                    max_size=10,
                    ssl='require'
                )
                print(f"Connected to Database: {settings.DATABASE_URL.split('@')[-1]}")
            except Exception as e:
                print(f"CRITICAL DATABASE ERROR: {e}")
                print(f"Failed DSN: {settings.DATABASE_URL.split('@')[-1]}")
                # Fallback without SSL if local or specific config (optional, but 'require' is safest for prod)
                try:
                     print("Retrying without SSL...")
                     self._pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL, min_size=1, max_size=10)
                     print("Connected to Database (No SSL)")
                except Exception as e2:
                    print(f"FINAL DATABASE CONNECTION FAILURE: {e2}")

    async def close(self):
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        if not self._pool: return None
        async with self._pool.acquire() as conn:
            record = await conn.fetchrow(query, *args)
            return dict(record) if record else None

    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        if not self._pool: return []
        async with self._pool.acquire() as conn:
            records = await conn.fetch(query, *args)
            return [dict(r) for r in records]

    async def execute(self, query: str, *args):
        if not self._pool: return
        async with self._pool.acquire() as conn:
            await conn.execute(query, *args)

db = Database()
