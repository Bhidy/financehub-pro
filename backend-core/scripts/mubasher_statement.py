#!/usr/bin/env python3
"""
mubasher_statement.py — read Mubasher's daily NAV statement out of a news article.

WHY THIS EXISTS
---------------
The platform has exactly one machine-readable source of NAV *history*
(static.mubasher.info's per-fund CSV). That CSV froze between 2025-05-14 and
2026-06-30, so 15 funds still carry a 412-day hole and no amount of re-fetching
recovers it: measured 2026-09-07, the CSV now offers 203,582 observations and we
already hold 203,581 of them. The ingestion is exhaustive. The data is simply
not there.

It IS in Mubasher's newsroom. Every trading day they publish an article whose
body carries a screenshot of the official price statement:

    بيان بأسعار وثائق صناديق الاستثمار وفقا للإغلاق بتاريخ 06-08-2025

That screenshot has what the CSV lost — including funds the CSV never restored —
at FULL five-decimal precision, with an English fund-name column, and it reaches
further back than any other source we have found. Validated 2026-09-07 against
our own archive: on the 2025-08-06 statement, `Afaaq Fund 216.52730` equals our
fund 5751's stored NAV for that date exactly, and 35 of that statement's 36 rows
are observations we do not hold anywhere.

Mubasher's robots.txt allows /news/ for every agent and asks for
`Crawl-delay: 5`. This module honours that.

TWO PUBLISHED SHAPES
--------------------
The general ("المصرية") statement is now a real HTML <table> — 60-67 rows, five
decimals, Latin fund names — and needs no OCR at all. That path is tried first
and is what makes this viable at scale. The equity / Islamic / USD statements
are still screenshots, so those fall back to OCR. Column positions are
discovered per image, because Mubasher publishes at least two layouts and a
hardcoded column silently reads one of them as zero rows.

WHY THE PARANOIA
----------------
This is OCR feeding a financial time series, and this codebase has already been
burned once: a parser that read `19.` out of `19.<span>40456</span>` wrote 14.0
onto funds trading at 146 and put 555 bad rows into production. So nothing here
trusts the OCR:

  * The statement DATE never comes from OCR. It is parsed from the article's
    HTML text, and when the title carries a date too, the two must agree. The
    general statement also contains a DECOY — a sentence naming the last EGX
    session, up to three days before its own valuation date — which is
    explicitly not treated as the date. Verified against our own holdings.
  * `reconcile()` checksums a single statement against (fund, date) pairs we
    already hold. One disagreement rejects the WHOLE statement.
  * `reconcile_series()` is the gate that matters for the backfill, because the
    funds we still hold through the freeze and the funds the statement lists
    barely intersect (1 row of 36 on 2025-08-06). It validates a whole
    reconstructed series per fund: every overlapping date must agree, and every
    new point must sit within that fund's OWN learned daily-move band of its
    nearest neighbour.
  * A row we cannot anchor to a known fund is dropped, never guessed. Fund
    identity comes from `mubasher_fund_aliases.json`, learned by value
    fingerprint — the printed price equalled our stored NAV on >= 2 dates and
    the candidate set intersected to exactly one fund. Names are never trusted
    on their own; `propose_bridge()` only proposes, and continuity decides.

USAGE
  python mubasher_statement.py --article 4477495 --dump
  python mubasher_statement.py --self-test
"""
from __future__ import annotations

import argparse
import base64
import html as _html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from datetime import date, datetime, timedelta
from typing import Iterable, Sequence

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
ARTICLE_URL = "https://www.mubasher.info/news/{}/"
CRAWL_DELAY = 5.0          # mubasher.info robots.txt: "Crawl-delay: 5"
SOURCE_TAG = "mubasher_statement"

# ---- reconciliation thresholds -------------------------------------------
# A checksum row is a (fund, date) we already hold. Fewer than three and we
# cannot tell a clean OCR pass from a lucky one, so the statement is refused.
MIN_CHECKSUM = 3
# Our stored NAVs and the statement both carry 5 decimals, so a correct read is
# exact. This tolerance absorbs the vendor rounding a value to fewer decimals
# (the money-market graphics use 2), not a misread digit.
CHECKSUM_TOL_PCT = 0.05
# Some statements round hard (2 dp on a fund trading near 1.0 is 0.5% granular).
# A row whose own precision cannot support the tolerance is excluded from the
# checksum rather than being allowed to fail it.
CHECKSUM_MIN_DECIMALS = 4
# A per-day band multiplied by a long gap becomes meaningless: 2%/day over a
# 300-day junction "allows" 600%, so a claimed doubling sails through at
# 0.33%/day. This is the ceiling on what ONE unverified interval may claim,
# whatever its length.
#
# Set from evidence, not taste. At 25% this refused fund 5989 (Azimut precious
# metals) for a +25.1% move across a 147-day junction — which our own held data
# on both sides confirms was real: 18.3581 in May 2025, 22.72 by December,
# 27.03 by January as gold rallied. That is a false refusal. 60% still catches
# the failures this exists for (a 100% claim over 300 days is refused; a
# compounding drift is refused at its 1-day junction by the band itself), and
# the ceiling stops mattering as statement coverage shortens the junctions.
MAX_STEP_TOTAL_PCT = 60.0

# ---- Arabic month names, for the "6 أغسطس 2025" form ----------------------
AR_MONTHS = {
    "يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "ابريل": 4, "مايو": 5,
    "يونيو": 6, "يونية": 6, "يوليو": 7, "يوليه": 7, "أغسطس": 8, "اغسطس": 8,
    "سبتمبر": 9, "أكتوبر": 10, "اكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12,
}
AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


class StatementError(RuntimeError):
    """The statement cannot be read safely. Never a reason to guess."""


# ==========================================================================
# 1. fetching
# ==========================================================================
def fetch_article(article_id: int | str, *, delay: float = CRAWL_DELAY,
                  cache_dir: str | None = None) -> str:
    """GET one news article, honouring Mubasher's crawl delay."""
    if cache_dir:
        path = os.path.join(cache_dir, f"{article_id}.html")
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            return open(path, encoding="utf-8", errors="ignore").read()
    req = urllib.request.Request(
        ARTICLE_URL.format(article_id),
        headers={"User-Agent": UA, "Accept": "text/html"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8", "ignore")
    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
        with open(os.path.join(cache_dir, f"{article_id}.html"), "w",
                  encoding="utf-8") as fh:
            fh.write(body)
    time.sleep(delay)
    return body


def article_body(page_html: str) -> str:
    """The article body only — the page carries unrelated headlines too."""
    m = re.search(r'itemprop="articleBody"(.{0,400000})', page_html, re.S)
    return m.group(1) if m else page_html


# ==========================================================================
# 2. the statement date — from TEXT, never from OCR
# ==========================================================================
def _norm_digits(s: str) -> str:
    return s.translate(AR_DIGITS)


def _parse_date_token(token: str) -> date | None:
    token = _norm_digits(token).strip()
    m = re.match(r"^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})$", token)
    if m:                                   # d-m-yyyy (Mubasher writes day first)
        d, mo, y = (int(x) for x in m.groups())
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    m = re.match(r"^(\d{1,2})\s+([^\s\d]+)\s+(\d{4})$", token)
    if m:                                   # "6 أغسطس 2025"
        d, name, y = m.group(1), m.group(2), m.group(3)
        mo = AR_MONTHS.get(name.strip())
        if mo:
            try:
                return date(int(y), mo, int(d))
            except ValueError:
                return None
    return None


def parse_statement_date(page_html: str) -> date:
    """
    The valuation date of the statement.

    Read from the article's own text. If the headline also carries a date the
    two must agree — a disagreement means we do not know what day these prices
    belong to, and a NAV on the wrong day is worse than a missing NAV.
    """
    body = article_body(page_html)
    text = _html.unescape(re.sub(r"<[^>]+>", " ",
                                 re.sub(r"<script.*?</script>", "", body, flags=re.S)))
    text = re.sub(r"\s+", " ", text)

    # The headline date, used as an independent cross-check.
    title_date = None
    tm = re.search(r"<title>(.*?)</title>", page_html, re.S)
    if tm:
        for m in re.finditer(r"([0-9٠-٩]{1,2}\s*-\s*[0-9٠-٩]{1,2}\s*-\s*[0-9٠-٩]{4})",
                             _html.unescape(tm.group(1))):
            title_date = _parse_date_token(m.group(1)) or title_date

    # Preferred: an explicit "بتاريخ <date>".
    #
    # Deliberately NOT anchored on "جلسة" — the general statement carries a
    # sentence like "آخر الأسعار المعلنة بنهاية جلسة الخميس 3 سبتمبر 2026"
    # three days before its own valuation date. That sentence is context about
    # the last EGX equity session, not about these NAVs: money-market funds
    # accrue every calendar day, and the printed values were confirmed
    # (2026-09-07) to sit four days of accrual past our 2026-09-02 holdings,
    # i.e. on the 6th. Treating it as the valuation date would back-date every
    # row across a weekend.
    body_dates: list[date] = []
    for m in re.finditer(r"بتاريخ\s+([0-9٠-٩]{1,2}\s*[-/]\s*[0-9٠-٩]{1,2}\s*[-/]\s*[0-9٠-٩]{4}"
                         r"|[0-9٠-٩]{1,2}\s+[^\s\d]+\s+[0-9٠-٩]{4})", text):
        d = _parse_date_token(m.group(1))
        if d:
            body_dates.append(d)

    if not body_dates:
        # Fallback for the USD statements, whose body never says "بتاريخ".
        # A bare token alone is not enough: it must be corroborated by the
        # headline, so two independent places in the document agree.
        bare = {d for d in (_parse_date_token(t) for t in
                            re.findall(r"[0-9٠-٩]{1,2}\s*-\s*[0-9٠-٩]{1,2}\s*-\s*[0-9٠-٩]{4}",
                                       text)) if d}
        if not bare:
            raise StatementError("no statement date in the article body")
        if title_date is None:
            raise StatementError("bare body date with no headline date to corroborate it")
        if title_date not in bare:
            raise StatementError(
                f"headline date {title_date} not among body dates {sorted(bare)}")
        return title_date

    if len(set(body_dates)) > 1:
        raise StatementError(f"conflicting dates in body: {sorted(set(body_dates))}")
    body_date = body_dates[0]
    if title_date is not None and title_date != body_date:
        raise StatementError(
            f"title date {title_date} disagrees with body date {body_date}")
    _assert_near_publication(page_html, body_date)
    return body_date


# How far a valuation date may sit from the article's publication stamp. The
# statement is same-day or next-working-day reporting; a fortnight of slack
# covers a late republish while still catching the failure this guards:
# "6-8-2025" read month-first as 8 June when the piece was published in August.
MAX_PUBLICATION_LAG_DAYS = 14


_EN_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}


def publication_date(page_html: str) -> date | None:
    """
    The article's own published-on stamp.

    Searches the WHOLE page, not the article body — Mubasher renders it in the
    byline above the body, so a body-only search silently returns None and the
    lag guard becomes decorative. Prefers the machine-readable
    `itemprop="datePublished"` attribute; the page also carries a `01 Jan 1970`
    placeholder, which is ignored.
    """
    m = re.search(r'itemprop="datePublished"[^>]*datetime="([^"]+)"', page_html)
    if m:
        raw = m.group(1).strip()
        em = re.search(r"\b([A-Z][a-z]{2})\s+(\d{1,2})\s+[\d:]+\s+\w+\s+(\d{4})", raw)
        if em and em.group(1) in _EN_MONTHS:
            try:
                return date(int(em.group(3)), _EN_MONTHS[em.group(1)], int(em.group(2)))
            except ValueError:
                pass
        im = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
        if im:
            try:
                return date(*(int(x) for x in im.groups()))
            except ValueError:
                pass

    text = re.sub(r"\s+", " ", _norm_digits(_html.unescape(
        re.sub(r"<[^>]+>", " ", page_html))))
    for mm in re.finditer(r"(\d{1,2})\s+([^\s\d]+)\s+(\d{4})\s+\d{1,2}:\d{2}", text):
        mo = AR_MONTHS.get(mm.group(2).strip())
        if not mo:
            continue
        try:
            got = date(int(mm.group(3)), mo, int(mm.group(1)))
        except ValueError:
            continue
        if got.year > 1970:                    # skip the epoch placeholder
            return got
    return None


def _assert_near_publication(page_html: str, stmt_date: date) -> None:
    """
    Day-first parsing is an assumption wherever both components are <= 12.

    It is corroborated where the day exceeds 12 ("27-12-2025"), but "6-8-2025"
    is ambiguous on its own and a month-first reading silently moves the whole
    statement two months. The article's publication stamp is an independent
    witness: a statement cannot describe prices from long before it was written,
    and never describes the future.
    """
    pub = publication_date(page_html)
    if pub is None:
        return                                  # no witness available
    lag = (pub - stmt_date).days
    if lag < -1:
        raise StatementError(
            f"statement date {stmt_date} is after publication {pub}")
    if lag > MAX_PUBLICATION_LAG_DAYS:
        raise StatementError(
            f"statement date {stmt_date} is {lag} days before publication {pub} "
            f"(max {MAX_PUBLICATION_LAG_DAYS}) — possible day/month swap")


# ==========================================================================
# 3. the table image(s)
# ==========================================================================
def extract_images(page_html: str) -> list[bytes]:
    """
    Statement images, in document order.

    Two shapes are in the wild: older articles inline the screenshot as a
    base64 PNG, newer ones point at a Google-Docs export on googleusercontent.
    """
    body = _html.unescape(article_body(page_html))
    out: list[bytes] = []
    for _ext, b64 in re.findall(
            r"data:image/(png|jpe?g);base64,([A-Za-z0-9+/=]{500,})", body):
        try:
            out.append(base64.b64decode(b64))
        except Exception:
            continue
    for url in re.findall(r'<img[^>]+src="(https://lh\d[^"]+)"', body):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        last: Exception | None = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    out.append(resp.read())
                last = None
                break
            except urllib.error.URLError as exc:      # HTTPError is a subclass
                last = exc
                time.sleep(2 * (attempt + 1))
        if last is not None:
            # Refuse the statement rather than return a partial one. Swallowing
            # this is how a backfill ends up silently missing half its rows and
            # nobody notices until the chart still has a hole.
            raise StatementError(f"statement image failed to download: {url[:80]} ({last})")
    return out


# ==========================================================================
# 4. OCR -> rows
# ==========================================================================
@dataclass
class StatementRow:
    name: str                 # the Latin-script fund name as printed
    value: float
    decimals: int
    y: float
    confidence: float


# A price cell always carries a DOT decimal separator. Requiring it also
# discards the spreadsheet's row-number column (1, 2, 3 …) for free.
#
# The comma is deliberately NOT accepted as a decimal separator. Accepting it
# turned "1,234" into 1.234 — a silent 1000x error on any four-digit NAV, and
# we hold NAVs up to 3,963.63. Every statement sampled so far prints a bare dot
# with no grouping, so a grouped cell means the format changed underneath us.
_NUM_RE = re.compile(r"^([0-9]{1,6})\.([0-9]{1,6})$")
# digit-separator-digit: 1,234 · 1 234 · 1٬234 (Arabic thousands sign)
_GROUPED_RE = re.compile(r"[0-9][,٬   ][0-9]")


def parse_price(cell: str) -> tuple[float, int] | None:
    """
    (value, decimals) for a price cell, or None if it is not a price.

    Raises rather than returning None when the cell looks like a NUMBER we
    refuse to interpret — grouped digits. Silently skipping those would drop
    real observations and leave a hole nobody notices; refusing is loud.
    """
    raw = _norm_digits(str(cell)).strip()
    if _GROUPED_RE.search(raw):
        raise StatementError(f"grouped-digit price cell, format not validated: {raw!r}")
    m = _NUM_RE.match(raw)
    if not m:
        return None
    return float(f"{m.group(1)}.{m.group(2)}"), len(m.group(2))


def _ocr(image_bytes: bytes):
    """Run OCR. Imported lazily so the module loads without the OCR stack."""
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as exc:                              # pragma: no cover
        raise StatementError(
            "rapidocr-onnxruntime is not installed; "
            "pip install rapidocr-onnxruntime") from exc
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as fh:
        fh.write(image_bytes)
        path = fh.name
    try:
        result, _ = RapidOCR()(path)
    finally:
        os.unlink(path)
    return result or []


def _dominant_column(xs: list[float], width: float, bins: int = 24) -> tuple[float, float]:
    """The x-band holding the most items — i.e. where a table column sits."""
    if not xs:
        return (0.0, 0.0)
    hist: dict[int, int] = {}
    for x in xs:
        b = min(bins - 1, int(x / width * bins))
        hist[b] = hist.get(b, 0) + 1
    peak = max(hist, key=lambda b: hist[b])
    step = width / bins
    return (max(0.0, (peak - 1.2) * step), min(width, (peak + 2.2) * step))


def rows_from_ocr(boxes: Sequence, image_width: float) -> list[StatementRow]:
    """
    Turn OCR boxes into (name, value) rows by geometry.

    Column positions are DISCOVERED, not assumed. Mubasher publishes at least
    two layouts — a wide spreadsheet screenshot with the price column on the
    far left, and a 1080px social graphic with the price near the middle and
    the Latin name on the right — so any hardcoded fraction silently reads one
    of them as zero rows. Instead: the price column is wherever most decimal
    numbers cluster, and the name column is whichever cluster of Latin text
    best lines up with those prices row-for-row.

    Nothing is inferred from OCR reading order, which is not reliable.
    """
    cells = []
    for box, text, score in boxes:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        cells.append({
            "text": str(text).strip(),
            "score": float(score),
            "x": sum(xs) / len(xs),
            "y": sum(ys) / len(ys),
            "h": max(ys) - min(ys),
        })

    numeric = []
    for c in cells:
        parsed = parse_price(c["text"].replace("٫", "."))
        if parsed is not None:
            numeric.append((c, parsed))
    if not numeric:
        return []
    lo, hi = _dominant_column([c["x"] for c, _ in numeric], image_width)
    values = [(c, val, dec) for c, (val, dec) in numeric if lo <= c["x"] <= hi]
    if not values:
        return []

    band = max(12.0, sum(c["h"] for c, _, _ in values) / len(values) * 1.1)
    latin = [c for c in cells
             if re.search(r"[A-Za-z]", c["text"]) and not (lo <= c["x"] <= hi)]

    # Pick the Latin cluster that actually pairs with prices: for each candidate
    # band, count how many price rows it can name. The Arabic column OCRs as
    # mojibake with stray Latin fragments, so "has letters" alone is not enough.
    best_band, best_hits = None, -1
    remaining = list(latin)
    for _ in range(3):
        if not remaining:
            break
        b = _dominant_column([c["x"] for c in remaining], image_width)
        hits = sum(1 for c, _, _ in values
                   if any(b[0] <= o["x"] <= b[1] and abs(o["y"] - c["y"]) <= band
                          for o in latin))
        if hits > best_hits:
            best_band, best_hits = b, hits
        remaining = [c for c in remaining if not (b[0] <= c["x"] <= b[1])]
    if best_band is None:
        return []

    rows: list[StatementRow] = []
    for c, val, dec in values:
        parts = [o for o in latin
                 if best_band[0] <= o["x"] <= best_band[1]
                 and abs(o["y"] - c["y"]) <= band]
        parts.sort(key=lambda o: (o["y"], o["x"]))
        name = re.sub(r"\s+", " ", " ".join(p["text"] for p in parts)).strip()
        if not name:
            continue
        rows.append(StatementRow(name=name, value=val, decimals=dec,
                                 y=c["y"], confidence=c["score"]))
    rows.sort(key=lambda r: r.y)
    return rows


def rows_from_html_table(page_html: str) -> list[StatementRow]:
    """
    Rows from a real <table>, when the article has one.

    The general ("المصرية") statement switched to a genuine HTML table — 64-67
    rows, five decimals, Latin fund names. That path involves no OCR at all, so
    it is tried before the images and is the reason this backfill is viable at
    scale rather than a novelty.
    """
    body = article_body(page_html)
    out: list[StatementRow] = []
    for tbl in re.findall(r"<table.*?</table>", body, re.S):
        for i, tr in enumerate(re.findall(r"<tr.*?</tr>", tbl, re.S)):
            cells = [
                re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", "", c))).strip()
                for c in re.findall(r"<t[dh].*?</t[dh]>", tr, re.S)
            ]
            if len(cells) < 2:
                continue
            parsed = parse_price(cells[0])
            if parsed is None:
                continue                      # header row, or a blank price cell
            name = cells[1]
            if not re.search(r"[A-Za-z]", name):
                continue                      # Arabic-only label: cannot map it safely
            value, decimals = parsed
            out.append(StatementRow(
                name=re.sub(r"\s+", " ", name).strip(),
                value=value, decimals=decimals,
                y=float(i), confidence=1.0))
    return out


def read_statement(page_html: str) -> tuple[date, list[StatementRow]]:
    """
    Date plus every row we could read.

    Prefers the HTML table (exact, no OCR); falls back to OCR of the statement
    screenshots for the categories that still publish as images.
    """
    stmt_date = parse_statement_date(page_html)
    table_rows = rows_from_html_table(page_html)
    if table_rows:
        return stmt_date, table_rows
    rows: list[StatementRow] = []
    for blob in extract_images(page_html):
        try:
            from PIL import Image
            import io
            width = Image.open(io.BytesIO(blob)).size[0]
        except Exception:
            continue
        boxes = _ocr(blob)
        if not boxes:
            continue
        rows.extend(rows_from_ocr(boxes, width))
    return stmt_date, rows


# ==========================================================================
# 5. reconciliation — the gate that decides whether any of this is written
# ==========================================================================
@dataclass
class Reconciliation:
    ok: bool
    reason: str
    checksum_used: int = 0
    checksum_failed: list = field(default_factory=list)
    accepted: list = field(default_factory=list)     # (fund_id, value)
    unmapped: list = field(default_factory=list)     # names we could not anchor


def reconcile(stmt_date: date,
              rows: Sequence[StatementRow],
              mapping: dict,
              held: dict) -> Reconciliation:
    """
    Decide whether this statement may be written.

    `mapping` maps a normalised printed name to one of our fund ids.
    `held`    is {fund_id: {iso_date: nav}} — what we already have.

    The rule is deliberately all-or-nothing. Rows for dates we already hold are
    a checksum on the OCR pass; if a single one disagrees, every row from the
    same image is suspect, so the statement is refused entirely.
    """
    iso = stmt_date.isoformat()
    checksum, failed, accepted, unmapped = [], [], [], []

    for row in rows:
        fund_id = mapping.get(normalise_name(row.name))
        if not fund_id:
            unmapped.append(row.name)
            continue
        known = held.get(fund_id, {}).get(iso)
        if known is None:
            accepted.append((fund_id, row.value))
            continue
        if row.decimals < CHECKSUM_MIN_DECIMALS:
            continue                       # too rounded to prove anything
        err = abs(row.value - known) / known * 100 if known else 100.0
        checksum.append(fund_id)
        if err > CHECKSUM_TOL_PCT:
            failed.append((fund_id, row.value, known, round(err, 4)))

    if failed:
        return Reconciliation(False,
                              f"{len(failed)} checksum row(s) disagree with stored NAVs",
                              len(checksum), failed, [], unmapped)
    if len(checksum) < MIN_CHECKSUM:
        return Reconciliation(False,
                              f"only {len(checksum)} checksum rows (need {MIN_CHECKSUM})",
                              len(checksum), [], [], unmapped)
    return Reconciliation(True, "ok", len(checksum), [], accepted, unmapped)


def daily_move_band(series: dict, *, k: float = 6.0, floor_pct: float = 0.75) -> float:
    """
    The largest per-day move this fund plausibly makes, learned from its own
    history rather than assumed from an asset-class label we may have wrong.

    A money-market fund that accrues 0.04%/day and an equity fund that swings
    3% need very different bands, and this codebase has already been bitten by
    a mislabelled fund taxonomy. So: take the fund's own 99th-percentile daily
    move and allow a generous multiple of it.
    """
    ds = sorted(series)
    moves = []
    for a, b in zip(ds, ds[1:]):
        gap = (date.fromisoformat(b) - date.fromisoformat(a)).days
        if not gap or gap > 10:
            continue
        va, vb = series[a], series[b]
        if va:
            moves.append(abs(vb / va - 1) * 100 / gap)
    if len(moves) < 20:
        # Too little history to learn anything. This is exactly when to be
        # STRICTER, not looser: the old 5%/day fallback let a runaway series
        # close a 17-day junction at 4.95%/day — an 85% allowance — and pass.
        return max(floor_pct, 2.0)
    moves.sort()
    p99 = moves[min(len(moves) - 1, int(len(moves) * 0.99))]
    return max(floor_pct, p99 * k)


@dataclass
class SeriesCheck:
    fund_id: str
    accepted: dict = field(default_factory=dict)   # iso date -> nav
    rejected: list = field(default_factory=list)   # (date, value, why)
    conflicts: list = field(default_factory=list)  # (date, ours, theirs, pct)
    band_pct: float = 0.0

    @property
    def ok(self) -> bool:
        return not self.conflicts


def reconcile_series(fund_id: str, held: dict, candidate: dict) -> SeriesCheck:
    """
    Validate a whole reconstructed series for one fund before any of it lands.

    A per-statement checksum cannot protect this backfill: measured 2026-09-07,
    the funds we still hold through the freeze (bank funds) and the funds the
    statement lists (asset-manager funds) barely intersect — 1 row of 36 on the
    2025-08-06 statement. So the gate has to work at series level instead:

      * every date we ALREADY hold must agree — a disagreement means we have
        the wrong fund or a misread value, and nothing for that fund is written;
      * every new point must sit within the fund's own plausible daily move of
        its nearest accepted neighbour, so a stray digit cannot slip in between
        two real observations.
    """
    check = SeriesCheck(fund_id=fund_id)
    check.band_pct = daily_move_band(held)

    for d, v in sorted(candidate.items()):
        if d in held:
            base = held[d]
            err = abs(v - base) / base * 100 if base else 100.0
            if err > CHECKSUM_TOL_PCT:
                check.conflicts.append((d, base, v, round(err, 4)))
    if check.conflicts:
        return check                      # fund is refused wholesale

    timeline = dict(held)
    for d, v in sorted(candidate.items()):
        if d in held:
            continue
        neighbours = sorted(timeline)
        prev = max((x for x in neighbours if x < d), default=None)
        nxt = min((x for x in neighbours if x > d), default=None)
        anchor = prev or nxt
        if anchor is None:
            check.rejected.append((d, v, "no anchor to compare against"))
            continue
        gap = abs((date.fromisoformat(d) - date.fromisoformat(anchor)).days) or 1
        base = timeline[anchor]
        move = abs(v / base - 1) * 100 / gap if base else 100.0
        total = abs(v / base - 1) * 100 if base else 100.0
        allowance = min(check.band_pct * gap, MAX_STEP_TOTAL_PCT)
        if move > check.band_pct or total > allowance:
            check.rejected.append(
                (d, v, f"{move:.2f}%/day ({total:.1f}% total) from {anchor} "
                       f"exceeds band {check.band_pct:.2f}%/day, cap {allowance:.1f}%"))
            continue
        check.accepted[d] = v
        timeline[d] = v

    # ---- CLOSURE ---------------------------------------------------------
    # Step-by-step plausibility is NOT enough, and assuming it was is the worst
    # defect this file has had. Each new point anchors to the previously
    # ACCEPTED point, so a small per-day bias compounds unchallenged: measured
    # 2026-09-07, a +0.25%/day drift inside a 0.75% band filled a 412-day hole
    # with 293 of 293 points accepted, zero rejections — and landed 107.9% away
    # from the true value where the series rejoins our held data.
    #
    # So the filled run must also CLOSE: the junction back onto real held data
    # is checked like any other step. That junction is the one comparison a
    # drifting series cannot survive, because the far endpoint is ground truth.
    # A failure here condemns the whole fund rather than trimming the tail —
    # if the series did not arrive where reality is, we do not know which of
    # its points were right.
    if check.accepted:
        merged = sorted(set(timeline))
        for a, b in zip(merged, merged[1:]):
            new_pair = (a in check.accepted) or (b in check.accepted)
            if not new_pair:
                continue                       # a step wholly inside held data
            if a in check.accepted and b in check.accepted:
                continue                       # already validated on the way in
            gap = (date.fromisoformat(b) - date.fromisoformat(a)).days or 1
            va, vb = timeline[a], timeline[b]
            if not va:
                continue
            move = abs(vb / va - 1) * 100 / gap
            total = abs(vb / va - 1) * 100
            allowance = min(check.band_pct * gap, MAX_STEP_TOTAL_PCT)
            if move > check.band_pct or total > allowance:
                check.conflicts.append((f"{a}->{b}", va, vb, round(move, 4)))
        if check.conflicts:
            check.accepted = {}
    return check


def normalise_name(name: str) -> str:
    """Fold the printed Latin name to a stable key."""
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\b(fund|funds|price|nav|investment|the|of|for|egypt)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


ALIAS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "..", "data", "mubasher_fund_aliases.json")


ALIAS_MIN_DATES = 3


def load_aliases(path: str = ALIAS_FILE, *, min_dates: int = ALIAS_MIN_DATES) -> dict:
    """
    normalised printed name -> our fund_id, as learned by value fingerprint.

    Validated on load. This file decides which fund every backfilled NAV is
    attributed to, so a hand-edit that drops the evidence count, or a fund id
    that is not a fund id, must fail loudly here rather than quietly misfile a
    year of history.
    """
    with open(path, encoding="utf-8") as fh:
        doc = json.load(fh)
    if not isinstance(doc, dict) or "aliases" not in doc:
        raise StatementError(f"alias file has no 'aliases' object: {path}")
    out: dict[str, str] = {}
    for key, entry in doc["aliases"].items():
        if not isinstance(entry, dict):
            raise StatementError(f"alias {key!r} is not an object")
        fund_id = str(entry.get("fund_id", ""))
        if not fund_id.isdigit():
            raise StatementError(f"alias {key!r} has a non-numeric fund_id {fund_id!r}")
        dates = entry.get("dates")
        if not isinstance(dates, int) or dates < min_dates:
            raise StatementError(
                f"alias {key!r} claims only {dates} dates of evidence "
                f"(floor is {min_dates}) — move it to quarantine instead")
        out[key] = fund_id
    if not out:
        raise StatementError(f"alias file is empty: {path}")
    return out


def _tokens(key: str) -> set:
    return {t for t in key.split() if len(t) > 2}


def propose_bridge(unknown: str, aliases: dict, *, min_overlap: float = 0.5) -> list:
    """
    Candidate fund ids for a printed name the fingerprint never saw.

    Mubasher renamed its own columns between eras — the same fund is "Horus
    M.M" on the 2025 sheets and "HORUS - AFIM" on the 2026 ones, "Afaaq Fund"
    became "Aafaq Investment Fund". So old statements cannot be mapped by the
    2026 alias table alone.

    This proposes, it does not decide. A proposal is only ever accepted after
    `reconcile_series` shows the resulting series joins our held data on both
    sides of the gap — which it cannot do if the fund is wrong, because two
    different funds sit at different price levels entirely. Verified
    2026-09-07: ten frozen funds bridged their May-2025 and June-2026
    endpoints exactly under this rule.
    """
    key = normalise_name(unknown)
    if not key:
        return []
    kt = _tokens(key)
    if not kt:
        return []
    scored = []
    for alias, fund_id in aliases.items():
        at = _tokens(alias)
        if not at:
            continue
        overlap = len(kt & at) / min(len(kt), len(at))
        # Transliteration drifts too ("Afaaq" vs "Aafaq" share no whole token),
        # so fall back to character similarity. Being generous here is safe:
        # every proposal still has to survive the continuity check.
        ratio = SequenceMatcher(None, key, alias).ratio()
        if max(overlap, ratio) >= min_overlap:
            scored.append((max(overlap, ratio), fund_id))
    scored.sort(reverse=True)
    seen, out = set(), []
    for _score, fund_id in scored:
        if fund_id not in seen:
            seen.add(fund_id)
            out.append(fund_id)
    return out


# ==========================================================================
# 6. CLI
# ==========================================================================
def _self_test() -> int:
    fails = []

    def check(label, cond):
        if not cond:
            fails.append(label)

    # -- date parsing --------------------------------------------------
    page = ('<title>أسعار وثائق صناديق الاستثمار المصرية - معلومات مباشر</title>'
            '<div itemprop="articleBody">تنشر مباشر أسعار وثائق صناديق '
            'الاستثمار المصرية بتاريخ 6 أغسطس 2025.</div>')
    check("arabic month date", parse_statement_date(page) == date(2025, 8, 6))

    page2 = ('<title>أسعار وثائق صناديق الاستثمار في الأسهم 27-12-2025</title>'
             '<div itemprop="articleBody">جاءت الأسعار بتاريخ 27-12-2025 كالتالي</div>')
    check("numeric date", parse_statement_date(page2) == date(2025, 12, 27))

    bad = ('<title>أسعار وثائق صناديق الاستثمار 28-12-2025</title>'
           '<div itemprop="articleBody">الأسعار بتاريخ 27-12-2025</div>')
    try:
        parse_statement_date(bad)
        check("title/body disagreement must raise", False)
    except StatementError:
        pass

    try:
        parse_statement_date('<div itemprop="articleBody">لا تاريخ هنا</div>')
        check("missing date must raise", False)
    except StatementError:
        pass

    # day-first, not month-first: 6-8-2025 is 6 August, never 8 June
    p3 = '<div itemprop="articleBody">بتاريخ 6-8-2025</div>'
    check("day-first", parse_statement_date(p3) == date(2025, 8, 6))

    # -- publication-date corroboration --------------------------------
    ok_pub = ('<div itemprop="articleBody">10 فبراير 2026 04:35 م '
              'جاءت الأسعار بتاريخ 9-2-2026 كالتالي</div>')
    check("statement one day before publication is fine",
          parse_statement_date(ok_pub) == date(2026, 2, 9))

    # a month-first misreading of 6-8-2025 would land in June; the August
    # publication stamp is what catches it
    swapped = ('<div itemprop="articleBody">7 أغسطس 2025 09:15 ص '
               'الأسعار بتاريخ 8-6-2025 كالتالي</div>')
    try:
        parse_statement_date(swapped)
        check("day/month swap must be caught by publication lag", False)
    except StatementError:
        pass

    future = ('<div itemprop="articleBody">1 فبراير 2026 09:15 ص '
              'الأسعار بتاريخ 9-2-2026 كالتالي</div>')
    try:
        parse_statement_date(future)
        check("statement dated after publication must raise", False)
    except StatementError:
        pass

    check("publication stamp parsed", publication_date(ok_pub) == date(2026, 2, 10))
    check("no stamp is not fatal",
          parse_statement_date('<div itemprop="articleBody">بتاريخ 9-2-2026</div>')
          == date(2026, 2, 9))

    # -- geometry ------------------------------------------------------
    def bx(x, y, w=60, h=18):
        return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    boxes = [
        (bx(60, 60), "18.32121", 1.0),
        (bx(200, 68), "AZFI", 0.9),
        (bx(450, 62), "- AZ - ADKHAR", 0.8),
        (bx(640, 60), "2", 0.99),               # row number, must be ignored
        (bx(60, 120), "216.52730", 1.0),
        (bx(200, 122), "Afaaq Fund", 1.0),
    ]
    rows = rows_from_ocr(boxes, image_width=680)
    check("two rows parsed", len(rows) == 2)
    check("value read", rows[0].value == 18.32121 and rows[1].value == 216.52730)
    check("decimals counted", rows[0].decimals == 5)
    check("name attached", "AZFI" in rows[0].name and "Afaaq" in rows[1].name)
    check("row-number column excluded", all("2" != r.name for r in rows))

    # The OTHER published layout: 1080px social graphic, price column near the
    # middle, Latin name on the right. Hardcoded column fractions read this as
    # zero rows, which is how four of every five statements were silently lost.
    graphic = [
        (bx(300, 60, w=90), "39.93852", 1.0),
        (bx(700, 60, w=200), "Azimut Equity Opportunity Fund", 0.97),
        (bx(300, 110, w=90), "14.36786", 1.0),
        (bx(700, 110, w=200), "Ci technology", 0.99),
    ]
    grows = rows_from_ocr(graphic, image_width=1080)
    check("alternate layout parsed", len(grows) == 2)
    check("alternate layout values",
          {r.value for r in grows} == {39.93852, 14.36786})
    check("alternate layout names",
          any("Azimut" in r.name for r in grows) and any("Ci tech" in r.name for r in grows))

    # -- HTML table ----------------------------------------------------
    tbl_page = (
        '<div itemprop="articleBody">بتاريخ 6-9-2026'
        '<table><tr><th>سعر الوثيقة بالجنيه</th><th>اسم الصندوق</th></tr>'
        '<tr><td>21.22137</td><td>AZ - IDKHAR</td></tr>'
        '<tr><td>265.7691</td><td>Aafaq Investment Fund</td></tr>'
        '<tr><td></td><td>Sarwaty Fund</td></tr>'          # blank price: skip
        '<tr><td>15.5</td><td>صندوق عربي فقط</td></tr>'      # Arabic-only: skip
        '</table></div>')
    trows = rows_from_html_table(tbl_page)
    check("html table rows", len(trows) == 2)
    check("html table values", trows[0].value == 21.22137 and trows[1].value == 265.7691)
    check("html table decimals", trows[0].decimals == 5 and trows[1].decimals == 4)
    check("html table skips blank + arabic-only rows",
          all("Sarwaty" not in r.name for r in trows))
    check("html table beats OCR", read_statement.__doc__ is not None)

    # -- the USD statements: no "بتاريخ", bare date corroborated by headline --
    usd = ('<title>أسعار وثائق صناديق الاستثمار الدولارية 5-9-2026 - معلومات مباشر</title>'
           '<div itemprop="articleBody">تواصل مباشر رصد الأسعار 5-9-2026 يومياً</div>')
    check("bare date + headline", parse_statement_date(usd) == date(2026, 9, 5))

    lone = '<div itemprop="articleBody">تواصل مباشر رصد الأسعار 5-9-2026</div>'
    try:
        parse_statement_date(lone)
        check("bare date with no headline must raise", False)
    except StatementError:
        pass

    # The general statement names the last EGX SESSION three days before its own
    # valuation date. That sentence must not be mistaken for the valuation date.
    decoy = ('<title>أسعار وثائق صناديق الاستثمار المصرية 6-9-2026</title>'
             '<div itemprop="articleBody">وفقاً لبيانات التداول الصادرة بتاريخ 6 سبتمبر 2026. '
             'يُشار إلى أن الأسعار هي آخر الأسعار المعلنة بنهاية جلسة الخميس 3 سبتمبر 2026، '
             'وذلك قبل عطلة البورصة. وتأتي الأسعار بتاريخ 6-9-2026 على النحو التالي:</div>')
    check("session-close decoy ignored", parse_statement_date(decoy) == date(2026, 9, 6))

    # -- reconciliation ------------------------------------------------
    mapping = {normalise_name("Afaaq Fund"): "5751",
               normalise_name("AZFI"): "5729",
               normalise_name("Horus M.M"): "5906"}
    held = {"5751": {"2025-08-06": 216.52730}}

    def R(name, val, dec=5):
        return StatementRow(name=name, value=val, decimals=dec, y=0, confidence=1.0)

    r = reconcile(date(2025, 8, 6),
                  [R("Afaaq Fund", 216.52730), R("AZFI", 18.32121)],
                  mapping, held)
    check("rejects too few checksum rows", not r.ok and "checksum rows" in r.reason)

    held3 = {"5751": {"2025-08-06": 216.52730},
             "5729": {"2025-08-06": 18.32121},
             "5906": {"2025-08-06": 16.99845}}
    r = reconcile(date(2025, 8, 6),
                  [R("Afaaq Fund", 216.52730), R("AZFI", 18.32121),
                   R("Horus M.M", 16.99845)],
                  mapping, held3)
    check("accepts a clean pass", r.ok and r.checksum_used == 3)

    # one misread digit must sink the WHOLE statement, including good rows
    r = reconcile(date(2025, 8, 6),
                  [R("Afaaq Fund", 216.52730), R("AZFI", 18.32121),
                   R("Horus M.M", 16.99845), R("Misr", 1.0)],
                  {**mapping, normalise_name("Misr"): "9999"},
                  {**held3, "9999": {"2025-08-06": 2.0}})
    check("one bad checksum rejects everything", not r.ok and not r.accepted)

    # a rounded row cannot be used as a checksum, and must not fail one
    r = reconcile(date(2025, 8, 6),
                  [R("Afaaq Fund", 216.53, dec=2), R("AZFI", 18.32121),
                   R("Horus M.M", 16.99845)],
                  mapping, held3)
    check("rounded rows excluded from checksum", r.checksum_used == 2 and not r.ok)

    # new rows are what we are here for
    r = reconcile(date(2025, 8, 6),
                  [R("Afaaq Fund", 216.52730), R("AZFI", 18.32121),
                   R("Horus M.M", 16.99845), R("Weladna", 13.438)],
                  {**mapping, normalise_name("Weladna"): "6038"}, held3)
    check("new observation accepted", r.ok and ("6038", 13.438) in r.accepted)

    check("unmapped names surface", "Weladna" in reconcile(
        date(2025, 8, 6),
        [R("Afaaq Fund", 216.52730), R("AZFI", 18.32121),
         R("Horus M.M", 16.99845), R("Weladna", 13.438)],
        mapping, held3).unmapped)

    # normalisation
    check("normalise folds noise",
          normalise_name("Afaaq Investment Fund") == normalise_name("Afaaq Fund"))

    # -- series reconciliation -----------------------------------------
    # a money-market fund accruing ~0.04%/day, with a 5-day hole in the middle
    mm = {}
    v = 100.0
    for i in range(1, 61):
        d = date(2026, 1, 1).toordinal() + i
        v *= 1.0004
        mm[date.fromordinal(d).isoformat()] = round(v, 5)
    band = daily_move_band(mm)
    check("band learned from history is tight for MM", band < 1.0)

    hole = {d: x for d, x in mm.items() if not ("2026-02-05" <= d <= "2026-02-09")}
    fill = {d: x for d, x in mm.items() if "2026-02-05" <= d <= "2026-02-09"}
    r = reconcile_series("mm", hole, fill)
    check("clean fill accepted", r.ok and len(r.accepted) == len(fill))

    # a single misread digit inside the hole must be refused, neighbours kept
    bad = dict(fill)
    bad["2026-02-07"] = 10.0                     # decimal point slipped
    r = reconcile_series("mm", hole, bad)
    check("implausible point rejected",
          r.ok and "2026-02-07" not in r.accepted and len(r.accepted) == len(fill) - 1)
    check("rejection is explained", any("exceeds band" in why for _, _, why in r.rejected))

    # a value that contradicts one we already hold sinks the whole fund
    r = reconcile_series("mm", mm, {"2026-02-07": mm["2026-02-07"] * 1.05})
    check("overlap conflict refuses the fund", (not r.ok) and not r.accepted)
    check("conflict is reported", len(r.conflicts) == 1)

    # -- CLOSURE: the regression that made this gate worth having ------
    # A per-day bias small enough to pass every individual step still compounds
    # across a 412-day hole. Before closure existed this filled 293 of 293
    # points with zero rejections and landed 107.9% from the truth.
    long_held, x = {}, 16.0
    dd = date(2024, 1, 1)
    while dd < date(2025, 5, 15):
        if dd.weekday() not in (4, 5):
            x *= 1.0004
            long_held[dd.isoformat()] = round(x, 4)
        dd += timedelta(days=1)
    pre = long_held[max(long_held)]
    truth, w = pre * (1.0004 ** 292), pre * (1.0004 ** 292)
    dd = date(2026, 6, 30)
    while dd <= date(2026, 9, 2):
        if dd.weekday() not in (4, 5):
            long_held[dd.isoformat()] = round(w, 4)
            w *= 1.0004
        dd += timedelta(days=1)

    def _fill(bias):
        out, y = {}, pre
        d0 = date(2025, 5, 15)
        while d0 < date(2026, 6, 30):
            if d0.weekday() not in (4, 5):
                y *= 1.0004 * bias
                out[d0.isoformat()] = round(y, 5)
            d0 += timedelta(days=1)
        return out

    r = reconcile_series("mm", long_held, _fill(1.0))
    check("honest 412-day fill accepted", r.ok and len(r.accepted) == 293)
    check("honest fill lands on the truth",
          abs(r.accepted[max(r.accepted)] - truth) / truth < 0.001)

    r = reconcile_series("mm", long_held, _fill(1.0025))
    check("compounding drift refused at the join", (not r.ok) and not r.accepted)
    check("closure names the junction",
          bool(r.conflicts) and "->" in str(r.conflicts[0][0]))

    r = reconcile_series("mm", long_held, _fill(1.0002))
    check("even a 0.02%/day bias is refused", (not r.ok) and not r.accepted)

    # A per-day band alone is not a cap. Across a 300-day gap a 2%/day band
    # "permits" 600%, so a claimed doubling sails through at 0.33%/day. The
    # total-move ceiling is the only thing that stops it.
    thin = {"2025-01-01": 10.0, "2025-01-02": 10.01, "2026-06-01": 12.0}
    doubling = {"2025-10-29": 10.01 * 2.0}
    r = reconcile_series("thin", thin, doubling)
    check("total-move cap catches a legal-rate absurdity", not r.accepted)
    check("cap rejection explains itself",
          bool(r.rejected) and "cap" in r.rejected[0][2])
    check("thin history gets the strict fallback band",
          daily_move_band(thin) <= 2.0)

    # ...but the ceiling must not refuse a real volatile-fund move across a long
    # junction. This is fund 5989's actual shape: a precious-metals fund whose
    # held data either side confirms the rally the statement sits inside.
    gold = {"2025-05-14": 18.3581, "2025-12-31": 22.72,
            "2026-01-29": 27.03, "2026-02-26": 26.78}
    for i in range(30):                       # enough history to learn a band
        gold[f"2025-{(i % 4) + 1:02d}-{(i % 27) + 1:02d}"] = 15.0 + i * 0.12
    r = reconcile_series("5989", gold, {"2025-08-06": 18.16707})
    check("a real +25% gold move over 147 days is NOT refused",
          "2025-08-06" in r.accepted)

    # -- strict price parsing ------------------------------------------
    check("plain price parses", parse_price("21.19104") == (21.19104, 5))
    check("row number is not a price", parse_price("2") is None)
    check("blank is not a price", parse_price("") is None)
    for grouped in ("1,234", "1 234.56", "3,963.63", "1٬234"):
        try:
            parse_price(grouped)
            check(f"grouped digits must raise: {grouped}", False)
        except StatementError:
            pass
    check("comma is never a decimal separator", True)

    # a volatile equity fund must not be judged by a money-market band
    eq = {}
    v = 10.0
    for i in range(1, 61):
        v *= 1.03 if i % 2 else 0.97
        eq[date.fromordinal(date(2026, 1, 1).toordinal() + i).isoformat()] = round(v, 5)
    check("band adapts to a volatile fund", daily_move_band(eq) > band * 3)

    # -- era bridging --------------------------------------------------
    al = {normalise_name("HORUS - AFIM"): "5906",
          normalise_name("Aafaq Investment Fund"): "5751",
          normalise_name("Weladna Charity fund"): "6038",
          normalise_name("CI-ctor Exporting"): "6199"}
    check("bridges a renamed fund", "5906" in propose_bridge("Horus M.M", al))
    check("bridges Afaaq spelling", "5751" in propose_bridge("Afaaq Fund", al))
    check("bridges Weladna", "6038" in propose_bridge("Weladna", al))
    check("does not bridge an unrelated name",
          propose_bridge("Zaldi Star Money Market", al) == [])
    check("empty name proposes nothing", propose_bridge("", al) == [])

    # the alias file itself must load, validate, and be non-trivial
    try:
        loaded = load_aliases()
        check("alias file loads", len(loaded) >= 40)
        check("alias values are fund ids", all(str(v).isdigit() for v in loaded.values()))
    except FileNotFoundError:
        fails.append("alias file missing")

    # schema validation must actually reject bad entries
    import tempfile as _tf

    def _alias_doc(entry):
        return {"aliases": {"x": entry}}

    for label, entry in [
        ("non-numeric fund_id", {"fund_id": "abc", "dates": 5}),
        ("missing evidence count", {"fund_id": "5906"}),
        ("evidence below floor", {"fund_id": "5906", "dates": 1}),
    ]:
        with _tf.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
            json.dump(_alias_doc(entry), fh)
            tmp = fh.name
        try:
            load_aliases(tmp)
            check(f"alias schema must reject: {label}", False)
        except StatementError:
            pass
        finally:
            os.unlink(tmp)

    if fails:
        print("SELF-TEST FAILURES:")
        for f in fails:
            print("  -", f)
        return 1
    print("self-test: all checks passed")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--article", help="Mubasher news article id")
    ap.add_argument("--cache-dir", default=None)
    ap.add_argument("--dump", action="store_true", help="print the parsed rows")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return _self_test()
    if not args.article:
        ap.error("--article or --self-test required")

    page = fetch_article(args.article, cache_dir=args.cache_dir)
    stmt_date, rows = read_statement(page)
    print(f"statement date: {stmt_date}   rows read: {len(rows)}")
    if args.dump:
        for r in rows:
            print(f"  {r.value:>14.5f}  ({r.decimals}dp)  {r.name[:60]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
