#!/usr/bin/env python3
"""
DB Health Probe — the platform's early-warning system for Postgres availability.
================================================================================
WHY THIS EXISTS: on 2026-07-02 a Supabase eu-central-1 platform incident flipped
our Postgres to read-only for ~20 min. Every write job crashed RED and we only
found out from a phone lock-screen full of "Run failed" pushes — the system was
BLIND to its own most critical dependency. This probe closes that gap.

Each run it:
  1. Probes Supabase Postgres directly: reachable? writable (not read-only)? in
     recovery (standby)? size, connection count, and the freshness of a canonical
     table (market_tickers). All reads — safe even when the DB is read-only.
  2. Reads the Supabase PUBLIC status API for our region's incident state (no
     credentials needed) so we can tell "platform incident, wait it out" from
     "read-only with NO incident → investigate our side (disk/manual)".
  3. Classifies one overall STATE. On a *transition* (dedup'd via a small JSON
     state file persisted across runs) it fires exactly ONE alert — DOWN when it
     first breaks, RECOVERED when it clears — never a per-cycle flood.

Design contract: it ALWAYS exits 0. A monitor must never itself become the CI-red
noise it exists to prevent; its output is the alert, not the exit code.

    DATABASE_URL=... DISCORD_WEBHOOK_URL=... \
    HEALTH_STATE_FILE=.health_state.json python scripts/db_health_probe.py
"""
import asyncio
import json
import os
import re
import sys
import urllib.request

import asyncpg

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))            # scripts/
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(          # backend-core/
    os.path.abspath(__file__))), "backend-core"))

STATUS_API = "https://status.supabase.com/api/v2/summary.json"
STATE_FILE = os.environ.get("HEALTH_STATE_FILE", ".health_state.json")


def _region_from_url(url: str) -> str:
    """aws-1-eu-central-1.pooler.supabase.com -> 'eu-central-1'."""
    m = re.search(r'aws-\d+-([a-z]+-[a-z]+-\d+)\.pooler', url or "")
    return m.group(1) if m else os.environ.get("SUPABASE_REGION", "eu-central-1")


async def probe_db(url: str) -> dict:
    """All-read health snapshot. Never raises — returns {'reachable': False,...}
    with the error on failure so the caller can classify it."""
    out = {"reachable": False, "read_only": None, "in_recovery": None,
           "db_size": None, "connections": None, "ticker_age_min": None,
           "error": None}
    conn = None
    try:
        conn = await asyncpg.connect(url, statement_cache_size=0, command_timeout=15)
        row = await conn.fetchrow(
            "SELECT current_setting('transaction_read_only') AS ro, "
            "pg_is_in_recovery() AS rec, "
            "pg_size_pretty(pg_database_size(current_database())) AS size, "
            "(SELECT count(*) FROM pg_stat_activity) AS conns")
        out.update(reachable=True, read_only=(row["ro"] == "on"),
                   in_recovery=bool(row["rec"]), db_size=row["size"],
                   connections=row["conns"])
        try:
            age = await conn.fetchval(
                "SELECT EXTRACT(EPOCH FROM (now() - max(updated_at)))/60 "
                "FROM market_tickers WHERE market_code='EGX'")
            out["ticker_age_min"] = round(float(age), 1) if age is not None else None
        except Exception:
            pass  # table missing / transient — freshness is best-effort
    except Exception as e:  # noqa: BLE001
        out["error"] = f"{type(e).__name__}: {str(e).splitlines()[0]}"
    finally:
        if conn is not None:
            try:
                await conn.close(timeout=5)
            except Exception:
                pass
    return out


def probe_status(region: str) -> dict:
    """Supabase public status for `region`. Never raises."""
    out = {"overall": None, "region_status": None, "incident": None, "error": None}
    try:
        req = urllib.request.Request(STATUS_API, headers={
            "User-Agent": "Starta-Health/1.0 (+https://startamarkets.com)"})
        data = json.loads(urllib.request.urlopen(req, timeout=15).read())
        out["overall"] = (data.get("status") or {}).get("description")
        for c in data.get("components", []):
            if c.get("name", "").lower() == region.lower():
                out["region_status"] = c.get("status")
                break
        # first unresolved incident that names our region (or is global)
        for inc in data.get("incidents", []):
            names = " ".join(
                [inc.get("name", "")] +
                [(u.get("body") or "") for u in inc.get("incident_updates", [])]).lower()
            affected = [c.get("name", "").lower()
                        for c in inc.get("components", [])]
            if region.lower() in names or region.lower() in affected or not affected:
                out["incident"] = {"id": inc.get("id"), "name": inc.get("name"),
                                   "impact": inc.get("impact"), "status": inc.get("status")}
                break
    except Exception as e:  # noqa: BLE001
        out["error"] = f"{type(e).__name__}: {str(e).splitlines()[0]}"
    return out


def classify(db: dict, st: dict) -> dict:
    """Fold the two snapshots into one state + a human summary."""
    inc = st.get("incident")
    inc_id = inc["id"] if inc else "-"
    if not db["reachable"]:
        state = "DB_UNREACHABLE"
    elif db["read_only"] or db["in_recovery"]:
        state = "DB_READONLY"
    else:
        state = "OK"
    # dedup signature: the state plus the incident identity, so a NEW platform
    # incident re-alerts even if the DB symptom looks the same.
    sig = f"{state}|{inc_id}"
    lines = []
    if state == "OK":
        headline = "✅ Database healthy (writable)"
    elif state == "DB_READONLY":
        if inc:
            headline = "🟠 Database READ-ONLY — Supabase platform incident (wait it out)"
            lines.append(f"Supabase incident: {inc['name']} [{inc['impact']}/{inc['status']}]")
        else:
            headline = "🔴 Database READ-ONLY with NO Supabase incident — investigate OUR side"
            lines.append("No matching regional incident → check disk usage / plan cap / "
                         "an accidental `default_transaction_read_only` — this may be on us.")
    else:  # DB_UNREACHABLE
        headline = "🔴 Database UNREACHABLE"
        lines.append(f"connect error: {db['error']}")
        if inc:
            lines.append(f"Supabase incident: {inc['name']} [{inc['impact']}/{inc['status']}]")
    if db["reachable"]:
        lines.append(f"size={db['db_size']} · connections={db['connections']} · "
                     f"read_only={db['read_only']} · in_recovery={db['in_recovery']}")
        if db["ticker_age_min"] is not None:
            lines.append(f"market_tickers freshness: {db['ticker_age_min']:.0f} min old")
    if st.get("overall"):
        lines.append(f"Supabase status: {st['overall']} · {_region(st)} ")
    return {"state": state, "sig": sig, "headline": headline, "lines": lines}


def _region(st: dict) -> str:
    rs = st.get("region_status")
    return f"region={rs}" if rs else "region=?"


def _load_state() -> dict:
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_state(sig: str, state: str) -> None:
    try:
        with open(STATE_FILE, "w") as f:
            json.dump({"sig": sig, "state": state}, f)
    except Exception as e:  # noqa: BLE001
        print(f"[warn] could not persist state file: {e}", file=sys.stderr)


def _alert(title: str, body: str) -> None:
    try:
        from notify import send_alert
        st = send_alert(title, body)
        print(f"alert delivery: {st}", file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"[warn] send_alert unavailable ({e}); title={title!r}\n{body}", file=sys.stderr)


async def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL not set — cannot probe", file=sys.stderr)
        return 0
    region = _region_from_url(url)
    db = await probe_db(url)
    st = probe_status(region)
    verdict = classify(db, st)

    print(verdict["headline"])
    for ln in verdict["lines"]:
        print(f"  {ln}")

    prev = _load_state()
    prev_sig, prev_state = prev.get("sig"), prev.get("state")
    changed = verdict["sig"] != prev_sig

    if changed and prev_sig is not None:
        # a genuine transition: recovered vs broke
        if verdict["state"] == "OK":
            _alert("✅ Database RECOVERED (writable again)",
                   "\n".join([f"Previous state: {prev_state}", ""] + verdict["lines"]))
        else:
            _alert(verdict["headline"], "\n".join(verdict["lines"]))
    elif changed and prev_sig is None:
        # first-ever run: only alert if we're already unhealthy, so a fresh
        # deploy while broken still surfaces (but a healthy first run stays quiet).
        if verdict["state"] != "OK":
            _alert(verdict["headline"], "\n".join(["(first monitor run)"] + verdict["lines"]))

    _save_state(verdict["sig"], verdict["state"])
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
