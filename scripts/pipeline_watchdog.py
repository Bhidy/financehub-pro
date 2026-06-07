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
(cooldown-guarded so it never storms), then alerts Discord. Signal hygiene: the
run stays GREEN on stale DATA (it alerts/heals); it only exits non-zero if the
WATCHDOG ITSELF broke (DB unreachable) — so a RED watchdog unambiguously means
"the watchdog is down", which the paired data-freshness-monitor cross-checks.

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
    if age_h > max_silence_h:
        return f"overdue {age_h:.1f}h (max {max_silence_h}h, last status={status})"
    return None


def _post_discord(title, lines, color):
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
            else:
                print(f"watchdog heartbeat OK ({(now-hb).total_seconds()/60:.0f}m ago)")
            return

        problems, heals = [], []

        # 1) DATA FRESHNESS
        for label, table, col, kind, thr, corrective, filt in DATASETS:
            try:
                val = await _max_ts(conn, table, col, filt)
            except Exception as e:
                problems.append(f"❓ {label}: check failed — {type(e).__name__}")
                continue
            state, detail = _classify(kind, thr, val, now)
            mark = {"OK": "✅", "STALE": "🟠", "EMPTY": "🔴"}[state]
            print(f"  {mark} {label:16} {state:5} {detail}")
            if state != "OK":
                problems.append(f"{mark} **{label}** {state} — {detail}")
                if heal and corrective:
                    res = _dispatch(*corrective)
                    heals.append(f"↻ {label} → {corrective[0]}: {res}")

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

        # 3) heartbeat (so the paired monitor can confirm we're alive)
        await conn.execute("""
            INSERT INTO pipeline_heartbeat(name,last_run_at,detail) VALUES('pipeline_watchdog',$1,$2)
            ON CONFLICT (name) DO UPDATE SET last_run_at=EXCLUDED.last_run_at, detail=EXCLUDED.detail
        """, now, f"{len(problems)} problem(s)")

        # 4) report + alert
        if heals:
            print("\n".join("  " + h for h in heals))
        if problems:
            title = "🟠 DATA PIPELINE — issues detected" + (" (auto-heal triggered)" if heals else "")
            _post_discord(title, problems + ([""] + heals if heals else []), 0xE67E22)
            print(f"\nWATCHDOG: {len(problems)} problem(s) found"
                  + (f", {sum('DISPATCHED' in h for h in heals)} heal(s) dispatched" if heals else ""))
        else:
            print("\nWATCHDOG: all datasets fresh, all schedules live ✅")
    finally:
        await conn.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--heal", action="store_true", help="auto-dispatch corrective workflows for stale data / dead crons")
    ap.add_argument("--check-watchdog", type=int, default=0, metavar="MIN",
                    help="inverse mode: alert if pipeline_watchdog heartbeat older than MIN minutes")
    a = ap.parse_args()
    asyncio.run(main(a.heal, a.check_watchdog))
