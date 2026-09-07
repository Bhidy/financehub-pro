#!/usr/bin/env python3
"""
promote_admin.py — grant the admin role to an account that ALREADY EXISTS.
=============================================================================
The companion to create_admin.py, and the one to reach for when the owner can
sign in fine but /admin says "This account is not an administrator".

The difference matters:

  create_admin.py   sets a PASSWORD (and creates the row if missing). It needs
                    ADMIN_PASSWORD, so it can only be run by whoever is willing
                    to type a password into the environment.
  promote_admin.py  touches ONLY `role`. It never reads, writes, or transports a
                    password, so it is safe to run from CI on the self-hosted
                    runner where the operator is not present.

Read-only by default — it reports what it would change and exits. Pass
--promote to actually write.

Usage:

    # report only
    DATABASE_URL=... python3 scripts/promote_admin.py --email you@example.com

    # grant
    DATABASE_URL=... python3 scripts/promote_admin.py --email you@example.com --promote

    # demote (undo)
    DATABASE_URL=... python3 scripts/promote_admin.py --email you@example.com --revoke

The email may also come from the ADMIN_EMAIL env var, which is how the
"Admin - Grant Role" workflow passes it: the repo is PUBLIC, so the address
travels as a GitHub secret (masked in logs) rather than as a dispatch input
(rendered in plain text on the run page). Every address this script prints is
masked regardless — CI logs here are world-readable.
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def mask(email: str) -> str:
    """b*****y@gmail.com — enough to confirm the right row, not enough to harvest."""
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    if len(local) <= 2:
        return f"{local[:1]}***@{domain}"
    return f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}@{domain}"


def normalize(email: str) -> str:
    """Match lib/auth-errors.normalizeEmail: sign-up lower-cases, so must we."""
    return email.strip().lower()


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", default=os.getenv("ADMIN_EMAIL"))
    group = ap.add_mutually_exclusive_group()
    group.add_argument("--promote", action="store_true", help="set role='admin'")
    group.add_argument("--revoke", action="store_true", help="set role='user'")
    args = ap.parse_args()

    if not args.email:
        sys.exit("No email given. Pass --email or set ADMIN_EMAIL. Nothing was changed.")
    email = normalize(args.email)

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
        row = await conn.fetchrow(
            "SELECT id, email, role, is_active FROM users WHERE lower(email) = $1",
            email,
        )

        if row is None:
            print(f"NOT FOUND: no account for {mask(email)}.")
            print("  This address has never registered. Sign up at /register first,")
            print("  then re-run this script (or use create_admin.py, which creates")
            print("  the row but requires a password).")
            sys.exit(2)

        print(f"FOUND     : {mask(row['email'])} (id={row['id']})")
        print(f"  role    : {row['role']}")
        print(f"  active  : {row['is_active']}")

        if not (args.promote or args.revoke):
            verdict = "already an admin" if row["role"] == "admin" else "NOT an admin"
            print(f"\nREPORT ONLY — this account is {verdict}.")
            print("Re-run with --promote to grant the role.")
            return

        target = "user" if args.revoke else "admin"
        if row["role"] == target and row["is_active"]:
            print(f"\nNO CHANGE — role is already '{target}' and the account is active.")
            return

        # is_active is set alongside the role deliberately: a deactivated admin
        # authenticates but fails require_admin's `is_active` check, which
        # presents as the same "not an administrator" screen and is maddening
        # to diagnose. Promotion means promotion.
        #
        # Decided in Python, not in a CASE on $2. Binding one parameter as both
        # a SET value and a comparand made asyncpg's prepare fail outright with
        # "inconsistent types deduced for parameter $2" — the placeholder is
        # typed from `role` in one position and from an unknown literal in the
        # other. Two parameters, two unambiguous types.
        active = True if target == "admin" else row["is_active"]
        updated = await conn.fetchrow(
            """
            UPDATE users
               SET role = $2,
                   is_active = $3
             WHERE id = $1
            RETURNING role, is_active
            """,
            row["id"],
            target,
            active,
        )
        print(f"\nUPDATED   : role {row['role']} -> {updated['role']}, active={updated['is_active']}")

        total_admins = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        print(f"admin accounts now: {total_admins}")
        print("\nSign out and back in — the role is stamped into the JWT at login,")
        print("so an existing session still carries the old one.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
