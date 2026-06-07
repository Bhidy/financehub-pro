"""Resilient asyncpg connect for scheduled write-path jobs.

Bounds every statement (command_timeout) so a hung write fails in seconds rather
than hanging a CI job, and retries the CONNECT on transient Supabase
transaction-pooler errors (port 6543: connection drops, "too many connections",
"cannot connect now") so a brief pooler blip doesn't fail a scheduled run.

It does NOT retry mid-statement on structural/data errors — those should surface
loudly (see scripts/tv_egx_harvester.py for the full per-cycle taxonomy). Use
this for the standalone scheduled scripts (funds NAV, company-names, stock-stats,
Yahoo reservoir) that open a single connection for the whole job.

    from data_pipeline.pg_resilient import connect_resilient
    conn = await connect_resilient(DATABASE_URL)
"""
import asyncio

import asyncpg

# Transient = infrastructure blip worth a reconnect. Mirrors the harvester's
# TRANSIENT_DB_ERRORS classification.
_TRANSIENT = (
    asyncpg.PostgresConnectionError,   # 08xxx — connection lost / does-not-exist
    asyncpg.CannotConnectNowError,     # 57P03 — server/pooler starting up
    asyncpg.TooManyConnectionsError,   # 53300 — pooler connection ceiling
    asyncpg.InterfaceError,            # client-side: "connection is closed"
    ConnectionError, OSError, asyncio.TimeoutError,
)


async def connect_resilient(url, *, attempts=4, command_timeout=30,
                            statement_cache_size=0, **kw):
    """Connect to Postgres, retrying the connect on transient pooler errors with
    bounded exponential backoff. Raises the last transient error if all attempts
    fail; non-transient errors (auth, bad DSN) propagate immediately."""
    last = None
    for i in range(1, attempts + 1):
        try:
            return await asyncpg.connect(
                url, statement_cache_size=statement_cache_size,
                command_timeout=command_timeout, **kw)
        except _TRANSIENT as e:
            last = e
            if i < attempts:
                await asyncio.sleep(min(2 ** i, 30))
    raise last
