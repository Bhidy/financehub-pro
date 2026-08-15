#!/usr/bin/env python3
"""
eima_backfill.py — recover the missing NAV history from EIMA weekly reports.

WHAT THIS FIXES
---------------
61 funds carry a ~13-month hole (2025-05-14 -> 2026-06-30) because Mubasher's
per-fund CSV froze. Everything else was ruled out first: Mubasher's entire
/api/1/funds/{id}/* subtree returns 500, only one CSV path exists, no fund was
migrated to a new id, the FRA portal publishes today's NAV only, and Wayback
never captured any of it.

EIMA's weekly PDF is the one independent series that reaches into the hole — but
EIMA went dark too: five archive captures of their Reports page across 2025 all
show February-2024 content. The 2025 PDFs were never published.

The recovery is that each 2026 report carries a matrix of time-weighted returns
beside the current NAV. Inverting them reconstructs NAV at each anchor date, so
a 2026 report yields 2025 points without a 2025 report existing.

SAFETY — the part that matters
------------------------------
Derived NAVs are NOT equivalent to published ones. Nothing is written on trust:

  1. MAPPING IS VALIDATED BY DATA, NOT BY NAME. EIMA identifies funds by English
     name; we key on Mubasher ids. A fuzzy name match is a hypothesis. It is
     accepted only if the reconstructed series agrees with NAV we already hold,
     at dates where both exist. A wrong mapping produces large errors and is
     rejected — so a bad match cannot silently corrupt a fund.
  2. A fund with too few overlapping points to check is SKIPPED, never written
     hopefully.
  3. Errors clustering near -50% or -99% are a redenomination, not a mismatch;
     those funds are reported for handling rather than written.
  4. Writes use ON CONFLICT DO NOTHING, so a real published NAV always beats a
     derived one and re-runs are idempotent.
  5. Every row is stamped with its source so derived points stay distinguishable
     forever, and `--dry-run` writes nothing at all.

USAGE
  python eima_backfill.py --dry-run            # parse, reconcile, report
  python eima_backfill.py                       # write what validates
  python eima_backfill.py --ids 5784,5882       # restrict to some funds
"""
from __future__ import annotations

import argparse
import asyncio
import difflib
import io
import json
import os
import re
import sys
from collections import defaultdict
from datetime import date, timedelta

import asyncpg

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.eima_report import parse_report  # noqa: E402
from data_pipeline.pg_resilient import (  # noqa: E402
    connect_resilient, database_is_read_only, is_read_only_error)

REPORTS_PAGE = "http://eima.org.eg/?page_id=1886"

# Identify ourselves honestly. EIMA is a small industry association running a
# modest WordPress site, not a data vendor with an SLA — during development this
# host started refusing connections after a burst of probing. A backfill that
# degrades someone else's server to fill our gaps is not acceptable, so this job
# announces who it is, crawls slowly, and backs off on failure.
UA = ("StartaMarkets-NAV-Backfill/1.0 (+https://startamarkets.com; "
      "contact via site) python-httpx")

# Seconds between requests. ~31 reports at 2s is about a minute for a job that
# runs weekly — there is no reason to go faster.
DEFAULT_DELAY_SECONDS = 2.0
MAX_RETRIES = 3

SOURCE_PUBLISHED = "eima_report"
SOURCE_DERIVED = "eima_derived"

# Reconciliation thresholds.
MATCH_WINDOW_DAYS = 4      # a stored NAV this close counts as the same observation
MIN_OVERLAP_POINTS = 3     # fewer than this and the mapping is unproven
MAX_MEDIAN_ERR_PCT = 1.0   # typical agreement must be this tight
MAX_SINGLE_ERR_PCT = 3.0   # and no single check may blow out
NAME_MATCH_FLOOR = 0.55    # below this the name hypothesis is not worth testing

_MIGRATE = """
ALTER TABLE nav_history ADD COLUMN IF NOT EXISTS source TEXT;
"""


def load_db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url.strip()
    for cand in ("~/Documents/startamarkets/.env", ".env", "../.env", "../../.env"):
        p = os.path.expanduser(cand)
        if os.path.exists(p):
            for line in open(p):
                m = re.match(r'\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
                if m:
                    return m.group(1).strip()
    raise SystemExit("FATAL: DATABASE_URL not set (env or .env)")


# ------------------------------------------------------------- fetching -----

def polite_get(session, url: str, delay: float, timeout: float = 90.0):
    """One request, slowly, with exponential backoff. Never hammer."""
    import time
    last = None
    for attempt in range(MAX_RETRIES):
        if attempt:
            time.sleep(delay * (2 ** attempt))
        try:
            r = session.get(url, timeout=timeout)
            r.raise_for_status()
            time.sleep(delay)
            return r
        except Exception as e:  # noqa: BLE001 — retried, then surfaced
            last = e
    raise last


def discover_reports(session, delay: float = DEFAULT_DELAY_SECONDS) -> list[str]:
    """Every weekly PDF currently linked on EIMA's Reports page."""
    r = polite_get(session, REPORTS_PAGE, delay, timeout=40)
    urls = sorted(set(re.findall(
        r'href="(https?://eima\.org\.eg/wp-content/uploads/[^"]+?\.pdf)"', r.text, re.I)))
    return urls


def pdf_to_text(blob: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(blob))
    return "\n".join((p.extract_text() or "") for p in reader.pages)


# -------------------------------------------------------------- mapping ----

def _norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"\b(fund|funds|investment|open|end|the|of|for|egypt|egyptian)\b", " ", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def best_match(eima_name: str, catalogue: list[tuple[str, str]]) -> tuple[str, float]:
    """Closest (fund_id, score) for an EIMA fund name against our English names."""
    target = _norm(eima_name)
    best, score = None, 0.0
    for fid, en in catalogue:
        s = difflib.SequenceMatcher(None, target, _norm(en)).ratio()
        if s > score:
            best, score = fid, s
    return best, score


# ------------------------------------------------------- reconciliation ----

def reconcile(points: list[dict], existing: dict) -> dict:
    """
    Test a candidate mapping against NAV we already hold.

    `existing` maps date -> nav. Returns the verdict plus the errors, so a
    rejection can always be explained rather than just counted.
    """
    errs = []
    for p in points:
        for off in range(0, MATCH_WINDOW_DAYS + 1):
            for d in ({p["date"] - timedelta(days=off), p["date"] + timedelta(days=off)}
                      if off else {p["date"]}):
                got = existing.get(d)
                if got:
                    errs.append((p["date"], (p["nav"] - got) / got * 100.0))
                    break
            else:
                continue
            break
    if len(errs) < MIN_OVERLAP_POINTS:
        return {"ok": False, "reason": f"only {len(errs)} overlapping points "
                                       f"(need {MIN_OVERLAP_POINTS})", "errors": errs}
    vals = sorted(abs(e) for _, e in errs)
    median = vals[len(vals) // 2]
    worst = vals[-1]
    signed = sorted(e for _, e in errs)
    # A redenomination shows as a tight cluster near -50% or -99%, which is a
    # corporate action rather than a wrong fund. Say so instead of "mismatch".
    for level, label in ((-50.0, "2:1"), (-99.0, "100:1")):
        near = [e for e in signed if abs(e - level) < 3.0]
        if len(near) >= max(2, len(signed) // 2):
            return {"ok": False, "reason": f"looks like a {label} redenomination "
                                           f"({len(near)}/{len(signed)} points near {level}%)",
                    "errors": errs}
    if median > MAX_MEDIAN_ERR_PCT or worst > MAX_SINGLE_ERR_PCT:
        return {"ok": False, "reason": f"median err {median:.2f}% / worst {worst:.2f}% "
                                       f"exceeds {MAX_MEDIAN_ERR_PCT}/{MAX_SINGLE_ERR_PCT}",
                "errors": errs}
    return {"ok": True, "reason": f"{len(errs)} points, median {median:.2f}%, "
                                  f"worst {worst:.2f}%", "errors": errs}


# ------------------------------------------------------------------ main ----

async def run(dry_run: bool = False, only_ids: list[str] | None = None,
              limit_reports: int | None = None,
              delay: float = DEFAULT_DELAY_SECONDS) -> int:
    try:
        import httpx
    except ModuleNotFoundError:
        raise SystemExit("FATAL: httpx required (pip install httpx pypdf)")

    conn = await connect_resilient(load_db_url())
    try:
        if not dry_run and await database_is_read_only(conn):
            print("[eima] database is READ-ONLY — skipping (not an error).", flush=True)
            return 0
        if not dry_run:
            await conn.execute(_MIGRATE)

        catalogue = [(r["fund_id"], r["fund_name_en"] or "")
                     for r in await conn.fetch(
                         "SELECT fund_id, fund_name_en FROM mutual_funds "
                         "WHERE fund_name_en IS NOT NULL")]
        print(f"[eima] catalogue: {len(catalogue)} funds with English names", flush=True)

        with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True,
                          timeout=60.0) as sess:
            urls = discover_reports(sess, delay)
            if limit_reports:
                urls = urls[:limit_reports]
            print(f"[eima] reports found: {len(urls)}", flush=True)

            # name -> list of {date, nav, derived}
            series: dict[str, list[dict]] = defaultdict(list)
            parsed = 0
            for u in urls:
                try:
                    blob = polite_get(sess, u, delay).content
                    rep = parse_report(pdf_to_text(blob))
                except Exception as e:  # noqa: BLE001 — one bad PDF must not stop the run
                    print(f"[eima] WARN {u.split('/')[-1][:50]}: {type(e).__name__}", flush=True)
                    continue
                if not rep["report_date"]:
                    continue
                parsed += 1
                for p in rep["published"] + rep["derived"]:
                    series[p["name"]].append(p)
            print(f"[eima] parsed {parsed}/{len(urls)} reports, "
                  f"{len(series)} distinct fund names", flush=True)

        stats = {"mapped": 0, "validated": 0, "rejected": 0, "skipped_no_match": 0,
                 "inserted": 0, "reports": parsed}
        rejects: list[str] = []

        for name, pts in sorted(series.items()):
            fid, score = best_match(name, catalogue)
            if not fid or score < NAME_MATCH_FLOOR:
                stats["skipped_no_match"] += 1
                continue
            if only_ids and fid not in only_ids:
                continue
            stats["mapped"] += 1

            rows = await conn.fetch(
                "SELECT date, nav FROM nav_history WHERE fund_id = $1", fid)
            existing = {r["date"]: float(r["nav"]) for r in rows}

            # De-duplicate: prefer a published NAV over a derived one for a date.
            byd: dict[date, dict] = {}
            for p in pts:
                cur = byd.get(p["date"])
                if cur is None or (cur["derived"] and not p["derived"]):
                    byd[p["date"]] = p
            pts = sorted(byd.values(), key=lambda p: p["date"])

            verdict = reconcile(pts, existing)
            if not verdict["ok"]:
                stats["rejected"] += 1
                rejects.append(f"{fid} <- '{name[:38]}' (score {score:.2f}): {verdict['reason']}")
                continue
            stats["validated"] += 1

            new = [p for p in pts if p["date"] not in existing]
            if not new:
                continue
            if dry_run:
                stats["inserted"] += len(new)
                continue
            try:
                res = await conn.fetch(
                    """INSERT INTO nav_history (fund_id, date, nav, source)
                       SELECT * FROM unnest($1::text[], $2::date[], $3::numeric[], $4::text[])
                       ON CONFLICT (fund_id, date) DO NOTHING
                       RETURNING date""",
                    [fid] * len(new), [p["date"] for p in new],
                    [p["nav"] for p in new],
                    [SOURCE_DERIVED if p["derived"] else SOURCE_PUBLISHED for p in new])
                stats["inserted"] += len(res)
            except Exception as e:  # noqa: BLE001 — per-fund isolation
                if is_read_only_error(e):
                    print("[eima] database went READ-ONLY mid-run — stopping cleanly.")
                    return 0
                rejects.append(f"{fid}: write failed {type(e).__name__}")

        print("[eima] RESULT " + json.dumps(stats), flush=True)
        if rejects:
            print(f"[eima] rejected {len(rejects)} candidate mappings:", flush=True)
            for r in rejects[:25]:
                print("   -", r, flush=True)
        return 0
    finally:
        await conn.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="Backfill NAV history from EIMA weekly reports")
    ap.add_argument("--dry-run", action="store_true",
                    help="parse and reconcile, report what WOULD be written")
    ap.add_argument("--ids", type=str, default=None, help="comma-separated fund_ids")
    ap.add_argument("--limit-reports", type=int, default=None,
                    help="only process the first N reports (for a fast check)")
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY_SECONDS,
                    help="seconds between requests to EIMA (be kind; default 2.0)")
    args = ap.parse_args()
    ids = [s.strip() for s in args.ids.split(",")] if args.ids else None
    sys.exit(asyncio.run(run(dry_run=args.dry_run, only_ids=ids,
                             limit_reports=args.limit_reports, delay=args.delay)))


if __name__ == "__main__":
    main()
