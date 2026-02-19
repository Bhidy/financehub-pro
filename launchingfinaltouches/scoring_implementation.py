# STARTA AI — SCREENER & SCORING IMPLEMENTATION GUIDE
# Covers: scoring logic, screener API, follow-up question handling
# Builds on: existing main.py, database.py, schema.sql

# ============================================================
# FILE 1: scoring_simple.py
# The 5-component scoring engine — fully verifiable
# ============================================================

from typing import Dict, List, Optional
from dataclasses import dataclass, field


# ── SECTOR CONFIGURATION ────────────────────────────────────

SECTOR_CONFIG = {
    "Financials - Banks": {
        "valuation_metric": "pb_ratio",          # P/B is primary for banks
        "valuation_label": "P/B vs 5yr avg",
        "roe_strong": 20.0, "roe_good": 15.0, "roe_weak": 10.0,
        "de_threshold": 1.5,                     # Banks naturally lever up
    },
    "Real Estate - Developers": {
        "valuation_metric": "pb_ratio",          # Asset-backed: P/B primary
        "valuation_label": "P/B vs 5yr avg",
        "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 8.0,
        "de_threshold": 0.7,
    },
    "Consumer - Food & Beverage": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs 5yr avg",
        "roe_strong": 25.0, "roe_good": 15.0, "roe_weak": 8.0,
        "de_threshold": 0.7,
    },
    "Consumer - Retail": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs 5yr avg",
        "roe_strong": 20.0, "roe_good": 12.0, "roe_weak": 6.0,
        "de_threshold": 0.7,
    },
    "Industrials": {
        "valuation_metric": "ev_ebitda",         # EV/EBITDA for capital-intensive
        "valuation_label": "EV/EBITDA vs 5yr avg",
        "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 7.0,
        "de_threshold": 0.8,
    },
    "Healthcare": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs 5yr avg",
        "roe_strong": 22.0, "roe_good": 15.0, "roe_weak": 8.0,
        "de_threshold": 0.5,
    },
    "Telecommunications": {
        "valuation_metric": "ev_ebitda",
        "valuation_label": "EV/EBITDA vs 5yr avg",
        "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 7.0,
        "de_threshold": 1.0,
    },
    "Energy & Utilities": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs 5yr avg",
        "roe_strong": 15.0, "roe_good": 10.0, "roe_weak": 6.0,
        "de_threshold": 1.0,
    },
}

DEFAULT_CONFIG = {
    "valuation_metric": "pe_ratio",
    "valuation_label": "P/E vs 5yr avg",
    "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 7.0,
    "de_threshold": 0.7,
}


# ── DATA STRUCTURE ───────────────────────────────────────────

@dataclass
class ScoreBreakdown:
    ticker: str
    company_name: str
    sector: str

    # Component scores (each 0-20)
    valuation:        int = 0
    profitability:    int = 0
    financial_health: int = 0
    earnings_quality: int = 0
    momentum:         int = 0

    # Metadata for each component (shown in breakdown card)
    valuation_note:        str = ""
    profitability_note:    str = ""
    financial_health_note: str = ""
    earnings_quality_note: str = ""
    momentum_note:         str = ""

    # Computed
    total: int = 0
    grade: str = ""
    signal: str = ""
    category: str = ""

    # For screener display
    current_price:  float = 0.0
    market_cap:     float = 0.0
    key_strength:   str = ""
    key_watch:      str = ""


# ── COMPONENT CALCULATORS ────────────────────────────────────

def score_valuation(current_val: float, historical_avg: float, label: str) -> tuple[int, str]:
    """
    How cheap vs own history? (0-20)
    Works for P/E, P/B, or EV/EBITDA depending on sector.

    Verification example:
    JUFO P/E: 11.47 | 5yr avg: 14.3
    Discount = (14.3 - 11.47) / 14.3 = 19.8% → score 12/20
    """
    if not current_val or not historical_avg or historical_avg == 0:
        return 8, f"{label}: insufficient history"

    discount = (historical_avg - current_val) / historical_avg

    if discount >= 0.30:
        score, desc = 20, f"30%+ below 5yr avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= 0.20:
        score, desc = 16, f"20-30% below 5yr avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= 0.10:
        score, desc = 12, f"10-20% below 5yr avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= 0.00:
        score, desc = 8,  f"Near 5yr avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= -0.15:
        score, desc = 4,  f"0-15% above 5yr avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    else:
        score, desc = 0,  f"15%+ above 5yr avg — expensive ({current_val:.1f}x vs {historical_avg:.1f}x avg)"

    return score, desc


def score_profitability(roe: float, sector: str) -> tuple[int, str]:
    """
    ROE vs sector-specific thresholds (0-20)

    Verification example:
    JUFO ROE: 38.6% | Consumer strong: 25%
    38.6 >= 25 * 1.5 (37.5) → score 20/20
    """
    cfg = SECTOR_CONFIG.get(sector, DEFAULT_CONFIG)
    strong = cfg["roe_strong"]
    good   = cfg["roe_good"]
    weak   = cfg["roe_weak"]

    if roe is None:
        return 8, "ROE: data unavailable"

    if roe >= strong * 1.5:
        score, desc = 20, f"ROE {roe:.1f}% — exceptional for sector (threshold: {strong:.0f}%)"
    elif roe >= strong:
        score, desc = 16, f"ROE {roe:.1f}% — above strong threshold ({strong:.0f}%)"
    elif roe >= good:
        score, desc = 12, f"ROE {roe:.1f}% — above good threshold ({good:.0f}%)"
    elif roe >= weak:
        score, desc = 8,  f"ROE {roe:.1f}% — above weak threshold ({weak:.0f}%)"
    elif roe >= 0:
        score, desc = 4,  f"ROE {roe:.1f}% — profitable but weak"
    else:
        score, desc = 0,  f"ROE {roe:.1f}% — negative (losing money)"

    return score, desc


def score_financial_health(debt_equity: float, sector: str) -> tuple[int, str]:
    """
    D/E vs sector threshold (0-20)

    Verification example:
    JUFO D/E: 0.62 | Consumer threshold: 0.70
    0.62 <= 0.70 → score 12/20
    """
    cfg = SECTOR_CONFIG.get(sector, DEFAULT_CONFIG)
    threshold = cfg["de_threshold"]

    if debt_equity is None:
        return 10, "D/E: data unavailable"

    if debt_equity <= threshold * 0.30:
        score, desc = 20, f"D/E {debt_equity:.2f}x — very low leverage (threshold: {threshold:.1f}x)"
    elif debt_equity <= threshold * 0.60:
        score, desc = 16, f"D/E {debt_equity:.2f}x — conservative leverage"
    elif debt_equity <= threshold:
        score, desc = 12, f"D/E {debt_equity:.2f}x — within acceptable range ({threshold:.1f}x threshold)"
    elif debt_equity <= threshold * 1.30:
        score, desc = 8,  f"D/E {debt_equity:.2f}x — slightly above comfort zone"
    elif debt_equity <= threshold * 1.70:
        score, desc = 4,  f"D/E {debt_equity:.2f}x — elevated leverage, watch"
    else:
        score, desc = 0,  f"D/E {debt_equity:.2f}x — high leverage, significant risk"

    return score, desc


def score_earnings_quality(operating_cash_flow: float, net_income: float) -> tuple[int, str]:
    """
    Does cash confirm earnings? OCF / Net Income ratio (0-20)
    CFA insight: cash earnings > book earnings = quality signal

    Verification example:
    JUFO OCF: 1700M | NI: 2735M
    Ratio = 1700/2735 = 0.62 → score 8/20
    """
    if net_income is None or net_income == 0:
        if operating_cash_flow and operating_cash_flow > 0:
            return 8, "Net income zero/negative but positive cash flow"
        return 0, "Both earnings and cash flow negative"

    if net_income < 0:
        return 0, f"Net income negative — loss-making business"

    ratio = operating_cash_flow / net_income

    if ratio >= 1.20:
        score, desc = 20, f"OCF/NI {ratio:.2f}x — cash materially ahead of earnings (strong quality)"
    elif ratio >= 1.00:
        score, desc = 16, f"OCF/NI {ratio:.2f}x — cash confirming earnings (good quality)"
    elif ratio >= 0.70:
        score, desc = 12, f"OCF/NI {ratio:.2f}x — some gap between cash and earnings (acceptable)"
    elif ratio >= 0.40:
        score, desc = 8,  f"OCF/NI {ratio:.2f}x — meaningful gap, watch accruals"
    elif ratio >= 0:
        score, desc = 4,  f"OCF/NI {ratio:.2f}x — very low cash conversion, caution"
    else:
        score, desc = 0,  f"Negative operating cash flow — earnings may not be real"

    return score, desc


def score_momentum(price_change_3m_pct: float) -> tuple[int, str]:
    """
    Price vs 3 months ago (0-20)
    Note: for value/gem screens, low momentum is expected and OK

    Verification: direct lookup of price change percentage
    """
    if price_change_3m_pct is None:
        return 10, "Price history: insufficient data"

    if price_change_3m_pct >= 20:
        score, desc = 20, f"Price +{price_change_3m_pct:.1f}% last 3m — strong uptrend"
    elif price_change_3m_pct >= 10:
        score, desc = 16, f"Price +{price_change_3m_pct:.1f}% last 3m — positive momentum"
    elif price_change_3m_pct >= 0:
        score, desc = 12, f"Price +{price_change_3m_pct:.1f}% last 3m — flat to positive"
    elif price_change_3m_pct >= -10:
        score, desc = 8,  f"Price {price_change_3m_pct:.1f}% last 3m — minor pullback"
    elif price_change_3m_pct >= -20:
        score, desc = 4,  f"Price {price_change_3m_pct:.1f}% last 3m — significant decline"
    else:
        score, desc = 0,  f"Price {price_change_3m_pct:.1f}% last 3m — major selloff"

    return score, desc


# ── GRADE + SIGNAL LABELS ────────────────────────────────────

def get_grade_and_signal(total: int) -> tuple[str, str]:
    if total >= 80: return "A", "Strong Setup"
    if total >= 65: return "B", "Interesting Setup"
    if total >= 50: return "C", "Monitor"
    if total >= 35: return "D", "Proceed With Caution"
    return "F", "Avoid"


def get_category(val: int, prof: int, quality: int, health: int) -> str:
    """
    Single label that summarises WHY the stock scores this way.
    Makes screener lists readable at a glance.
    """
    if prof >= 16 and quality >= 16:
        return "Quality Compounder at Discount" if val >= 12 else "Quality Compounder (Fairly Priced)"
    if val >= 16:
        return "Value with Quality" if prof >= 12 else "Deep Value (Quality Risk)"
    if quality <= 4:
        return "Value Trap Risk"
    if health <= 4:
        return "Leveraged Value — Handle With Care"
    return "Balanced Opportunity"


def get_key_strength(breakdown: 'ScoreBreakdown') -> str:
    """Pick the single most impressive component to highlight."""
    scores = {
        "valuation": breakdown.valuation,
        "profitability": breakdown.profitability,
        "financial health": breakdown.financial_health,
        "earnings quality": breakdown.earnings_quality,
        "momentum": breakdown.momentum,
    }
    best = max(scores, key=scores.get)
    if best == "valuation":     return breakdown.valuation_note
    if best == "profitability": return breakdown.profitability_note
    if best == "financial health": return breakdown.financial_health_note
    if best == "earnings quality": return breakdown.earnings_quality_note
    return breakdown.momentum_note


def get_key_watch(breakdown: 'ScoreBreakdown') -> str:
    """Pick the single most concerning component to flag."""
    scores = {
        "valuation": breakdown.valuation,
        "profitability": breakdown.profitability,
        "financial health": breakdown.financial_health,
        "earnings quality": breakdown.earnings_quality,
        "momentum": breakdown.momentum,
    }
    worst = min(scores, key=scores.get)
    if worst == "valuation":     return breakdown.valuation_note
    if worst == "profitability": return breakdown.profitability_note
    if worst == "financial health": return breakdown.financial_health_note
    if worst == "earnings quality": return breakdown.earnings_quality_note
    return breakdown.momentum_note


# ── MASTER SCORE FUNCTION ────────────────────────────────────

def calculate_score(stock: Dict, historical_avg: Dict) -> ScoreBreakdown:
    """
    Main entry point. Pass in current stock data + historical averages.
    Returns complete ScoreBreakdown.

    Args:
        stock: current data from valuation_ratios table
        historical_avg: dict with 5yr averages (pe_5yr_avg, pb_5yr_avg, etc.)
    """
    sector = stock.get("sector", "Consumer - Food & Beverage")
    cfg    = SECTOR_CONFIG.get(sector, DEFAULT_CONFIG)

    # Which valuation metric for this sector?
    val_metric   = cfg["valuation_metric"]
    current_val  = stock.get(val_metric)
    avg_key      = val_metric + "_5yr_avg"
    hist_val     = historical_avg.get(avg_key)

    # Calculate each component
    v_score, v_note = score_valuation(current_val, hist_val, cfg["valuation_label"])
    p_score, p_note = score_profitability(stock.get("roe"), sector)
    h_score, h_note = score_financial_health(stock.get("debt_to_equity"), sector)
    q_score, q_note = score_earnings_quality(
        stock.get("operating_cash_flow"),
        stock.get("net_income")
    )
    m_score, m_note = score_momentum(stock.get("price_change_3m_pct"))

    total = v_score + p_score + h_score + q_score + m_score
    grade, signal = get_grade_and_signal(total)
    category = get_category(v_score, p_score, q_score, h_score)

    bd = ScoreBreakdown(
        ticker=stock["ticker"],
        company_name=stock.get("company_name", ""),
        sector=sector,
        valuation=v_score,        valuation_note=v_note,
        profitability=p_score,    profitability_note=p_note,
        financial_health=h_score, financial_health_note=h_note,
        earnings_quality=q_score, earnings_quality_note=q_note,
        momentum=m_score,         momentum_note=m_note,
        total=total,
        grade=grade,
        signal=signal,
        category=category,
        current_price=stock.get("current_price", 0),
        market_cap=stock.get("market_cap", 0),
    )

    bd.key_strength = get_key_strength(bd)
    bd.key_watch    = get_key_watch(bd)

    return bd


# ── SCREENER ────────────────────────────────────────────────

def screen_undervalued(
    all_stocks: List[Dict],
    all_historical: Dict,       # {ticker: {pe_5yr_avg: X, pb_5yr_avg: X, ...}}
    sector_filter: str = None,
    min_score: int = 50,
    limit: int = 15,
) -> List[ScoreBreakdown]:
    results = []
    for stock in all_stocks:
        if sector_filter and stock.get("sector") != sector_filter:
            continue
        hist = all_historical.get(stock["ticker"], {})
        bd = calculate_score(stock, hist)
        if bd.total >= min_score:
            results.append(bd)
    results.sort(key=lambda x: x.total, reverse=True)
    return results[:limit]


def screen_hidden_gems(
    all_stocks: List[Dict],
    all_historical: Dict,
    min_score: int = 60,
    limit: int = 10,
) -> List[ScoreBreakdown]:
    """
    Same scoring, but pre-filtered for:
    - Market cap EGP 500M – 5B
    - ROE > 15%
    - D/E < 0.7
    - Avg daily volume > EGP 500k (tradeable)
    """
    filtered = [
        s for s in all_stocks
        if 500_000_000  <= s.get("market_cap", 0) <= 5_000_000_000
        and s.get("roe", 0)              >= 15
        and s.get("debt_to_equity", 999) <= 0.7
        and s.get("avg_daily_volume_egp", 0) >= 500_000
    ]
    return screen_undervalued(filtered, all_historical, min_score=min_score, limit=limit)


def group_by_sector_top(scores: List[ScoreBreakdown]) -> Dict[str, ScoreBreakdown]:
    """Return best-scoring stock per sector — for Option B ranking display."""
    best = {}
    for s in scores:
        sector_short = s.sector.split(" - ")[0]   # "Financials" from "Financials - Banks"
        if sector_short not in best or s.total > best[sector_short].total:
            best[sector_short] = s
    return best


# ── FORMAT FOR CLAUDE ────────────────────────────────────────

def format_for_claude(
    scores: List[ScoreBreakdown],
    screen_type: str,
    sector_top: Dict = None,
) -> str:
    """
    Structured text injected into Claude's context.
    Claude receives this + system prompt → writes conversational response.
    """
    lines = [f"SCREEN TYPE: {screen_type}"]
    lines.append(f"TOTAL RESULTS: {len(scores)}")
    lines.append("")

    lines.append("=== OVERALL RANKING (top 5) ===")
    for i, s in enumerate(scores[:5], 1):
        lines.append(
            f"{i}. {s.ticker} | {s.company_name} | {s.sector} | "
            f"Score {s.total}/100 | Grade {s.grade} | {s.signal} | {s.category}"
        )
        lines.append(f"   Breakdown: Val {s.valuation} | Prof {s.profitability} | "
                     f"Health {s.financial_health} | Quality {s.earnings_quality} | Mom {s.momentum}")
        lines.append(f"   Strength: {s.key_strength}")
        lines.append(f"   Watch:    {s.key_watch}")
        lines.append("")

    if sector_top:
        lines.append("=== BEST BY SECTOR ===")
        for sector, s in sector_top.items():
            lines.append(f"{sector}: {s.ticker} ({s.total}/100 Grade {s.grade})")
        lines.append("")

    lines.append("INSTRUCTION FOR RESPONSE:")
    lines.append("- Lead with ONE hook insight about what the screen reveals (pattern, surprise, or macro signal)")
    lines.append("- Present overall ranking as clean list, then sector view")
    lines.append("- One sentence per stock explaining WHY it scored this way")
    lines.append("- End with exactly 3 choice chips for follow-up")
    lines.append("- Do NOT explain the scoring methodology unless user asks")

    return "\n".join(lines)


def format_single_score_for_claude(s: ScoreBreakdown) -> str:
    """For follow-up: deep dive on one stock's score."""
    return f"""
STOCK SCORE DEEP DIVE: {s.ticker}
Total: {s.total}/100 | Grade: {s.grade} | Signal: {s.signal}
Category: {s.category}

COMPONENT BREAKDOWN:
Valuation        {s.valuation}/20  — {s.valuation_note}
Profitability    {s.profitability}/20  — {s.profitability_note}
Financial Health {s.financial_health}/20  — {s.financial_health_note}
Earnings Quality {s.earnings_quality}/20  — {s.earnings_quality_note}
Momentum         {s.momentum}/20  — {s.momentum_note}

Key strength: {s.key_strength}
Key watch:    {s.key_watch}

INSTRUCTION: Present breakdown visually (one line per component).
Highlight the most interesting split (highest vs lowest component).
Explain in 2-3 sentences what the split tells you about this stock.
Flag the one real risk. End with 3 specific follow-up choices.
"""


# ============================================================
# FILE 2: intent_detector.py
# Detects what the user is asking for
# Drives which data to fetch before calling Claude
# ============================================================

import re
from typing import Tuple

# All Egyptian tickers your database covers
KNOWN_TICKERS = {
    "JUFO", "COMI", "TMGH", "SWDY", "DOMP", "OBOU", "PHDC",
    "OCDI", "ESRS", "MNHD", "EKHO", "ALEX", "QNBA", "AIOB",
    # Add all tickers from your database
}

SECTOR_KEYWORDS = {
    "bank": "Financials - Banks",
    "banks": "Financials - Banks",
    "financial": "Financials - Banks",
    "real estate": "Real Estate - Developers",
    "property": "Real Estate - Developers",
    "developer": "Real Estate - Developers",
    "food": "Consumer - Food & Beverage",
    "consumer": "Consumer - Food & Beverage",
    "retail": "Consumer - Retail",
    "industrial": "Industrials",
    "steel": "Industrials",
    "healthcare": "Healthcare",
    "pharma": "Healthcare",
    "telecom": "Telecommunications",
}

SCREENER_PATTERNS = [
    r"most undervalued",
    r"undervalued stocks",
    r"cheapest stocks",
    r"best value",
    r"top value",
    r"hidden gems?",
    r"under.?the.?radar",
    r"undiscovered",
    r"unloved stocks",
]

SCORE_REQUEST_PATTERNS = [
    r"score",
    r"how.*calculated",
    r"breakdown",
    r"inside.*score",
    r"what.*driving",
    r"explain.*score",
]

FOLLOWUP_PATHS = {
    "deep_dive_score":    ["score", "breakdown", "inside", "driving", "components"],
    "compare_peers":      ["compare", "peers", "versus", "vs", "other banks", "competitors"],
    "catalyst":           ["catalyst", "what.*change", "move higher", "unlock", "trigger"],
    "risk":               ["risk", "npl", "what.*wrong", "bear case", "downside"],
    "macro_read":         ["macro", "why both", "sector", "pattern", "cycle", "timing"],
    "patience":           ["patience", "how long", "stay cheap", "when", "catalyst surface"],
    "earnings_quality":   ["earnings quality", "ocf", "cash flow", "accruals", "ratio"],
}


def detect_intent(message: str, conversation_history: list) -> dict:
    """
    Returns structured intent dict that tells the backend what to fetch.

    Returns:
    {
        "type": "screener" | "single_stock" | "followup" | "macro" | "educational" | "general",
        "ticker": "JUFO" | None,
        "sector": "Financials - Banks" | None,
        "screen_type": "undervalued" | "hidden_gems" | None,
        "followup_path": "deep_dive_score" | "compare_peers" | ... | None,
        "followup_ticker": "COMI" | None,
    }
    """
    msg = message.lower().strip()
    intent = {
        "type": "general",
        "ticker": None,
        "sector": None,
        "screen_type": None,
        "followup_path": None,
        "followup_ticker": None,
    }

    # 1. Check for known ticker
    for ticker in KNOWN_TICKERS:
        if ticker.lower() in msg or ticker in message.upper():
            intent["ticker"] = ticker
            break

    # 2. Check for sector keyword
    for keyword, sector in SECTOR_KEYWORDS.items():
        if keyword in msg:
            intent["sector"] = sector
            break

    # 3. Screener intent
    for pattern in SCREENER_PATTERNS:
        if re.search(pattern, msg):
            intent["type"] = "screener"
            if re.search(r"hidden gem|under.?the.?radar|undiscovered|unloved", msg):
                intent["screen_type"] = "hidden_gems"
            else:
                intent["screen_type"] = "undervalued"
            return intent

    # 4. Follow-up path detection
    # Check if previous AI message mentioned specific stocks
    if conversation_history:
        last_ai = next(
            (m["content"] for m in reversed(conversation_history) if m["role"] == "assistant"),
            ""
        )
        # Which stocks were mentioned in last AI message?
        mentioned = [t for t in KNOWN_TICKERS if t in last_ai.upper()]

        for path, keywords in FOLLOWUP_PATHS.items():
            if any(kw in msg for kw in keywords):
                intent["type"] = "followup"
                intent["followup_path"] = path
                # Match ticker from message or first mentioned in last response
                if intent["ticker"]:
                    intent["followup_ticker"] = intent["ticker"]
                elif mentioned:
                    intent["followup_ticker"] = mentioned[0]
                return intent

    # 5. Single stock
    if intent["ticker"]:
        intent["type"] = "single_stock"
        return intent

    # 6. Macro
    if any(w in msg for w in ["market", "egx", "egypt", "macro", "timing", "good time"]):
        intent["type"] = "macro"

    return intent


# ============================================================
# FILE 3: chat_handler.py
# Routes intent → fetches right data → calls Claude
# ============================================================

import json
import anthropic
import os
from database import Database

db = Database()
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

with open("system_prompt_v2.txt") as f:
    SYSTEM_PROMPT = f.read()


async def handle_chat(message: str, session_id: str, history: list) -> dict:
    """
    Main handler. Returns {response, data_for_frontend}.
    """
    from intent_detector import detect_intent
    from scoring_simple import (
        screen_undervalued, screen_hidden_gems,
        group_by_sector_top, format_for_claude,
        format_single_score_for_claude, calculate_score
    )

    intent = detect_intent(message, history)
    context_data = {}

    # ── SCREENER ─────────────────────────────────────────────
    if intent["type"] == "screener":
        all_stocks    = db.get_all_stocks_with_ratios()
        all_historical = db.get_all_historical_averages()

        if intent["screen_type"] == "hidden_gems":
            scores = screen_hidden_gems(all_stocks, all_historical)
            context_data["screen_type"] = "hidden_gems"
        else:
            scores = screen_undervalued(
                all_stocks,
                all_historical,
                sector_filter=intent.get("sector")
            )
            context_data["screen_type"] = "undervalued"

        sector_top   = group_by_sector_top(scores)
        context_str  = format_for_claude(scores, context_data["screen_type"], sector_top)

        context_data["scores"]     = [s.__dict__ for s in scores[:10]]
        context_data["sector_top"] = {k: v.__dict__ for k, v in sector_top.items()}

    # ── FOLLOW-UP: SCORE BREAKDOWN ───────────────────────────
    elif intent["type"] == "followup" and intent["followup_path"] == "deep_dive_score":
        ticker = intent["followup_ticker"]
        if ticker:
            stock = db.get_stock_full_data(ticker)
            hist  = db.get_historical_averages(ticker)
            score = calculate_score(stock, hist)
            context_str = format_single_score_for_claude(score)
            context_data["score_breakdown"] = score.__dict__
        else:
            context_str = "User asked for score breakdown but no ticker identified."

    # ── FOLLOW-UP: OTHER PATHS ───────────────────────────────
    elif intent["type"] == "followup":
        ticker = intent["followup_ticker"]
        path   = intent["followup_path"]

        stock_data = db.get_stock_full_data(ticker) if ticker else {}
        hist       = db.get_financials_history(ticker) if ticker else []
        insights   = db.get_macro_insights(ticker) if ticker else []

        context_str = f"""
FOLLOW-UP PATH: {path}
TICKER: {ticker or 'None'}
STOCK DATA: {json.dumps(stock_data, indent=2)}
MACRO INSIGHTS: {json.dumps(insights, indent=2)}

INSTRUCTION: User chose the '{path}' path. Focus entirely on this angle.
Don't repeat what was already said. Go deeper on this specific thread.
End with 3 new choices that continue the conversation further.
"""
        context_data = {"followup_path": path, "ticker": ticker}

    # ── SINGLE STOCK ─────────────────────────────────────────
    elif intent["type"] == "single_stock":
        ticker     = intent["ticker"]
        stock      = db.get_stock_full_data(ticker)
        hist_avg   = db.get_historical_averages(ticker)
        financials = db.get_financials_history(ticker)
        sector_avg = db.get_sector_average(stock.get("sector"))
        insights   = db.get_macro_insights(ticker)
        score      = calculate_score(stock, hist_avg)

        context_str = f"""
SINGLE STOCK: {ticker}
SCORE: {format_single_score_for_claude(score)}
STOCK DATA: {json.dumps(stock, indent=2)}
FINANCIALS (last 3yr): {json.dumps(financials[:3], indent=2)}
SECTOR AVERAGES: {json.dumps(sector_avg, indent=2)}
MACRO/SEASONALITY INSIGHTS: {json.dumps(insights, indent=2)}
"""
        context_data["score"] = score.__dict__

    # ── MACRO / GENERAL ──────────────────────────────────────
    else:
        macro = db.get_latest_macro_data()
        context_str = f"MACRO DATA: {json.dumps(macro, indent=2)}"
        context_data["macro"] = macro

    # ── BUILD MESSAGES + CALL CLAUDE ─────────────────────────
    messages = []
    for m in history[-10:]:
        messages.append({"role": m["role"], "content": m["content"]})

    messages.append({
        "role": "user",
        "content": f"User question: {message}\n\nContext:\n{context_str}"
    })

    response = claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=messages
    )

    return {
        "response": response.content[0].text,
        "data":     context_data,
        "intent":   intent,
        "tokens":   response.usage.input_tokens + response.usage.output_tokens,
    }


# ============================================================
# FILE 4: database additions
# New queries needed in database.py
# ============================================================

# ADD THESE METHODS TO YOUR EXISTING database.py:

"""
def get_all_stocks_with_ratios(self) -> List[Dict]:
    query = '''
    SELECT
        s.ticker, s.company_name, s.sector, s.market_cap,
        p.close as current_price,
        ((p.close - p30.close) / NULLIF(p30.close, 0) * 100) as price_change_3m_pct,
        vr.pe_ratio, vr.pb_ratio, vr.ev_ebitda,
        vr.roe, vr.debt_to_equity,
        vr.operating_cash_flow, vr.net_income,
        vr.avg_daily_volume_egp
    FROM stocks s
    LEFT JOIN prices p ON s.ticker = p.ticker
        AND p.date = (SELECT MAX(date) FROM prices WHERE ticker = s.ticker)
    LEFT JOIN prices p30 ON s.ticker = p30.ticker
        AND p30.date = (SELECT MAX(date) FROM prices
                        WHERE ticker = s.ticker AND date <= CURRENT_DATE - 90)
    LEFT JOIN valuation_ratios vr ON s.ticker = vr.ticker
        AND vr.as_of_date = (SELECT MAX(as_of_date) FROM valuation_ratios WHERE ticker = s.ticker)
    WHERE s.is_active = TRUE
    '''
    with self.conn.cursor() as cur:
        cur.execute(query)
        return [dict(row) for row in cur.fetchall()]


def get_all_historical_averages(self) -> Dict:
    '''Returns {ticker: {pe_5yr_avg: X, pb_5yr_avg: X, ev_ebitda_5yr_avg: X}}'''
    query = '''
    SELECT
        ticker,
        AVG(pe_ratio)   as pe_5yr_avg,
        AVG(pb_ratio)   as pb_5yr_avg,
        AVG(ev_ebitda)  as ev_ebitda_5yr_avg
    FROM valuation_ratios
    WHERE as_of_date >= CURRENT_DATE - INTERVAL '5 years'
    GROUP BY ticker
    '''
    with self.conn.cursor() as cur:
        cur.execute(query)
        return {row['ticker']: dict(row) for row in cur.fetchall()}


def get_historical_averages(self, ticker: str) -> Dict:
    query = '''
    SELECT
        AVG(pe_ratio)   as pe_5yr_avg,
        AVG(pb_ratio)   as pb_5yr_avg,
        AVG(ev_ebitda)  as ev_ebitda_5yr_avg
    FROM valuation_ratios
    WHERE ticker = %s AND as_of_date >= CURRENT_DATE - INTERVAL '5 years'
    '''
    with self.conn.cursor() as cur:
        cur.execute(query, (ticker,))
        result = cur.fetchone()
        return dict(result) if result else {}
"""


# ============================================================
# FILE 5: main.py additions
# Add this endpoint to your existing main.py
# ============================================================

"""
@app.post("/api/chat")
async def chat(request: ChatRequest):
    result = await handle_chat(
        message=request.message,
        session_id=request.session_id,
        history=request.conversation_history or []
    )

    # Store conversation
    db.store_conversation(
        user_id=request.user_id,
        session_id=request.session_id,
        user_message=request.message,
        ai_response=result["response"],
        ticker_mentioned=result["intent"].get("ticker"),
        tokens_used=result["tokens"]
    )

    return ChatResponse(
        response=result["response"],
        data=result["data"],
        intent=result["intent"],
        tokens_used=result["tokens"]
    )
"""


# ============================================================
# FILE 6: Frontend — how choice chips trigger follow-ups
# Add to Chat.tsx
# ============================================================

"""
// Parse AI response to extract choice chips
function parseChoices(text: string): string[] {
  const matches = text.match(/[1-3]️⃣\s.+/g) || [];
  return matches.map(m => m.replace(/^[1-3]️⃣\s/, '').trim());
}

// Render chips below AI message
function ChoiceChips({ choices, onSelect }: { choices: string[], onSelect: (c:string)=>void }) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      {choices.map((choice, i) => (
        <button
          key={i}
          onClick={() => onSelect(choice)}
          className="text-left px-4 py-2.5 bg-gray-50 border border-gray-200
                     rounded-xl text-sm text-gray-700 hover:bg-teal-50
                     hover:border-teal-300 transition-all duration-150"
        >
          <span className="text-teal-600 font-semibold mr-2">
            {['1️⃣','2️⃣','3️⃣'][i]}
          </span>
          {choice}
        </button>
      ))}
    </div>
  );
}

// In your main Chat component:
// After receiving AI response, parse and show chips
const [chips, setChips] = useState<string[]>([]);

useEffect(() => {
  if (messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === 'assistant') {
      setChips(parseChoices(last.content));
    }
  }
}, [messages]);

// When chip is clicked, send it as a user message
const handleChipClick = (choice: string) => {
  setChips([]);
  sendMessage(choice);  // Uses your existing sendMessage function
};
"""


# ============================================================
# FILE 7: schema addition
# One new table to cache scores (run once)
# ============================================================

"""
-- Add to schema.sql (or run as migration)

CREATE TABLE IF NOT EXISTS composite_scores (
    ticker          VARCHAR(10) PRIMARY KEY REFERENCES stocks(ticker),
    as_of_date      DATE NOT NULL,
    total           INTEGER,
    grade           CHAR(1),
    signal          VARCHAR(50),
    category        VARCHAR(80),
    valuation       INTEGER,  valuation_note        TEXT,
    profitability   INTEGER,  profitability_note    TEXT,
    financial_health INTEGER, financial_health_note TEXT,
    earnings_quality INTEGER, earnings_quality_note TEXT,
    momentum        INTEGER,  momentum_note         TEXT,
    key_strength    TEXT,
    key_watch       TEXT,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for screener queries
CREATE INDEX idx_cs_total ON composite_scores(total DESC);
CREATE INDEX idx_cs_date  ON composite_scores(as_of_date DESC);
"""


# ============================================================
# FILE 8: Daily score refresh (run via cron at 6am)
# scheduler.py
# ============================================================

"""
import schedule, time, requests

def refresh_scores():
    all_stocks    = db.get_all_stocks_with_ratios()
    all_historical = db.get_all_historical_averages()

    from scoring_simple import calculate_score
    for stock in all_stocks:
        hist  = all_historical.get(stock['ticker'], {})
        score = calculate_score(stock, hist)
        db.save_composite_score(score)   # upsert into composite_scores table

    print(f"Refreshed {len(all_stocks)} scores")

schedule.every().day.at("06:00").do(refresh_scores)
while True:
    schedule.run_pending()
    time.sleep(60)
"""
