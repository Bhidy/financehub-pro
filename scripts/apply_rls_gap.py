#!/usr/bin/env python3
"""
Apply migration 006 (RLS gap) via the Supabase Management API run-SQL (PAT), then
VERIFY: re-check RLS status for the 11 tables and re-test that the 3 internal ops
tables are no longer anon-readable. Idempotent SQL — safe to re-run.

WRITE operation — dispatch intentionally. Exits non-zero if the apply or the
verification fails (e.g. DB read-only during a platform incident → retry later).

    SUPABASE_ACCESS_TOKEN=... python scripts/apply_rls_gap.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.supabase.com"
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
REF = os.environ.get("SUPABASE_PROJECT_REF", "kgjpkphfjmmiyjsgsaup")
MIG = os.environ.get("MIGRATION_FILE", "backend-core/migrations/006_rls_gap_tables.sql")

PUBLIC = ['egx_company_profile_v2', 'egx_dividends', 'egx_estimates', 'egx_financials',
          'egx_fundamentals', 'egx_news', 'egx_technicals', 'symbol_map']
INTERNAL = ['egx_ingest_deadletter', 'fund_sync_runs', 'pipeline_heartbeat']
ALL11 = PUBLIC + INTERNAL


def _req(method, url, token=None, body=None, extra=None):
    headers = {"User-Agent": "Starta-RLS/1.0", "Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(body).encode()
    if extra:
        headers.update(extra)
    req = urllib.request.Request(url, method=method, headers=headers, data=body)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode(errors="replace")
            try:
                return r.status, json.loads(raw)
            except Exception:
                return r.status, raw[:500]
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode()[:400]
        except Exception:
            return e.code, str(e)
    except Exception as e:  # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"


def run_sql(sql):
    return _req("POST", f"{API}/v1/projects/{REF}/database/query", token=TOKEN, body={"query": sql})


def main():
    if not TOKEN:
        print("SUPABASE_ACCESS_TOKEN not set"); return 1
    sql = open(MIG).read()
    print(f"Applying {MIG} …")
    st, body = run_sql(sql)
    if st != 200 and st != 201:
        if isinstance(body, str) and "read-only" in body.lower():
            print(f"⚠️ DB is READ-ONLY right now (platform incident) — not applied. Re-dispatch when writable. {body}")
            return 1
        print(f"❌ apply failed HTTP {st}: {body}")
        return 1
    print(f"✅ apply OK (HTTP {st})")

    # VERIFY 1: RLS now on for all 11
    q = ("select c.relname as t, c.relrowsecurity as rls, "
         "(select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as pol "
         "from pg_class c join pg_namespace n on n.oid=c.relnamespace "
         "where n.nspname='public' and c.relname = any(array[" +
         ",".join(f"'{t}'" for t in ALL11) + "]) order by c.relname")
    st2, rows = run_sql(q)
    bad = [r for r in rows if not r.get("rls")] if isinstance(rows, list) else ["query failed"]
    print("\n== RLS after apply ==")
    if isinstance(rows, list):
        for r in rows:
            print(f"   {'✅' if r['rls'] else '🔴'} {r['t']:26} rls={r['rls']} policies={r['pol']}")
    ok = not bad

    # VERIFY 2: internal tables no longer anon-readable
    stk, keys = _req("GET", f"{API}/v1/projects/{REF}/api-keys", token=TOKEN)
    anon = next((k.get("api_key") or k.get("apiKey") for k in keys
                 if isinstance(keys, list) and k.get("name") == "anon"), None)
    print("\n== anon exposure after apply (internal tables must be denied) ==")
    if anon:
        base = f"https://{REF}.supabase.co/rest/v1"
        for t in INTERNAL:
            s3, b3 = _req("GET", f"{base}/{t}?select=*&limit=1", extra={"apikey": anon, "Authorization": "Bearer " + anon})
            denied = s3 in (401, 403) or (isinstance(b3, list) and len(b3) == 0) or (isinstance(b3, str) and "permission" in b3.lower())
            print(f"   {'✅ denied' if denied else '🔴 STILL EXPOSED'}: {t} (HTTP {s3})")
            if not denied:
                ok = False

    print("\n" + ("✅ RLS gap CLOSED — all 11 tables protected." if ok else "🔴 verification incomplete — review above."))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
