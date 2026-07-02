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


# --- read-only awareness ---------------------------------------------------- #
# A read-only database is a DISTINCT signal from _TRANSIENT above. During a
# Supabase platform incident the whole cluster is set default_transaction_read_only
# =on (SQLSTATE 25006 on every write); a hot standby behaves the same. Retrying
# WITHIN a run cannot help — it persists for the whole incident — so the correct
# response is not reconnect-and-retry but SKIP-this-cycle-and-exit-clean. A write
# job that crashes RED on this turns an external, transient, not-our-fault infra
# state into a flood of failure notifications and blocks PRs. It is also not a
# bug to hide: the DB health monitor (scripts/db_health_probe.py) tracks the
# incident and alerts once per transition.
def is_read_only_error(exc) -> bool:
    """True if `exc` is Postgres 'cannot execute X in a read-only transaction'."""
    return isinstance(exc, asyncpg.ReadOnlySQLTransactionError)


async def database_is_read_only(conn) -> bool:
    """Cheap, side-effect-free probe: can this session NOT write? True when
    default_transaction_read_only=on (platform incident) OR the backend is in
    recovery (standby). Callers use it as a preflight to skip a write cycle
    gracefully rather than crash on the first INSERT."""
    row = await conn.fetchrow(
        "SELECT current_setting('transaction_read_only') AS ro, "
        "pg_is_in_recovery() AS in_recovery")
    return row["ro"] == "on" or bool(row["in_recovery"])
