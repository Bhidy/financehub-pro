"""
Offline unit tests for per-fund NAV data-quality scoring (no DB, no network).
Run:  cd backend-core && python -m pytest tests/test_fund_data_quality.py -q
Or standalone (no pytest):  python backend-core/tests/test_fund_data_quality.py
"""
import json
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_pipeline.fund_data_quality import (  # noqa: E402
    assess, cadence_label, find_gaps, gap_tolerance_days, break_tolerance_days,
    grade, median_interval_days,
)

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "nav_5784_real.json")


def _daily(n, start=date(2026, 1, 1), nav=100.0):
    return [(start + timedelta(days=i), nav + i) for i in range(n)]


def _weekly(n, start=date(2025, 1, 5), nav=50.0):
    return [(start + timedelta(days=7 * i), nav + i) for i in range(n)]


def _real_5784():
    with open(FIXTURE, encoding="utf-8") as fh:
        return [(date.fromisoformat(d), float(v)) for d, v in json.load(fh)]


# --------------------------------------------------------------- cadence ----

def test_cadence_detected_from_the_funds_own_rhythm():
    assert cadence_label(_daily(40)) == "daily"
    assert cadence_label(_weekly(40)) == "weekly"
    assert median_interval_days(_weekly(40)) == 7.0


def test_tolerance_scales_with_cadence_not_a_fixed_day_count():
    # The whole point: 54 of 195 funds publish weekly. A fixed threshold would
    # flag every one of them as broken.
    assert gap_tolerance_days(_daily(40)) == 10          # floor
    assert gap_tolerance_days(_weekly(40)) == 21         # 7 * 3
    assert break_tolerance_days(_daily(40)) == 30        # floor
    assert break_tolerance_days(_weekly(40)) == 70       # 7 * 10


def test_a_weekly_fund_has_no_gaps():
    assert find_gaps(_weekly(60)) == []


def test_a_monthly_fund_has_no_gaps():
    monthly = [(date(2024, 1, 1) + timedelta(days=30 * i), 10.0 + i) for i in range(24)]
    assert find_gaps(monthly) == []


# ------------------------------------------------------------- closures -----

def test_the_2011_egx_closure_is_real_history_not_a_defect():
    # The exchange was shut 27 Jan - 23 Mar 2011. 23 funds lived through it.
    series = [
        (date(2011, 1, 24), 10.0), (date(2011, 1, 25), 10.1), (date(2011, 1, 26), 10.0),
        (date(2011, 3, 24), 8.9), (date(2011, 3, 27), 9.0), (date(2011, 3, 28), 9.1),
    ]
    assert find_gaps(series) == []


def test_a_real_hole_next_to_the_closure_is_still_flagged():
    # Guard against the closure window swallowing genuine absences around it.
    series = [
        (date(2010, 1, 4), 10.0), (date(2010, 1, 5), 10.0),
        (date(2010, 9, 1), 11.0), (date(2010, 9, 2), 11.0),   # 239-day hole, pre-closure
        (date(2011, 3, 24), 9.0), (date(2011, 3, 25), 9.0),
    ]
    gaps = find_gaps(series)
    assert len(gaps) == 1
    assert gaps[0]["days"] == 239


# ------------------------------------------------- the production incident --

def test_real_fund_5784_carries_exactly_the_documented_hole():
    gaps = find_gaps(_real_5784())
    assert any(g["days"] == 412 and g["from"] == "2025-05-14" and g["to"] == "2026-06-30"
               for g in gaps), gaps


def test_real_fund_5784_is_graded_F_not_A():
    # It is ~99% "covered" by point count and still has a 13-month void that makes
    # every trailing return meaningless. Coverage alone must not earn an A.
    rec = assess("5784", _real_5784(), as_of=date(2026, 8, 15))
    assert rec["grade"] == "F", rec
    assert rec["worst_gap_days"] == 412
    assert rec["cadence"] == "daily"
    assert rec["points"] == 760


def test_a_clean_daily_fund_grades_A():
    rec = assess("clean", _daily(400, start=date(2025, 7, 15)), as_of=date(2026, 8, 18))
    assert rec["grade"] == "A", rec
    assert rec["gap_count"] == 0


def test_a_clean_weekly_fund_is_not_punished_for_being_weekly():
    rec = assess("weekly", _weekly(80, start=date(2025, 2, 2)), as_of=date(2026, 8, 17))
    assert rec["grade"] in ("A", "B"), rec
    assert rec["gap_count"] == 0
    assert rec["cadence"] == "weekly"


def test_a_thin_new_fund_is_not_an_A():
    # The 62xx/64xx cohort: ~13 points, all from mid-2026, no history upstream.
    rec = assess("6427", _daily(13, start=date(2026, 7, 1)), as_of=date(2026, 8, 15))
    assert rec["grade"] in ("C", "D", "F"), rec
    assert rec["points"] == 13


def test_a_stale_fund_is_graded_down_even_with_perfect_history():
    rec = assess("stale", _daily(300, start=date(2025, 1, 1)), as_of=date(2026, 8, 15))
    assert rec["grade"] == "F", rec        # last point ~2025-10, >60d old
    assert rec["age_days"] > 60


# ------------------------------------------------------------ degenerate ----

def test_degenerate_inputs_never_raise():
    assert assess("empty", [])["grade"] == "F"
    assert assess("one", [(date(2026, 1, 1), 1.0)])["grade"] == "F"
    assert find_gaps([]) == []
    assert find_gaps([(date(2026, 1, 1), 1.0)]) == []


def test_bad_rows_are_dropped_not_fatal():
    series = [
        (date(2026, 1, 1), 10.0), (date(2026, 1, 2), 0.0),      # zero -> dropped
        (date(2026, 1, 3), -5.0),                                # negative -> dropped
        (date(2026, 1, 4), float("nan")),                        # NaN -> dropped
        (date(2026, 1, 5), 11.0),
    ]
    rec = assess("messy", series, as_of=date(2026, 1, 6))
    assert rec["points"] == 2


def test_grade_is_monotonic_in_the_worst_gap():
    # A longer hole can never grade better than a shorter one, all else equal.
    grades = [grade(100.0, g, 1, 500) for g in (0, 25, 60, 120, 400)]
    order = {"A": 0, "B": 1, "C": 2, "D": 3, "F": 4}
    assert [order[g] for g in grades] == sorted(order[g] for g in grades)


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_") or not callable(fn):
            continue
        try:
            fn()
            print(f"  ok   {name}")
        except AssertionError as exc:
            failed += 1
            print(f"  FAIL {name}: {exc}")
    print("\n✅ all data-quality assertions passed" if not failed
          else f"\n❌ {failed} failed")
    sys.exit(1 if failed else 0)
