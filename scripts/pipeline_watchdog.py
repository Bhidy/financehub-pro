#!/usr/bin/env python3
"""
Pipeline Watchdog — the dead-man's-switch for the whole data platform.
======================================================================
Outcome-based + process-based safety net that makes "silent staleness" (a feed
or cron quietly stops, data rots, nobody notices) impossible to go unseen or
unhealed. Costs nothing: GitHub Actions + Supabase + Discord only.

Two independent checks every run:
  1. DATA FRESHNESS  — every critical dataset's newest row vs a trading-calendar
     -aware SLA. Catches "job ran but produced stale/no data".
  2. SCHEDULE LIVENESS — via `gh run list`, did each scheduled workflow actually
     fire within its window? Catches "cron silently never ran" (the exact bug
     that left 3 workflows dead with 0 runs).

On a problem it (optionally, --heal) DISPATCHES the corrective workflow
(cooldown-guarded so it never storms), then alerts Discord. Signal hygiene: it
ALWAYS writes the heartbeat, sends Discord and fires every heal FIRST, then exits
non-zero iff a problem was left UNHEALED (no corrective, --heal off, dispatch
skipped/failed, or a human-only issue) so the GitHub UI is honestly RED and can't
false-green; a problem we dispatched-for-heal keeps it GREEN (the heal IS the
response), and a healthy run is GREEN. A RED run with a written heartbeat means
"real problem outstanding"; a MISSING heartbeat (DB unreachable / watchdog dead)
is what the paired data-freshness-monitor cross-checks.

It writes a heartbeat to `pipeline_heartbeat` so a second, independent workflow
can confirm the watchdog itself is alive ("who watches the watchman", for free).

Usage:
    DATABASE_URL=... python scripts/pipeline_watchdog.py            # report only
    DATABASE_URL=... python scripts/pipeline_watchdog.py --heal     # + auto-repair
    DATABASE_URL=... python scripts/pipeline_watchdog.py --check-watchdog 90
        # inverse mode: alert if the watchdog's OWN heartbeat is older than N min
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
from datetime import datetime, time, timedelta, timezone

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL")
DISCORD = os.environ.get("DISCORD_WEBHOOK_URL")
REPO = os.environ.get("WATCHDOG_REPO", "Bhidy/financehub-pro")

# --------------------------------------------------------------------------- #
# EGX trading calendar (free, maintained). EGX trades Sun–Thu; Fri/Sat closed.
# Session window in UTC is kept WIDE [06:00, 13:15] to cover the harvester's
# `*/15 6-13` price cron and both EET/EEST mappings — being slightly wide only
# extends "prices expected fresh" a little, which is safe.
# MAINTAIN the holiday list yearly (a missing holiday at worst causes one benign
# extra alert on a closed day; schedule-liveness is the primary dead-cron catch).
# --------------------------------------------------------------------------- #
WEEKEND = {4, 5}  # Python weekday(): Mon=0 … Fri=4, Sat=5
EGX_HOLIDAYS = {
    # 2026 — best-effort; update from the official EGX calendar.
    "2026-01-07", "2026-01-25", "2026-04-12", "2026-04-13", "2026-04-25",
    "2026-05-01", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-30",
    "2026-07-23", "2026-08-25", "2026-08-26", "2026-10-06",
}
SESSION_OPEN_UTC = time(6, 0)
SESSION_CLOSE_UTC = time(13, 15)


def _is_trading_day(d) -> bool:
    return d.weekday() not in WEEKEND and d.isoformat() not in EGX_HOLIDAYS


def _is_market_open(now: datetime) -> bool:
    return _is_trading_day(now.date()) and SESSION_OPEN_UTC <= now.timetz().replace(tzinfo=None) <= SESSION_CLOSE_UTC


def _last_completed_session_date(now: datetime):
    """Most recent trading day whose close (13:15 UTC) is <= now."""
    d = now.date()
    for _ in range(14):
        if _is_trading_day(d):
            close = datetime.combine(d, SESSION_CLOSE_UTC, tzinfo=timezone.utc)
            if close <= now:
                return d
        d -= timedelta(days=1)
    return now.date()


def _trading_days_missed(ts: datetime, now: datetime) -> int:
    """How many trading sessions have CLOSED with a date strictly after the data's
    date. Weekend/holiday-safe: no trading days accrue while the market is shut."""
    if ts is None:
        return 999
    n, d = 0, ts.date() + timedelta(days=1)
    while d <= now.date():
        if _is_trading_day(d) and datetime.combine(d, SESSION_CLOSE_UTC, tzinfo=timezone.utc) <= now:
            n += 1
        d += timedelta(days=1)
    return n


# --------------------------------------------------------------------------- #
# What we guard. (label, table, ts_col, kind, threshold, corrective, filter)
#   kind: intraday  -> only when market open; stale if age_min > threshold
#         session_date -> stale if max(date) < last completed session date
#         trading_daily -> stale if >= threshold trading sessions missed
#         wall_days   -> stale if age_hours > threshold (tolerant; spans weekends)
#   corrective: (workflow_file, {dispatch inputs}) to auto-run, or None
# --------------------------------------------------------------------------- #
HARVEST = "tv-egx-harvester.yml"
DATASETS = [
    ("prices",         "market_tickers",  "last_updated", "intraday",      25,    (HARVEST, {"cycle": "prices"}),                    "market_code='EGX'"),
    ("charts/ohlc",    "ohlc_data",       "date",         "session_date",  None,  (HARVEST, {"cycle": "prices_and_technicals"}),      None),
    ("technicals",     "egx_technicals",  "updated_at",   "trading_daily", 2,     (HARVEST, {"cycle": "technicals"}),                 None),
    ("stock_statistics","stock_statistics","updated_at",  "trading_daily", 2,     ("stock-statistics-refresh.yml", {}),               None),
    ("news",           "egx_news",        "created_at",   "wall_days",     7*24,  (HARVEST, {"cycle": "news"}),                       None),
    ("dividends",      "egx_dividends",   "updated_at",   "wall_days",     8*24,  (HARVEST, {"cycle": "dividends"}),                  None),
    ("estimates",      "egx_estimates",   "updated_at",   "wall_days",     9*24,  (HARVEST, {"cycle": "estimates"}),                  None),
    ("financials",     "egx_financials",  "updated_at",   "wall_days",     9*24,  (HARVEST, {"cycle": "financials_and_fundamentals"}),None),
    ("fundamentals",   "egx_fundamentals","updated_at",   "wall_days",     9*24,  (HARVEST, {"cycle": "financials_and_fundamentals"}),None),
    ("symbol_map",     "symbol_map",      "updated_at",   "wall_days",     9*24,  (HARVEST, {"cycle": "symbolmap"}),                  None),
    ("funds_nav",      "mutual_funds",    "updated_at",   "wall_days",     5*24,  ("funds-nav-update.yml", {}),                       None),
]

# Scheduled workflows we expect to keep firing. (file, kind, max_silence_hours)
#   kind: intraday -> enforced only during market hours
#         daily    -> enforced only on/after a trading session
#         interval -> enforced every day (cadence-based)
#         weekly   -> generous
WORKFLOWS = [
    # Intraday thresholds are generous on purpose: GitHub schedules jitter, and
    # DATA freshness (above) is the tight signal. Schedule-liveness exists to catch
    # a dead/grossly-overdue cron (the "never ran" class), not normal jitter.
    (HARVEST,                       "intraday", 3.0),
    ("enterprise-data-update.yml",  "intraday", 3.0),
    ("data-freshness-monitor.yml",  "intraday", 2.0),
    ("stock-statistics-refresh.yml","daily",    30),
    ("stocks-freshness-monitor.yml","daily",    30),
    ("funds-nav-update.yml",        "daily",    30),
    ("funds-freshness-monitor.yml", "daily",    30),
    ("symbol-data-quality.yml",     "daily",    30),
    ("morning_brief.yml",           "daily",    30),
    ("company-names-refresh.yml",   "weekly",   9*24),
    ("data_sync.yml",               "interval", 6),
    ("production_watchdog.yml",     "interval", 8),
    # "who watches the monitor": if the DB early-warning monitor itself stops
    # firing we'd be blind again. 3h window is generous vs the */10 cron so normal
    # self-hosted drop never false-flags it; only a truly dead monitor trips.
    ("db-health-monitor.yml",       "interval", 3),
]

HEAL_COOLDOWN_MIN = 45  # never re-dispatch a corrective workflow within this window


def _gh(args, timeout=30):
    """Best-effort gh CLI call -> stdout (str) or None. Never raises."""
    try:
        r = subprocess.run(["gh", *args], capture_output=True, text=True, timeout=timeout)
        return r.stdout if r.returncode == 0 else None
    except Exception:
        return None


def _last_run(workflow_file):
    """(last_run_dt|None, status) for a workflow's most recent run, via gh."""
    out = _gh(["run", "list", "--repo", REPO, "--workflow", workflow_file, "-L", "1",
               "--json", "createdAt,status,conclusion"])
    if not out:
        return None, "unknown"
    try:
        rows = json.loads(out)
    except Exception:
        return None, "unknown"
    if not rows:
        return None, "never"
    r = rows[0]
    dt = datetime.fromisoformat(r["createdAt"].replace("Z", "+00:00"))
    return dt, (r.get("conclusion") or r.get("status") or "unknown")


def _dispatch(workflow_file, inputs):
    """Dispatch a corrective workflow, cooldown-guarded. Returns a status string."""
    last, status = _last_run(workflow_file)
    if status in ("queued", "in_progress"):
        return "skip(already running)"
    if last is not None:
        age_min = (datetime.now(timezone.utc) - last).total_seconds() / 60
        if age_min < HEAL_COOLDOWN_MIN:
            return f"skip(ran {int(age_min)}m ago)"
    args = ["workflow", "run", workflow_file, "--repo", REPO]
    for k, v in (inputs or {}).items():
        args += ["-f", f"{k}={v}"]
    return "DISPATCHED" if _gh(args) is not None else "dispatch-failed"


async def _max_ts(conn, table, col, filt):
    where = f" WHERE {filt}" if filt else ""
    val = await conn.fetchval(f"SELECT max({col}) FROM {table}{where}")
    return val


def _classify(kind, threshold, val, now):
    """Return (state, detail). state in {OK, STALE, EMPTY}."""
    if val is None:
        return "EMPTY", "no rows"
    if kind == "session_date":
        last = _last_completed_session_date(now)
        return ("OK" if val >= last else "STALE"), f"max date {val} (expected ≥ {last})"
    # normalise to aware datetime
    ts = val if isinstance(val, datetime) else datetime.combine(val, time(), tzinfo=timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    age_h = (now - ts).total_seconds() / 3600
    if kind == "intraday":
        if not _is_market_open(now):
            return "OK", f"market closed (age {age_h:.1f}h, not expected fresh)"
        age_m = age_h * 60
        return ("OK" if age_m <= threshold else "STALE"), f"age {age_m:.0f}m (SLA {threshold}m, market open)"
    if kind == "trading_daily":
        missed = _trading_days_missed(ts, now)
        return ("OK" if missed < threshold else "STALE"), f"{missed} session(s) missed (age {age_h:.1f}h)"
    # wall_days
    return ("OK" if age_h <= threshold else "STALE"), f"age {age_h/24:.1f}d (SLA {threshold/24:.0f}d)"


def _workflow_overdue(file, kind, max_silence_h, now):
    last, status = _last_run(file)
    if status == "unknown":
        return None  # gh unavailable; skip silently
    if last is None:  # never ran — the dead-cron case
        return f"NEVER RAN (status={status})"
    age_h = (now - last).total_seconds() / 3600
    # only enforce tight windows when the market is/was relevant
    if kind == "intraday" and not _is_market_open(now):
        return None
    if kind == "daily" and not _is_trading_day(_last_completed_session_date(now)):
        return None
    # A run still queued/in_progress is NOT proof of liveness: if the single
    # self-hosted runner is down, GitHub keeps enqueuing runs that never start,
    # so the latest run looks "recent" yet nothing actually executed. Treat a
    # non-terminal run that has been pending LONGER than its window as overdue
    # (the single-runner-down case) rather than silently "already running/live".
    if status in ("queued", "in_progress") and age_h > max_silence_h:
        return f"stuck {status} {age_h:.1f}h (max {max_silence_h}h — runner down? never started)"
    if age_h > max_silence_h:
        return f"overdue {age_h:.1f}h (max {max_silence_h}h, last status={status})"
    return None


def _post_discord(title, lines, color):
    # Prefer the verified-delivery path (scripts/notify.py): it POSTs to Discord,
    # CHECKS the HTTP status, and falls back to EMAIL (SMTP) when Discord is missing
    # / non-2xx / dead — closing the "Discord is the only alert channel, silent on a
    # 403'd webhook" gap (audit H3). If that module can't be imported (older checkout
    # or odd run context), fall through to the original raw Discord POST below, so
    # alerting NEVER hard-depends on the new module.
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from notify import send_alert
        st = send_alert(title, "\n".join(lines))
        print(f"alert delivery: {st}", file=sys.stderr)
        return
    except Exception as e:
        print(f"notify.send_alert unavailable, using raw Discord: {e}", file=sys.stderr)

    if not DISCORD:
        return
    try:
        import urllib.request
        body = json.dumps({"embeds": [{
            "title": title,
            "description": "\n".join(lines)[:3900],
            "color": color,
        }]}).encode()
        req = urllib.request.Request(DISCORD, data=body, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=15).read()
    except Exception as e:
        print(f"discord post failed: {e}", file=sys.stderr)


async def _connect():
    last = None
    for i in range(1, 4):
        try:
            return await asyncpg.connect(DATABASE_URL, statement_cache_size=0, command_timeout=25)
        except Exception as e:
            last = e
            await asyncio.sleep(2 ** i)
    raise last


async def main(heal: bool, check_watchdog_min: int):
    if not DATABASE_URL:
        sys.exit("DATABASE_URL not set")
    now = datetime.now(timezone.utc)
    conn = await _connect()
    try:
        # Read-only preflight (covers BOTH forward + inverse mode). A Supabase
        # platform incident sets the cluster read-only: the watchdog then can't
        # write its heartbeat, CREATE its table, or dispatch heals — and none of
        # that is our bug. Crashing here would (a) spam a RED every cycle and
        # (b) make the paired inverse-watcher cry "WATCHDOG IS DOWN" off a stale
        # heartbeat. So skip cleanly (exit 0); the DB health monitor owns
        # incident alerting (dedup'd, once per transition).
        _ro = await conn.fetchrow(
            "SELECT current_setting('transaction_read_only') AS ro, "
            "pg_is_in_recovery() AS rec")
        if _ro["ro"] == "on" or _ro["rec"]:
            print("DB is READ-ONLY (Supabase platform incident/standby) — watchdog "
                  "pausing this cycle; no writes possible. Health monitor tracks the "
                  "incident. Not an error.")
            return
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS pipeline_heartbeat (
                name TEXT PRIMARY KEY, last_run_at TIMESTAMPTZ NOT NULL,
                detail TEXT)
        """)

        # Inverse mode: a paired workflow uses this to watch the watchdog itself.
        if check_watchdog_min:
            hb = await conn.fetchval("SELECT last_run_at FROM pipeline_heartbeat WHERE name='pipeline_watchdog'")
            if hb is None or (now - hb).total_seconds() / 60 > check_watchdog_min:
                age = "never" if hb is None else f"{(now-hb).total_seconds()/60:.0f}m ago"
                _post_discord("🚨 WATCHDOG IS DOWN",
                              [f"pipeline_watchdog last heartbeat: {age} (expected ≤ {check_watchdog_min}m).",
                               "The data-platform safety net is not running — investigate GitHub Actions."], 0xE74C3C)
                print(f"WATCHDOG STALE: {age}")
                # RED run = GitHub mobile push — the only live alert channel.
                # Exiting 0 here would leave the dead-man's-switch itself dead.
                raise SystemExit(1)
            print(f"watchdog heartbeat OK ({(now-hb).total_seconds()/60:.0f}m ago)")
            return

        # `unhealed` counts problems that were NOT successfully dispatched-for-heal
        # (no corrective, --heal off, or dispatch skipped/failed). It drives an
        # HONEST exit code at the end so the GitHub UI goes RED only when a real
        # problem is left unaddressed — while a problem we kicked a heal for keeps
        # the run GREEN (the heal IS the response).
        problems, heals, unhealed = [], [], 0

        # 1) DATA FRESHNESS
        for label, table, col, kind, thr, corrective, filt in DATASETS:
            try:
                val = await _max_ts(conn, table, col, filt)
            except Exception as e:
                problems.append(f"❓ {label}: check failed — {type(e).__name__}")
                unhealed += 1
                continue
            state, detail = _classify(kind, thr, val, now)
            mark = {"OK": "✅", "STALE": "🟠", "EMPTY": "🔴"}[state]
            print(f"  {mark} {label:16} {state:5} {detail}")
            if state != "OK":
                problems.append(f"{mark} **{label}** {state} — {detail}")
                if heal and corrective:
                    res = _dispatch(*corrective)
                    heals.append(f"↻ {label} → {corrective[0]}: {res}")
                    if res != "DISPATCHED":
                        unhealed += 1
                else:
                    unhealed += 1

        # 2) SCHEDULE LIVENESS (did each cron actually fire?)
        print("  --- schedule liveness ---")
        for file, kind, max_h in WORKFLOWS:
            issue = _workflow_overdue(file, kind, max_h, now)
            print(f"  {'⏰' if issue else '✅'} {file:32} {issue or 'live'}")
            if issue:
                problems.append(f"⏰ **{file}** {issue}")
                if heal and file != "pipeline-watchdog.yml":
                    res = _dispatch(file, {})
                    heals.append(f"↻ {file}: {res}")
                    if res != "DISPATCHED":
                        unhealed += 1
                else:
                    unhealed += 1

        # 3) RUNNER DISK CHECK (self-hosted only — checks actual Hetzner VPS disk)
        #    Warn at 85%, critical at 92%. Standard-library shutil; no pip needed.
        DISK_WARN_PCT = 85
        DISK_CRIT_PCT = 92
        disk_summary = ""
        print("  --- runner disk ---")
        try:
            import shutil
            du = shutil.disk_usage("/")
            _disk_pct = int(du.used * 100 / du.total)
            _disk_free_gb = du.free / (1024 ** 3)
            disk_summary = f"disk={_disk_pct}%"
            if _disk_pct >= DISK_CRIT_PCT:
                mark = "🔴"
                problems.append(
                    f"🔴 **runner disk CRITICAL: {_disk_pct}% full** — only {_disk_free_gb:.1f}G free on Hetzner VPS."
                    f" Runner will crash if disk fills. Clear: `docker system prune -f` or expand volume."
                )
                unhealed += 1  # disk needs a human to free space — no auto-heal
            elif _disk_pct >= DISK_WARN_PCT:
                mark = "🟠"
                problems.append(
                    f"🟠 **runner disk {_disk_pct}% full** — {_disk_free_gb:.1f}G remaining on Hetzner VPS."
                    f" Free space soon: `docker system prune -f` or clear /tmp, logs."
                )
                unhealed += 1  # disk needs a human to free space — no auto-heal
            else:
                mark = "✅"
            print(f"  {mark} runner disk:    {_disk_pct}% used, {_disk_free_gb:.1f}G free")
        except Exception as e:
            print(f"  ❓ disk check skipped: {e}", file=sys.stderr)

        # 4) heartbeat (so the paired monitor can confirm we're alive)
        await conn.execute("""
            INSERT INTO pipeline_heartbeat(name,last_run_at,detail) VALUES('pipeline_watchdog',$1,$2)
            ON CONFLICT (name) DO UPDATE SET last_run_at=EXCLUDED.last_run_at, detail=EXCLUDED.detail
        """, now, f"{len(problems)} problem(s)" + (f" | {disk_summary}" if disk_summary else ""))

        # 5) report + alert
        if heals:
            print("\n".join("  " + h for h in heals))
        if problems:
            title = "🟠 DATA PIPELINE — issues detected" + (" (auto-heal triggered)" if heals else "")
            _post_discord(title, problems + ([""] + heals if heals else []), 0xE67E22)
            print(f"\nWATCHDOG: {len(problems)} problem(s) found"
                  + (f", {sum('DISPATCHED' in h for h in heals)} heal(s) dispatched" if heals else ""))
        else:
            print("\nWATCHDOG: all datasets fresh, all schedules live, runner disk OK ✅")
    finally:
        await conn.close()

    # HONEST exit code (run AFTER heartbeat, Discord alert and heal dispatch above,
    # so none of those are skipped): if any problem was left UNHEALED — no corrective,
    # --heal off, dispatch skipped/failed, or a human-only issue like disk/check-failed
    # — exit non-zero so the GitHub UI goes RED and the run can't be a false green. A
    # healthy run, or one where every problem was dispatched-for-heal, stays exit 0.
    if unhealed:
        sys.exit(f"WATCHDOG: {unhealed} unhealed problem(s) — see Discord/log above")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--heal", action="store_true", help="auto-dispatch corrective workflows for stale data / dead crons")
    ap.add_argument("--check-watchdog", type=int, default=0, metavar="MIN",
                    help="inverse mode: alert if pipeline_watchdog heartbeat older than MIN minutes")
    a = ap.parse_args()
    asyncio.run(main(a.heal, a.check_watchdog))
