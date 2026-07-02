#!/usr/bin/env python3
"""
Supabase Metrics API probe — INFRA early-warning (disk / memory / connections).
===============================================================================
The layer a raw DB connection can't see: scrapes the project's Prometheus
endpoint (~200 node/postgres/pooler series) so we catch a disk-full or
connection-exhaustion *before* it forces the DB read-only — the exact class of
event that surprised us on 2026-07-02.

Endpoint:  https://<ref>.supabase.co/customer/v1/privileged/metrics
Auth:      HTTP Basic — username "service_role", password = the service_role key
           (env SUPABASE_SERVICE_ROLE_KEY, GitHub secret SUPABASE_SERVICE_ROLE_KEY).

Prints a health line + the key series, and alerts once when disk crosses a
threshold. Always exits 0 (monitor contract). First run also doubles as the
service_role-key validity check (❌ on 401/403).

    SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_PROJECT_REF=kgjpkphfjmmiyjsgsaup \
    python scripts/supabase_metrics.py
"""
import base64
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # scripts/ for notify

REF = os.environ.get("SUPABASE_PROJECT_REF", "kgjpkphfjmmiyjsgsaup")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
URL = f"https://{REF}.supabase.co/customer/v1/privileged/metrics"
DISK_WARN_PCT = float(os.environ.get("DISK_WARN_PCT", "80"))


def _alert(title, body):
    try:
        from notify import send_alert
        print("alert delivery:", send_alert(title, body), file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"[warn] send_alert unavailable ({e}); {title}", file=sys.stderr)


def _samples(lines, metric):
    """All (labels, value) for a metric name (gauge). value as float."""
    out = []
    for ln in lines:
        if ln.startswith(metric + " ") or ln.startswith(metric + "{"):
            try:
                out.append((ln[len(metric):].rsplit(" ", 1)[0],
                            float(ln.rsplit(" ", 1)[1])))
            except Exception:
                pass
    return out


def _root(samples):
    """Pick the value for mountpoint="/" if labelled, else the largest."""
    rootv = [v for lbl, v in samples if 'mountpoint="/"' in lbl]
    if rootv:
        return rootv[0]
    return max((v for _, v in samples), default=None)


def main():
    if not KEY:
        print("SUPABASE_SERVICE_ROLE_KEY not set — skipping infra metrics probe")
        return 0
    auth = base64.b64encode(f"service_role:{KEY}".encode()).decode()
    req = urllib.request.Request(URL, headers={
        "Authorization": "Basic " + auth,
        "User-Agent": "Starta-Metrics/1.0 (+https://startamarkets.com)"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()[:200]
        except Exception:
            pass
        print(f"❌ METRICS API HTTP {e.code} — the service_role key is wrong, "
              f"expired, or lacks access. Update the SUPABASE_SERVICE_ROLE_KEY "
              f"secret. {body}")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ metrics fetch failed (transient?): {type(e).__name__}: {e}")
        return 0

    lines = [l for l in text.splitlines() if l and not l.startswith("#")]
    names = sorted({l.split("{")[0].split(" ")[0] for l in lines})
    print(f"✅ METRICS API OK — {len(lines)} series ({len(names)} distinct metrics) from {REF}")

    # --- disk (the read-only predictor) ---
    avail = _root(_samples(lines, "node_filesystem_avail_bytes"))
    size = _root(_samples(lines, "node_filesystem_size_bytes"))
    disk_pct = None
    if avail is not None and size and size > 0:
        disk_pct = round((size - avail) / size * 100, 1)
        print(f"   disk:        {disk_pct}% used  ({(size-avail)/1e9:.1f} / {size/1e9:.1f} GB)")

    # --- memory ---
    mem_avail = _root(_samples(lines, "node_memory_MemAvailable_bytes"))
    mem_total = _root(_samples(lines, "node_memory_MemTotal_bytes"))
    if mem_avail is not None and mem_total:
        print(f"   memory:      {round((mem_total-mem_avail)/mem_total*100,1)}% used")

    # --- connections ---
    backends = _samples(lines, "pg_stat_database_num_backends")
    if backends:
        print(f"   connections: {int(sum(v for _, v in backends))} active backends")
    maxc = _samples(lines, "pg_settings_max_connections")
    if maxc:
        print(f"   max_connections: {int(maxc[0][1])}")

    if not (avail or mem_avail or backends):
        # metric names differ from expected — dump a sample so we can wire precise
        # alerts next iteration (discovery, not a failure).
        print("   (standard node/pg series not matched — sample of available metrics:)")
        for n in names[:25]:
            print(f"     {n}")

    # --- alert (disk is the one that forces read-only) ---
    if disk_pct is not None and disk_pct >= DISK_WARN_PCT:
        _alert(f"🟠 Supabase disk {disk_pct}% used (threshold {DISK_WARN_PCT}%)",
               f"project {REF}: disk {disk_pct}% used. A full disk forces the DB "
               f"read-only. Free space or resize before it does.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
