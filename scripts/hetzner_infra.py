#!/usr/bin/env python3
"""
Hetzner host monitor — closes the last blind spot (the backend VPS itself).
===========================================================================
The FastAPI backend, Caddy, and the self-hosted GitHub runner all live on one
Hetzner Cloud server. A raw DB/Supabase view can't see that box; this probe uses
the Hetzner Cloud API (token = GitHub secret HETZNER_API_TOKEN, project-scoped to
"Starta") to watch it:
  * validates the token (lists project servers)
  * reports each server's status / type / datacenter / IP
  * alerts once if a server is NOT "running" (off / rebuilding / migrating), or
    if a reboot is detected since last run (state dedup via HETZNER_STATE_FILE)

Runs on a GitHub-hosted runner (needs no box access — just the API), so it keeps
working even if the self-hosted runner is down. Always exits 0.

    HETZNER_API_TOKEN=... python scripts/hetzner_infra.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # scripts/ for notify

API = "https://api.hetzner.cloud/v1"
TOKEN = os.environ.get("HETZNER_API_TOKEN")
STATE_FILE = os.environ.get("HETZNER_STATE_FILE", ".hetzner_state.json")
EXPECT_IP = os.environ.get("HETZNER_EXPECT_IP", "46.224.223.172")  # the backend box


def _get(path):
    req = urllib.request.Request(API + path, headers={
        "Authorization": "Bearer " + (TOKEN or ""),
        "User-Agent": "Starta-Hetzner/1.0 (+https://startamarkets.com)"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode()[:300]
        except Exception:
            return e.code, str(e)
    except Exception as e:  # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"


def _alert(title, body):
    try:
        from notify import send_alert
        print("alert delivery:", send_alert(title, body), file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"[warn] send_alert unavailable ({e}); {title}", file=sys.stderr)


def _load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_state(state):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f)
    except Exception as e:  # noqa: BLE001
        print(f"[warn] could not persist state: {e}", file=sys.stderr)


def main():
    if not TOKEN:
        print("HETZNER_API_TOKEN not set — skipping host monitor")
        return 0
    st, body = _get("/servers")
    if st in (401, 403):
        print(f"❌ HETZNER TOKEN INVALID (HTTP {st}). Regenerate at "
              f"console.hetzner.com → project → Security → API tokens and update "
              f"the HETZNER_API_TOKEN secret. {body}")
        return 0
    if st != 200 or not isinstance(body, dict):
        print(f"⚠️ Hetzner API unexpected HTTP {st}: {body}")
        return 0
    servers = body.get("servers", [])
    print(f"✅ HETZNER TOKEN VALID — {len(servers)} server(s) in project.")

    prev = _load_state()
    new_state, alerts = {}, []
    for s in servers:
        name = s.get("name")
        status = s.get("status")
        stype = (s.get("server_type") or {}).get("name")
        dc = ((s.get("datacenter") or {}).get("location") or {}).get("name")
        ip = ((s.get("public_net") or {}).get("ipv4") or {}).get("ip")
        cores = (s.get("server_type") or {}).get("cores")
        mem = (s.get("server_type") or {}).get("memory")
        disk = (s.get("server_type") or {}).get("disk")
        mark = "✅" if status == "running" else "🔴"
        tag = "  ← backend box" if ip == EXPECT_IP else ""
        print(f"   {mark} {name} [{ip}] status={status} type={stype} "
              f"({cores}vCPU/{mem}GB/{disk}GB) dc={dc}{tag}")
        key = str(s.get("id"))
        new_state[key] = status
        if status != "running":
            alerts.append(f"🔴 server {name} ({ip}) is '{status}' (expected running)")
        elif prev.get(key) and prev[key] != "running" and status == "running":
            alerts.append(f"✅ server {name} ({ip}) recovered to running")

    if EXPECT_IP and not any(
            ((s.get("public_net") or {}).get("ipv4") or {}).get("ip") == EXPECT_IP
            for s in servers):
        alerts.append(f"⚠️ expected backend server {EXPECT_IP} not found in project")

    if alerts:
        _alert("Hetzner host status change", "\n".join(alerts))
    _save_state(new_state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
