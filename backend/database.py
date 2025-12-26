import os
import asyncpg
from typing import Optional, List, Dict, Any

# Default connection string (User should provide via ENV)
DB_DSN = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

class Database:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        if not self._pool:
            try:
                self._pool = await asyncpg.create_pool(dsn=DB_DSN)
                print(f"Connected to Database: {DB_DSN.split('@')[-1]}")
            except Exception as e:
                print(f"CRITICAL DATABASE ERROR: {e}")
                print(f"Failed DSN: {DB_DSN}")
                # We don't raise here to allow app to start even if DB is missing (for demo)

    async def close(self):
        if self._pool:
            await self._pool.close()

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
