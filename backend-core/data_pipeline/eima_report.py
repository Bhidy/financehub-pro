#!/usr/bin/env python3
"""
EIMA weekly performance report — pure parsing and NAV reconstruction.

WHY THIS EXISTS (2026-08-15 audit)
----------------------------------
Mubasher's per-fund CSV froze around 2025-05 for 61 funds, leaving a ~13-month
hole in the middle of their NAV history. Every other channel was checked and
ruled out: Mubasher's whole /api/1/funds/{id}/* subtree returns 500, only one
CSV path exists, and no fund was migrated to a new id. The FRA's iinvest portal
publishes today's NAV only. Wayback never captured the price pages.

EIMA (Egyptian Investment Management Association) publishes a weekly PDF with a
NAV column, and it is the only independent series that reaches into the hole.
But EIMA ALSO went dark: five separate archive captures of their Reports page
across 2025 (Jan/May/Aug/Oct/Dec) all show it frozen on February-2024 content.
They stopped after Feb 2024 and relaunched at end-2025. So the 2025 weekly PDFs
were never published and cannot be found.

THE RECOVERY
------------
Each report carries, beside the current NAV, a matrix of TIME-WEIGHTED returns:
weekly, 4-week, YTD, 12-month, 2/3/4/5/6-year. Inverting them reconstructs the
NAV at each of those anchor dates:

    nav(t - 1y) = nav(t) / (1 + return_12m)

So a report published in 2026 yields a NAV point in 2025 — inside the hole —
without EIMA having published anything in 2025 at all. Measured against our own
stored history where the two overlap, this reproduces NAV to 0.01%-0.5%.

WHAT THIS MODULE DOES NOT DO
----------------------------
It never decides what to write. Derived NAVs are lower-confidence than published
ones and are returned tagged as such; the caller reconciles them against real
data and drops anything that disagrees. See scripts/eima_backfill.py.

PURE by design (stdlib only, no PDF library, no DB, no network) so every rule is
unit tested against a committed text fixture of a real report.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Iterable, Optional

# Return columns, in the order they appear after the NAV column. Verified against
# the header of the 2026-06-04 report and cross-checked on a second issue.
RETURN_COLUMNS = ("weekly", "w4", "ytd", "y1", "y2", "y3", "y4", "y5", "y6")

# How far back each column's anchor sits, in days. YTD is handled separately
# because its anchor is 1 January of the report year, not a fixed offset.
_YEARS = {"y1": 1, "y2": 2, "y3": 3, "y4": 4, "y5": 5, "y6": 6}
_DAYS = {"weekly": 7, "w4": 28}

_MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}

# A data row: index, name+manager, Mon-YY inception, initial value, NAV, then
# alternating percent/rank pairs. Anchoring on the inception token is what makes
# this robust — fund and manager names both contain spaces and neither is quoted.
_ROW = re.compile(
    r"^\s*(\d+)\s+"                       # row index
    r"(.+?)\s+"                           # fund name + management company
    r"([A-Z][a-z]{2}-\d{2})\s+"           # inception, e.g. Dec-21
    r"(?:[$\u20ac\u00a3]\s*)?([\d,]+(?:\.\d+)?)\s+"   # initial value (may carry $/EUR/GBP)
    r"(?:[$\u20ac\u00a3]\s*)?([\d,]+(?:\.\d+)?)\s+"   # NAV (same)
    r"(.*)$"                              # the return/rank tail
)
_PCT = re.compile(r"(-?\d+(?:\.\d+)?)%")
_SECTION = re.compile(r"^\s*((?:Open|Closed)\s*End[^\n]*)$")


def parse_report_date(text: str) -> Optional[date]:
    """The report's own as-of date, e.g. '4-Jun-26' in the page header."""
    m = re.search(r"\b(\d{1,2})-([A-Z][a-z]{2})-(\d{2})\b", text)
    if m and m.group(2) in _MONTHS:
        return date(2000 + int(m.group(3)), _MONTHS[m.group(2)], int(m.group(1)))
    # Fallback: the NAV column is headed with the date as dd/mm/yy
    m = re.search(r"\b(\d{2})/(\d{2})/(\d{2})\b", text)
    if m:
        return date(2000 + int(m.group(3)), int(m.group(2)), int(m.group(1)))
    return None


def _num(s: str) -> Optional[float]:
    try:
        v = float(s.replace(",", ""))
    except (TypeError, ValueError):
        return None
    return v if v == v and v not in (float("inf"), float("-inf")) else None


def parse_rows(text: str) -> list[dict]:
    """
    Every fund row in the report.

    Returns dicts with: name, section, inception, initial, nav, and a `returns`
    map of column -> fraction (0.2299 for 22.99%). Missing columns are absent
    rather than zero — 'N/A' in the PDF means the fund is younger than the
    window, and treating that as a 0% return would fabricate history.
    """
    out: list[dict] = []
    section = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        sec = _SECTION.match(line)
        if sec:
            section = re.sub(r"\s+", " ", sec.group(1)).strip()
            continue
        # "These Funds were separated because of difference in valuation date"
        # header lines are NOT matched by _SECTION (trailing text), but they DO
        # flip the context: every row that follows carries a NAV valued at the
        # PRIOR YEAR-END, not at this report's date. Writing those under report
        # dates would place a December price in June. Mark and let callers skip.
        if "separated" in line.lower() and "valuation" in line.lower():
            section = (section or "") + " [SEPARATED-VALUATION]"
            continue
        m = _ROW.match(line)
        if not m:
            continue
        # THE EMPTY-NAV SIGNATURE (found in production, the hard way). When a
        # row's NAV cell is blank, the regex slides right and captures the first
        # RETURN's digits as the NAV — "1.0493%" became NAV 1.0493 and fund 6402
        # received a series of percentages as prices. The tell is exact: the
        # remainder then STARTS with the orphaned '%'. Such a row has no NAV and
        # must not exist, not guess.
        if m.group(6).lstrip().startswith("%"):
            continue
        nav = _num(m.group(5))
        if nav is None or nav <= 0:
            continue
        # The percent tokens appear in column order; ranks are bare integers and
        # are skipped by matching only on the % sign.
        pcts = [float(x) / 100.0 for x in _PCT.findall(m.group(6))]
        returns = {c: p for c, p in zip(RETURN_COLUMNS, pcts)}
        raw_name = re.sub(r"\s+", " ", m.group(2)).strip()
        # Foreign-currency funds were silently DROPPED before (the $ broke the
        # regex, 13 rows per report, no counter). They now parse, tagged, so the
        # backfill can refuse to write a USD series into an EGP fund — the data
        # gate would refuse anyway, but identity should not depend on luck.
        currency = "USD" if "$" in raw_name or "usd" in raw_name.lower() else (
            "EUR" if "\u20ac" in raw_name or "euro" in raw_name.lower() else "EGP")
        out.append({
            "name": raw_name,
            "currency": currency,
            "separated": bool(section and "[SEPARATED-VALUATION]" in section),
            "section": section,
            "inception": m.group(3),
            "initial": _num(m.group(4)),
            "nav": nav,
            "returns": returns,
        })
    return out


def _shift_years(d: date, years: int) -> date:
    try:
        return d.replace(year=d.year - years)
    except ValueError:          # 29 Feb -> 28 Feb
        return d.replace(year=d.year - years, day=28)


def derive_navs(row: dict, report_date: date,
                columns: Iterable[str] = ("y1", "y2", "y3", "y4", "y5", "y6", "ytd")) -> list[dict]:
    """
    Reconstruct historical NAVs by inverting the return matrix.

    nav(anchor) = nav(report_date) / (1 + return)

    Only the columns actually present are used. A return of exactly -100% is
    rejected rather than dividing by zero, and any anchor that would predate the
    fund's inception is dropped.

    Every result is tagged `derived=True`. These are NOT equivalent to published
    NAVs: they are weekly-resolution, time-weighted, and for a DISTRIBUTING fund
    a time-weighted return includes reinvested income that the raw NAV does not.
    The caller must reconcile before writing.
    """
    nav_now = row.get("nav")
    if not nav_now or nav_now <= 0:
        return []
    inception = None
    m = re.match(r"([A-Z][a-z]{2})-(\d{2})", row.get("inception") or "")
    if m and m.group(1) in _MONTHS:
        inception = date(2000 + int(m.group(2)), _MONTHS[m.group(1)], 1)

    out: list[dict] = []
    for col in columns:
        r = row.get("returns", {}).get(col)
        if r is None or r <= -0.999999:
            continue
        if col == "ytd":
            anchor = date(report_date.year, 1, 1)
        elif col in _YEARS:
            anchor = _shift_years(report_date, _YEARS[col])
        elif col in _DAYS:
            anchor = date.fromordinal(report_date.toordinal() - _DAYS[col])
        else:
            continue
        if anchor >= report_date:
            continue
        if inception and anchor < inception:
            continue                      # the window predates the fund
        out.append({
            "name": row["name"],
            "date": anchor,
            "nav": round(nav_now / (1.0 + r), 6),
            "column": col,
            "derived": True,
            "from_report": report_date,
        })
    return out


def split_managers(rows: list[dict]) -> list[dict]:
    """
    Separate the fund name from the management company.

    The PDF renders them as one run of text with no delimiter, and both contain
    spaces, so there is nothing to split on syntactically. But a manager appears
    on MANY rows while a fund name appears once — so the repeated trailing
    phrases ARE the managers, and the report tells us who they are without a
    hardcoded list that would rot the first time a company rebrands.
    """
    from collections import Counter
    # A fund's series number (I, II, III...) sits immediately before the manager
    # and repeats just as often, so "I Hermes Portfolio and Fund Management"
    # looks like a manager and, being longer, would win the longest-match. Refuse
    # any candidate that opens with a numbering token.
    _ROMAN = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}
    tails: Counter = Counter()
    for r in rows:
        words = r["name"].split()
        # Managers here run 2-6 words ("NI Capital" .. "Al Ahly Financial
        # Investments Management").
        for n in range(2, 7):
            if len(words) <= n:
                continue
            cand = words[-n:]
            first = cand[0].lstrip("*").lower()
            if first in _ROMAN or first.isdigit():
                continue
            tails[" ".join(cand)] += 1
    # A phrase is a manager if it ends several different rows.
    managers = {t for t, c in tails.items() if c >= 3}
    out = []
    for r in rows:
        name, mgr = r["name"], None
        best = ""
        for m in managers:
            if name.endswith(" " + m) and len(m) > len(best):
                best = m
        if best:
            mgr, name = best, name[: -len(best)].strip()
            # A trailing "*" is EIMA's disclaimer marker, not part of the name.
            name = name.rstrip("*").strip()
            # A manager carrying a disclaimer marker ("*PFI Asset Management")
            # appears too rarely to clear the frequency bar, so only its common
            # tail matched and the "*PFI" was stranded on the fund name.
            m2 = re.search(r"\s\*(\S+)$", name)
            if m2:
                name = name[: m2.start()].strip()
                mgr = f"{m2.group(1)} {mgr}".strip()
        out.append({**r, "name": name, "manager": mgr})
    return out


def parse_report(text: str) -> dict:
    """Whole report: as-of date, published NAVs, and every derivable NAV."""
    rd = parse_report_date(text)
    rows = split_managers(parse_rows(text))
    published = [{"name": r["name"], "date": rd, "nav": r["nav"],
                  "column": "nav", "derived": False, "from_report": rd}
                 for r in rows] if rd else []
    derived: list[dict] = []
    if rd:
        for r in rows:
            derived.extend(derive_navs(r, rd))
    return {"report_date": rd, "rows": rows,
            "published": published, "derived": derived}
