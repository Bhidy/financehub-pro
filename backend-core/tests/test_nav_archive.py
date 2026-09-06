"""The NAV archive's only job is to notice history disappearing.

These cases are written against the incident that motivated it: 61 funds each
lost thirteen months while the platform's totals kept RISING, because the healthy
funds more than covered the loss. A check on totals would have stayed green
through the whole thing, so the per-fund cases below are the point.
"""
import importlib.util
import pathlib

spec = importlib.util.spec_from_file_location(
    "nav_archive", pathlib.Path(__file__).parent.parent / "scripts" / "nav_archive.py")
nav_archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nav_archive)
compare = nav_archive.compare
build_manifest = nav_archive.build_manifest


def snap(per_fund):
    return {"taken_at": "t", "funds": len(per_fund),
            "rows": sum(f["points"] for f in per_fund.values()),
            "per_fund": per_fund}


def f(points, first, last):
    return {"points": points, "first": first, "last": last}


def test_growth_is_silent():
    prev = snap({"100": f(10, "2025-01-01", "2025-06-01")})
    now = snap({"100": f(25, "2025-01-01", "2026-09-01")})
    assert compare(prev, now) == []


def test_a_fund_losing_points_is_caught():
    prev = snap({"100": f(500, "2021-01-01", "2026-09-01")})
    now = snap({"100": f(88, "2021-01-01", "2026-09-01")})
    problems = compare(prev, now)
    assert len(problems) == 1 and "LOST 412" in problems[0]


def test_a_fund_disappearing_is_caught():
    prev = snap({"100": f(10, "2025-01-01", "2025-06-01"),
                 "200": f(10, "2025-01-01", "2025-06-01")})
    now = snap({"100": f(12, "2025-01-01", "2025-07-01")})
    problems = compare(prev, now)
    assert len(problems) == 1 and "200" in problems[0] and "DISAPPEARED" in problems[0]


def test_truncating_the_start_is_caught():
    prev = snap({"100": f(10, "2012-04-01", "2026-09-01")})
    now = snap({"100": f(10, "2025-01-01", "2026-09-01")})
    assert any("TRUNCATED" in p for p in compare(prev, now))


def test_latest_going_backwards_is_caught():
    prev = snap({"100": f(10, "2025-01-01", "2026-09-02")})
    now = snap({"100": f(10, "2025-01-01", "2026-06-30")})
    assert any("WENT BACKWARDS" in p for p in compare(prev, now))


def test_the_incident_shape_totals_rise_while_funds_are_gutted():
    """The exact failure that ran undetected for fourteen months.

    Sixty-one funds lose most of their history; the rest grow enough that the
    row total goes UP. Any aggregate check passes. This must not.
    """
    prev = snap({**{str(i): f(500, "2021-01-01", "2026-09-01") for i in range(61)},
                 **{str(100 + i): f(500, "2021-01-01", "2026-09-01") for i in range(134)}})
    now = snap({**{str(i): f(88, "2021-01-01", "2026-09-01") for i in range(61)},
                **{str(100 + i): f(800, "2021-01-01", "2026-09-01") for i in range(134)}})
    assert now["rows"] > prev["rows"], "precondition: the total must RISE"
    problems = compare(prev, now)
    assert len(problems) == 61


def test_a_corrected_nav_is_not_loss():
    """Values may be corrected; dates may not vanish. The digest is over dates."""
    rows_a = [{"fund_id": "1", "date": "2025-05-14", "nav": 10.0, "source": "x"}]
    rows_b = [{"fund_id": "1", "date": "2025-05-14", "nav": 11.5, "source": "y"}]
    assert build_manifest(rows_a)["date_digest"] == build_manifest(rows_b)["date_digest"]
    assert compare(build_manifest(rows_a), build_manifest(rows_b)) == []


def test_first_run_has_nothing_to_compare():
    assert compare({}, snap({"1": f(3, "2025-01-01", "2025-03-01")})) == []


# ── the freeze alarm — the signal that did not exist for fourteen months ──────

newly_frozen = nav_archive.newly_frozen
_is_frozen = nav_archive._is_frozen
_median_interval = nav_archive._median_interval
from datetime import date as _date  # noqa: E402


def ff(points, first, last, median_days, frozen):
    return {"points": points, "first": first, "last": last,
            "median_days": median_days, "frozen": frozen}


def test_a_daily_fund_that_stops_is_named():
    prev = snap({"5784": ff(500, "2021-01-01", "2026-08-30", 1.0, False)})
    now = snap({"5784": ff(500, "2021-01-01", "2026-08-30", 1.0, True)})
    out = newly_frozen(prev, now)
    assert len(out) == 1 and "5784" in out[0] and "STOPPED PUBLISHING" in out[0]


def test_an_already_stale_fund_does_not_re_fire():
    """Only the transition is reported, or the backlog drowns the new signal."""
    prev = snap({"6197": ff(83, "2025-02-10", "2026-06-30", 1.0, True)})
    now = snap({"6197": ff(83, "2025-02-10", "2026-06-30", 1.0, True)})
    assert newly_frozen(prev, now) == []


def test_a_weekly_fund_is_not_called_stale_for_being_weekly():
    """54 of 195 funds publish weekly. An alarm that fires on them is noise."""
    as_of = _date(2026, 9, 7)
    assert not _is_frozen("2026-09-01", 7.0, as_of)
    assert not _is_frozen("2026-08-20", 7.0, as_of)     # 18d, inside 4x7
    assert _is_frozen("2026-07-01", 7.0, as_of)         # 68d, well past


def test_a_daily_fund_gets_the_21_day_floor_not_4_days():
    as_of = _date(2026, 9, 7)
    assert not _is_frozen("2026-08-25", 1.0, as_of)     # 13d — inside the floor
    assert _is_frozen("2026-08-01", 1.0, as_of)         # 37d — gone


def test_median_interval_is_not_dragged_by_one_long_hole():
    """A daily fund with a 412-day hole must still read as daily."""
    days = [f"2025-0{m}-{d:02d}" for m in (1, 2, 3) for d in range(1, 29)]
    days.append("2026-06-30")
    assert _median_interval(days) <= 2.0


def test_the_mubasher_freeze_would_have_fired_on_day_one():
    """61 daily funds go silent together while the rest keep publishing."""
    prev = snap({**{str(i): ff(500, "2021-01-01", "2025-05-14", 1.0, False) for i in range(61)},
                 **{str(100 + i): ff(500, "2021-01-01", "2025-05-14", 1.0, False) for i in range(134)}})
    now = snap({**{str(i): ff(500, "2021-01-01", "2025-05-14", 1.0, True) for i in range(61)},
                **{str(100 + i): ff(560, "2021-01-01", "2025-06-20", 1.0, False) for i in range(134)}})
    assert now["rows"] > prev["rows"], "precondition: totals still rise"
    assert compare(prev, now) == [], "precondition: nothing was DELETED"
    assert len(newly_frozen(prev, now)) == 61
