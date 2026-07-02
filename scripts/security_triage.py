#!/usr/bin/env python3
"""
Security triage — hard evidence for the Supabase Security Advisor findings.
===========================================================================
READ-ONLY. Changes nothing. Uses the Management API PAT (SUPABASE_ACCESS_TOKEN)
to answer the only questions that matter before we touch RLS:

  1. Which public tables currently have RLS OFF, and which SECURITY DEFINER views
     exist?  (run-SQL against pg_class / pg_views)
  2. What role does the app connect as?  (confirms the "superuser bypasses RLS,
     so enabling RLS won't break the app" claim in migration 004)
  3. Is the anon/PostgREST Data API ACTUALLY reachable, and can the anon key READ
     these RLS-off tables right now?  (the real-world exposure test)

Prints a triage table so remediation targets only the genuinely-exposed tables.

    SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=kgjpkphfjmmiyjsgsaup \
    python scripts/security_triage.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.supabase.com"
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
REF = os.environ.get("SUPABASE_PROJECT_REF", "kgjpkphfjmmiyjsgsaup")


def _req(method, url, token=None, body=None, extra=None):
    headers = {"User-Agent": "Starta-Sectriage/1.0", "Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(body).encode()
    if extra:
        headers.update(extra)
    req = urllib.request.Request(url, method=method, headers=headers, data=body)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode(errors="replace")
            try:
                return r.status, json.loads(raw)
            except Exception:
                return r.status, raw[:500]
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode()[:300]
        except Exception:
            return e.code, str(e)
    except Exception as e:  # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"


def run_sql(sql):
    st, body = _req("POST", f"{API}/v1/projects/{REF}/database/query",
                    token=TOKEN, body={"query": sql})
    return st, body


def main():
    if not TOKEN:
        print("SUPABASE_ACCESS_TOKEN not set"); return 0

    # 2) connection role / superuser?
    st, who = run_sql(
        "select current_user, "
        "(select rolsuper from pg_roles where rolname=current_user) as is_super")
    print("== connection role ==")
    print(f"   {who}")

    # 1) RLS status per public table
    st, rls = run_sql(
        "select c.relname as table, c.relrowsecurity as rls_on, "
        "(select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policies "
        "from pg_class c join pg_namespace n on n.oid=c.relnamespace "
        "where n.nspname='public' and c.relkind='r' order by c.relrowsecurity, c.relname")
    off = []
    if isinstance(rls, list):
        off = [r for r in rls if not r.get("rls_on")]
        print(f"\n== RLS status: {len(rls)} public tables, {len(off)} with RLS OFF ==")
        for r in off:
            print(f"   🔴 RLS OFF: {r['table']}  (policies={r['policies']})")
        on_no_pol = [r for r in rls if r.get("rls_on") and not r.get("policies")]
        if on_no_pol:
            print(f"   ({len(on_no_pol)} tables RLS-ON but no policy = deny-all to anon, e.g. {[r['table'] for r in on_no_pol[:5]]})")
    else:
        print("RLS query failed:", rls)

    # SECURITY DEFINER views
    st, defv = run_sql(
        "select viewname from pg_views where schemaname='public' "
        "and definition ilike '%security definer%'")
    print("\n== SECURITY DEFINER views ==")
    if isinstance(defv, list):
        print(f"   {len(defv)} view(s): {[v['viewname'] for v in defv]}")
    else:
        print("   query returned:", defv)

    # 3) anon exposure test
    print("\n== anon / PostgREST exposure test ==")
    stk, keys = _req("GET", f"{API}/v1/projects/{REF}/api-keys", token=TOKEN)
    anon = None
    if isinstance(keys, list):
        for k in keys:
            if k.get("name") == "anon":
                anon = k.get("api_key") or k.get("apiKey")
    if not anon:
        print(f"   could not fetch anon key (HTTP {stk}) — {str(keys)[:120]}")
    else:
        base = f"https://{REF}.supabase.co/rest/v1"
        probe_tables = [r["table"] for r in off[:6]] or ["market_tickers"]
        for t in probe_tables:
            st2, body2 = _req("GET", f"{base}/{t}?select=*&limit=1", extra={
                "apikey": anon, "Authorization": "Bearer " + anon})
            if st2 == 200 and isinstance(body2, list):
                verdict = f"🔴 EXPOSED — anon READ returned {len(body2)} row(s)"
            elif st2 in (401, 403) or (isinstance(body2, str) and "permission denied" in body2.lower()):
                verdict = "✅ protected (anon denied)"
            elif st2 == 404:
                verdict = "➖ not in REST schema (not exposed)"
            else:
                verdict = f"HTTP {st2}: {str(body2)[:80]}"
            print(f"   {t:28} -> {verdict}")
    print("\n(READ-ONLY triage — nothing was changed.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
