"""
Offline unit tests for the Mubasher list-API row parser (no DB, no network).
Run:  cd backend-core && python -m pytest tests/test_funds_list_api_sync.py -q
Or standalone:  python backend-core/tests/test_funds_list_api_sync.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.funds_list_api_sync import (  # noqa: E402
    parse_list_rows, _parse_date, _parse_nav, _fund_insert_row)


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


def test_fund_insert_row_maps_valid_fund():
    en = {"fundId": 6144, "name": "CI Fund", "price": 19.6, "currency": "EGP",
          "managers": ["CI Capital"], "owner": "CI", "date": "30 June 2026"}
    row = _fund_insert_row(en, "صندوق سي آي")
    assert row is not None
    assert row[0] == "6144" and row[1] == "CI Fund" and row[2] == "صندوق سي آي"
    assert row[3] == "EGP" and row[4] == "CI Capital" and row[6] == 19.6


def test_fund_insert_row_rejects_dataless():
    # price 0 -> unlaunched/no-data fund -> None (never an empty stub page)
    assert _fund_insert_row({"fundId": 6404, "name": "Azimut 2030", "price": 0.0}) is None
    assert _fund_insert_row({"fundId": 1, "name": "", "price": 5.0}) is None
    assert _fund_insert_row("garbage") is None


def test_fund_insert_row_arabic_falls_back_to_english():
    row = _fund_insert_row({"fundId": 9, "name": "X Fund", "price": 1.0}, None)
    assert row is not None and row[2] == "X Fund"


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(fns)}/{len(fns)} list-api parser tests passed")
