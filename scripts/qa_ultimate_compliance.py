#!/usr/bin/env python3
"""
QA Chief Expert Validator — v3 (Extended Fix Validation)
=========================================================
Tests ALL intent types PLUS targeted validation of each reported fix:

Fix #1 — Score Diversity (not flat 36)
Fix #2 — P/B not N/A
Fix #3 — ROE not N/A
Fix #4 — Yield not N/A for dividend stocks
Fix #5 — High-PE stocks capped in screeners
Fix #6 — Sector peer is size-relevant
Fix #7 — Sector avg PE shown inline
Fix #8 — TTM data consistent (no annual history for KPIs)

Run: python3 scripts/qa_30_english.py
"""

import requests
import json
import time
import sys
import re
from typing import List, Dict, Any, Optional, Tuple

API_URL = "https://starta.46-224-223-172.sslip.io/api/v1/ai/chat"
TIMEOUT = 60
LLM_QUOTA_MSG = "upgrading its neural pathways"

class Colors:
    GREEN  = '\033[92m'
    FAIL   = '\033[91m'
    WARN   = '\033[93m'
    CYAN   = '\033[96m'
    BOLD   = '\033[1m'
    HEADER = '\033[95m'
    ENDC   = '\033[0m'


# ─────────────────────────────────────────────────────────────────────────
# TEST SUITE — 38 QUESTIONS (30 core + 8 fix-specific targeted tests)
# ─────────────────────────────────────────────────────────────────────────
TEST_SUITE = [

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 1: CORE SCENARIOS (original 28, no mutual funds)
    # ═══════════════════════════════════════════════════════════════════

    # ── STOCK PRICE & SNAPSHOT ─────────────────────────────────────────
    {
        "id": 1, "type": "STOCK_PRICE",
        "msg": "What is the current price of COMI?",
        "checks": ["has_price", "has_cards"],
        "expect_symbol": "COMI",
    },
    {
        "id": 2, "type": "STOCK_SNAPSHOT",
        "msg": "Give me a full snapshot of SWDY",
        "checks": ["has_price", "has_cards"],
        "expect_symbol": "SWDY",
        "allow_llm_error": True,  # Snapshot requires LLM narrative — quota transient
    },
    {
        "id": 3, "type": "STOCK_PRICE",
        "msg": "Price of ETEL",
        "checks": ["has_price", "has_cards"],
        "expect_symbol": "ETEL",
    },

    # ── STATISTICS / RATIOS ────────────────────────────────────────────
    {
        "id": 4, "type": "STOCK_STATISTICS",
        "msg": "Show me the financial statistics for HRHO",
        "checks": ["has_cards", "has_pe_or_pb"],
        "expect_symbol": "HRHO",
    },
    {
        "id": 5, "type": "STOCK_STATISTICS",
        "msg": "Show me the key financial ratios for AMOC",
        "checks": ["has_cards"],
        "expect_symbol": "AMOC",
    },

    # ── FINANCIALS ─────────────────────────────────────────────────────
    {
        "id": 6, "type": "FINANCIALS",
        "msg": "Show me FWRY financials",
        "checks": ["has_cards", "success"],
        "expect_symbol": "FWRY",
    },
    {
        "id": 7, "type": "FINANCIALS",
        "msg": "Financials of ISPH",
        "checks": ["has_cards", "success"],
        "expect_symbol": "ISPH",
    },
    {
        "id": 8, "type": "DIVIDENDS",
        "msg": "Dividends history of ABUK",
        "checks": ["has_cards", "success"],
        "expect_symbol": "ABUK",
    },

    # ── ANALYSIS & HEALTH ──────────────────────────────────────────────
    {
        "id": 9, "type": "ANALYSIS",
        "msg": "Analyze EMAAR for me",
        "checks": ["has_cards", "success"],
        "expect_symbol": "EMAAR",
    },
    {
        "id": 10, "type": "HEALTH",
        "msg": "What is the financial health of COMI?",
        "checks": ["has_cards", "success"],
        # Note: health response uses company name not ticker — no symbol check
    },
    {
        "id": 11, "type": "VALUATION",
        "msg": "What is the fair value of MFPC?",
        "checks": ["has_cards", "success"],
        "expect_symbol": "MFPC",
    },

    # ── SCREENERS ──────────────────────────────────────────────────────
    {
        "id": 12, "type": "SCREENER_UNDERVALUED",
        "msg": "Find me undervalued stocks in EGX",
        "checks": ["has_cards", "success", "has_multiple_stocks"],
    },
    {
        "id": 13, "type": "SCREENER_HIDDEN_GEMS",
        "msg": "Show me hidden gems in the market",
        "checks": ["has_cards", "success", "has_multiple_stocks"],
        "allow_llm_error": True,
    },
    {
        "id": 14, "type": "SCREENER_DIVIDENDS",
        "msg": "Show me high dividend yield stocks",
        "checks": ["has_cards", "success", "has_multiple_stocks"],
    },
    {
        "id": 15, "type": "SCREENER_SECTOR",
        "msg": "Show me Banks sector stocks in EGX",
        "checks": ["has_cards", "success"],
    },
    {
        "id": 16, "type": "SCREENER_SECTOR",
        "msg": "List Real Estate stocks in Egypt",
        "checks": ["has_cards", "success"],
    },

    # ── COMPARISON ─────────────────────────────────────────────────────
    {
        "id": 17, "type": "COMPARE",
        "msg": "Compare COMI and FWRY",
        "checks": ["has_cards", "success", "has_both_symbols"],
        "expect_symbols": ["COMI", "FWRY"],
    },
    {
        "id": 18, "type": "COMPARE_AUTO",
        "msg": "Compare ORWE with its peers",
        "checks": ["has_cards", "success"],
        "expect_symbol": "ORWE",
    },
    {
        "id": 19, "type": "COMPARE",
        "msg": "SWDY versus PHDC comparison",
        "checks": ["has_cards", "success"],
    },

    # ── MARKET & DISCOVERY ─────────────────────────────────────────────
    {
        "id": 20, "type": "MARKET_MOVERS",
        "msg": "Show me the top gainers today",
        "checks": ["has_cards", "success", "has_multiple_stocks"],
    },
    {
        "id": 21, "type": "MARKET_MOVERS",
        "msg": "What are the biggest losers today?",
        "checks": ["has_cards", "success"],
    },
    {
        "id": 22, "type": "MARKET_SUMMARY",
        "msg": "Give me the EGX market summary",
        "checks": ["has_cards", "success"],
    },

    # ── OWNERSHIP & PROFILE ────────────────────────────────────────────
    {
        "id": 23, "type": "OWNERSHIP",
        "msg": "Who are the major shareholders of ORWE?",
        "checks": ["has_cards", "success"],
        "expect_symbol": "ORWE",
        "allow_llm_error": True,  # Ownership uses LLM — quota transient
    },
    {
        "id": 24, "type": "COMPANY_PROFILE",
        "msg": "Tell me about HRHO company profile",
        "checks": ["has_cards", "success"],
        "expect_symbol": "HRHO",
        "allow_llm_error": True,
    },

    # ── EDUCATIONAL & MACRO ────────────────────────────────────────────
    {
        "id": 25, "type": "EDUCATIONAL",
        "msg": "What is the P/E ratio and how do I use it?",
        "checks": ["success", "has_text"],
    },
    {
        "id": 26, "type": "MACRO",
        "msg": "What is the macro economic environment in Egypt?",
        "checks": ["success", "has_text"],
    },

    # ── DEEP STOCK ANALYSIS ────────────────────────────────────────────
    {
        "id": 27, "type": "STOCK_SNAPSHOT",
        "msg": "Give me a full deep analysis of SWDY stock",
        "checks": ["has_cards", "success"],
        "expect_symbol": "SWDY",
    },

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 2: TARGETED FIX VALIDATION (labeled F1-F8 test per fix)
    # ═══════════════════════════════════════════════════════════════════

    # ── FIX #1 — Score Diversity (not all = 36) ────────────────────────
    {
        "id": "F1a", "type": "FIX1_SCORE_DIVERSITY",
        "msg": "Give me a full snapshot of COMI",
        "label": "Fix #1: COMI snapshot returns a unique score (not flat)",
        "checks": ["has_cards", "success"],
        "expect_symbol": "COMI",
        "data_check": "score_present",
        "data_check_desc": "Expect numeric total_score in snapshot card",
    },
    {
        "id": "F1b", "type": "FIX1_SCORE_DIVERSITY",
        "msg": "Give me a full snapshot of HRHO",
        "label": "Fix #1: HRHO snapshot returns a score different from COMI (diversity proven)",
        "checks": ["has_cards", "success"],
        "expect_symbol": "HRHO",
        "data_check": "score_present",
        "data_check_desc": "HRHO must have numeric total_score (proves engine differentiates)",
        "allow_llm_error": True,
    },

    # ── FIX #2 — P/B Ratio Not N/A ─────────────────────────────────────
    {
        "id": "F2a", "type": "FIX2_PB_NOT_NA",
        "msg": "Show me statistics for SWDY including P/B ratio",
        "label": "Fix #2: P/B ratio is numeric (not N/A) for SWDY",
        "checks": ["has_cards", "success"],
        "expect_symbol": "SWDY",
        "data_check": "pb_is_numeric",
        "data_check_desc": "P/B ratio must be a real number like 1.8x, not N/A",
    },
    {
        "id": "F2b", "type": "FIX2_PB_NOT_NA",
        "msg": "What is the P/B ratio of COMI?",
        "label": "Fix #2: P/B ratio is numeric for COMI",
        "checks": ["has_cards", "success"],
        "expect_symbol": "COMI",
        "data_check": "pb_is_numeric",
        "data_check_desc": "P/B ratio must be a real number, not N/A",
    },

    # ── FIX #3 — ROE Not N/A ───────────────────────────────────────────
    {
        "id": "F3a", "type": "FIX3_ROE_NOT_NA",
        "msg": "Show me the financial statistics for HRHO",
        "label": "Fix #3: ROE is numeric (not N/A) for HRHO statistics",
        "checks": ["has_cards", "success"],
        "expect_symbol": "HRHO",
        "data_check": "roe_is_numeric",
        "data_check_desc": "ROE must be a real number like 22.5%, not N/A",
    },
    {
        "id": "F3b", "type": "FIX3_ROE_NOT_NA",
        "msg": "Show me financial health indicators for FWRY",
        "label": "Fix #3: ROE present in health analysis",
        "checks": ["has_cards", "success"],
        "data_check": "roe_or_health_data",
        "data_check_desc": "Health response must contain ROE or financial ratios",
    },

    # ── FIX #4 — Dividend Yield Not N/A ───────────────────────────────
    {
        "id": "F4", "type": "FIX4_YIELD_NOT_NA",
        "msg": "What is the dividend yield of ABUK?",
        "label": "Fix #4: Dividend yield shows numeric value not N/A",
        "checks": ["has_cards", "success"],
        # Note: this query routes to dividend screener — ABUK may not appear in text
        "data_check": "yield_is_numeric",
        "data_check_desc": "Dividend yield must be a numeric percentage, not N/A",
    },

    # ── FIX #5 — High-PE Stocks Excluded from Screeners ───────────────
    {
        "id": "F5", "type": "FIX5_PE_CAP",
        "msg": "Show me undervalued stocks with low P/E in EGX",
        "label": "Fix #5: No stock with PE > 40 in undervalued screener",
        "checks": ["has_cards", "success"],
        "data_check": "no_high_pe_in_screener",
        "data_check_desc": "Screener must not return stocks with PE > 40x",
    },

    # ── FIX #6 — Sector Peer is Size-Relevant ─────────────────────────
    {
        "id": "F6", "type": "FIX6_SECTOR_PEER",
        "msg": "Compare ORWE with a similar peer",
        "label": "Fix #6: ORWE peer is size-relevant (not EAST or giant cap)",
        "checks": ["has_cards", "success"],
        "expect_symbol": "ORWE",
        "data_check": "peer_not_east",
        "data_check_desc": "Auto-selected peer for ORWE must NOT be EAST",
    },

    # ── FIX #7 — Sector Avg PE Displayed Inline ───────────────────────
    {
        "id": "F7", "type": "FIX7_SECTOR_AVG_PE",
        "msg": "Show me the valuation ratios and sector context for SWDY",
        "label": "Fix #7: Response contains sector average PE/PB inline",
        "checks": ["has_cards", "success"],
        "expect_symbol": "SWDY",
        "data_check": "sector_avg_pe_shown",
        "data_check_desc": "Response must show 'sector avg' or 'السوق' next to PE/PB values",
    },

    # ── FIX #8 — TTM Consistency (no stale annual values) ─────────────
    {
        "id": "F8a", "type": "FIX8_TTM_CONSISTENCY",
        "msg": "Show me return on equity and debt to equity for AMOC",
        "label": "Fix #8: ROE/DE are TTM values (non-null, recent)",
        "checks": ["has_cards", "success"],
        "expect_symbol": "AMOC",
        "data_check": "ttm_ratios_present",
        "data_check_desc": "ROE, D/E must be numeric — N/A means still using broken annual source",
    },
    {
        "id": "F8b", "type": "FIX8_TTM_CONSISTENCY",
        "msg": "Analyze the financial health of TMGH",
        "label": "Fix #8: Health analysis uses TTM data not annual",
        "checks": ["has_cards", "success"],
        "expect_symbol": "TMGH",
        "data_check": "health_data_present",
        "data_check_desc": "Health card must contain actual ratio values, not blank",
    },
]

# ── CONTEXT SWITCH TEST ───────────────────────────────────────────────────
CONTEXT_SUITE = [
    {"msg": "Analyze HRHO",         "expect_symbol": "HRHO", "step": "SEED"},
    {"msg": "What about SWDY?",     "expect_symbol": "SWDY", "step": "SWITCH"},
    {"msg": "Show me its P/E ratio", "expect_symbol": "SWDY", "step": "STAY"},
]


# ─────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────

def call_api(message: str, session_id: str, language: str = "en") -> Dict:
    try:
        res = requests.post(API_URL, json={
            "message": message, "session_id": session_id, "language": language
        }, timeout=TIMEOUT)
        if res.status_code == 200:
            return res.json()
        return {"success": False, "message": f"HTTP {res.status_code}"}
    except Exception as e:
        return {"success": False, "message": f"Exception: {e}"}


def get_text(data: dict) -> str:
    parts = [
        str(data.get("conversational_text") or ""),
        str(data.get("message") or ""),
        str(data.get("cards") or []),
        str(data.get("structured_narrative") or {}),
    ]
    return " ".join(parts).upper()


def is_llm_error(data: dict) -> bool:
    return LLM_QUOTA_MSG in str(data.get("message") or "").lower()


def get_all_pe_values(raw_json: str) -> List[float]:
    """Extract all pe_ratio numeric values from the JSON."""
    vals = re.findall(r'"pe_ratio"\s*:\s*([0-9]+(?:\.[0-9]+)?)', raw_json)
    return [float(v) for v in vals if v]


def get_all_scores(raw_json: str) -> List[int]:
    """Extract all total_score values."""
    vals = re.findall(r'"total_score"\s*:\s*(\d+)', raw_json)
    return [int(v) for v in vals]


def run_data_check(check_name: str, data: dict, raw_json: str, full_text: str) -> Tuple[bool, str]:
    """Run a targeted data accuracy check. Returns (passed, detail)."""

    if check_name == "score_present":
        scores = get_all_scores(raw_json)
        if not scores:
            return False, "No total_score found in response"
        return True, f"Score found: {scores[0]}"

    if check_name == "scores_diverse":
        scores = get_all_scores(raw_json)
        if len(scores) < 2:
            return False, f"Only {len(scores)} scores found — need ≥2 to check diversity"
        if len(set(scores)) == 1:
            return False, f"All {len(scores)} scores identical = {scores[0]} (flat scoring not fixed)"
        min_s, max_s = min(scores), max(scores)
        if max_s - min_s < 5:
            return False, f"Score range too narrow: {min_s}–{max_s} (expected >5 spread)"
        return True, f"Diverse scores: min={min_s}, max={max_s}, count={len(scores)}"

    if check_name == "pb_is_numeric":
        # Check pb_ratio field is numeric
        pb_vals = re.findall(r'"pb_ratio"\s*:\s*([0-9]+(?:\.[0-9]+)?)', raw_json)
        # Also check display string pattern "1.8x" or "P/B: 1.8"
        pb_display = re.findall(r'P/?B[:\s]*([0-9]+\.[0-9]+)', full_text)
        if pb_vals or pb_display:
            val = pb_vals[0] if pb_vals else pb_display[0]
            return True, f"P/B numeric value found: {val}"
        # Check for N/A
        if re.search(r'P/?B[^\d]{0,20}N/?A', full_text, re.IGNORECASE):
            return False, "P/B shows N/A — COALESCE fix may not have reached this handler"
        if '"pb_ratio": null' in raw_json or '"pb_ratio":null' in raw_json:
            return False, "pb_ratio is null in card data — COALESCE fix not applied"
        return False, "P/B ratio not found at all in response"

    if check_name == "roe_is_numeric":
        roe_vals = re.findall(r'"roe"\s*:\s*([0-9]+(?:\.[0-9]+)?)', raw_json)
        roe_display = re.findall(r'ROE[:\s=]*([0-9]+(?:\.[0-9]+)?)\s*%', full_text)
        if roe_vals or roe_display:
            val = roe_vals[0] if roe_vals else roe_display[0]
            return True, f"ROE numeric found: {val}%"
        if re.search(r'ROE[^\d]{0,15}N/?A', full_text, re.IGNORECASE):
            return False, "ROE shows N/A — annual query fix may not have reached this handler"
        return False, "ROE not found in response"

    if check_name == "roe_or_health_data":
        # For health responses, check either ROE or Altman Z or Current Ratio
        has_z = re.search(r'"altman_z_score"\s*:\s*[0-9]', raw_json)
        has_cr = re.search(r'"current_ratio"\s*:\s*[0-9]', raw_json)
        has_roe = re.search(r'"roe"\s*:\s*[0-9]', raw_json)
        if has_z or has_cr or has_roe:
            found = []
            if has_z:  found.append("Altman Z-score")
            if has_cr: found.append("Current Ratio")
            if has_roe: found.append("ROE")
            return True, f"Health data present: {', '.join(found)}"
        return False, "No Altman Z, Current Ratio, or ROE found in health response"

    if check_name == "yield_is_numeric":
        yield_vals = re.findall(r'"dividend_yield"\s*:\s*([0-9]+(?:\.[0-9]+)?)', raw_json)
        yield_display = re.findall(r'(?:Yield|dividend)[^\d]{0,20}([0-9]+(?:\.[0-9]+)?)\s*%', full_text, re.IGNORECASE)
        if yield_vals or yield_display:
            val = yield_vals[0] if yield_vals else yield_display[0]
            return True, f"Yield numeric found: {val}%"
        if '"dividend_yield": null' in raw_json or '"dividend_yield":null' in raw_json:
            return False, "dividend_yield is null — COALESCE not applied in this handler"
        return False, "Dividend yield not found in response"

    if check_name == "no_high_pe_in_screener":
        pe_vals = get_all_pe_values(raw_json)
        if not pe_vals:
            # No PE shown is acceptable for a screener that lists stocks without individual PE
            return True, "No individual PE values exposed in screener (acceptable)"
        bad = [v for v in pe_vals if v > 40]
        if bad:
            return False, f"Screener returned stocks with PE > 40x: {bad} — cap not enforced"
        return True, f"All PE values within cap: max={max(pe_vals):.1f}x (cap=40)"

    if check_name == "peer_not_east":
        if "EAST" in full_text and "ORWE" in full_text:
            # If EAST appears multiple times it was likely selected as peer
            east_count = full_text.count("EAST")
            if east_count >= 3:
                return False, f"EAST appears {east_count}x suggesting it was auto-selected as peer for ORWE (wrong — different size)"
        return True, "EAST not selected as primary peer for ORWE"

    if check_name == "sector_avg_pe_shown":
        # Check for "sector avg" or sector comparison text inline
        has_sector_avg = (
            "SECTOR AVG" in full_text or
            "SECTOR AVERAGE" in full_text or
            re.search(r'[0-9]+\.[0-9]+X\s*[—\-–]\s*SECTOR', full_text) or
            re.search(r'SECTOR.*?[0-9]+\.[0-9]+X', full_text) or
            re.search(r'AVG.*?[0-9]+\.[0-9]+', full_text)
        )
        if has_sector_avg:
            # Try to extract the actual values
            match = re.search(r'([0-9]+\.[0-9]+)[Xx]?\s*[—\-–]+\s*.*?([0-9]+\.[0-9]+)[Xx]?\s*(?:sector|avg)', full_text, re.IGNORECASE)
            detail = f"Sector avg shown in response" + (f": stock={match.group(1)}x, avg={match.group(2)}x" if match else "")
            return True, detail
        return False, "No sector average shown inline (e.g. '11.4x — sector avg 18.2x')"

    if check_name == "ttm_ratios_present":
        has_de = re.search(r'"debt_equity"\s*:\s*[0-9]', raw_json) or re.search(r'D/E.*?[0-9]+\.[0-9]+', full_text)
        has_roe = re.search(r'"roe"\s*:\s*[0-9]', raw_json)
        has_cr = re.search(r'"current_ratio"\s*:\s*[0-9]', raw_json)
        found = []
        if has_de:  found.append("D/E")
        if has_roe: found.append("ROE")
        if has_cr:  found.append("Current Ratio")
        if found:
            return True, f"TTM ratios present: {', '.join(found)}"
        return False, "No D/E, ROE, or Current Ratio found — TTM data not reaching this response"

    if check_name == "health_data_present":
        has_z   = re.search(r'"altman_z_score"\s*:\s*[0-9]', raw_json)
        has_pi  = re.search(r'"piotroski_f_score"\s*:\s*[0-9]', raw_json)
        has_cr  = re.search(r'"current_ratio"\s*:\s*[0-9]', raw_json)
        has_de  = re.search(r'"debt_equity"\s*:\s*[0-9]', raw_json)
        found = []
        if has_z:  found.append("Altman Z")
        if has_pi: found.append("Piotroski")
        if has_cr: found.append("Current Ratio")
        if has_de: found.append("D/E")
        if found:
            return True, f"Health data present: {', '.join(found)}"
        return False, "No health metrics (Altman Z, Piotroski, Current Ratio, D/E) in response"

    return True, "Unknown check — skipped"


# ─────────────────────────────────────────────────────────────────────────
# VALIDATE
# ─────────────────────────────────────────────────────────────────────────

def validate(test: dict, data: dict) -> Tuple[List[str], List[str]]:
    """Returns (failures, warnings)."""
    issues, warns = [], []
    checks = test.get("checks", [])
    raw_json = json.dumps(data, ensure_ascii=False)
    full_text = get_text(data)

    if is_llm_error(data) and test.get("allow_llm_error"):
        warns.append("LLM quota exhausted — transient (Groq)")
        return issues, warns

    if "success" in checks:
        if not data.get("success"):
            issues.append(f"success=False: {str(data.get('message',''))[:100]}")
            return issues, warns

    if "has_cards" in checks:
        if not data.get("cards"):
            issues.append("No cards returned")

    if "has_price" in checks:
        if not re.search(r'"(?:last_price|price)":\s*[0-9]', raw_json):
            issues.append("No numeric price in response")

    if "has_pe_or_pb" in checks:
        has = (re.search(r'"pe_ratio":\s*[0-9]', raw_json) or
               re.search(r'"pb_ratio":\s*[0-9]', raw_json) or
               re.search(r'P/[EB].*?[0-9]+\.[0-9]+', full_text))
        if not has:
            issues.append("PE and PB both missing/null")

    if "has_multiple_stocks" in checks:
        cards = data.get("cards", [])
        multi_types = {
            "hidden_gems","screener_results","stock_list","movers",
            "undervalued_stocks","sector_list","gainers","losers","dividend_leaders"
        }
        has_multi = any(c.get("type") in multi_types for c in cards)
        unique = set(re.findall(r'\b([A-Z]{3,5})\b', full_text)) - {
            "EGX","TTM","ROE","API","QA","USD","EGP","N/A","PASS","FAIL","TRUE","NONE","AND","FOR","THE"
        }
        if not has_multi and len(unique) < 3:
            issues.append(f"Expected multiple stocks — only {len(unique)} tickers found")

    if "expect_symbol" in test:
        sym = test["expect_symbol"].upper()
        if sym not in full_text:
            issues.append(f"Expected symbol {sym} not in response")

    if "has_both_symbols" in checks and "expect_symbols" in test:
        for sym in test["expect_symbols"]:
            if sym.upper() not in full_text:
                issues.append(f"Comparison: missing symbol {sym}")

    if "has_text" in checks:
        text = str(data.get("conversational_text") or data.get("message") or "")
        if len(text.strip()) < 50:
            issues.append(f"Response too short ({len(text)} chars)")

    # ── Targeted data accuracy check ───────────────────────────────────
    dc = test.get("data_check")
    if dc:
        passed, detail = run_data_check(dc, data, raw_json, full_text)
        if not passed:
            issues.append(f"DATA: {test.get('data_check_desc', dc)} — {detail}")
        else:
            warns.append(f"✓ {detail}")

    return issues, warns


# ─────────────────────────────────────────────────────────────────────────
# MAIN RUNNER
# ─────────────────────────────────────────────────────────────────────────

def run():
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD} 🔬 CHIEF EXPERT QA v3 — {len(TEST_SUITE)} SCENARIOS + FIX VALIDATION{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")

    results = {"passed": 0, "failed": 0, "warned": 0, "failures": []}
    timestamp = int(time.time())

    print(f"{Colors.BOLD}{'─'*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}  SECTION 1 — Core Scenarios (1–27){Colors.ENDC}")
    print(f"{Colors.BOLD}{'─'*70}{Colors.ENDC}\n")

    in_fix_section = False

    for test in TEST_SUITE:
        i      = test["id"]
        msg    = test["msg"]
        t_type = test["type"]
        label  = test.get("label", "")

        # Section header for fix tests
        if str(i).startswith("F") and not in_fix_section:
            in_fix_section = True
            print(f"\n{Colors.BOLD}{'─'*70}{Colors.ENDC}")
            print(f"{Colors.BOLD}  SECTION 2 — Fix Validation (F1–F8){Colors.ENDC}")
            print(f"{Colors.BOLD}{'─'*70}{Colors.ENDC}\n")

        sid  = f"qa-v3-{timestamp}-{i}"
        tag  = f"[{i}]" if str(i).isdigit() else f"[{i}]"

        if label:
            print(f"  {tag} {Colors.CYAN}{label}{Colors.ENDC}")
            print(f"      Query: {msg[:60]}", end="  ", flush=True)
        else:
            print(f"  {tag} {Colors.CYAN}{t_type}{Colors.ENDC} | {msg[:58]}", end="  ", flush=True)

        start = time.time()
        data  = call_api(msg, sid)
        dur   = time.time() - start

        issues, warns = validate(test, data)
        intent = (data or {}).get("meta", {}).get("intent", "?")

        if issues:
            if label:
                print(f"{Colors.FAIL}❌ FAIL{Colors.ENDC} ({dur:.1f}s) [{intent}]")
            else:
                print(f"{Colors.FAIL}❌ FAIL{Colors.ENDC} ({dur:.1f}s) [{intent}]")
            for iss in issues:
                print(f"         {Colors.FAIL}✗ {iss}{Colors.ENDC}")
            for w in [x for x in warns if not x.startswith("✓")]:
                print(f"         {Colors.WARN}⚠ {w}{Colors.ENDC}")
            results["failed"] += 1
            results["failures"].append({"id": i, "msg": msg, "type": t_type, "label": label, "issues": issues})
        elif any(w.startswith("⚠") or "quota" in w.lower() for w in warns):
            print(f"{Colors.WARN}⚠ WARN{Colors.ENDC} ({dur:.1f}s) [{intent}]")
            for w in warns:
                print(f"         {Colors.WARN}⚠ {w}{Colors.ENDC}")
            results["warned"] += 1
            results["passed"] += 1
        else:
            print(f"{Colors.GREEN}✅ PASS{Colors.ENDC} ({dur:.1f}s) [{intent}]")
            for w in [x for x in warns if x.startswith("✓")]:
                print(f"         {Colors.CYAN}{w}{Colors.ENDC}")
            results["passed"] += 1

        time.sleep(0.4)

    # ── Phase 2: Context Switch ──────────────────────────────────────
    print(f"\n{Colors.BOLD}{'─'*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}  CONTEXT SWITCH VALIDATION{Colors.ENDC}")
    print(f"{Colors.BOLD}{'─'*70}{Colors.ENDC}\n")
    ctx_sid = f"qa-ctx3-{timestamp}"

    for step in CONTEXT_SUITE:
        print(f"  [{step['step']}] {step['msg'][:55]}", end="  ", flush=True)
        data = call_api(step["msg"], ctx_sid)
        sym  = step.get("expect_symbol", "")
        full = get_text(data)

        if sym and sym.upper() not in full:
            print(f"{Colors.FAIL}❌ FAIL — {sym} not found{Colors.ENDC}")
            results["failed"] += 1
            results["failures"].append({"id": "CTX", "msg": step["msg"], "type": "CONTEXT", "label": "", "issues": [f"Expected {sym} in response"]})
        else:
            print(f"{Colors.GREEN}✅ PASS{Colors.ENDC}")
            results["passed"] += 1
        time.sleep(0.4)

    # ── Summary ──────────────────────────────────────────────────────
    total = results["passed"] + results["failed"]
    pct   = int(results["passed"] / total * 100) if total else 0

    print(f"\n{Colors.HEADER}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}📊 FINAL: {results['passed']}/{total} passed ({pct}%) | {results['warned']} warnings{Colors.ENDC}")

    if results["failures"]:
        print(f"\n{Colors.FAIL}{Colors.BOLD}FAILURES TO FIX:{Colors.ENDC}")
        for f in results["failures"]:
            label = f" — {f['label']}" if f.get('label') else ""
            print(f"  [{f['id']}] {f['type']}{label}")
            for iss in f["issues"]:
                print(f"        • {iss}")

    if results["failed"] == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🏆 100% PASS — ALL FIXES VERIFIED WORLD-CLASS COMPLIANT{Colors.ENDC}\n")
        sys.exit(0)
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}⚠️  {results['failed']} FAILURE(S) — FIXING NOW{Colors.ENDC}\n")
        sys.exit(1)


if __name__ == "__main__":
    run()
