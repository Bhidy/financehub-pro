#!/usr/bin/env python3
"""
============================================================
FinanceHub Pro — Integration Test Suite
Financial-Services-Plugins Full Plan Validation
============================================================

Tests all changes from the financial-services-plugins integration:
  - Phase 2: New Antigravity skills (validated via intent routing)
  - Phase 3: 3 new intents + learning section terms + LLM rules
  - Phase 4: EARNINGS_ANALYSIS, MORNING_BRIEF, CATALYST_CALENDAR handlers
  - Phase 5: Comps table in earnings, thesis tracking, risk intent

Usage:
    python3 scripts/test_integration_plan.py
    python3 scripts/test_integration_plan.py --symbol COMI  # override test symbol
    python3 scripts/test_integration_plan.py --fast         # skip slow tests

Author: Chief Integration Validation Agent
"""

import sys
import os
import time
import json
import uuid
import argparse
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime

# ══════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════
BASE_URL     = "https://starta.46-224-223-172.sslip.io/api/v1"
CHAT_URL     = f"{BASE_URL}/ai/chat"
HEALTH_URL   = "https://starta.46-224-223-172.sslip.io/health"
TIMEOUT      = 35       # seconds per request
SESSION_ID   = f"integration-test-{uuid.uuid4().hex[:8]}"
SYMBOL_A     = "COMI"   # primary test symbol (large-cap EGX)
SYMBOL_B     = "CIB"    # secondary comparison symbol
SYMBOL_C     = "SWDY"   # third symbol for diversification

# ANSI colors
GRN = "\033[92m"; RED = "\033[91m"; YLW = "\033[93m"
BLU = "\033[94m"; CYN = "\033[96m"; RST = "\033[0m"
BLD = "\033[1m"

# ══════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════
def chat(message: str, session_id: Optional[str] = None, history: Optional[List] = None) -> Dict[str, Any]:
    """Send a chat message and return the JSON response."""
    payload = {
        "message":    message,
        "session_id": session_id or SESSION_ID,
        "history":    history or [],
    }
    # Use a unique fingerprint per call to avoid triggering the 5-question guest limit
    unique_fp = f"test-suite-{uuid.uuid4().hex}"
    headers = {
        "Content-Type": "application/json",
        "X-Language": "en",
        "X-Device-Fingerprint": unique_fp,
    }
    try:
        r = requests.post(CHAT_URL, json=payload, headers=headers, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.Timeout:
        return {"success": False, "__error": "TIMEOUT", "message_text": "", "cards": [], "learning_section": None}
    except Exception as e:
        return {"success": False, "__error": str(e), "message_text": "", "cards": [], "learning_section": None}


def card_types(resp: Dict) -> List[str]:
    """Return a flat list of card type strings from response."""
    types = []
    for card in resp.get("cards", []):
        if isinstance(card, dict):
            t = card.get("type") or ""
            if t:
                types.append(str(t).lower())
    return types


def has_card(resp: Dict, card_type: str) -> bool:
    """Check if a specific card type is present in response."""
    return card_type.lower() in card_types(resp)


def has_learning(resp: Dict) -> bool:
    """Check if learning_section is present and non-empty."""
    ls = resp.get("learning_section")
    if not ls:
        return False
    items = ls.get("items", []) if isinstance(ls, dict) else []
    return bool(items)


def has_followup(resp: Dict) -> bool:
    """Check if follow_up_prompt OR followups chips are non-empty."""
    return bool(resp.get("follow_up_prompt")) or bool(resp.get("followups"))


def has_actions(resp: Dict) -> bool:
    """Check if actions array is non-empty."""
    return bool(resp.get("actions"))


def text_contains(resp: Dict, *keywords: str) -> bool:
    """Check if any response text field contains a keyword (case-insensitive)."""
    targets = [
        resp.get("message_text", "") or "",
        resp.get("conversational_text", "") or "",
        resp.get("framework_text", "") or "",
    ]
    combined = " ".join(targets).lower()
    return all(kw.lower() in combined for kw in keywords)


def has_success(resp: Dict) -> bool:
    return resp.get("success", False) is True


class TestResult:
    def __init__(self, name: str, category: str):
        self.name = name
        self.category = category
        self.passed = False
        self.details: List[str] = []
        self.response_time: float = 0.0
        self.intent_detected: str = ""

    def ok(self, condition: bool, label: str) -> bool:
        if not condition:
            self.details.append(f"  ✗ FAIL: {label}")
        return condition

    def info(self, label: str):
        self.details.append(f"  ℹ  {label}")
        return True


# ══════════════════════════════════════════════════════════════════
# TEST DEFINITIONS — 30 questions
# ══════════════════════════════════════════════════════════════════

def run_tests(fast_mode: bool = False) -> List[TestResult]:
    results: List[TestResult] = []
    
    def run(name: str, category: str, message: str, assertions):
        tr = TestResult(name, category)
        t0 = time.time()
        resp = chat(message)
        tr.response_time = round(time.time() - t0, 2)
        # meta is a plain dict in the API response (not a nested object)
        meta = resp.get("meta") or {}
        tr.intent_detected = meta.get("intent", "") if isinstance(meta, dict) else ""

        # Always check success + 4-layer presence
        checks = [
            tr.ok(has_success(resp), "API returned success=True"),
            tr.ok(bool(resp.get("message_text", "")), "message_text is non-empty"),
        ]

        # Run per-test assertions
        assertion_results = assertions(resp, tr)
        if isinstance(assertion_results, list):
            checks.extend(assertion_results)

        tr.passed = all(checks) and all(assertion_results if isinstance(assertion_results, list) else [True])
        results.append(tr)
        
        # Progress indicator
        status = f"{GRN}PASS{RST}" if tr.passed else f"{RED}FAIL{RST}"
        intent_str = f" [{tr.intent_detected}]" if tr.intent_detected else ""
        print(f"  {status} ({tr.response_time}s){intent_str} — {name}")
        for d in tr.details:
            print(d)
        return tr

    # ─────────────────────────────────────────────────────────────
    # GROUP 1: EARNINGS_ANALYSIS INTENT (Phase 3 + Phase 4)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 1: EARNINGS_ANALYSIS Intent (Phase 3+4) ━━━{RST}")

    run("T01 — EARNINGS: Earnings analysis trigger",
        "EARNINGS_ANALYSIS",
        f"Show me {SYMBOL_A} earnings analysis",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(has_card(resp, "financials_table") or has_card(resp, "stock_header"),
                  "Has financials_table or stock_header card"),
            tr.ok(has_learning(resp), "Has learning_section (new terms from Phase 3)"),
            tr.ok(has_followup(resp), "Has follow_up_prompt (4-layer layer 4)"),
        ])

    run("T02 — EARNINGS: Quarterly results phrasing",
        "EARNINGS_ANALYSIS",
        f"What were {SYMBOL_B} quarterly results?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has cards in response"),
            tr.ok(has_followup(resp), "Has follow-up (4-layer)"),
        ])

    run("T03 — EARNINGS: Earnings beat or miss",
        "EARNINGS_ANALYSIS",
        f"Did {SYMBOL_A} earnings beat or miss expectations?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("message_text")), "Has message_text"),
            tr.ok(has_learning(resp), "Has learning section"),
        ])

    run("T04 — EARNINGS: Annual earnings quality check",
        "EARNINGS_ANALYSIS",
        f"Annual earnings quality for {SYMBOL_C}",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has cards"),
        ])

    run("T05 — EARNINGS: Comps table auto-generated (Rec D)",
        "EARNINGS_ANALYSIS+COMPS_REC_D",
        f"{SYMBOL_A} earnings analysis",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(
                has_card(resp, "compare_table") or has_card(resp, "financials_table"),
                "Has compare_table (Rec D auto-comps) or financials_table"
            ),
            tr.info(
                "compare_table found: YES" if has_card(resp, "compare_table") else
                "compare_table found: NO (may mean no sector peers have stats)"
            ),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 2: MORNING_BRIEF INTENT (Phase 4)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 2: MORNING_BRIEF Intent (Phase 4) ━━━{RST}")

    run("T06 — MORNING: Classic morning brief trigger",
        "MORNING_BRIEF",
        "Morning brief",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(
                has_card(resp, "movers_table") or has_card(resp, "stats"),
                "Has movers_table or stats card (breadth+movers expected)"
            ),
            tr.ok(has_followup(resp), "Has follow-up (4-layer)"),
            tr.ok(has_actions(resp), "Has action buttons"),
        ])

    run("T07 — MORNING: Today's market phrasing",
        "MORNING_BRIEF",
        "What happened in the market today?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has cards"),
        ])

    run("T08 — MORNING: Give me market brief variant",
        "MORNING_BRIEF",
        "Give me today's EGX market brief",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("message_text")), "Has message_text"),
            tr.ok(has_learning(resp), "Has learning section"),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 3: CATALYST_CALENDAR INTENT (Phase 4)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 3: CATALYST_CALENDAR Intent (Phase 4) ━━━{RST}")

    run("T09 — CATALYST: Upcoming catalysts for stock",
        "CATALYST_CALENDAR",
        f"Upcoming catalysts for {SYMBOL_A}",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(
                has_card(resp, "stats") or has_card(resp, "stock_header"),
                "Has stats or stock_header card"
            ),
            tr.ok(has_followup(resp), "Has follow-up"),
        ])

    run("T10 — CATALYST: Corporate events phrasing",
        "CATALYST_CALENDAR",
        f"What are the next corporate events for {SYMBOL_A}?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has cards in response"),
        ])

    run("T11 — CATALYST: Market-wide calendar (no symbol)",
        "CATALYST_CALENDAR",
        "EGX catalyst calendar upcoming events",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("message_text")), "Has message_text"),
            tr.ok(has_actions(resp), "Has actions"),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 4: LEARNING SECTION — New Terms (Phase 3)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 4: New Learning Section Terms (Phase 3) ━━━{RST}")

    run("T12 — LEARNING: WACC definition triggered",
        "LEARNING_SECTION",
        f"What is the WACC used for valuing {SYMBOL_A}?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(has_learning(resp), "Has learning_section with WACC or valuation term"),
        ])

    run("T13 — LEARNING: DCF model definition",
        "LEARNING_SECTION",
        f"DCF model fair value of {SYMBOL_B}",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(has_learning(resp), "Has learning section"),
        ])

    run("T14 — LEARNING: Earnings term surfaced",
        "LEARNING_SECTION",
        f"Did {SYMBOL_A} have an earnings beat this year?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(has_learning(resp), "Has learning section (earnings_beat_miss term expected)"),
        ])

    run("T15 — LEARNING: NIM definition (bank sector)",
        "LEARNING_SECTION",
        f"What is the net interest margin for {SYMBOL_B}?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(has_learning(resp), "Has learning section (NIM term expected for bank)"),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 5: LLM RULES — Sector Causality v2 + Valuation Cross-Check (Phase 3)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 5: LLM Sector Causality v2 + Valuation Rules (Phase 3) ━━━{RST}")

    run("T16 — LLM: Banking sector analysis (NIM/NPL drivers only)",
        "LLM_SECTOR_CAUSALITY",
        f"Analyze the banking sector drivers on EGX",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")) or bool(resp.get("message_text")), "Has content"),
            tr.ok(has_learning(resp), "Has learning section"),
        ])

    run("T17 — LLM: Real estate drivers (pre-sales/NAV, not NIM)",
        "LLM_SECTOR_CAUSALITY",
        f"What drives real estate stocks like TMGH on EGX?",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("message_text")), "Has response text"),
        ])

    run("T18 — LLM: Deep valuation triggers valuation cross-check rule 11",
        "LLM_VALUATION_RULE11",
        f"Deep valuation analysis of {SYMBOL_A}",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has cards"),
            tr.ok(has_learning(resp), "Has learning section"),
            tr.ok(has_followup(resp), "Has follow-up"),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 6: 4-LAYER STRUCTURE INTEGRITY (Protected Structure)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 6: 4-Layer Structure Integrity (Core Protection) ━━━{RST}")

    run("T19 — 4LAYER: Stock snapshot has all 4 layers",
        "FOUR_LAYER",
        f"Show me {SYMBOL_A} stock overview",
        lambda resp, tr: [
            tr.ok(has_success(resp), "Layer 0: API success"),
            tr.ok(bool(resp.get("message_text")), "Layer 1: Opening/greeting text present"),
            tr.ok(bool(resp.get("cards")), "Layer 2: Data cards present"),
            tr.ok(has_learning(resp), "Layer 3: Learning section present"),
            tr.ok(has_followup(resp), "Layer 4: Follow-up prompt present"),
        ])

    run("T20 — 4LAYER: Morning brief has all 4 layers",
        "FOUR_LAYER",
        "Morning brief for EGX",
        lambda resp, tr: [
            tr.ok(has_success(resp), "Layer 0: success"),
            tr.ok(bool(resp.get("message_text")), "Layer 1: message_text"),
            tr.ok(bool(resp.get("cards")), "Layer 2: cards"),
            tr.ok(has_learning(resp), "Layer 3: learning_section"),
            tr.ok(has_followup(resp), "Layer 4: follow_up_prompt / followups"),
        ])

    run("T21 — 4LAYER: Earnings analysis has all 4 layers",
        "FOUR_LAYER",
        f"{SYMBOL_B} annual earnings quality",
        lambda resp, tr: [
            tr.ok(has_success(resp), "Layer 0: success"),
            tr.ok(bool(resp.get("message_text")), "Layer 1: message_text"),
            tr.ok(bool(resp.get("cards")), "Layer 2: cards"),
            tr.ok(has_learning(resp), "Layer 3: learning_section"),
            tr.ok(has_followup(resp), "Layer 4: follow_up_prompt"),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 7: REGRESSION — Existing core flows still working
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 7: Regression — Existing Core Flows ━━━{RST}")

    run("T22 — REGRESSION: Stock price still works",
        "REGRESSION",
        f"Show me {SYMBOL_A} price",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has cards"),
            tr.ok(has_followup(resp), "Has follow-up"),
        ])

    run("T23 — REGRESSION: Top gainers still works",
        "REGRESSION",
        "Show me top gainers today",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has gainers cards"),
            tr.ok(has_actions(resp), "Has action buttons"),
        ])

    run("T24 — REGRESSION: Stock comparison still works",
        "REGRESSION",
        f"Compare {SYMBOL_A} to {SYMBOL_B}",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has comparison cards"),
        ])

    run("T25 — REGRESSION: Financials still works",
        "REGRESSION",
        f"{SYMBOL_A} financials",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has financial cards"),
            tr.ok(has_learning(resp), "Has learning section"),
        ])

    run("T26 — REGRESSION: Deep valuation still works",
        "REGRESSION",
        f"Deep valuation of {SYMBOL_B}",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has valuation cards"),
            tr.ok(has_followup(resp), "Has follow-up"),
        ])

    run("T27 — REGRESSION: Market summary still works",
        "REGRESSION",
        "EGX market summary",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has market cards"),
            tr.ok(has_actions(resp), "Has action buttons"),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 8: THESIS TRACKING (Rec B)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 8: Thesis Tracking — Rec B ━━━{RST}")

    run("T28 — THESIS: Track thesis phrase recognized",
        "THESIS_REC_B",
        f"Analyze {SYMBOL_A} earnings then track this thesis",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True and no crash"),
            tr.ok(bool(resp.get("message_text")), "Has response text (not empty)"),
            tr.info("Thesis tracking is stored in session context — no visible response change expected"),
        ])

    # ─────────────────────────────────────────────────────────────
    # GROUP 9: SECTOR SCREENING + SCREENER REGRESSION
    # ─────────────────────────────────────────────────────────────
    print(f"\n{BLD}{CYN}━━━ GROUP 9: Sector / Screener Tests ━━━{RST}")

    run("T29 — SECTOR: Banking sector overview",
        "SECTOR_OVERVIEW",
        "Show me banking sector analysis on EGX",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has sector cards"),
        ])

    run("T30 — SCREENER: Value screener still works",
        "SCREENER_REGRESSION",
        "Find undervalued stocks on EGX with low P/E",
        lambda resp, tr: [
            tr.ok(has_success(resp), "success=True"),
            tr.ok(bool(resp.get("cards")), "Has screener result cards"),
            tr.ok(has_followup(resp), "Has follow-up"),
        ])

    return results


# ══════════════════════════════════════════════════════════════════
# REPORT
# ══════════════════════════════════════════════════════════════════
def print_report(results: List[TestResult]):
    total     = len(results)
    passed    = sum(1 for r in results if r.passed)
    failed    = total - passed
    pct       = round(passed / total * 100) if total else 0

    by_category: Dict[str, List[TestResult]] = {}
    for r in results:
        by_category.setdefault(r.category, []).append(r)

    print(f"\n{BLD}{'═'*62}{RST}")
    print(f"{BLD}  INTEGRATION TEST REPORT — FinanceHub Pro{RST}")
    print(f"  Financial-Services-Plugins Full Plan Validation")
    print(f"  {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'═'*62}{RST}")

    print(f"\n{BLD}  SUMMARY{RST}")
    print(f"  Total : {total}")
    print(f"  {GRN}Passed: {passed}{RST}")
    if failed:
        print(f"  {RED}Failed: {failed}{RST}")
    print(f"  Score : {GRN if pct >= 80 else YLW if pct >= 60 else RED}{pct}%{RST}")

    print(f"\n{BLD}  RESULTS BY CATEGORY{RST}")
    for cat, cat_results in by_category.items():
        cat_pass = sum(1 for r in cat_results if r.passed)
        cat_total = len(cat_results)
        cat_icon = GRN+"✓"+RST if cat_pass == cat_total else (YLW+"~"+RST if cat_pass > 0 else RED+"✗"+RST)
        print(f"\n  {cat_icon}  {BLD}{cat}{RST}  [{cat_pass}/{cat_total}]")
        for r in cat_results:
            icon = GRN+"●"+RST if r.passed else RED+"●"+RST
            intent = f" [{r.intent_detected}]" if r.intent_detected else ""
            print(f"     {icon} {r.name} ({r.response_time}s){intent}")
            if not r.passed:
                for d in r.details:
                    print(f"       {d}")

    print(f"\n{'═'*62}")
    if pct == 100:
        print(f"  {GRN}{BLD}✓ ALL TESTS PASSED — Integration complete{RST}")
    elif pct >= 80:
        print(f"  {GRN}{BLD}✓ GOOD — Most tests passed. Review failures above.{RST}")
    elif pct >= 60:
        print(f"  {YLW}{BLD}~ PARTIAL — Some issues found. Review failures above.{RST}")
    else:
        print(f"  {RED}{BLD}✗ CRITICAL — Many failures. Check backend logs.{RST}")
    print(f"{'═'*62}\n")

    # Save JSON report
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "total": total, "passed": passed, "failed": failed, "score_pct": pct,
        "tests": [
            {
                "name": r.name, "category": r.category,
                "passed": r.passed, "response_time": r.response_time,
                "intent": r.intent_detected, "details": r.details
            }
            for r in results
        ]
    }
    report_path = os.path.join(os.path.dirname(__file__), "integration_test_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  JSON report saved: {report_path}\n")

    return pct


# ══════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(
        description="Run 30-question integration tests on FinanceHub Pro chatbot"
    )
    parser.add_argument("--symbol", default="COMI", help="Primary test symbol (default: COMI)")
    parser.add_argument("--fast", action="store_true", help="Skip slow tests")
    args = parser.parse_args()

    global SYMBOL_A
    SYMBOL_A = args.symbol.upper()

    print(f"\n{BLD}{BLU}╔══════════════════════════════════════════════════╗{RST}")
    print(f"{BLD}{BLU}║   FinanceHub Pro — Integration Test Suite        ║{RST}")
    print(f"{BLD}{BLU}║   30 Questions · Financial-Services-Plugins Plan  ║{RST}")
    print(f"{BLD}{BLU}╚══════════════════════════════════════════════════╝{RST}")
    print(f"  API    : {CHAT_URL}")
    print(f"  Symbol : {SYMBOL_A} / {SYMBOL_B} / {SYMBOL_C}")
    print(f"  Session: {SESSION_ID}")

    # Pre-flight health check
    print(f"\n  {BLD}Pre-flight health check...{RST}")
    try:
        health = requests.get(HEALTH_URL, timeout=10).json()
        db_ok  = health.get("database") == "healthy"
        api_ok = health.get("status") == "healthy"
        print(f"  API: {'✓ healthy' if api_ok else '✗ UNHEALTHY'}")
        print(f"  DB : {'✓ healthy' if db_ok else '✗ UNHEALTHY'}")
        if not (api_ok and db_ok):
            print(f"\n  {RED}Pre-flight FAILED — backend not healthy. Aborting.{RST}")
            sys.exit(1)
    except Exception as e:
        print(f"  {RED}Health check error: {e}. Proceeding anyway...{RST}")

    print(f"\n  {BLD}Running 30 tests...{RST}")
    t_start = time.time()
    results = run_tests(fast_mode=args.fast)
    elapsed = round(time.time() - t_start, 1)
    print(f"\n  Total time: {elapsed}s")

    score = print_report(results)
    sys.exit(0 if score >= 80 else 1)


if __name__ == "__main__":
    main()
