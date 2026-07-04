"""
Offline unit tests for the pure fund risk-metric math (no DB, no network).
Run:  cd backend-core && python -m pytest tests/test_fund_metrics.py -q
Or standalone (no pytest):  python backend-core/tests/test_fund_metrics.py
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_pipeline.fund_metrics import (  # noqa: E402
    total_return_pct, window_return_pct, ytd_return_pct, max_drawdown_pct,
    annualized_volatility_pct, nav_52w_high_low, compute_all,
    _split_adjust, _reject_spikes,
)


def _weekly(navs, start=date(2025, 1, 4)):
    """Build a weekly (7-day) dated series from a list of NAVs."""
    return [(start + timedelta(days=7 * i), float(v)) for i, v in enumerate(navs)]


def _daily(navs, start=date(2025, 1, 1)):
    """Build a daily (1-day) dated series from a list of NAVs."""
    return [(start + timedelta(days=i), float(v)) for i, v in enumerate(navs)]


# --- max drawdown ---------------------------------------------------------- #
def test_drawdown_peak_to_trough():
    # 100 -> 120 (peak) -> 90 (trough) -> 150 : worst dd = (90-120)/120 = -25%
    assert max_drawdown_pct(_weekly([100, 120, 90, 150])) == -25.0

def test_drawdown_monotonic_up_is_zero_not_none():
    assert max_drawdown_pct(_weekly([100, 110, 120, 130])) == 0.0

def test_drawdown_needs_two_points():
    assert max_drawdown_pct(_weekly([100])) is None
    assert max_drawdown_pct([]) is None

def test_drawdown_ignores_bad_points():
    # a NaN / zero / negative NAV must not poison the peak or the math
    s = _weekly([100, 120, 90, 150])
    s.insert(2, (date(2025, 3, 1), float("nan")))
    s.insert(3, (date(2025, 3, 2), 0))
    assert max_drawdown_pct(s) == -25.0


# --- returns --------------------------------------------------------------- #
def test_total_return():
    assert total_return_pct(_weekly([100, 150])) == 50.0

def test_window_return_30d():
    s = [(date(2025, 12, 31), 100.0), (date(2026, 1, 31), 110.0)]
    assert window_return_pct(s, 30) == 10.0

def test_ytd_return_prior_year_close():
    s = [(date(2025, 12, 31), 100.0), (date(2026, 1, 31), 110.0)]
    assert ytd_return_pct(s) == 10.0

def test_return_none_when_no_old_enough_ref():
    s = [(date(2026, 1, 20), 100.0), (date(2026, 1, 31), 110.0)]
    assert window_return_pct(s, 365) is None


# --- volatility (annualized by ACTUAL frequency) --------------------------- #
def test_weekly_volatility_scales_by_52_not_252():
    # returns [+10%, -10%] -> pstdev = 0.10 ; weekly -> *sqrt(365.25/7)=7.2235
    # -> 72.23% . A blind sqrt(252) would wrongly give ~158%.
    vol = annualized_volatility_pct(_weekly([100, 110, 99]))
    assert vol is not None and abs(vol - 72.23) < 0.05

def test_volatility_needs_two_returns():
    assert annualized_volatility_pct(_weekly([100, 110])) is None  # only 1 return


# --- 52w high/low + bundle ------------------------------------------------- #
def test_52w_high_low():
    hi, lo = nav_52w_high_low(_weekly([100, 130, 90, 110]))
    assert hi == 130.0 and lo == 90.0

def test_52w_window_excludes_old_points():
    old = [(date(2024, 1, 1), 500.0)]          # >365d before latest -> excluded
    recent = _weekly([100, 130, 90, 110], start=date(2026, 3, 1))
    hi, lo = nav_52w_high_low(old + recent)
    assert hi == 130.0 and lo == 90.0          # 500 must not appear

def test_compute_all_bundle_shape():
    m = compute_all(_weekly([100, 120, 90, 150]))
    assert m["max_drawdown"] == -25.0
    assert m["points"] == 4
    assert "sharpe" not in m and "beta" not in m  # gated, must be absent
    assert m["nav_52w_high"] == 150.0
    # latest_date MUST be a datetime.date (not str) — asyncpg rejects a string
    # for a DATE column, which would fail every upsert.
    assert isinstance(m["latest_date"], date)


# --- spike / bad-data hardening -------------------------------------------- #
def test_isolated_spike_removed_from_drawdown():
    # a single glitch (0.03 amid ~1.0) must NOT create a ~-97% drawdown
    s = _weekly([1.0, 1.01, 1.02, 0.03, 1.03, 1.04, 1.05])
    assert max_drawdown_pct(s) == 0.0            # despiked -> monotonic up
    v = annualized_volatility_pct(s)
    assert v is not None and v < 20              # not an absurd 200%+

def test_real_multipoint_crash_preserved():
    # a genuine multi-point decline is NOT treated as a spike
    assert max_drawdown_pct(_weekly([1.0, 0.9, 0.8, 0.7, 0.6])) == -40.0

def test_no_absurd_metrics_from_corrupt_series():
    # despike + output backstop guarantee: never an absurd vol/drawdown
    # (this is the money-market 232%-vol / -97%-DD case, made safe)
    m = compute_all(_weekly([1.0, 0.02, 1.0, 0.02, 1.0, 0.02, 1.0, 0.02, 1.0]))
    assert m["volatility_annual"] is None or m["volatility_annual"] <= 100
    assert m["max_drawdown"] is None or m["max_drawdown"] >= -90


def test_redenomination_stitched_not_a_fake_crash():
    # a 100:1 redenomination overnight (102 -> 1.03) must NOT read as a -99% drawdown
    dd = max_drawdown_pct(_daily([100, 101, 102, 1.03, 1.04, 1.05, 1.06]))
    assert dd is not None and dd > -5           # stitched -> continuous, ~no drawdown

def test_split_adjust_stitches_redenomination():
    # earlier points rescaled to the new (~1.0) scale after a 100:1 redenomination
    adj = dict(_split_adjust(_daily([100, 101, 102, 1.03, 1.04, 1.05])))
    assert all(0.9 < v < 1.2 for v in list(adj.values())[:3])

def test_split_adjust_gap_guard_leaves_wide_gap_move():
    # 100 -> 15 across 182 days is a real move, NOT a re-scaling: left unchanged
    adj = _split_adjust([(date(2020, 1, 1), 100.0), (date(2020, 7, 1), 15.0)])
    assert adj[0][1] == 100.0 and adj[1][1] == 15.0

def test_redenomination_across_short_data_gap_stitched():
    # a ~4:1 redenomination during a ~40-day Mubasher data gap (the 3889 pattern)
    s = _daily([100, 101, 102]) + [(date(2025, 2, 12), 25.0), (date(2025, 2, 13), 25.5),
                                   (date(2025, 2, 14), 26.0), (date(2025, 2, 15), 26.5)]
    adj = dict(_split_adjust(s))
    assert all(20 < v < 30 for v in list(adj.values())[:3])   # early block rescaled ~25

def test_reject_spikes_preserves_gradual_trend():
    # a dense gradual decline is NOT despiked (local median tracks it)
    kept = _reject_spikes([(date(2025, 1, i + 1), v) for i, v in
                           enumerate([100, 95, 90, 85, 80, 75, 70])])
    assert len(kept) == 7


# --- standalone runner (no pytest needed) ---------------------------------- #
if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = 0
    for fn in fns:
        try:
            fn()
            passed += 1
            print(f"  ok  {fn.__name__}")
        except AssertionError as e:
            print(f"FAIL  {fn.__name__}: {e}")
            raise SystemExit(1)
    print(f"\n{passed}/{len(fns)} fund-metric tests passed")
