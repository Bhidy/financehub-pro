"""
Offline unit tests for the Mubasher list-API row parser (no DB, no network).
Run:  cd backend-core && python -m pytest tests/test_funds_list_api_sync.py -q
Or standalone:  python backend-core/tests/test_funds_list_api_sync.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.funds_list_api_sync import parse_list_rows, _parse_date, _parse_nav  # noqa: E402


def test_parses_valid_rows():
    payload = {"rows": [
        {"fundId": 6144, "price": 19.60654, "date": "30 June 2026"},
        {"fundId": 2734, "price": 709.38, "date": "29 June 2026"},
    ]}
    out = parse_list_rows(payload)
    assert out == [("6144", date(2026, 6, 30), 19.60654),
                   ("2734", date(2026, 6, 29), 709.38)]


def test_drops_bad_rows():
    payload = {"rows": [
        {"fundId": 1, "price": None, "date": "30 June 2026"},      # no price
        {"fundId": 2, "price": 0, "date": "30 June 2026"},         # non-positive
        {"fundId": 3, "price": 5.0, "date": "not a date"},         # bad date
        {"fundId": None, "price": 5.0, "date": "30 June 2026"},    # no id
        "garbage",                                                  # not a dict
        {"fundId": 9, "price": 12.5, "date": "1 July 2026"},       # valid
    ]}
    out = parse_list_rows(payload)
    assert out == [("9", date(2026, 7, 1), 12.5)]


def test_empty_or_malformed_payload():
    assert parse_list_rows({}) == []
    assert parse_list_rows({"rows": None}) == []
    assert parse_list_rows([]) == []


def test_date_formats():
    assert _parse_date("30 June 2026") == date(2026, 6, 30)
    assert _parse_date("2026-06-30") == date(2026, 6, 30)
    assert _parse_date("") is None
    assert _parse_date("garbage") is None


def test_nav_validation():
    assert _parse_nav("19.60654") == 19.60654
    assert _parse_nav("1,234.5") == 1234.5
    assert _parse_nav(0) is None
    assert _parse_nav(-3) is None
    assert _parse_nav(float("nan")) is None


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(fns)}/{len(fns)} list-api parser tests passed")
