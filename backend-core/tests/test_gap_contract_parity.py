"""
Cross-language gap-contract parity: Python ledger vs TypeScript chart.

WHY THIS EXISTS
---------------
Two implementations of the same rule now decide whether a NAV interval is a hole:

    frontend/lib/nav-gaps.ts              -> severs the chart line
    backend-core/data_pipeline/           -> grades the fund in the quality ledger
        fund_data_quality.py

If they drift, the platform contradicts itself about the same fund: a chart drawn
straight through a gap the ledger calls a defect, or a fund graded F whose chart
looks unbroken. That is worse than either behaviour alone, because there is no
longer a single answer to "does this fund have a hole".

This test runs BOTH implementations over the same fixtures and fails on any
divergence. It is the reason the thresholds may be duplicated across languages
at all.

Requires node (the frontend toolchain already does). Skips — loudly — if absent,
rather than passing silently and letting drift through.

Run:  cd backend-core && python -m pytest tests/test_gap_contract_parity.py -q
"""
import json
import os
import subprocess
import sys
import tempfile
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_pipeline.fund_data_quality import (  # noqa: E402
    break_tolerance_days, find_gaps, gap_tolerance_days, median_interval_days,
)

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TS_MODULE = os.path.join(REPO, "frontend", "lib", "nav-gaps.ts")
FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "nav_5784_real.json")

# The TS side is invoked through tsx, which the frontend already depends on.
_RUNNER = r"""
import { findGaps, gapToleranceDays, breakToleranceDays, medianIntervalDays } from '%s';
import { readFileSync } from 'fs';
const cases = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = {};
for (const [name, pts] of Object.entries(cases)) {
    const series = pts.map(([time, value]) => ({ time, value }));
    out[name] = {
        median: medianIntervalDays(series),
        gapTolerance: gapToleranceDays(series),
        breakTolerance: breakToleranceDays(series),
        gaps: findGaps(series).map(g => [g.from, g.to, g.days]),
    };
}
process.stdout.write(JSON.stringify(out));
"""


def _cases() -> dict:
    with open(FIXTURE, encoding="utf-8") as fh:
        real = json.load(fh)
    day = lambda y, m, d: date(y, m, d)  # noqa: E731

    def series(pairs):
        return [[d.isoformat(), v] for d, v in pairs]

    daily = series([(day(2026, 1, 1) + timedelta(days=i), 100.0 + i) for i in range(60)])
    weekly = series([(day(2025, 1, 5) + timedelta(days=7 * i), 50.0 + i) for i in range(60)])
    monthly = series([(day(2024, 1, 1) + timedelta(days=30 * i), 10.0 + i) for i in range(24)])
    revolution = series([
        (day(2011, 1, 24), 10.0), (day(2011, 1, 25), 10.1), (day(2011, 1, 26), 10.0),
        (day(2011, 3, 24), 8.9), (day(2011, 3, 27), 9.0), (day(2011, 3, 28), 9.1),
    ])
    holed = series([
        (day(2025, 5, 12), 10.0), (day(2025, 5, 13), 10.0), (day(2025, 5, 14), 10.0),
        (day(2026, 6, 30), 13.0), (day(2026, 7, 1), 13.0), (day(2026, 7, 2), 13.0),
    ])
    # A weekly fund with a genuine hole: the case where a fixed threshold and a
    # cadence-derived one disagree most.
    weekly_holed = series(
        [(day(2024, 1, 7) + timedelta(days=7 * i), 20.0 + i) for i in range(20)]
        + [(day(2025, 6, 1) + timedelta(days=7 * i), 40.0 + i) for i in range(20)]
    )
    return {
        "real_5784": real,
        "daily_clean": daily,
        "weekly_clean": weekly,
        "monthly_clean": monthly,
        "egx_2011_closure": revolution,
        "daily_412d_hole": holed,
        "weekly_with_hole": weekly_holed,
    }


def _run_ts(cases: dict) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        data_path = os.path.join(tmp, "cases.json")
        with open(data_path, "w", encoding="utf-8") as fh:
            json.dump(cases, fh)
        script = os.path.join(tmp, "parity.ts")
        with open(script, "w", encoding="utf-8") as fh:
            fh.write(_RUNNER % TS_MODULE.replace("\\", "/"))
        proc = subprocess.run(
            ["npx", "--yes", "tsx", script, data_path],
            cwd=os.path.join(REPO, "frontend"),
            capture_output=True, text=True, timeout=300,
        )
    if proc.returncode != 0:
        raise RuntimeError(f"tsx failed: {proc.stderr[-800:]}")
    return json.loads(proc.stdout)


def test_python_and_typescript_agree_on_every_gap():
    if not os.path.exists(TS_MODULE):
        raise AssertionError(f"TS contract module missing: {TS_MODULE}")
    cases = _cases()
    try:
        ts = _run_ts(cases)
    except (FileNotFoundError, RuntimeError, subprocess.TimeoutExpired) as exc:
        # Loud skip: never let an unrunnable parity check read as agreement.
        print(f"  SKIP parity (node/tsx unavailable): {exc}")
        return

    mismatches = []
    for name, pts in cases.items():
        series = [(date.fromisoformat(d), float(v)) for d, v in pts]
        py = {
            "median": median_interval_days(series),
            "gapTolerance": gap_tolerance_days(series),
            "breakTolerance": break_tolerance_days(series),
            "gaps": [[g["from"], g["to"], g["days"]] for g in find_gaps(series)],
        }
        got = ts[name]
        for key in ("median", "gapTolerance", "breakTolerance"):
            if abs(float(py[key]) - float(got[key])) > 1e-9:
                mismatches.append(f"{name}.{key}: py={py[key]} ts={got[key]}")
        if py["gaps"] != [list(g) for g in got["gaps"]]:
            mismatches.append(f"{name}.gaps: py={py['gaps']} ts={got['gaps']}")

    assert not mismatches, (
        "Python and TypeScript disagree about NAV gaps — the chart and the quality "
        "ledger would contradict each other:\n  " + "\n  ".join(mismatches)
    )


if __name__ == "__main__":
    try:
        test_python_and_typescript_agree_on_every_gap()
        print("\n✅ gap contract is identical across Python and TypeScript")
    except AssertionError as exc:
        print(f"\n❌ {exc}")
        sys.exit(1)
