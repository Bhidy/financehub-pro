"""
Offline tests for EIMA -> Mubasher fund-name matching (no DB, no network).

Every case here is a real pair taken from the live backfill run, not an invented
example. The first run matched 90 of 186 names; these are the patterns that made
up the other 96.

Run:  cd backend-core && python -m pytest tests/test_fund_name_match.py -q
Or standalone:  python backend-core/tests/test_fund_name_match.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_pipeline.fund_name_match import (  # noqa: E402
    _series_number, idf, match_funds, score, tokens,
)


# Scored against the REAL catalogue, not a toy one. IDF is corpus-relative: in a
# 20-name sample every token looks equally rare and the weighting cannot
# discriminate, so "SAIB & ADIB Fund (Sanabel)" scored 0.40 against a fixture and
# 0.55 against production. A matcher tested on an unrepresentative corpus is not
# tested at all — these fixtures are the live catalogue and a real report.
_FX = os.path.join(os.path.dirname(__file__), "fixtures")
with open(os.path.join(_FX, "fund_catalogue.json"), encoding="utf-8") as fh:
    CATALOGUE = json.load(fh)
with open(os.path.join(_FX, "eima_fund_names.json"), encoding="utf-8") as fh:
    EIMA_ROWS = json.load(fh)

_WEIGHTS = idf([tokens(c["en"]) for c in CATALOGUE]
               + [tokens(r["name"]) for r in EIMA_ROWS])


def sc(a: str, b: str) -> float:
    return score(tokens(a), tokens(b), _WEIGHTS)


# ------------------------------------------------------------ tokenising ----

def test_boilerplate_is_dropped_but_identity_survives():
    t = tokens("Wethaq Money Market Fund Cumulative and Periodic Income Fund")
    assert "wethaq" in t
    assert "fund" not in t and "cumulative" not in t


def test_institution_abbreviations_expand():
    assert set(tokens("CIB Fund I")) >= {"commercial", "international", "bank"}
    assert set(tokens("ALEXBANK Fund I")) >= {"bank", "alexandria"}


def test_roman_and_arabic_series_numbers_unify():
    assert _series_number(tokens("Banque Misr Fund III")) == "3"
    assert _series_number(tokens("Banque Misr Mutual Fund 3")) == "3"


def test_a_bare_digit_is_not_dropped_as_noise():
    """
    Regression. Single characters were dropped as noise, so our "Mutual Fund 1"
    lost its "1" while EIMA's roman "I" survived as "1". The series number then
    existed on one side only, could never disagree, and the whole series check
    was silently inert — which is how "Fund II" got mapped onto "Mutual Fund 1".
    """
    assert _series_number(tokens("Banque Misr Mutual Fund 1")) == "1"
    assert "1" in tokens("Bank of Alexandria Mutual Fund 1")


# --------------------------------------------------------------- scoring ----

def test_a_short_brand_matches_its_long_official_title():
    # SequenceMatcher scored these on total length, so a one-word brand inside a
    # seven-word official title lost to unrelated funds. Thresholds here are the
    # values measured on the real catalogue, above the 0.45 assignment floor.
    assert sc("Momentum", "Cairo Capital Cumulative Fund Momentum") >= 0.9
    assert sc("SAIB & ADIB Fund (Sanabel)",
              "Sanabel Equity Fund Islamic Sharia Compliant") >= 0.40


def test_abbreviation_matches_the_spelled_out_institution():
    # EIMA writes the market abbreviation, we write the legal name; without the
    # alias table these pairs share no tokens at all and score 0.
    assert sc("ALEXBANK Fund I", "Bank of Alexandria Mutual Fund 1") >= 0.9
    assert sc("CIB Fund I (Osoul)", "Commercial International Bank Money Market Fund") >= 0.55


def test_a_different_series_number_is_disqualifying():
    # Fund 2 and fund 3 hold different assets. A confident wrong answer here is
    # worse than none, and under one-to-one assignment it also consumes the
    # correct fund's slot.
    assert sc("Banque Misr Fund II", "Banque Misr Mutual Fund 1") == 0.0
    assert sc("Banque Misr Fund II", "Banque Misr Mutual Fund 3") == 0.0
    assert sc("Banque Misr Fund II", "Banque Misr Mutual Fund 2") >= 0.7


def test_unrelated_funds_do_not_match():
    assert sc("Wethaq", "Pharos Fund I") < 0.4
    assert sc("Aman Micro Finance", "Bank of Alexandria Mutual Fund 1") < 0.4


def test_common_words_alone_are_not_a_match():
    # Almost every Egyptian fund is a "bank money market fund"; sharing only
    # those words must not constitute identity.
    assert sc("Some Bank Money Market Fund", "Other Bank Money Market Fund") < 0.6


# ------------------------------------------------------------ assignment ----



def test_real_pairs_from_the_live_run_all_resolve():
    """Pairs confirmed by hand against the production catalogue."""
    m = match_funds(EIMA_ROWS, CATALOGUE)
    for name, want in {"CIB Fund I (Osoul)": "2684",
                       "ALEXBANK Fund I": "2690",
                       "Momentum": "6410",
                       "SAIB & ADIB Fund (Sanabel)": "2742",
                       "Wethaq": "5784",
                       "Diamond": "5882"}.items():
        got = m.get(name)
        assert got and got[0] == want, f"{name}: wanted {want}, got {got}"


def test_the_banque_misr_series_maps_one_for_one():
    # The bug that made this module necessary: "Fund II" landed on "Mutual Fund 1"
    # and "Fund III" on "Mutual Fund 2" — every fund in the series off by one.
    m = match_funds(EIMA_ROWS, CATALOGUE)
    by_id = {c["fund_id"]: c["en"] for c in CATALOGUE}
    for eima_name, digit in (("Banque Misr Fund II", "2"),
                             ("Banque Misr Fund III", "3")):
        got = m.get(eima_name)
        assert got, f"{eima_name} unmatched"
        assert digit in by_id[got[0]], f"{eima_name} -> {by_id[got[0]]}"


def test_recall_against_the_real_report_is_materially_better():
    # The original matcher resolved 90 of 186 names.
    m = match_funds(EIMA_ROWS, CATALOGUE)
    assert len(m) >= 150, f"only {len(m)} of {len(EIMA_ROWS)} matched"
    ids = [fid for fid, _ in m.values()]
    assert len(ids) == len(set(ids)), "a fund id was claimed twice"





def test_the_manager_corroborates_but_does_not_decide():
    # A right name with the wrong manager should still match; a wrong name with
    # the right manager should not.
    right_name = match_funds([{"name": "Wethaq", "manager": "Totally Different House"}],
                             CATALOGUE)
    assert right_name.get("Wethaq", (None,))[0] == "5784"
    wrong_name = match_funds([{"name": "Zzz Unrelated Vehicle",
                               "manager": "CI Asset Management"}], CATALOGUE)
    assert "Zzz Unrelated Vehicle" not in wrong_name


def test_a_match_on_a_series_number_alone_is_refused():
    # "Ebank Fund II" and "Banque Misr Mutual Fund 2" share nothing but the digit
    # 2. Matching on that would hand one fund's history to another.
    assert sc("Ebank Fund II", "Banque Misr Mutual Fund 2") == 0.0


def test_degenerate_input_does_not_raise():
    assert match_funds([], CATALOGUE) == {}
    assert match_funds([{"name": "", "manager": None}], CATALOGUE) == {}
    assert tokens("") == []
    assert score([], [], {}) == 0.0


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
    print("\n✅ all fund-name-match assertions passed" if not failed else f"\n❌ {failed} failed")
    sys.exit(1 if failed else 0)
