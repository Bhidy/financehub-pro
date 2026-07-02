#!/usr/bin/env python3
"""
Supabase Management API probe — validate the PAT + surface project health & Advisors.
=====================================================================================
Uses the Supabase Management API (https://api.supabase.com), authenticated with a
Personal Access Token (env SUPABASE_ACCESS_TOKEN, stored as the GitHub secret
SUPABASETOKENKEY). This is the project-LEVEL control plane that a raw DB
connection can't reach:
  * validates the PAT (lists visible projects)
  * reports our project's status/region (ACTIVE_HEALTHY, etc.)
  * pulls the Security Advisor + Performance Advisor (RLS gaps, exposed tables,
    missing/unused indexes, slow queries) — Supabase auditing itself

Always exits 0 (monitor contract): its job is the report/alert, not the exit code.
On ERROR-level Security Advisor findings it fires a single alert via notify.

    SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=kgjpkphfjmmiyjsgsaup \
    python scripts/supabase_mgmt.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # scripts/ for notify

API = "https://api.supabase.com"
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "kgjpkphfjmmiyjsgsaup")


def _get(path):
    """(status:int|None, body:obj|str). Never raises."""
    req = urllib.request.Request(API + path, headers={
        "Authorization": "Bearer " + (TOKEN or ""),
        "User-Agent": "Starta-Mgmt/1.0 (+https://startamarkets.com)",
        "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            raw = r.read().decode()
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


def _advisor(kind):
    """Return (status, lints:list). Tries the documented path."""
    st, body = _get(f"/v1/projects/{PROJECT_REF}/advisors/{kind}")
    lints = []
    if st == 200 and isinstance(body, dict):
        lints = body.get("lints") or body.get("data") or []
    return st, lints, body


def _alert(title, body):
    try:
        from notify import send_alert
        print("alert delivery:", send_alert(title, body), file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"[warn] send_alert unavailable ({e}); {title}", file=sys.stderr)


def main():
    if not TOKEN:
        print("SUPABASE_ACCESS_TOKEN not set — cannot probe the Management API")
        return 0

    # 1) VALIDATE the PAT by listing visible projects
    st, body = _get("/v1/projects")
    if st in (401, 403):
        print(f"❌ TOKEN INVALID (HTTP {st}). The PAT is wrong, expired, or lacks scope.\n"
              f"   Regenerate at supabase.com/dashboard/account/tokens and update the "
              f"SUPABASETOKENKEY secret.\n   response: {body}")
        return 0
    if st != 200 or not isinstance(body, list):
        print(f"⚠️ Management API unexpected response HTTP {st}: {body}")
        return 0
    print(f"✅ TOKEN VALID — Management API reachable; {len(body)} project(s) visible.")

    ours = next((p for p in body if p.get("id") == PROJECT_REF), None)
    if ours:
        print(f"   project: {ours.get('name')} [{ours.get('id')}]  "
              f"region={ours.get('region')}  status={ours.get('status')}")
    else:
        names = ", ".join(f"{p.get('name')}[{p.get('id')}]" for p in body) or "(none)"
        print(f"   ⚠️ project {PROJECT_REF} not visible to this token. Visible: {names}")
        return 0

    # 1b) NETWORK RESTRICTIONS — decides whether DB-touching monitors can run on
    #     GitHub-hosted runners (dynamic IPs). "allow all" => yes; an allowlist =>
    #     those monitors must stay on the fixed-IP self-hosted runner.
    stn, netr = _get(f"/v1/projects/{PROJECT_REF}/network-restrictions")
    if stn == 200 and isinstance(netr, dict):
        cfg = netr.get("config") or {}
        allowed = (cfg.get("dbAllowedCidrs") or []) + (cfg.get("dbAllowedCidrsV6") or [])
        openish = (not allowed) or ("0.0.0.0/0" in allowed) or ("::/0" in allowed)
        print(f"   network restrictions: {'OPEN (any IP) — DB monitors may run GitHub-hosted' if openish else f'ALLOWLIST {allowed} — DB monitors must stay self-hosted'} (status={netr.get('status')})")
    else:
        print(f"   network restrictions: HTTP {stn} (assume open)")

    # 2) ADVISORS — Supabase auditing itself
    alert_lines, err_keys = [], []
    for kind in ("security", "performance"):
        st2, lints, raw = _advisor(kind)
        if st2 != 200:
            print(f"   {kind:11} advisor: HTTP {st2} (endpoint may need a different scope) — {str(raw)[:120]}")
            continue
        by_level = {}
        for lint in lints:
            lvl = (lint.get("level") or "?").upper()
            by_level[lvl] = by_level.get(lvl, 0) + 1
        summary = ", ".join(f"{k}:{v}" for k, v in sorted(by_level.items())) or "clean"
        print(f"   {kind:11} advisor: {len(lints)} finding(s)  [{summary}]")
        # surface the ERROR-level items (the ones that matter)
        errs = [l for l in lints if (l.get("level") or "").upper() == "ERROR"]
        for l in errs[:8]:
            print(f"       ERROR: {l.get('title') or l.get('name')} — "
                  f"{(l.get('description') or '')[:120]}")
        if errs:
            alert_lines.append(f"{kind} advisor: {len(errs)} ERROR-level finding(s)")
            alert_lines += [f"  • {l.get('title') or l.get('name')}" for l in errs[:8]]
            err_keys += [f"{kind}:{l.get('name') or l.get('title')}:{(l.get('metadata') or {}).get('name','')}" for l in errs]

    # Dedup: alert only when the SET of ERROR findings CHANGES vs the last run
    # (persisted in MGMT_STATE_FILE via the workflow's Actions cache). Prevents
    # the daily sweep from re-pinging the same findings every day.
    fp = "|".join(sorted(set(err_keys)))
    prev = ""
    state_file = os.environ.get("MGMT_STATE_FILE")
    if state_file:
        try:
            with open(state_file) as f:
                prev = (json.load(f) or {}).get("fp", "")
        except Exception:
            prev = ""
    if alert_lines and fp != prev:
        _alert("🟠 Supabase Advisor: ERROR-level findings changed",
               "\n".join([f"project {PROJECT_REF}", ""] + alert_lines))
    elif alert_lines:
        print(f"   (advisor ERRORs unchanged since last run — no re-alert; {len(err_keys)} error(s))")
    if state_file:
        try:
            with open(state_file, "w") as f:
                json.dump({"fp": fp}, f)
        except Exception as e:  # noqa: BLE001
            print(f"[warn] could not persist mgmt state: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
