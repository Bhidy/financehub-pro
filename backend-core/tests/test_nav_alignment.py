"""The gate that would have stopped 13,313 misdated rows.

The incident is the specification: a money-market series shifted one day still
AGREES with held data to 0.01%, so no tolerance on values could catch it. Only
asking "which alignment best explains this" does.
"""
import importlib.util
import pathlib
from datetime import date, timedelta

# Loaded by path, like the other suites here: `from data_pipeline...` only
# resolves when pytest is invoked from backend-core/, and CI runs from the
# repository root.
_spec = importlib.util.spec_from_file_location(
    "nav_alignment",
    pathlib.Path(__file__).parent.parent / "data_pipeline" / "nav_alignment.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
check_alignment, MIN_OVERLAP = _mod.check_alignment, _mod.MIN_OVERLAP


def series(start: date, n: int, first: float, daily: float) -> dict:
    """A fund creeping up by `daily` a day — the money-market shape."""
    return {start + timedelta(days=i): first * (1 + daily) ** i for i in range(n)}


def test_a_correctly_dated_series_passes():
    held = series(date(2025, 1, 1), 60, 100.0, 0.0001)
    v = check_alignment(dict(held), held)
    assert v["ok"] and v["best_offset"] == 0


def test_the_incident_a_one_day_shift_on_a_money_market_fund():
    """The exact shape that got through: values agree to 0.01%, dates do not."""
    held = series(date(2025, 1, 1), 60, 100.0, 0.0001)
    # every point dated one day early, carrying the NEXT day's value
    shifted = {d - timedelta(days=1): v for d, v in held.items()}
    v = check_alignment(shifted, held)
    assert not v["ok"], v["why"]
    assert v["best_offset"] == 1
    assert "MISALIGNED" in v["why"]


def test_a_value_tolerance_alone_would_have_passed_it():
    """Proves why the naive guard is not enough — the errors really are tiny."""
    held = series(date(2025, 1, 1), 60, 100.0, 0.0001)
    shifted = {d - timedelta(days=1): v for d, v in held.items()}
    v = check_alignment(shifted, held)
    at_zero = v["scores"][0][0]
    assert at_zero < 0.05, f"median error at the claimed dates is only {at_zero}%"


def test_a_shift_the_other_way_is_caught_too():
    held = series(date(2025, 1, 1), 60, 100.0, 0.0001)
    shifted = {d + timedelta(days=1): v for d, v in held.items()}
    v = check_alignment(shifted, held)
    assert not v["ok"] and v["best_offset"] == -1


def test_ordinary_noise_does_not_condemn_a_good_series():
    """A slightly better fit elsewhere is not proof; only a decisive one is."""
    held = series(date(2025, 1, 1), 60, 100.0, 0.0001)
    jittered = {d: v * (1 + (0.00002 if i % 3 else -0.00002))
                for i, (d, v) in enumerate(held.items())}
    assert check_alignment(jittered, held)["ok"]


def test_a_volatile_fund_shifted_is_caught_just_as_well():
    held = series(date(2025, 1, 1), 60, 50.0, 0.01)
    shifted = {d - timedelta(days=1): v for d, v in held.items()}
    assert not check_alignment(shifted, held)["ok"]


def test_too_little_overlap_yields_no_verdict_rather_than_a_wrong_one():
    held = series(date(2025, 1, 1), MIN_OVERLAP - 2, 100.0, 0.0001)
    v = check_alignment(dict(held), held)
    assert v["ok"] and v["checked"] is False


def test_a_series_with_no_overlap_at_all_is_not_condemned():
    """Filling a genuine hole means writing dates we do not hold. That is the
    job, not a failure."""
    held = series(date(2025, 1, 1), 40, 100.0, 0.0001)
    elsewhere = series(date(2026, 6, 1), 40, 130.0, 0.0001)
    v = check_alignment(elsewhere, held)
    assert v["ok"] and v["checked"] is False
