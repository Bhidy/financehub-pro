#!/usr/bin/env python3
"""
manager_nav_backfill.py — recover NAV history from the fund MANAGERS themselves.

WHAT THIS FIXES
---------------
After the EIMA recovery, fourteen funds still carried the full 412-day hole
(2025-05-14 -> 2026-06-30) that Mubasher's frozen per-fund CSV opened. EIMA's
weekly report covers mainstream Egyptian-pound retail funds; every one of the
fourteen is a foreign-currency, charitable or specialised-issuance fund, so no
amount of matcher tuning could reach them. Proven, not assumed: re-running the
EIMA matcher at a third of its name floor returned the same fourteen.

The managers publish their own NAV. That is the primary record — the vendor was
only ever a courier for it — so this goes to the source.

SOURCES
-------
  azimut     app.azimut.eg/api/fund/{id} -> `graph`, a full [epoch_ms, nav]
             series behind the "Growth of Investment" chart on azimut.eg.
             Dense: fund 5729 alone has 271 observations inside the hole.

  cicapital  cicapital.com/fundprice/ publishes one table of unit prices with a
             "Last update" date, and overwrites it daily. The Internet Archive
             holds captures of it. Each capture is therefore the manager's own
             published price on a known date. Sparse — three captures inside the
             hole — but every point is a real published NAV, and three anchors
             break a 412-day void into four ~100-day segments.

WHY PUBLISHED IS NOT THE SAME AS DERIVED
----------------------------------------
eima_backfill reconstructs NAV by inverting published RETURNS; a reconstructed
value is an inference and is gated accordingly. These values are the NAV itself,
as the manager published it. The thresholds below reflect that difference, and
only that: the MAPPING is still decided by data, never by a name.

  A name can only shortlist. A fund is accepted only when the manager's series
  agrees with NAV we already hold, at dates where both exist — tight median,
  bounded tail. Measured on the three Azimut funds: 934 / 131 / 13 overlapping
  observations at median errors of 0.026% / 0.013% / 0.0002%. The same test
  REJECTED Azimut's "Menthum" against our fund 6157 at 41% median error, because
  Azimut's Menthum is the EGP fund and ours is the CI-managed USD one. That
  rejection is the gate doing its job on a trap a human nearly walked into.

  The tail is a percentile, not an absolute maximum, because these series are
  long. Fund 5729 has ONE day in 934 that differs by 4% and 933 that agree to
  0.03%; an absolute max-error rule reads that as a different fund, which is
  plainly wrong. At most 1% of overlapping points may exceed 3%.

SAFETY
------
  * ON CONFLICT DO NOTHING — a value we already hold always wins. Re-runs are
    idempotent and nothing is ever overwritten or deleted.
  * Every row is stamped with its source and source_url, so a manager-sourced
    NAV stays distinguishable from a vendor-sourced one for ever.
  * --dry-run writes nothing at all, and is the default in CI.
  * Per-fund isolation: one fund's failure cannot abort the run.
  * Read-only database is detected and exits cleanly rather than half-writing.

BE KIND
-------
Self-identifying UA, a delay between requests, and no more requests than the job
needs. Azimut's API is the one their own public site calls; the Internet Archive
is a public service that asks for patience.

USAGE
  python manager_nav_backfill.py --dry-run
  python manager_nav_backfill.py
  python manager_nav_backfill.py --only azimut --ids 5729
"""
from __future__ import annotations

import argparse
import asyncio
import html
import json
import os
import re
import sys
import time
from datetime import date, datetime, timezone
from statistics import median

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.pg_resilient import (  # noqa: E402
    connect_resilient, database_is_read_only, is_read_only_error)

UA = ("StartaMarkets-NAV-Backfill/1.0 (+https://startamarkets.com; "
      "contact via site) python-httpx")
DEFAULT_DELAY = 1.5

SOURCE_AZIMUT = "azimut_site"
SOURCE_CICAP = "cicapital_site"
SOURCE_MUBNEWS = "mubasher_news_archive"

# ── mapping thresholds (published source; see the module docstring) ──────────
MIN_OVERLAP_POINTS = 3      # fewer than this and the mapping is unproven
MAX_MEDIAN_ERR_PCT = 0.75   # typical agreement must be tight
TAIL_ERR_PCT = 3.0          # a point above this counts toward the tail
MAX_TAIL_FRACTION = 0.01    # at most 1% of overlapping points may be in it

# ── THE EXACT ANCHOR ────────────────────────────────────────────────────────
# A dense series overlapping ours for years is one kind of proof. A table that
# overlaps on ONE date is another, and refusing it would be a mistake:
#
#   2025-04-06, Mubasher's own price table vs NAV we already hold —
#     CI Sectors Issuance 1 (Building)    10.87693  ours 10.8769   0.000%
#     CI Sectors Issuance 2 (Technology)  10.06175  ours 10.0617   0.000%
#     CI Sectors Issuance 3 (Export)      10.18701  ours 10.1870   0.000%
#     CI Sectors Issuance 4 (Consumption) 11.65593  ours 11.6559   0.000%
#     CI Sectors Issuance 5 (E-payment)   10.77616  ours 10.7762   0.000%
#     Weladna Charitable                  12.68316  ours 12.6832   0.000%
#     Horus (AFIM / EgyptAir)             15.78626  ours 15.7863   0.000%
#
# Six significant figures agreeing is not a coincidence, and the five CI
# siblings carry DIFFERENT values, so a swap between them would show. This is
# stronger evidence than a hundred loose matches — the reason the ordinary floor
# is three is that a loose match needs repetition to mean anything, and an exact
# one does not.
#
# The safeguard is that it must be exact and UNCONTRADICTED: every overlapping
# observation must agree this closely, not merely one of them.
EXACT_ANCHOR_PCT = 0.05     # six-figure agreement, i.e. the same published number
MIN_EXACT_ANCHORS = 1

SQL_INSERT = """INSERT INTO nav_history (fund_id, date, nav, source, source_url, ingested_at)
   SELECT fid, d, nav, src, url, NOW()
   FROM unnest($1::text[], $2::date[], $3::numeric[], $4::text[], $5::text[]) AS t(fid, d, nav, src, url)
   ON CONFLICT (fund_id, date) DO NOTHING
   RETURNING date"""


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


# ── source: Azimut ───────────────────────────────────────────────────────────

AZIMUT_LIST = "https://app.azimut.eg/api/fund/list?size=100&web=true"
AZIMUT_FUND = "https://app.azimut.eg/api/fund/{id}"
AZIMUT_HEADERS = {"accept": "application/json", "origin": "https://azimut.eg",
                  "referer": "https://azimut.eg/", "user-agent": UA}


def _txt(v) -> str:
    """The API returns some fields as {en, ar}; take a readable string."""
    if isinstance(v, dict):
        return str(v.get("en") or v.get("ar") or next(iter(v.values()), ""))
    return "" if v is None else str(v)


def fetch_azimut(sess, delay: float) -> dict[str, dict]:
    """{label: {"pts": {iso_date: nav}, "url": ...}} for every Azimut fund."""
    out: dict[str, dict] = {}
    r = sess.get(AZIMUT_LIST, headers=AZIMUT_HEADERS, timeout=60)
    r.raise_for_status()
    rows = (((r.json() or {}).get("response") or {}).get("funds") or {}).get("dataList") or []
    print(f"[manager] azimut: {len(rows)} funds listed", flush=True)
    for row in rows:
        fid = row.get("id")
        if fid is None:
            continue
        time.sleep(delay)
        url = AZIMUT_FUND.format(id=fid)
        try:
            d = sess.get(url, headers=AZIMUT_HEADERS, timeout=60).json()
        except Exception as e:  # noqa: BLE001 — one fund must not kill the source
            print(f"[manager]   azimut #{fid}: {type(e).__name__}", flush=True)
            continue
        f = (d.get("response") or {}).get("fund") or d
        graph = f.get("graph") or []
        if not graph:
            continue
        pts: dict[str, float] = {}
        for pair in graph:
            try:
                t, v = pair[0], float(pair[1])
            except Exception:  # noqa: BLE001
                continue
            if not (1e-6 < v < 1e9):
                continue
            iso = datetime.fromtimestamp(t / 1000, timezone.utc).date().isoformat()
            pts[iso] = v
        if not pts:
            continue
        label = f"{_txt(f.get('name'))} [{_txt(f.get('currency_symbol'))}]".strip()
        out[label] = {"pts": pts, "url": url, "source": SOURCE_AZIMUT}
    return out


# ── source: CI Capital, through the public archive of its own price page ─────

CDX = ("http://web.archive.org/cdx/search/cdx?url=cicapital.com%2Ffundprice%2F"
       "&output=json&filter=statuscode:200&collapse=timestamp:8&limit=600")
SNAPSHOT = "http://web.archive.org/web/{ts}id_/https://www.cicapital.com/fundprice/"

# "Last update: Monday, August 25, 2025"
_UPDATED = re.compile(r"Last update:\s*(?:\w+,\s*)?([A-Z][a-z]+ \d{1,2}, \d{4})")
_MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], 1)}


def _parse_price_page(raw: str) -> tuple[str | None, dict[str, float]]:
    """(published_date, {fund name: price}) from one capture of the table."""
    body = re.sub(r"<script.*?</script>", "", raw, flags=re.S)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", "|", body))
    # Collapse the whitespace AROUND the separators before collapsing runs of
    # them. Without this a table cell arrives as "|name| |917.02|" — the blank
    # between the tags is a whitespace-only segment, not an empty one — and a
    # "|name|price|" pattern matches nothing. The parser read the page's date
    # correctly and returned zero funds, which is the quietest possible failure.
    text = re.sub(r"[ \t\r\n\u00a0]*\|[ \t\r\n\u00a0]*", "|", text)
    text = re.sub(r"\|+", "|", text)

    m = _UPDATED.search(text)
    when = None
    if m:
        try:
            mon, day, year = re.match(r"([A-Z][a-z]+) (\d{1,2}), (\d{4})", m.group(1)).groups()
            when = date(int(year), _MONTHS[mon], int(day)).isoformat()
        except Exception:  # noqa: BLE001
            when = None

    prices: dict[str, float] = {}
    # A row is "<name>|<price>" where the price is a bare number, optionally with
    # thousands separators. Section headings ("Money Market") carry no number and
    # fall out naturally.
    # The trailing separator is a LOOKAHEAD, not consumed: adjacent rows share
    # one, so consuming it swallowed the start of the next row and silently
    # dropped every second fund — the CI sector family lost two of its five.
    for name, val in re.findall(
            r"\|([^|]{6,80}?)\|([0-9][0-9,]*\.?[0-9]*)(?=\|)", text):
        name = name.strip()
        if not name or name.lower() in {"fund name", "price", "fund type"}:
            continue
        try:
            v = float(val.replace(",", ""))
        except ValueError:
            continue
        if 1e-6 < v < 1e9:
            prices.setdefault(name, v)
    return when, prices


def fetch_cicapital(sess, delay: float) -> dict[str, dict]:
    """One series per fund NAME, assembled across archive captures."""
    out: dict[str, dict] = {}
    try:
        rows = sess.get(CDX, headers={"user-agent": UA}, timeout=90).json()
    except Exception as e:  # noqa: BLE001
        print(f"[manager] cicapital: CDX unavailable ({type(e).__name__})", flush=True)
        return out
    stamps = sorted({r[1] for r in rows[1:]}) if rows else []
    print(f"[manager] cicapital: {len(stamps)} archive captures", flush=True)
    seen_dates: set[str] = set()
    for ts in stamps:
        time.sleep(delay)
        try:
            raw = sess.get(SNAPSHOT.format(ts=ts), headers={"user-agent": UA}, timeout=90).text
        except Exception as e:  # noqa: BLE001
            print(f"[manager]   capture {ts}: {type(e).__name__}", flush=True)
            continue
        when, prices = _parse_price_page(raw)
        if not when or not prices:
            continue
        # The page is overwritten daily; two captures on the same publication
        # date carry the same table and the second adds nothing.
        if when in seen_dates:
            continue
        seen_dates.add(when)
        for name, v in prices.items():
            rec = out.setdefault(name, {"pts": {}, "url": SNAPSHOT.format(ts=ts),
                                        "source": SOURCE_CICAP})
            rec["pts"][when] = v
    print(f"[manager] cicapital: {len(out)} fund names across "
          f"{len(seen_dates)} publication dates", flush=True)
    return out


# ── source: Mubasher's own published price table, from the public archive ────
#
# THE VENDOR HAD THE DATA THE WHOLE TIME.
# Mubasher's per-fund price FILE froze on 2025-05-14 and that is what opened the
# hole. Their news desk went on publishing "Prices of investment funds including
# certificates in EGP, USD" throughout — a full table of every fund with its unit
# price and an explicit as-of date. Different system, same publisher. The live
# article is behind a sign-in wall; the Internet Archive holds 114 of them, 112
# with capture dates inside the hole.
#
# Two of those articles predate the freeze, which is what makes the mapping
# provable rather than assumed: on 2025-04-06 the table's numbers match NAV we
# already hold to six significant figures, for every fund that later went dark.

MUBASHER_CDX = ("http://web.archive.org/cdx/search/cdx?url=english.mubasher.info%2Fnews%2F*"
                "&output=json&filter=statuscode:200"
                "&filter=original:.*Prices-of-investment-funds.*"
                "&collapse=urlkey&limit=2000")
WAYBACK = "http://web.archive.org/web/{ts}/{url}"

# "Fund Name: X (y) Price per Certificate (EGP): 12.68316"
# THE NUMBER IS SPLIT BY MARKUP, AND READING HALF OF IT IS WORSE THAN READING
# NONE. Newer articles render the price as `19.<span>40456</span>`; stripping
# tags to a space turns that into "19. 40456", and a regex that stops at the
# first space captures "19." — which parses as 19.0 and is a wrong NAV, not a
# missing one. That reached production: fund 6120 received 14.0 between two
# observations of 146, and 6392 received 1.0424 between two of 108.
#
# So the value class admits the spaces, which are then removed, and
# _clean_price refuses anything that still looks truncated.
_ROW = re.compile(r"Fund Name:\s*(.+?)\s*Price per Certificate \((EGP|USD|EUR)\):"
                  r"\s*([0-9][0-9,.\s]*)")


def _clean_price(raw: str) -> float | None:
    """A price, or nothing. Never half a price.

    Rejects a value ending in a separator — "19." is the signature of a number
    cut in half by an element boundary, and is the one shape that silently
    becomes plausible-looking garbage.
    """
    v = re.sub(r"\s+", "", raw or "")
    v = v.rstrip(".,")
    if not v or v.count(".") > 1:
        return None
    if not re.fullmatch(r"[0-9][0-9,]*(\.[0-9]+)?", v):
        return None
    # A bare integer where the source always prints decimals is the same
    # truncation wearing a different hat, so require the fraction the raw string
    # promised: if it contained a dot, the cleaned value must still have one.
    if "." in raw and "." not in v:
        return None
    try:
        f = float(v.replace(",", ""))
    except ValueError:
        return None
    return f if 1e-6 < f < 1e9 else None
# The as-of line comes in several shapes, and the year is present in some of
# them and absent in others:
#     "as of 5 April 2025 compared with the previous prices"
#     "as of 14 October, compared to the previous prices"
# "compared" is the reliable neighbour — an article also mentions other dates
# further down, in its related-articles rail, and taking the first bare "as of"
# in the whole document once picked one of those.
_ASOF = re.compile(r"as of\s+(\d{1,2})\s+([A-Z][a-z]+)(?:,)?\s*(\d{4})?")


def _article_date(text: str, capture_ts: str) -> str | None:
    """The date the article says its prices are as of.

    TAKE THE YEAR WHEN THE ARTICLE GIVES ONE. The first version of this ignored
    it and inferred every year from the capture inside a twenty-day window,
    which threw away 89 of 114 articles: the Internet Archive often crawls
    months after publication, and "as of 5 January 2026" captured on 2026-03-08
    is sixty-two days behind. The year was written on the page the whole time.

    When it is genuinely absent, infer the most recent calendar year that puts
    the date at or before the capture. An article is archived after it is
    published, so a date in the capture's future is wrong by construction, and
    among the remaining candidates the most recent is the only sensible reading.
    A wrong year would place a NAV on a day it does not belong to — which the
    reconciliation gate then catches as disagreement on the overlap dates.
    """
    cap = date(int(capture_ts[:4]), int(capture_ts[4:6]), int(capture_ts[6:8]))
    matches = list(_ASOF.finditer(text))
    if not matches:
        return None
    # Prefer the one the lede uses: "as of <date> compared with the previous…".
    m = next((x for x in matches
              if "compar" in text[x.end():x.end() + 40].lower()), matches[0])

    day, mon, year = int(m.group(1)), _MONTHS.get(m.group(2)), m.group(3)
    if not mon:
        return None
    if year:
        try:
            cand = date(int(year), mon, day)
        except ValueError:
            return None
        return cand.isoformat() if cand <= cap else None
    for back in (0, 1, 2):
        try:
            cand = date(cap.year - back, mon, day)
        except ValueError:
            continue
        if cand <= cap:
            return cand.isoformat()
    return None


def fetch_mubasher_news(sess, delay: float) -> dict[str, dict]:
    out: dict[str, dict] = {}
    try:
        rows = sess.get(MUBASHER_CDX, headers={"user-agent": UA}, timeout=120).json()
    except Exception as e:  # noqa: BLE001
        print(f"[manager] mubasher_news: CDX unavailable ({type(e).__name__})", flush=True)
        return out
    arts = [(r[1], r[2]) for r in rows[1:]] if rows else []
    print(f"[manager] mubasher_news: {len(arts)} archived price articles", flush=True)

    seen_dates: set[str] = set()
    parsed = 0
    for ts, url in sorted(arts):
        time.sleep(delay)
        snap = WAYBACK.format(ts=ts, url=url)
        try:
            raw = sess.get(snap, headers={"user-agent": UA}, timeout=120).text
        except Exception:  # noqa: BLE001 — one capture must not stop the sweep
            continue
        body = re.sub(r"<script.*?</script>", "", raw, flags=re.S)
        text = html.unescape(re.sub(r"<[^>]+>", " ", body))
        text = re.sub(r"\s+", " ", text)
        when = _article_date(text, ts)
        if not when or when in seen_dates:
            continue
        rowsx = _ROW.findall(text)
        if not rowsx:
            continue
        seen_dates.add(when)
        parsed += 1
        for name, cur, val in rowsx:
            v = _clean_price(val)
            if v is None:
                continue
            label = f"{name.strip()} [{cur}]"
            rec = out.setdefault(label, {"pts": {}, "url": snap,
                                         "source": SOURCE_MUBNEWS})
            rec["pts"].setdefault(when, v)
    print(f"[manager] mubasher_news: {len(out)} fund names across {parsed} "
          f"publication dates", flush=True)
    return out


SOURCES = {"azimut": fetch_azimut, "cicapital": fetch_cicapital,
           "mubasher_news": fetch_mubasher_news}


# ── mapping, decided by data ─────────────────────────────────────────────────

def reconcile(pts: dict[str, float], held: dict[str, float]) -> dict:
    """Agreement between a manager's series and NAV we already hold.

    Only dates present in BOTH count. `held` must exclude rows this pipeline
    wrote itself, or a mapping would be able to ratify itself on a later run.
    """
    errs = [abs(v - held[d]) / held[d] * 100.0
            for d, v in pts.items() if d in held and held[d]]
    n = len(errs)
    if n and max(errs) <= EXACT_ANCHOR_PCT and n >= MIN_EXACT_ANCHORS:
        # Every overlapping observation is the SAME published number. See
        # EXACT_ANCHOR_PCT above for why this outranks the ordinary floor.
        return {"ok": True, "overlap": n, "median": median(errs), "tail": 0.0,
                "why": "", "exact": True}
    if n < MIN_OVERLAP_POINTS:
        return {"ok": False, "overlap": n, "median": None, "tail": None,
                "why": f"only {n} overlapping observation(s), need "
                       f"{MIN_OVERLAP_POINTS} (or one exact match)"}
    med = median(errs)
    tail = sum(1 for e in errs if e > TAIL_ERR_PCT) / n
    ok = med <= MAX_MEDIAN_ERR_PCT and tail <= MAX_TAIL_FRACTION
    why = ""
    if not ok:
        why = (f"median {med:.3f}% (max {MAX_MEDIAN_ERR_PCT}%)"
               if med > MAX_MEDIAN_ERR_PCT
               else f"{tail*100:.1f}% of points off by >{TAIL_ERR_PCT}%")
    return {"ok": ok, "overlap": n, "median": med, "tail": tail, "why": why,
            "exact": False}


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def token_score(a: str, b: str) -> float:
    ta, tb = set(norm(a).split()), set(norm(b).split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


async def run(dry_run: bool, only: str | None, only_ids: list[str] | None,
              delay: float) -> int:
    import httpx

    conn = await connect_resilient(load_db_url())
    try:
        if not dry_run and await database_is_read_only(conn):
            print("[manager] database is READ-ONLY — not writing.", flush=True)
            return 0

        catalogue = [(r["fund_id"], r["fund_name_en"] or "")
                     for r in await conn.fetch(
                         "SELECT fund_id, fund_name_en FROM mutual_funds "
                         "WHERE fund_name_en IS NOT NULL AND fund_id ~ '^[0-9]+$'")]
        if only_ids:
            catalogue = [c for c in catalogue if c[0] in set(only_ids)]
        print(f"[manager] catalogue: {len(catalogue)} ingested funds", flush=True)

        series: dict[str, dict] = {}
        with httpx.Client(follow_redirects=True, timeout=90.0) as sess:
            for name, fn in SOURCES.items():
                if only and name != only:
                    continue
                try:
                    series.update(fn(sess, delay))
                except Exception as e:  # noqa: BLE001 — one source must not kill the run
                    print(f"[manager] source {name} failed: {type(e).__name__}: {e}",
                          flush=True)
        print(f"[manager] {len(series)} manager series collected", flush=True)

        # Held NAV, EXCLUDING anything this pipeline wrote, so a mapping cannot
        # validate itself against its own earlier output.
        held_cache: dict[str, dict] = {}
        all_cache: dict[str, dict] = {}

        async def held(fid: str) -> dict:
            if fid not in held_cache:
                rows = await conn.fetch(
                    "SELECT date, nav, source FROM nav_history WHERE fund_id = $1", fid)
                all_cache[fid] = {r["date"].isoformat(): float(r["nav"]) for r in rows}
                held_cache[fid] = {r["date"].isoformat(): float(r["nav"]) for r in rows
                                   if (r["source"] or "") not in (SOURCE_AZIMUT, SOURCE_CICAP, SOURCE_MUBNEWS)}
            return held_cache[fid]

        # Score every (series, fund) pair the name makes plausible, then assign
        # one-to-one by reconciliation quality — most overlap first, then tightest.
        candidates = []
        rejected: list[str] = []
        for label, rec in sorted(series.items()):
            for fid, en in catalogue:
                if token_score(label, en) < 0.12:
                    continue
                v = reconcile(rec["pts"], await held(fid))
                if v["ok"]:
                    candidates.append((label, fid, v))
                elif v["overlap"] >= MIN_OVERLAP_POINTS:
                    rejected.append(f"{fid} <- '{label[:38]}': {v['why']} "
                                    f"({v['overlap']} overlapping)")

        candidates.sort(key=lambda t: (-(t[2]["overlap"] or 0), t[2]["median"] or 9e9))
        used_fid: set[str] = set()
        used_label: set[str] = set()
        assigned = []
        for label, fid, v in candidates:
            if fid in used_fid or label in used_label:
                continue
            used_fid.add(fid)
            used_label.add(label)
            assigned.append((label, fid, v))

        print(f"[manager] mapped {len(assigned)} fund(s) by data agreement", flush=True)

        inserted = 0
        gained = []
        for label, fid, v in assigned:
            rec = series[label]
            existing = all_cache.get(fid, {})
            new = {d: nav for d, nav in rec["pts"].items() if d not in existing}
            if not new:
                continue
            dates = sorted(new)
            if dry_run:
                inserted += len(new)
            else:
                try:
                    res = await conn.fetch(
                        SQL_INSERT,
                        [fid] * len(dates), [date.fromisoformat(d) for d in dates],
                        [new[d] for d in dates], [rec["source"]] * len(dates),
                        [rec["url"]] * len(dates))
                    inserted += len(res)
                except Exception as e:  # noqa: BLE001 — per-fund isolation
                    if is_read_only_error(e):
                        print("[manager] database went READ-ONLY mid-run — stopping cleanly.")
                        return 0
                    rejected.append(f"{fid}: write failed {type(e).__name__}")
                    continue
            gained.append((fid, label, len(new), dates[0], dates[-1],
                           v["overlap"], v["median"], rec["source"]))

        print(f"[manager] {'WOULD INSERT' if dry_run else 'INSERTED'} {inserted} "
              f"observation(s) across {len(gained)} fund(s)", flush=True)
        for fid, label, n, lo, hi, ov, med, src in sorted(gained, key=lambda x: -x[2]):
            print(f"[manager]   {fid:>6} +{n:>4}  {lo}..{hi}  "
                  f"(overlap {ov}, median {med:.3f}%)  {src}  {label[:34]}", flush=True)
        if rejected:
            print(f"[manager] {len(rejected)} candidate mapping(s) rejected:", flush=True)
            for r in rejected[:25]:
                print("   -", r, flush=True)
        return 0
    finally:
        await conn.close()


async def purge(sources: list[str]) -> int:
    """Remove rows this script wrote, and only those.

    Needed the day it shipped: a markup change split prices across an element
    boundary and a truncated "19." was written as 19.0. Those rows are wrong,
    they are on live fund pages, and every one of them is re-derivable — so the
    safe repair is to drop the whole source and re-run the fixed parser rather
    than to hand-pick outliers.

    The source filter is not a convenience. It is what makes this impossible to
    turn into an accident: no vendor observation, and no row from any other
    pipeline, can be reached from here.
    """
    allowed = {SOURCE_AZIMUT, SOURCE_CICAP, SOURCE_MUBNEWS}
    bad = set(sources) - allowed
    if bad:
        raise SystemExit(f"refusing to purge sources this script does not own: {sorted(bad)}")
    conn = await connect_resilient(load_db_url())
    try:
        if await database_is_read_only(conn):
            print("[manager] database is READ-ONLY — not purging.", flush=True)
            return 0
        rows = await conn.fetch(
            "DELETE FROM nav_history WHERE source = ANY($1::text[]) RETURNING fund_id",
            list(sources))
        funds = sorted({r["fund_id"] for r in rows})
        print(f"[manager] PURGED {len(rows)} row(s) from {sources} "
              f"across {len(funds)} fund(s)", flush=True)
        return 0
    finally:
        await conn.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="Backfill NAV history from fund managers")
    ap.add_argument("--purge-source", type=str, default=None,
                    help="delete every row written by these sources (comma-separated) "
                         "and exit. Only this script's own sources may be named.")
    ap.add_argument("--dry-run", action="store_true",
                    help="collect and reconcile, report what WOULD be written")
    ap.add_argument("--only", choices=sorted(SOURCES), default=None,
                    help="restrict to one source")
    ap.add_argument("--ids", type=str, default=None,
                    help="comma-separated fund_ids to consider")
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY,
                    help="seconds between upstream requests (be kind; default 1.5)")
    a = ap.parse_args()
    if a.purge_source:
        sys.exit(asyncio.run(purge([x.strip() for x in a.purge_source.split(",") if x.strip()])))
    ids = [x.strip() for x in a.ids.split(",")] if a.ids else None
    sys.exit(asyncio.run(run(a.dry_run, a.only, ids, a.delay)))


if __name__ == "__main__":
    main()
