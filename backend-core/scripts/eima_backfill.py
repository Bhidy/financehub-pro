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
from data_pipeline.fund_name_match import match_funds  # noqa: E402
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

def _errors_by_column(points: list[dict], existing: dict) -> dict:
    """Per-anchor-column signed errors against NAV we already hold."""
    out: dict[str, list[float]] = defaultdict(list)
    for p in points:
        got = None
        for off in range(0, MATCH_WINDOW_DAYS + 1):
            for d in ({p["date"] - timedelta(days=off), p["date"] + timedelta(days=off)}
                      if off else {p["date"]}):
                if d in existing:
                    got = existing[d]
                    break
            if got is not None:
                break
        if got:
            out[p.get("column", "?")].append((p["nav"] - got) / got * 100.0)
    return out


def _median(xs: list[float]) -> float:
    xs = sorted(xs)
    return xs[len(xs) // 2] if xs else 0.0


def reconcile(points: list[dict], existing: dict) -> dict:
    """
    Test a candidate mapping against NAV we already hold, PER ANCHOR COLUMN.

    Why per column, learned from the first live run: a fund whose overall median
    error was 0.00% was rejected because one point sat 4.35% out, and another at
    0.09% median was rejected on a 37% outlier. Those are correct mappings — the
    outliers were single bad anchors, not evidence of the wrong fund.

    And the reason they are single bad anchors is structural. A redenomination
    (Egyptian funds do 2:1 and 100:1) breaks every anchor OLDER than the event
    and leaves newer ones intact. So the 3-year column can be worthless while the
    1-year column is exact. Judging the fund as a whole throws away good data to
    punish bad; judging each column keeps what is right.

    Returns the mapping verdict plus the set of columns whose data is usable.
    """
    by_col = _errors_by_column(points, existing)
    total = sum(len(v) for v in by_col.values())
    all_errs = [abs(x) for v in by_col.values() for x in v]
    med_all = _median(all_errs) if all_errs else None
    if total < MIN_OVERLAP_POINTS:
        return {"ok": False, "reason": f"only {total} overlapping points "
                                       f"(need {MIN_OVERLAP_POINTS})",
                "good_columns": set(), "by_col": by_col,
                "overlap": total, "median_abs": med_all}

    # The mapping is judged on the BEST-evidenced columns: if any column agrees
    # tightly across several points, this is the right fund.
    proven = [c for c, e in by_col.items()
              if len(e) >= 2 and abs(_median(e)) <= MAX_MEDIAN_ERR_PCT]
    if not proven:
        overall = _median([abs(x) for v in by_col.values() for x in v])
        for level, label in ((-50.0, "2:1"), (-99.0, "100:1")):
            near = [x for v in by_col.values() for x in v if abs(x - level) < 3.0]
            if len(near) >= max(2, total // 2):
                return {"ok": False,
                        "reason": f"looks like a {label} redenomination "
                                  f"({len(near)}/{total} points near {level}%)",
                        "good_columns": set(), "by_col": by_col,
                        "overlap": total, "median_abs": med_all}
        return {"ok": False, "reason": f"no column agrees; median |err| {overall:.2f}%",
                "good_columns": set(), "by_col": by_col,
                "overlap": total, "median_abs": med_all}

    # Mapping accepted. Now keep only the columns that are individually sound —
    # a column with a wide spread is a broken anchor, not usable history.
    good = set()
    for c, e in by_col.items():
        if len(e) >= 2 and abs(_median(e)) <= MAX_MEDIAN_ERR_PCT and max(abs(x) for x in e) <= MAX_SINGLE_ERR_PCT:
            good.add(c)
    dropped = sorted(set(by_col) - good)
    good_errs = [abs(x) for c in good for x in by_col[c]]
    return {"ok": True,
            "reason": f"{total} points; columns kept={sorted(good)}"
                      + (f", dropped={dropped}" if dropped else ""),
            "good_columns": good, "by_col": by_col,
            "overlap": len(good_errs), "median_abs": _median(good_errs)}


def assign_one_to_one(names: list[str], catalogue: list[tuple[str, str]]) -> dict[str, tuple[str, float]]:
    """
    Match EIMA names to fund ids ONE-TO-ONE.

    Scoring each name independently let three different EIMA funds all claim
    fund 2703 in the first live run — at most one of them could be right, and the
    wrong ones then had to be caught downstream by value checks. A fund id is a
    unique thing; the assignment should say so. Greedy by descending score, which
    is enough here and stays explainable.
    """
    pairs = []
    for n in names:
        for fid, en in catalogue:
            sc = difflib.SequenceMatcher(None, _norm(n), _norm(en)).ratio()
            if sc >= NAME_MATCH_FLOOR:
                pairs.append((sc, n, fid))
    pairs.sort(reverse=True)
    taken_name: set[str] = set()
    taken_fid: set[str] = set()
    out: dict[str, tuple[str, float]] = {}
    for sc, n, fid in pairs:
        if n in taken_name or fid in taken_fid:
            continue
        out[n] = (fid, sc)
        taken_name.add(n)
        taken_fid.add(fid)
    return out


# ------------------------------------------------------------------ main ----



async def verify_written(conn, prune: bool = False) -> int:
    """
    Audit every EIMA-sourced row already in nav_history, at the source of truth.

    Checks, in order of severity:
      1. duplicates (the PK forbids them — verify anyway, trust nothing);
      2. non-positive or absurd values relative to the fund's own real range;
      3. REDUNDANT rows: an EIMA row within MATCH_WINDOW_DAYS of a real
         observation adds no information and only noise — counted, and deleted
         when prune=True (deletes ONLY eima-sourced rows, nothing else);
      4. JOIN plausibility: at every boundary between a real row and an EIMA
         row, the implied per-interval return is compared against the fund's own
         behaviour. Flags are a review list, not an auto-delete.
    """
    rows = await conn.fetch(
        """SELECT fund_id, date, nav, source FROM nav_history
           WHERE source IN ($1, $2) ORDER BY fund_id, date""",
        SOURCE_PUBLISHED, SOURCE_DERIVED)
    print(f"[eima-verify] eima-sourced rows on file: {len(rows)}", flush=True)
    if not rows:
        return 0

    by_fund: dict[str, list] = defaultdict(list)
    for r in rows:
        by_fund[r["fund_id"]].append(r)
    print(f"[eima-verify] funds holding eima rows: {len(by_fund)}", flush=True)

    dup = await conn.fetch(
        """SELECT fund_id, date, COUNT(*) c FROM nav_history
           GROUP BY fund_id, date HAVING COUNT(*) > 1 LIMIT 5""")
    print(f"[eima-verify] duplicate (fund_id,date) rows: {len(dup)}"
          + (" ❌" if dup else " ✅"), flush=True)

    bad_vals, redundant, join_flags = [], [], []
    for fid, ers in by_fund.items():
        full = await conn.fetch(
            "SELECT date, nav, source FROM nav_history WHERE fund_id=$1 ORDER BY date", fid)
        real = [(r["date"], float(r["nav"])) for r in full
                if r["source"] not in (SOURCE_PUBLISHED, SOURCE_DERIVED)]
        if real:
            lo = min(v for _, v in real) * 0.5
            hi = max(v for _, v in real) * 2.0
            for r in ers:
                v = float(r["nav"])
                if v <= 0 or v < lo or v > hi:
                    bad_vals.append((fid, str(r["date"]), v))
        real_dates = [d for d, _ in real]
        import bisect as _b
        for r in ers:
            i = _b.bisect_left(real_dates, r["date"])
            for j in (i - 1, i):
                if 0 <= j < len(real_dates) and abs((real_dates[j] - r["date"]).days) <= MATCH_WINDOW_DAYS:
                    redundant.append((fid, str(r["date"])))
                    break
        # join plausibility across real<->eima boundaries
        seq = [(r["date"], float(r["nav"]), r["source"] in (SOURCE_PUBLISHED, SOURCE_DERIVED))
               for r in full]
        daily = [abs((b[1] / a[1]) - 1) / max(1, (b[0] - a[0]).days)
                 for a, b in zip(seq, seq[1:]) if not a[2] and not b[2] and a[1] > 0]
        daily.sort()
        med_daily = daily[len(daily) // 2] if daily else 0.0005
        for a, b in zip(seq, seq[1:]):
            if a[2] == b[2] or a[1] <= 0:
                continue
            d = max(1, (b[0] - a[0]).days)
            step = abs(b[1] / a[1] - 1)
            allow = max(med_daily * d * 6, 0.02 + 0.0015 * d)
            if step > allow:
                join_flags.append((fid, str(a[0]), str(b[0]), round(step * 100, 2)))

    print(f"[eima-verify] value-range violations: {len(bad_vals)}"
          + (" ❌ " + str(bad_vals[:5]) if bad_vals else " ✅"), flush=True)
    print(f"[eima-verify] redundant rows (within {MATCH_WINDOW_DAYS}d of real data): "
          f"{len(redundant)}", flush=True)
    print(f"[eima-verify] join-plausibility flags (review list): {len(join_flags)}", flush=True)
    for f in join_flags[:12]:
        print(f"[eima-verify]   REVIEW fund {f[0]}: {f[1]} -> {f[2]} step {f[3]}%", flush=True)

    if prune and redundant:
        res = await conn.fetch(
            """DELETE FROM nav_history e
               WHERE e.source IN ($1, $2)
                 AND EXISTS (SELECT 1 FROM nav_history r
                             WHERE r.fund_id = e.fund_id
                               AND COALESCE(r.source, '') NOT IN ($1, $2)
                               AND r.date BETWEEN e.date - $3::int AND e.date + $3::int)
               RETURNING e.fund_id""",
            SOURCE_PUBLISHED, SOURCE_DERIVED, MATCH_WINDOW_DAYS)
        print(f"[eima-verify] PRUNED {len(res)} redundant eima rows", flush=True)
    return 1 if (dup or bad_vals) else 0


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

        catalogue = [{"fund_id": r["fund_id"], "en": r["fund_name_en"] or "",
                      "mgr_en": r["manager_name_en"] or ""}
                     for r in await conn.fetch(
                         "SELECT fund_id, fund_name_en, manager_name_en FROM mutual_funds "
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
            managers: dict[str, str | None] = {}
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
                # Key by (name, SECTION). Proven in production: two different
                # funds — an equity and a money-market fund — parsed to the same
                # name, their series MERGED, the equity points reconciled against
                # fund 6402's real data, and the money-market points rode in with
                # them. Section is part of a fund's identity in these reports.
                secmap = {r["name"]: r.get("section") for r in rep["rows"]}
                # Our nav_history is EGP. A USD/EUR series must never be offered
                # to the matcher at all — identity should not depend on the data
                # gate happening to refuse it.
                egp = {r["name"] for r in rep["rows"] if r.get("currency", "EGP") == "EGP"}
                for p in rep["published"] + rep["derived"]:
                    if p["name"] not in egp:
                        continue
                    key = f'{p["name"]}\u00a7{secmap.get(p["name"]) or ""}'
                    series[key].append(p)
                for r in rep["rows"]:
                    managers.setdefault(
                        f'{r["name"]}\u00a7{r.get("section") or ""}', r.get("manager"))
            print(f"[eima] parsed {parsed}/{len(urls)} reports, "
                  f"{len(series)} distinct fund names", flush=True)

        stats = {"mapped": 0, "validated": 0, "rejected": 0, "skipped_no_match": 0,
                 "inserted": 0, "reports": parsed}
        rejects: list[str] = []
        # What the run would actually change, so a dry-run answers "which gap,
        # for which funds, over what period" instead of just a total.
        by_year: dict[int, int] = defaultdict(int)
        gap_window = 0          # points landing in the 2025-05..2026-06 hole
        per_fund: list[tuple] = []

        # ------------------------------------------------------------------
        # DATA-FIRST ASSIGNMENT (v3). Names can only SHORTLIST; data decides.
        #
        # Why, proven on production: the name matcher — both versions of it —
        # got real funds WRONG in ways no scorer can fix:
        #   * "Hermes" (a 2026 money-market fund) scored a perfect 1.00 against
        #     our "EFG Hermes Gold Fund" by containment;
        #   * the two GIG Insurance siblings (equity vs money market) were
        #     swapped outright;
        #   * EIMA and Mubasher NUMBER THE SAME FUND DIFFERENTLY — EIMA's
        #     "NBE Fund IV" is our "NBE Mutual Fund 2", confirmed by NAVs
        #     agreeing to <1% — so series-number logic cannot be authoritative
        #     in either direction.
        # The one instrument that was right every time is reconciliation
        # against NAV we already hold. So each name is scored against EVERY
        # shortlisted fund by RECONCILE QUALITY, and assignment is one-to-one
        # by (overlap points, lowest median error). A fund whose data agrees
        # to 0.2% across ten dates IS that fund, whatever the names say.
        # ------------------------------------------------------------------
        from data_pipeline.fund_name_match import idf as _idf, score as _nm_score, tokens as _nm_tokens
        cat_toks = {c["fund_id"]: _nm_tokens(c["en"]) for c in catalogue}
        weights = _idf(list(cat_toks.values())
                       + [_nm_tokens(n.split("\u00a7")[0]) for n in series])

        # De-duplicate each name's points once (published beats derived per date).
        clean_pts: dict[str, list[dict]] = {}
        for name, pts in series.items():
            byd: dict[date, dict] = {}
            for p in pts:
                cur = byd.get(p["date"])
                if cur is None or (cur["derived"] and not p["derived"]):
                    byd[p["date"]] = p
            clean_pts[name] = sorted(byd.values(), key=lambda p: p["date"])

        # Two views of a fund's history, and the distinction is load-bearing:
        #   real_cache   — rows we did NOT write. The ONLY evidence reconcile may
        #                  use. Without the source filter this gate validated
        #                  candidates against rows this very pipeline wrote a run
        #                  earlier — 0.00% error by construction, a wrong mapping
        #                  permanently self-ratifying.
        #   all_cache    — every row, for the insert-skip and proximity guards
        #                  (we must not re-insert or crowd our own rows either).
        real_cache: dict[str, dict] = {}
        all_cache: dict[str, dict] = {}

        async def load_existing(fid: str) -> dict:
            if fid not in real_cache:
                rows = await conn.fetch(
                    "SELECT date, nav, source FROM nav_history WHERE fund_id = $1", fid)
                all_cache[fid] = {r["date"]: float(r["nav"]) for r in rows}
                real_cache[fid] = {r["date"]: float(r["nav"]) for r in rows
                                   if r["source"] not in (SOURCE_PUBLISHED, SOURCE_DERIVED)}
            return real_cache[fid]

        SHORTLIST_FLOOR = 0.30      # generous: recall here, precision from data
        AMBIGUITY_RATIO = 2.0       # best median must beat runner-up 2x, else skip

        candidates = []            # (name, fid, name_score, verdict)
        ambiguous: list[str] = []
        for name in sorted(series):
            et = _nm_tokens(name.split("\u00a7")[0])
            short = [c["fund_id"] for c in catalogue
                     if _nm_score(et, cat_toks[c["fund_id"]], weights) >= SHORTLIST_FLOOR]
            if only_ids:
                short = [f for f in short if f in only_ids]
            passed = []
            for fid in short:
                v = reconcile(clean_pts[name], await load_existing(fid))
                if v["ok"]:
                    passed.append((fid, v))
            if not passed:
                stats["skipped_no_match"] += 1
                continue
            passed.sort(key=lambda t: (
                -(t[1]["overlap"] or 0),
                t[1]["median_abs"] if t[1]["median_abs"] is not None else 9e9))
            best = passed[0]
            # Ambiguity guard: two funds tracking the same asset (gold funds all
            # follow gold) can BOTH reconcile. If the runner-up is nearly as
            # good, no write is safer than a coin flip.
            if len(passed) > 1:
                b, r = best[1], passed[1][1]
                r_med = r["median_abs"] if r["median_abs"] is not None else 9e9
                b_med = b["median_abs"] if b["median_abs"] is not None else 0.0
                if r_med < max(b_med * AMBIGUITY_RATIO, 0.10):
                    ambiguous.append(f"'{name[:36]}' ~ {best[0]} vs {passed[1][0]} "
                                     f"(medians {b['median_abs']:.2f}% / {r['median_abs']:.2f}%)")
                    continue
            ns = _nm_score(et, cat_toks[best[0]], weights)
            candidates.append((name, best[0], ns, best[1]))

        # One-to-one, best data quality first.
        candidates.sort(key=lambda t: (
            -(t[3]["overlap"] or 0),
            t[3]["median_abs"] if t[3]["median_abs"] is not None else 9e9))
        used_fid: set = set()
        assigned = []
        for name, fid, ns, v in candidates:
            if fid in used_fid:
                rejects.append(f"{fid} <- '{name[:38]}': fund already taken by a "
                               f"better-reconciling name")
                stats["rejected"] += 1
                continue
            used_fid.add(fid)
            assigned.append((name, fid, ns, v))
        stats["mapped"] = len(candidates) + stats["rejected"]
        stats["ambiguous"] = len(ambiguous)
        print(f"[eima] data-first assignment: {len(assigned)} funds "
              f"({len(ambiguous)} ambiguous skipped)", flush=True)
        for a in ambiguous[:15]:
            print(f"[eima]   AMBIGUOUS {a}", flush=True)

        for name, fid, score, verdict in assigned:
            pts = clean_pts[name]
            existing = all_cache[fid]
            stats["validated"] += 1

            good = verdict["good_columns"]
            new = [p for p in pts
                   if p["date"] not in existing and p.get("column") in good]

            # PROXIMITY GUARD. A derived point within a few days of data we
            # already hold adds no information — the fund has an observation
            # there — but it does add noise: derived values sit ~0.5% off the
            # real curve, and interleaving them with genuine rows manufactures
            # sawtooth volatility the metrics pipeline would then dutifully
            # report. Only genuine voids get filled.
            if new:
                have = sorted(existing)
                import bisect as _bisect
                def _near(d):
                    i = _bisect.bisect_left(have, d)
                    for j in (i - 1, i):
                        if 0 <= j < len(have) and abs((have[j] - d).days) <= MATCH_WINDOW_DAYS:
                            return True
                    return False
                before_n = len(new)
                new = [p for p in new if not _near(p["date"])]
                stats["skipped_redundant"] = stats.get("skipped_redundant", 0) + (before_n - len(new))

            if not new:
                continue
            for q in new:
                by_year[q["date"].year] += 1
                if date(2025, 5, 14) <= q["date"] <= date(2026, 6, 30):
                    gap_window += 1
            per_fund.append((fid, name[:34], len(new),
                             min(q["date"] for q in new), max(q["date"] for q in new),
                             sorted(good)))
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
        print("[eima] NEW POINTS BY YEAR: " + json.dumps(dict(sorted(by_year.items()))), flush=True)
        print(f"[eima] landing inside the 2025-05..2026-06 hole: {gap_window}", flush=True)
        print(f"[eima] funds gaining history: {len(per_fund)}", flush=True)
        for fid, nm, n, lo, hi, good in sorted(per_fund, key=lambda x: -x[2])[:40]:
            print(f"[eima]   {fid:>9} {nm:36s} +{n:>4}  {lo}..{hi}  cols={','.join(good)}",
                  flush=True)
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
    ap.add_argument("--verify-only", action="store_true",
                    help="audit the eima rows already in nav_history; no fetch, no writes")
    ap.add_argument("--purge-eima-ids", type=str, default=None,
                    help="[with --verify-only] delete ALL eima-sourced rows for these "
                         "fund_ids (comma-separated). Only ever touches eima rows.")
    ap.add_argument("--prune-redundant", action="store_true",
                    help="[with --verify-only] delete eima rows sitting within a few days "
                         "of a real observation (noise, no information)")
    args = ap.parse_args()
    ids = [s.strip() for s in args.ids.split(",")] if args.ids else None
    if args.verify_only:
        async def _v():
            conn = await connect_resilient(load_db_url())
            try:
                ro = await database_is_read_only(conn)
                if args.purge_eima_ids and not ro:
                    ids_ = [x.strip() for x in args.purge_eima_ids.split(",") if x.strip()]
                    res = await conn.fetch(
                        """DELETE FROM nav_history WHERE fund_id = ANY($1::text[])
                           AND source IN ($2, $3) RETURNING fund_id""",
                        ids_, SOURCE_PUBLISHED, SOURCE_DERIVED)
                    print(f"[eima-verify] PURGED {len(res)} eima rows for funds {ids_}",
                          flush=True)
                if args.prune_redundant and ro:
                    print("[eima-verify] database READ-ONLY — verify runs, prune skipped.")
                    return await verify_written(conn, prune=False)
                return await verify_written(conn, prune=args.prune_redundant and not ro)
            finally:
                await conn.close()
        sys.exit(asyncio.run(_v()))
    sys.exit(asyncio.run(run(dry_run=args.dry_run, only_ids=ids,
                             limit_reports=args.limit_reports, delay=args.delay)))


if __name__ == "__main__":
    main()
