#!/usr/bin/env python3
"""
Per-fund NAV data-quality scoring — pure math, no DB, no network.

WHY THIS EXISTS (2026-08-15 audit)
----------------------------------
The funds pipeline failed for thirteen months with every alarm green. The reason
was structural, not a bug: the failure mode is PER-FUND (Mubasher froze one
fund's CSV at a time) while every check was AGGREGATE.

    monitor() asked only:  MAX(date) across ALL funds <= 5 days old
                           AND >= 30 funds fresh within 10 days

One healthy fund satisfies the first for the entire universe. The list-API sync
writes one point per day for ~183 funds, so the second passes with six-fold
headroom. Both stayed green while 61 funds carried a 13-month hole and 26 had no
history at all. An aggregate statistic cannot observe a per-entity failure — no
threshold tuning fixes that, only a per-entity ledger does.

This module produces that ledger: one quality record per fund, which the monitor
then alerts on by DISTRIBUTION (how many funds below grade, worst coverage)
rather than by universe maximum.

NOT EVERY GAP IS A DEFECT — the part that must not be got wrong:
  * 54 of 195 Egyptian funds publish WEEKLY. A 7-day interval is their cadence,
    not a hole. A fixed day-count threshold would condemn all of them.
  * The EGX was genuinely shut 2011-01-27 -> 2011-03-23 (revolution). 23 funds
    lived through it. That is real market history and must never be "filled".
  * The Egyptian week is Sunday-Thursday, so Fri/Sat absences are structural.

So tolerance is derived from each fund's OWN median interval, and known closures
are excluded. Only what remains is missing data.

CONTRACT WITH THE FRONTEND
--------------------------
The thresholds here MUST equal frontend/lib/nav-gaps.ts. A chart that severs a
line where this module reports no gap (or vice versa) is worse than either
behaviour alone, because the page and the ledger would disagree about the same
fund. backend-core/tests/test_gap_contract_parity.py runs BOTH implementations
over the same fixture and fails on any divergence.

PURE by design (stdlib only) so every rule is unit tested on series with known
answers. The DB wrapper lives in scripts/compute_fund_data_quality.py.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from statistics import median
from typing import Iterable, Optional

# ---------------------------------------------------------------- constants --
# MUST match frontend/lib/nav-gaps.ts. See test_gap_contract_parity.py.
GAP_TOLERANCE_FLOOR_DAYS = 10
GAP_TOLERANCE_CADENCE_MULT = 3
BREAK_TOLERANCE_FLOOR_DAYS = 30
BREAK_TOLERANCE_CADENCE_MULT = 10

# Exchange closures that are real history, not missing data.
CLOSURES: tuple[tuple[date, date], ...] = (
    (date(2011, 1, 27), date(2011, 3, 23)),   # Egyptian revolution — EGX shut ~8 weeks
)

# Cadence buckets, by median interval in days.
_CADENCE_BUCKETS = (
    (1.5, "daily"),
    (4.0, "few-per-week"),
    (9.0, "weekly"),
    (18.0, "biweekly"),
    (40.0, "monthly"),
)


def _norm(series: Iterable) -> list[tuple[date, float]]:
    """Sort ascending, drop unusable points, de-duplicate by date."""
    out: dict[date, float] = {}
    for item in series or ():
        try:
            d, v = item[0], float(item[1])
        except (TypeError, ValueError, IndexError):
            continue
        if isinstance(d, datetime):
            d = d.date()
        if not isinstance(d, date):
            try:
                d = datetime.strptime(str(d)[:10], "%Y-%m-%d").date()
            except ValueError:
                continue
        if v <= 0 or v != v or v in (float("inf"), float("-inf")):
            continue
        out[d] = v
    return sorted(out.items())


def _overlaps_closure(a: date, b: date) -> bool:
    return any(not (b <= s or a >= e) for s, e in CLOSURES)


def median_interval_days(series) -> float:
    """The fund's own publication rhythm. Median, so one long hole cannot skew it."""
    pts = _norm(series)
    if len(pts) < 3:
        return 1.0
    gaps = [(pts[i][0] - pts[i - 1][0]).days for i in range(1, len(pts))]
    return float(median(gaps))


def cadence_label(series) -> str:
    m = median_interval_days(series)
    for upper, label in _CADENCE_BUCKETS:
        if m <= upper:
            return label
    return "sparse"


def gap_tolerance_days(series) -> float:
    """Generous: feeds the completeness metric. Every real absence should count."""
    return max(GAP_TOLERANCE_FLOOR_DAYS,
               median_interval_days(series) * GAP_TOLERANCE_CADENCE_MULT)


def break_tolerance_days(series) -> float:
    """Conservative: only holes big enough that interpolating them would mislead."""
    return max(BREAK_TOLERANCE_FLOOR_DAYS,
               median_interval_days(series) * BREAK_TOLERANCE_CADENCE_MULT)


def find_gaps(series, tolerance_days: Optional[float] = None) -> list[dict]:
    """Intervals that are genuinely missing data — cadence and closures excluded."""
    pts = _norm(series)
    if len(pts) < 2:
        return []
    tol = gap_tolerance_days(pts) if tolerance_days is None else tolerance_days
    gaps = []
    for i in range(1, len(pts)):
        a, b = pts[i - 1][0], pts[i][0]
        days = (b - a).days
        if days <= tol or _overlaps_closure(a, b):
            continue
        gaps.append({"from": a.isoformat(), "to": b.isoformat(), "days": days})
    return gaps


def expected_points(series, as_of: Optional[date] = None) -> int:
    """
    How many observations this fund SHOULD have over its own lifetime, at its own
    cadence, excluding known closures. Deliberately derived from the fund rather
    than from a trading calendar: a weekly fund is not missing four points a week.
    """
    pts = _norm(series)
    if len(pts) < 2:
        return len(pts)
    step = max(1.0, median_interval_days(pts))
    first, last = pts[0][0], (as_of or pts[-1][0])
    span = (last - first).days
    for s, e in CLOSURES:
        lo, hi = max(first, s), min(last, e)
        if hi > lo:
            span -= (hi - lo).days
    return max(len(pts), int(span / step) + 1)


def grade(coverage_pct: float, worst_gap_days: int, age_days: int, points: int) -> str:
    """
    A single letter the monitor and the UI can both key on.

    Deliberately harsh on a long hole regardless of coverage: a fund can be 95%
    covered and still have a 13-month void that makes every trailing return
    meaningless. That case must not read as an A.
    """
    if points < 2:
        return "F"
    if worst_gap_days >= 365 or age_days > 60 or coverage_pct < 40:
        return "F"
    if worst_gap_days >= 90 or age_days > 30 or coverage_pct < 65:
        return "D"
    if worst_gap_days >= 45 or age_days > 14 or coverage_pct < 80:
        return "C"
    if worst_gap_days >= 21 or age_days > 7 or coverage_pct < 92:
        return "B"
    return "A"


def assess(fund_id: str, series, as_of: Optional[date] = None) -> dict:
    """The per-fund quality record. This is what the ledger stores."""
    pts = _norm(series)
    today = as_of or (pts[-1][0] if pts else date.today())
    if not pts:
        return {
            "fund_id": fund_id, "points": 0, "first_date": None, "last_date": None,
            "cadence": None, "median_interval_days": None, "expected_points": 0,
            "coverage_pct": 0.0, "gap_count": 0, "gap_days_total": 0,
            "worst_gap_days": 0, "worst_gap_from": None, "worst_gap_to": None,
            "age_days": None, "grade": "F",
        }

    gaps = find_gaps(pts)
    worst = max(gaps, key=lambda g: g["days"]) if gaps else None
    exp = expected_points(pts, as_of=today)
    coverage = round(min(100.0, (len(pts) / exp) * 100.0), 2) if exp else 0.0
    age = (today - pts[-1][0]).days
    return {
        "fund_id": fund_id,
        "points": len(pts),
        "first_date": pts[0][0].isoformat(),
        "last_date": pts[-1][0].isoformat(),
        "cadence": cadence_label(pts),
        "median_interval_days": round(median_interval_days(pts), 2),
        "expected_points": exp,
        "coverage_pct": coverage,
        "gap_count": len(gaps),
        "gap_days_total": sum(g["days"] for g in gaps),
        "worst_gap_days": worst["days"] if worst else 0,
        "worst_gap_from": worst["from"] if worst else None,
        "worst_gap_to": worst["to"] if worst else None,
        "age_days": age,
        "grade": grade(coverage, worst["days"] if worst else 0, age, len(pts)),
    }
