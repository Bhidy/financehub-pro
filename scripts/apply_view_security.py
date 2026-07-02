#!/usr/bin/env python3
"""
Apply migration 007 (view security_invoker) via the Management API run-SQL (PAT),
then VERIFY that no public view is left without security_invoker=true.
Idempotent; WRITE — dispatch intentionally. Exits non-zero on failure.

    SUPABASE_ACCESS_TOKEN=... python scripts/apply_view_security.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.supabase.com"
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
REF = os.environ.get("SUPABASE_PROJECT_REF", "kgjpkphfjmmiyjsgsaup")
MIG = os.environ.get("MIGRATION_FILE", "backend-core/migrations/007_view_security_invoker.sql")


def run_sql(sql):
    req = urllib.request.Request(
        f"{API}/v1/projects/{REF}/database/query", method="POST",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": "Bearer " + (TOKEN or ""),
                 "Content-Type": "application/json", "User-Agent": "Starta-Views/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode(errors="replace")
            try:
                return r.status, json.loads(raw)
            except Exception:
                return r.status, raw[:400]
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode()[:400]
        except Exception:
            return e.code, str(e)
    except Exception as e:  # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"


LEFT = ("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace "
        "where n.nspname='public' and c.relkind='v' "
        "and not ('security_invoker=true' = any(coalesce(c.reloptions,'{}'))) order by 1")


def main():
    if not TOKEN:
        print("SUPABASE_ACCESS_TOKEN not set"); return 1
    st0, before = run_sql(LEFT)
    n_before = len(before) if isinstance(before, list) else "?"
    print(f"views WITHOUT security_invoker before: {n_before} "
          f"{[r['relname'] for r in before] if isinstance(before, list) else before}")

    print(f"\nApplying {MIG} …")
    st, body = run_sql(open(MIG).read())
    if st not in (200, 201):
        if isinstance(body, str) and "read-only" in body.lower():
            print(f"⚠️ DB read-only right now — re-dispatch when writable. {body}"); return 1
        print(f"❌ apply failed HTTP {st}: {body}"); return 1
    print(f"✅ apply OK (HTTP {st})")

    st2, after = run_sql(LEFT)
    left = [r["relname"] for r in after] if isinstance(after, list) else after
    print(f"\nviews WITHOUT security_invoker after: {len(left) if isinstance(left, list) else left} {left}")
    ok = isinstance(left, list) and len(left) == 0
    print("\n" + ("✅ all public views are now security_invoker=on — SECURITY DEFINER VIEW findings closed."
                  if ok else "🔴 some views still lack security_invoker — review above."))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
