"""
nav_alignment.py — does a source's series sit on the right DATES?

WHY THIS EXISTS
---------------
Every other NAV source in this platform proves itself against data already held
before it writes. The Mubasher page scraper did not, and on its first live run it
wrote 13,313 rows dated one day early, each carrying the following day's value:

    fund 2729   1573 new dates, 1573 matched an adjacent held value exactly
    fund 2714   1047 / 1047
    fund 5726    273 /  273

The cause was a timezone (`datetime.fromtimestamp` reading UTC-midnight epochs in
local time), but the cause is not the point. The point is that nothing stood
between reading and writing.

WHY AN AGREEMENT CHECK WOULD NOT HAVE CAUGHT IT
-----------------------------------------------
The obvious guard — "the values must agree with what we hold" — fails here, and
understanding why is the whole design. Most of these funds are money-market
funds that move about 0.01% a day. Shift such a series by one day and it still
agrees with held data to 0.01%, which sails through any sane tolerance. The
values were never wrong. The DATES were.

So the test is not "do the values agree" but "which alignment best explains
them". The series is scored at several date offsets, and if some offset other
than zero fits materially better, the series is misaligned and must not be
written — whatever the errors look like at zero.

That question is source-agnostic. A vendor changing its epoch convention, a
daylight-saving boundary, an off-by-one in a date parser: all of them move the
best offset off zero, and none of them need to be anticipated by name.
"""
from __future__ import annotations

from datetime import date, timedelta
from statistics import median

# Below this there is not enough evidence to judge alignment, and a confident
# verdict on two points would be worse than no verdict.
MIN_OVERLAP = 8

# How far to look. A one-day slip is the realistic failure; two covers a weekend
# boundary. Beyond that a "better fit" is more likely coincidence than alignment.
MAX_SHIFT = 2

# The zero offset must not be beaten by more than this ratio. A real series has
# its best fit at zero by a wide margin; a shifted one is dramatically better
# somewhere else.
DECISIVE_RATIO = 2.0


def _errors_at(offset: int, candidate: dict, held: dict) -> list[float]:
    """Percentage errors when the candidate is compared `offset` days later."""
    out = []
    for d, v in candidate.items():
        h = held.get(d + timedelta(days=offset))
        if h:
            out.append(abs(v - h) / h * 100.0)
    return out


def check_alignment(candidate: dict[date, float], held: dict[date, float],
                    max_shift: int = MAX_SHIFT) -> dict:
    """Verdict on whether `candidate` is dated correctly against `held`.

    `candidate` and `held` are {date: nav}. Returns a dict with `ok`, the
    `best_offset`, the median error at each offset tried, and a human sentence.
    """
    scores: dict[int, tuple[float, int]] = {}
    for off in range(-max_shift, max_shift + 1):
        errs = _errors_at(off, candidate, held)
        if len(errs) >= MIN_OVERLAP:
            scores[off] = (median(errs), len(errs))

    if 0 not in scores:
        # Nothing to compare at the dates claimed. That is not proof of a
        # problem, and it is not proof of correctness either.
        return {"ok": True, "checked": False, "best_offset": None, "scores": scores,
                "why": f"fewer than {MIN_OVERLAP} overlapping observations — alignment not testable"}

    best = min(scores, key=lambda o: scores[o][0])
    at_zero = scores[0][0]
    at_best = scores[best][0]

    if best == 0:
        return {"ok": True, "checked": True, "best_offset": 0, "scores": scores,
                "why": f"aligned (median {at_zero:.4f}% at the dates claimed)"}

    # Something fits better elsewhere. Only call it misaligned when it fits
    # DECISIVELY better, so ordinary noise cannot condemn a good series.
    decisive = at_best * DECISIVE_RATIO < at_zero
    if not decisive:
        return {"ok": True, "checked": True, "best_offset": best, "scores": scores,
                "why": (f"offset {best:+d} fits slightly better "
                        f"({at_best:.4f}% vs {at_zero:.4f}%) but not decisively")}

    return {"ok": False, "checked": True, "best_offset": best, "scores": scores,
            "why": (f"MISALIGNED: the series fits {at_best:.4f}% when shifted "
                    f"{best:+d} day(s) versus {at_zero:.4f}% at the dates it "
                    f"claims — it is dated {-best:+d} day(s) wrong")}


def describe(verdict: dict) -> str:
    """One line for a run log."""
    s = " ".join(f"{o:+d}:{m:.4f}%" for o, (m, _) in sorted(verdict.get("scores", {}).items()))
    return f"{verdict['why']}" + (f"  [offsets {s}]" if s else "")
