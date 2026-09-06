#!/usr/bin/env python3
"""
nav_archive.py — a permanent, append-only archive of every NAV we have ever held.

WHY THIS EXISTS
---------------
The platform lost thirteen months of NAV history for 61 funds and could not get
it back, because the history only ever existed in two places: a vendor's live
file and our database. When Mubasher's per-fund CSV froze in 2025-05, the
vendor's copy stopped being a copy of anything, and there was nothing else to
restore from. Recovery had to be reconstructed by inverting return columns out
of a trade association's PDFs — a year later, imperfectly, and for only some
funds.

The weekly pg_dump added afterwards is a disaster-recovery backup, not an
archive: `retention-days: 30`. Thirty-one days after a silent deletion the last
copy is gone, and nobody was looking at row counts in between.

So this keeps a snapshot that never expires, off the database provider, with the
one check that matters:

    EVERY (fund_id, date) OBSERVED IN ANY PREVIOUS SNAPSHOT MUST STILL EXIST.

A NAV, once published, is a historical fact. It may be corrected; it may never
vanish. If a snapshot is not a superset of its predecessor, this exits non-zero
and names exactly which observations disappeared — the alarm that was missing
for fourteen months.

WHAT IT IS NOT
--------------
Not a backup of the database (db-backup.yml does that). Not a replacement for
ingestion. It holds one table, the one that is irreplaceable: an OHLC bar can be
re-fetched from an exchange forever, a fund's NAV on a Tuesday in 2025 cannot.

USAGE
  python nav_archive.py --out nav-archive.csv.gz            # export + manifest
  python nav_archive.py --out X.csv.gz --compare prev.json  # + regression check
  python nav_archive.py --verify-only --compare prev.json   # check, export nothing
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import gzip
import hashlib
import io
import json
import os
import sys
from collections import defaultdict
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.pg_resilient import connect_resilient  # noqa: E402

# Only the ingested universe is archived. Shadow rows keyed by an ISIN-like code
# are duplicates the site never publishes and the NAV updater never writes to;
# archiving them would make the superset check fire on housekeeping that is not
# data loss.
UNIVERSE = "fund_id ~ '^[0-9]+$'"


def load_db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url.strip()
    for cand in ("~/Documents/startamarkets/.env", ".env", "../.env", "../../.env"):
        p = os.path.expanduser(cand)
        if os.path.exists(p):
            for line in open(p):
                if line.startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("DATABASE_URL not set")


async def fetch_rows(conn) -> list[tuple]:
    return await conn.fetch(
        f"""SELECT fund_id, date, nav, COALESCE(source, 'unrecorded') AS source
              FROM nav_history
             WHERE {UNIVERSE}
             ORDER BY fund_id, date""")


def _median_interval(dates: list[str]) -> float:
    """The fund's OWN publication rhythm, in days.

    Median, not mean, so one long hole cannot drag the estimate — and per fund,
    because 54 of 195 funds publish weekly and a fixed day-count would call every
    one of them stale. Same rule as lib/nav-gaps.ts and fund_data_quality.
    """
    if len(dates) < 3:
        return 1.0
    ds = sorted(date.fromisoformat(d) for d in dates)
    gaps = sorted((ds[i] - ds[i - 1]).days for i in range(1, len(ds)))
    mid = len(gaps) // 2
    return float(gaps[mid] if len(gaps) % 2 else (gaps[mid - 1] + gaps[mid]) / 2)


def _is_frozen(last: str, median_days: float, as_of: date) -> bool:
    """Has this fund stopped publishing, by its own standard?

    Four missed intervals, floor 21 days. Deliberately generous: this must never
    cry wolf on a weekly fund whose Thursday slipped, because an alarm that fires
    on healthy funds is an alarm nobody reads — which is how a THIRTEEN-MONTH
    freeze across 61 funds went unnoticed while two aggregate checks stayed green.
    """
    tolerance = max(21.0, median_days * 4)
    return (as_of - date.fromisoformat(last)).days > tolerance


def build_manifest(rows) -> dict:
    """Per-fund shape plus a digest of every (fund, date) observed.

    The digest is over DATES, not values: a corrected NAV is legitimate and must
    not look like loss, while a vanished date always is loss.
    """
    as_of = date.today()
    per: dict[str, dict] = {}
    counts: dict[str, int] = defaultdict(int)
    firsts: dict[str, str] = {}
    lasts: dict[str, str] = {}
    dates: dict[str, list[str]] = defaultdict(list)
    h = hashlib.sha256()
    for r in rows:
        fid = str(r["fund_id"])
        d = r["date"].isoformat() if isinstance(r["date"], date) else str(r["date"])
        counts[fid] += 1
        dates[fid].append(d)
        if fid not in firsts or d < firsts[fid]:
            firsts[fid] = d
        if fid not in lasts or d > lasts[fid]:
            lasts[fid] = d
        h.update(f"{fid}|{d}\n".encode())
    for fid in counts:
        med = _median_interval(dates[fid])
        per[fid] = {"points": counts[fid], "first": firsts[fid], "last": lasts[fid],
                    "median_days": med, "frozen": _is_frozen(lasts[fid], med, as_of)}
    return {
        "taken_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "funds": len(per),
        "rows": sum(counts.values()),
        "date_digest": h.hexdigest(),
        "per_fund": dict(sorted(per.items())),
    }


def compare(prev: dict, now: dict) -> list[str]:
    """Regressions only. Growth is expected and silent.

    Checked per fund, because the totals hide exactly the failure this exists to
    catch: 61 funds can lose thirteen months each while the row count still rises
    on the back of the funds that are healthy.
    """
    problems: list[str] = []
    pf_prev, pf_now = prev.get("per_fund", {}), now.get("per_fund", {})

    for fid, p in sorted(pf_prev.items()):
        n = pf_now.get(fid)
        if n is None:
            problems.append(f"fund {fid}: DISAPPEARED — had {p['points']} points "
                            f"({p['first']}..{p['last']}), now absent")
            continue
        if n["points"] < p["points"]:
            problems.append(f"fund {fid}: LOST {p['points'] - n['points']} point(s) "
                            f"({p['points']} -> {n['points']})")
        if n["first"] > p["first"]:
            problems.append(f"fund {fid}: history TRUNCATED at the start "
                            f"({p['first']} -> {n['first']})")
        if n["last"] < p["last"]:
            problems.append(f"fund {fid}: latest observation WENT BACKWARDS "
                            f"({p['last']} -> {n['last']})")
    return problems


def newly_frozen(prev: dict, now: dict) -> list[str]:
    """Funds that were publishing at the last snapshot and have stopped.

    THIS IS THE ALARM THAT DID NOT EXIST. When Mubasher's per-fund CSV froze in
    2025-05, 61 funds stopped receiving NAV on the same day and nothing said so
    for fourteen months: MAX(date) across all funds is satisfied by any single
    healthy fund, and the fresh-within-10-days count is satisfied by the list-API
    trickle. Both stayed green throughout. Every signal the platform had was a
    total or a delta over totals, and this failure is invisible in totals.

    A fund is named here only on the TRANSITION — publishing last week, silent
    now — so the standing backlog cannot drown the one new fund that matters.
    """
    pf_prev, pf_now = prev.get("per_fund", {}), now.get("per_fund", {})
    out = []
    for fid, n in sorted(pf_now.items()):
        p = pf_prev.get(fid)
        if p is None:
            continue                       # new fund: nothing to transition from
        if n.get("frozen") and not p.get("frozen"):
            out.append(f"fund {fid}: STOPPED PUBLISHING — last {n['last']}, "
                       f"normally every {n.get('median_days', '?')}d")
    return out


async def main_async(args) -> int:
    conn = await connect_resilient(load_db_url())
    try:
        rows = await fetch_rows(conn)
    finally:
        await conn.close()

    manifest = build_manifest(rows)
    print(f"[nav-archive] {manifest['rows']} observations across "
          f"{manifest['funds']} funds", flush=True)

    if args.out:
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["fund_id", "date", "nav", "source"])
        for r in rows:
            w.writerow([r["fund_id"], r["date"], r["nav"], r["source"]])
        with gzip.open(args.out, "wb") as fh:
            fh.write(buf.getvalue().encode())
        size = os.path.getsize(args.out)
        print(f"[nav-archive] wrote {args.out} ({size/1_048_576:.1f} MiB)", flush=True)

    if args.manifest:
        with open(args.manifest, "w") as fh:
            json.dump(manifest, fh, indent=1, sort_keys=True)
        print(f"[nav-archive] wrote {args.manifest}", flush=True)

    if not args.compare:
        print("[nav-archive] no previous manifest supplied — nothing to compare. "
              "This is expected only on the very first run.", flush=True)
        return 0

    if not os.path.exists(args.compare):
        print(f"[nav-archive] previous manifest {args.compare} not found — "
              "treating as first run.", flush=True)
        return 0

    with open(args.compare) as fh:
        prev = json.load(fh)
    problems = compare(prev, manifest)
    froze = newly_frozen(prev, manifest)
    grew = manifest["rows"] - prev.get("rows", 0)
    print(f"[nav-archive] vs {prev.get('taken_at', 'previous')}: "
          f"{grew:+d} observations, {manifest['funds'] - prev.get('funds', 0):+d} funds",
          flush=True)
    if problems:
        print(f"[nav-archive] HISTORY LOST — {len(problems)} regression(s):", flush=True)
        for p in problems[:60]:
            print("   -", p, flush=True)
        if len(problems) > 60:
            print(f"   … and {len(problems) - 60} more", flush=True)
        return 2
    if froze:
        print(f"[nav-archive] {len(froze)} fund(s) STOPPED PUBLISHING since the "
              f"last snapshot:", flush=True)
        for f_ in froze:
            print("   -", f_, flush=True)
        return 3
    still = sum(1 for v in manifest["per_fund"].values() if v.get("frozen"))
    print(f"[nav-archive] OK — every observation in the previous snapshot is still "
          f"present, and no fund stopped publishing ({still} already-stale carried "
          f"over).", flush=True)
    return 0


def compare_files(prev_path: str, now_path: str) -> int:
    """Compare two manifests with no database access.

    Split out so the workflow can ALWAYS publish the snapshot first and judge it
    second. A run that discovers missing history must still keep the evidence of
    what it found — failing before the upload would throw away the only record of
    the state that tripped the alarm.
    """
    if not os.path.exists(prev_path):
        print(f"[nav-archive] no previous manifest at {prev_path} — first run.", flush=True)
        return 0
    with open(prev_path) as fh:
        prev = json.load(fh)
    with open(now_path) as fh:
        now = json.load(fh)

    problems = compare(prev, now)
    froze = newly_frozen(prev, now)
    print(f"[nav-archive] vs {prev.get('taken_at', 'previous')}: "
          f"{now['rows'] - prev.get('rows', 0):+d} observations, "
          f"{now['funds'] - prev.get('funds', 0):+d} funds", flush=True)
    if problems:
        print(f"[nav-archive] HISTORY LOST — {len(problems)} regression(s):", flush=True)
        for x in problems[:60]:
            print("   -", x, flush=True)
        if len(problems) > 60:
            print(f"   … and {len(problems) - 60} more", flush=True)
        return 2
    if froze:
        print(f"[nav-archive] {len(froze)} fund(s) STOPPED PUBLISHING since the last "
              f"snapshot:", flush=True)
        for x in froze:
            print("   -", x, flush=True)
        return 3
    still = sum(1 for v in now["per_fund"].values() if v.get("frozen"))
    print(f"[nav-archive] OK — no observation lost, no fund newly silent "
          f"({still} already-stale carried over).", flush=True)
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description="Permanent append-only NAV archive")
    ap.add_argument("--compare-files", nargs=2, metavar=("PREV", "NOW"),
                    help="compare two manifests offline; no database access")
    ap.add_argument("--out", help="write the gzipped CSV snapshot here")
    ap.add_argument("--manifest", help="write the integrity manifest here")
    ap.add_argument("--compare", help="previous manifest to check against")
    ap.add_argument("--verify-only", action="store_true",
                    help="compare without writing a snapshot")
    args = ap.parse_args()
    if args.compare_files:
        sys.exit(compare_files(*args.compare_files))
    if args.verify_only:
        args.out = None
    sys.exit(asyncio.run(main_async(args)))


if __name__ == "__main__":
    main()
