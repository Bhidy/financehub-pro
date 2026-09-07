#!/usr/bin/env python3
"""
backfill_last_seen.py — repair `users.last_login` for accounts that never got one.
=============================================================================
The admin console renders `last_login` as "Last seen". Until 2026-09-07 that
column was written in only two places — the OAuth2 form grant and the Google
callback — so an account that registered and did not come back showed
"Never", which is not true of anyone: signup issues a token and signs the
person straight in. 50 of 88 rows read that way.

app/api/v1/endpoints/auth.py now stamps it at signup and on every path that
establishes a session (both login twins, refresh, bootstrap-refresh), so no
new row can enter that state. This repairs the rows created before that.

`last_login = created_at` is the honest value: registration is the one moment
we can prove the account holder was present. It is never used to overwrite a
real login — the WHERE clause only touches NULLs.

Idempotent: run it twice and the second run updates nothing.

Usage (DATABASE_URL from env or .env):

    DATABASE_URL=... python3 scripts/backfill_last_seen.py            # report
    DATABASE_URL=... python3 scripts/backfill_last_seen.py --apply    # write
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REPORT = """
    SELECT COUNT(*)                                            AS total,
           COUNT(*) FILTER (WHERE last_login IS NULL)          AS never_seen,
           COUNT(*) FILTER (WHERE last_login < created_at)     AS seen_before_joining,
           COUNT(*) FILTER (WHERE last_login > created_at)     AS returned_since
      FROM users
"""


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write; otherwise report only")
    args = ap.parse_args()

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

    import asyncpg

    conn = await asyncpg.connect(database_url, statement_cache_size=0)
    try:
        before = dict(await conn.fetchrow(REPORT))
        print("BEFORE:", before)

        if not args.apply:
            print(f"\nREPORT ONLY — {before['never_seen']} row(s) would be set to created_at.")
            print("Re-run with --apply to write.")
            return

        # created_at IS NOT NULL guard: a row with neither timestamp has nothing
        # honest to copy, and writing NOW() would invent a visit.
        status = await conn.execute(
            "UPDATE users SET last_login = created_at "
            "WHERE last_login IS NULL AND created_at IS NOT NULL"
        )
        print("UPDATE:", status)

        after = dict(await conn.fetchrow(REPORT))
        print("AFTER :", after)
        if after["never_seen"]:
            print(f"\nNOTE: {after['never_seen']} row(s) still NULL — they have no created_at either.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
