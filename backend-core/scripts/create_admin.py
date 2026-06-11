#!/usr/bin/env python3
"""
create_admin.py — the ONLY sanctioned way to create/repair an admin account.
=============================================================================
Replaces the removed startup seeding in app/main.py, which used to insert
'admin@finhub.pro' with a bcrypt hash copied from public tutorials (guessable
role=admin on a live system — audit 2026-06-11, severity High).

Usage (run from backend-core/, reads DATABASE_URL from env or .env):

    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<strong password>' \
        python3 scripts/create_admin.py

Behavior:
  - bcrypt-hashes ADMIN_PASSWORD with the same passlib context the API uses,
  - upserts the user with role='admin', is_active=TRUE,
  - never prints the password or hash,
  - refuses passwords shorter than 12 characters.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main() -> None:
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    if not email or not password:
        sys.exit("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars. Nothing was changed.")
    if len(password) < 12:
        sys.exit("ADMIN_PASSWORD must be at least 12 characters. Nothing was changed.")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            database_url = os.getenv("DATABASE_URL")
        except ImportError:
            pass
    if not database_url:
        sys.exit("DATABASE_URL is not set. Nothing was changed.")

    from passlib.context import CryptContext
    import asyncpg

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed = pwd_context.hash(password)

    conn = await asyncpg.connect(database_url, statement_cache_size=0)
    try:
        await conn.execute(
            """
            INSERT INTO users (email, hashed_password, full_name, role, is_active, created_at)
            VALUES ($1, $2, 'Administrator', 'admin', TRUE, NOW())
            ON CONFLICT (email) DO UPDATE
                SET hashed_password = EXCLUDED.hashed_password,
                    role = 'admin',
                    is_active = TRUE
            """,
            email, hashed,
        )
    finally:
        await conn.close()
    print(f"Admin account ready for {email} (password not shown).")


if __name__ == "__main__":
    asyncio.run(main())
