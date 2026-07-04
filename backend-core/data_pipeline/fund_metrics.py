#!/usr/bin/env python3
"""
Pure fund risk-metric math — computed from our own nav_history, no external feed.

WHY THIS EXISTS
---------------
Our advanced fund metrics (volatility, drawdown) were 100% NULL in production:
the only scripts that would have populated them scraped Decypha and were never
scheduled, and no `max_drawdown` existed server-side at all. A competitor shows a
drawdown figure but computes it wrong (maxDrawdown=0 on funds that clearly fell).
Since we already store a fresh daily NAV series per fund, the correct move is to
COMPUTE these deterministically from nav_history — no scraping, no login, no
external dependency, and no wrong-benchmark assumptions.

This module is PURE (stdlib only, no DB, no network) so every formula is unit
tested on synthetic series with known answers. The DB read/write wrapper lives in
scripts/compute_fund_metrics.py.

CONVENTIONS
-----------
  * `series` is a list of (date, nav) tuples in ANY order; helpers sort ascending
    and drop non-finite / non-positive NAVs defensively.
  * returns are PERCENT (e.g. 12.34 == +12.34%).
  * max_drawdown is a NEGATIVE percent (worst peak-to-trough); 0.0 for a series
    that only ever rose; None when there are < 2 usable points.
  * volatility is annualized by the series' ACTUAL observation frequency (weekly
    vs daily), NOT a hardcoded sqrt(252) — Egyptian fund NAVs are mostly weekly.
"""
from __future__ import annotations

import math
from datetime import date, timedelta
from statistics import pstdev
from typing import Iterable, Optional

_YEAR_DAYS = 365.25


def _clean(series: Iterable[tuple]) -> list[tuple[date, float]]:
    """Sort ascending by date, coerce, and drop unusable points (NaN/Inf/<=0)."""
    out: dict[date, float] = {}
    for d, nav in series or []:
        try:
            v = float(nav)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(v) or v <= 0:
            continue
        out[d] = v  # last value wins on duplicate date
    return sorted(out.items())


def total_return_pct(series) -> Optional[float]:
    pts = _clean(series)
    if len(pts) < 2:
        return None
    first, last = pts[0][1], pts[-1][1]
    if first <= 0:
        return None
    return round((last / first - 1.0) * 100.0, 4)


def window_return_pct(series, days: int) -> Optional[float]:
    """% change from the NAV as of (latest_date - days) to the latest NAV.

    Uses the last point on/before the window start so a weekly series still
    resolves a reference. Returns None if no point is old enough.
    """
    pts = _clean(series)
    if len(pts) < 2:
        return None
    latest_date, latest_nav = pts[-1]
    cutoff = latest_date - timedelta(days=days)
    ref = None
    for d, v in pts:
        if d <= cutoff:
            ref = v
        else:
            break
    if ref is None or ref <= 0:
        return None
    return round((latest_nav / ref - 1.0) * 100.0, 4)


def ytd_return_pct(series) -> Optional[float]:
    """% change from the last NAV of the PRIOR year to the latest NAV."""
    pts = _clean(series)
    if len(pts) < 2:
        return None
    latest_date, latest_nav = pts[-1]
    jan1 = date(latest_date.year, 1, 1)
    ref = None
    for d, v in pts:
        if d < jan1:
            ref = v
        else:
            break
    if ref is None or ref <= 0:
        return None
    return round((latest_nav / ref - 1.0) * 100.0, 4)


def max_drawdown_pct(series) -> Optional[float]:
    """Worst peak-to-trough decline as a NEGATIVE percent (running-peak method).

    Same algorithm as the mobile app's client-side chart stat, moved server-side.
    A series that only rises returns 0.0 (NOT None) — that is a real "no drawdown"
    signal. None only when there are < 2 usable points.
    """
    pts = _clean(series)
    if len(pts) < 2:
        return None
    peak = pts[0][1]
    worst = 0.0
    for _, v in pts:
        if v > peak:
            peak = v
        elif peak > 0:
            dd = (v - peak) / peak * 100.0
            if dd < worst:
                worst = dd
    return round(worst, 4)


def annualized_volatility_pct(series) -> Optional[float]:
    """Annualized volatility (%) of periodic simple returns.

    Annualized by the series' ACTUAL average sampling interval, so a weekly NAV
    series is scaled by sqrt(52-ish) and a daily one by sqrt(252-ish) WITHOUT
    assuming which it is. Needs >= 3 points to have >= 2 returns. Returns None
    when the interval is undefined or there are too few points.
    """
    pts = _clean(series)
    if len(pts) < 3:
        return None
    rets: list[float] = []
    gaps: list[int] = []
    for (d0, v0), (d1, v1) in zip(pts, pts[1:]):
        if v0 <= 0:
            continue
        rets.append(v1 / v0 - 1.0)
        gaps.append((d1 - d0).days)
    if len(rets) < 2:
        return None
    gaps = [g for g in gaps if g > 0]
    if not gaps:
        return None
    avg_gap = sum(gaps) / len(gaps)
    periods_per_year = _YEAR_DAYS / avg_gap
    vol = pstdev(rets) * math.sqrt(periods_per_year)
    return round(vol * 100.0, 4)


def nav_52w_high_low(series) -> tuple[Optional[float], Optional[float]]:
    """(high, low) NAV over the trailing 365 days; (None, None) if empty."""
    pts = _clean(series)
    if not pts:
        return None, None
    latest_date = pts[-1][0]
    cutoff = latest_date - timedelta(days=365)
    window = [v for d, v in pts if d >= cutoff]
    if not window:
        window = [pts[-1][1]]
    return round(max(window), 6), round(min(window), 6)


def compute_all(series) -> dict:
    """Bundle every metric for one fund. Sharpe/alpha/beta are intentionally
    OMITTED here: they need an EGX benchmark series + a real EGP risk-free rate,
    and publishing a wrong Sharpe (0% RF, blind sqrt(252)) is worse than a blank
    one. Those land in a later phase behind a proper benchmark join."""
    pts = _clean(series)
    hi, lo = nav_52w_high_low(pts)
    return {
        "points": len(pts),
        "latest_nav": round(pts[-1][1], 6) if pts else None,
        "latest_date": pts[-1][0].isoformat() if pts else None,
        "return_1m": window_return_pct(pts, 30),
        "return_3m": window_return_pct(pts, 91),
        "return_6m": window_return_pct(pts, 182),
        "return_ytd": ytd_return_pct(pts),
        "return_1y": window_return_pct(pts, 365),
        "return_3y": window_return_pct(pts, 1095),
        "return_5y": window_return_pct(pts, 1826),
        "volatility_annual": annualized_volatility_pct(pts),
        "max_drawdown": max_drawdown_pct(pts),
        "nav_52w_high": hi,
        "nav_52w_low": lo,
    }
