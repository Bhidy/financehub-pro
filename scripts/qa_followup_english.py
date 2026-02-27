#!/usr/bin/env python3
"""
English Follow-Up Reliability Verification
==========================================
Covers deterministic follow-up behavior for screener/list flows.
"""

import json
import re
import sys
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

import requests

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
TIMEOUT = 45

NOISE_SYMBOLS = {"DOES", "PEERS", "TERMS", "VALUATION", "GROWTH", "AND", "THE"}


def call_api(session_id: str, message: str, fingerprint: str) -> Tuple[bool, Dict[str, Any], str]:
    headers = {
        "Content-Type": "application/json",
        "X-Device-Fingerprint": fingerprint,
        "X-Language": "en",
    }
    payload = {
        "message": message,
        "session_id": session_id,
        "history": [],
        "market": "EGX",
    }
    try:
        r = requests.post(API_URL, json=payload, headers=headers, timeout=TIMEOUT)
    except Exception as exc:
        return False, {}, f"Request error: {exc}"

    if r.status_code != 200:
        return False, {}, f"HTTP {r.status_code}: {r.text[:240]}"

    try:
        data = r.json()
    except Exception as exc:
        return False, {}, f"Invalid JSON response: {exc}"
    return True, data, ""


def has_hard_failure(data: Dict[str, Any]) -> Optional[str]:
    text = str(data.get("message_text") or data.get("message") or "").lower()
    intent = str((data.get("meta") or {}).get("intent") or "").upper()
    response_status = str(data.get("response_status") or "").lower()

    if intent in {"SYSTEM_ERROR", "ERROR"}:
        return f"Hard failure intent: {intent}"
    if "i didn't understand your request" in text:
        return "Fallback 'I didn't understand' detected"
    if "system error" in text and "debug" not in text:
        return "System error text detected"
    if response_status == "fail":
        return "response_status=fail"
    return None


def extract_primary_symbol(data: Dict[str, Any]) -> Optional[str]:
    entities = (data.get("meta") or {}).get("entities") or {}
    symbol = entities.get("symbol")
    if symbol:
        return str(symbol).upper()

    stock_list = data.get("stock_list")
    if isinstance(stock_list, list) and stock_list:
        first = stock_list[0] or {}
        ticker = first.get("ticker") or first.get("symbol")
        if ticker:
            return str(ticker).upper()

    cards = data.get("cards") or []
    for card in cards:
        if not isinstance(card, dict):
            continue
        ctype = str(card.get("type") or "").lower()
        cdata = card.get("data") or {}
        if ctype in {"stock_header", "snapshot"} and isinstance(cdata, dict):
            sym = cdata.get("symbol")
            if sym:
                return str(sym).upper()
        if ctype in {"stock_list", "hidden_gems", "discovery_list"} and isinstance(cdata, dict):
            stocks = cdata.get("stocks")
            if isinstance(stocks, list) and stocks:
                item = stocks[0] if isinstance(stocks[0], dict) else {}
                sym = item.get("ticker") or item.get("symbol")
                if sym:
                    return str(sym).upper()
    return None


def first_followup_payload(data: Dict[str, Any], prefer_keywords: List[str]) -> Optional[str]:
    followups = data.get("followups") or []
    if not isinstance(followups, list):
        return None

    for keyword in prefer_keywords:
        for chip in followups:
            if not isinstance(chip, dict):
                continue
            txt = str(chip.get("text") or "").lower()
            payload = str(chip.get("payload") or "").strip()
            if payload and keyword in txt:
                return payload

    for chip in followups:
        if not isinstance(chip, dict):
            continue
        payload = str(chip.get("payload") or "").strip()
        if payload:
            return payload
    return None


def validate_compare_entities(data: Dict[str, Any]) -> Optional[str]:
    entities = (data.get("meta") or {}).get("entities") or {}
    compare_symbols = entities.get("compare_symbols") or []
    if isinstance(compare_symbols, str):
        compare_symbols = [compare_symbols]
    if not isinstance(compare_symbols, list):
        return None

    for sym in compare_symbols:
        token = str(sym).upper().strip()
        if token in NOISE_SYMBOLS:
            return f"Noise symbol leaked into compare_entities: {token}"
    return None


def assert_pass(name: str, ok: bool, reason: str = "") -> bool:
    if ok:
        print(f"✅ {name}")
        return True
    print(f"❌ {name} -> {reason}")
    return False


def main() -> int:
    session_id = f"qa-followup-en-{uuid.uuid4().hex[:10]}"
    fingerprint = f"qa_followup_en_{uuid.uuid4().hex[:8]}"

    print(f"Target: {API_URL}")
    print(f"Session: {session_id}")
    print("-" * 70)

    passed = 0
    total = 0

    # 1) Screener seed
    total += 1
    ok, seed, err = call_api(session_id, "Get me the most undervalued stocks", fingerprint)
    if not ok:
        assert_pass("Seed screener", False, err)
    else:
        hard = has_hard_failure(seed)
        passed += int(assert_pass("Seed screener", hard is None, hard or ""))

    if not ok:
        print("Stopping early due seed request failure.")
        return 1

    top_symbol = extract_primary_symbol(seed)
    followup_payload = first_followup_payload(seed, ["risk"])
    unlock_payload = first_followup_payload(seed, ["unlock", "catalyst"])

    # 2) Click predefined follow-up exactly as returned
    total += 1
    if not followup_payload:
        assert_pass("Follow-up payload available", False, "No followups returned from seed response")
    else:
        ok2, resp2, err2 = call_api(session_id, followup_payload, fingerprint)
        if not ok2:
            assert_pass("Follow-up payload execution", False, err2)
        else:
            hard2 = has_hard_failure(resp2)
            reason = hard2 or ""
            if not hard2 and top_symbol:
                blob = json.dumps(resp2, ensure_ascii=False).upper()
                if top_symbol not in blob:
                    reason = f"Response did not stay anchored to {top_symbol}"
            passed += int(assert_pass("Follow-up payload execution", reason == "", reason))

    # 3) Unlock/catalyst follow-up
    total += 1
    if not unlock_payload:
        unlock_payload = f"What unlocks {top_symbol}?" if top_symbol else "What unlocks this setup?"
    ok3, resp3, err3 = call_api(session_id, unlock_payload, fingerprint)
    if not ok3:
        assert_pass("Unlock/catalyst follow-up", False, err3)
    else:
        hard3 = has_hard_failure(resp3)
        passed += int(assert_pass("Unlock/catalyst follow-up", hard3 is None, hard3 or ""))

    # 4) Long natural-language comparison (must not crash)
    total += 1
    long_compare = (
        "How does the stock in question compare to its sector peers in terms of current "
        "valuation and growth prospects considering the nuanced story and different angles?"
    )
    ok4, resp4, err4 = call_api(session_id, long_compare, fingerprint)
    if not ok4:
        assert_pass("Long comparison guard", False, err4)
    else:
        hard4 = has_hard_failure(resp4)
        noise_err = validate_compare_entities(resp4)
        reason = hard4 or noise_err or ""
        passed += int(assert_pass("Long comparison guard", reason == "", reason))

    print("-" * 70)
    print(f"Summary: {passed}/{total} passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())

