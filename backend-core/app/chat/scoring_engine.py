"""
Scoring Engine - Calculates the multi-factor grade for Egyptian Stocks.
Features 5 components: Valuation, Profitability, Health, Quality, Momentum.
Prioritizes sector-relevant KPIs based on configured thresholds.
"""
from typing import Dict, List, Tuple
from dataclasses import dataclass

SECTOR_CONFIG = {
    "Banks": {
        "valuation_metric": "pb_ratio",          # P/B is primary for banks
        "valuation_label": "P/B vs Sector Avg",
        "roe_strong": 20.0, "roe_good": 15.0, "roe_weak": 10.0,
        "de_threshold": 1.5,                     # Banks naturally lever up
    },
    "Real Estate": {
        "valuation_metric": "pb_ratio",          # Asset-backed: P/B primary
        "valuation_label": "P/B vs Sector Avg",
        "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 8.0,
        "de_threshold": 0.7,
    },
    "Food, Beverages & Tobacco": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs Sector Avg",
        "roe_strong": 25.0, "roe_good": 15.0, "roe_weak": 8.0,
        "de_threshold": 0.7,
    },
    "Trade & Distributors": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs Sector Avg",
        "roe_strong": 20.0, "roe_good": 12.0, "roe_weak": 6.0,
        "de_threshold": 0.7,
    },
    "Industrial Goods, Services and Automobiles": {
        "valuation_metric": "ev_ebitda",         # EV/EBITDA for capital-intensive
        "valuation_label": "EV/EBITDA vs Sector Avg",
        "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 7.0,
        "de_threshold": 0.8,
    },
    "Health Care & Pharmaceuticals": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs Sector Avg",
        "roe_strong": 22.0, "roe_good": 15.0, "roe_weak": 8.0,
        "de_threshold": 0.5,
    },
    "IT, Media & Communication Services": {
        "valuation_metric": "ev_ebitda",
        "valuation_label": "EV/EBITDA vs Sector Avg",
        "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 7.0,
        "de_threshold": 1.0,
    },
    "Utilities": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs Sector Avg",
        "roe_strong": 15.0, "roe_good": 10.0, "roe_weak": 6.0,
        "de_threshold": 1.0,
    },
    "Energy & Support Services": {
        "valuation_metric": "pe_ratio",
        "valuation_label": "P/E vs Sector Avg",
        "roe_strong": 15.0, "roe_good": 10.0, "roe_weak": 6.0,
        "de_threshold": 1.0,
    },
}

DEFAULT_CONFIG = {
    "valuation_metric": "pe_ratio",
    "valuation_label": "P/E vs Sector Avg",
    "roe_strong": 18.0, "roe_good": 12.0, "roe_weak": 7.0,
    "de_threshold": 0.7,
}

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


def score_valuation_absolute(current_val: float, label: str, is_pb: bool = False) -> Tuple[int, str]:
    """Score valuation using absolute thresholds when no historical average is available."""
    if not current_val or current_val <= 0:
        return 4, f"{label}: unavailable"

    if is_pb:
        # P/B absolute thresholds
        if current_val < 0.7:
            return 20, f"{label} {current_val:.2f}x — deep discount below book (exceptional)"
        elif current_val < 1.0:
            return 16, f"{label} {current_val:.2f}x — below book value (attractive)"
        elif current_val < 1.5:
            return 12, f"{label} {current_val:.2f}x — reasonable book multiple"
        elif current_val < 2.5:
            return 8,  f"{label} {current_val:.2f}x — moderate, watch growth"
        elif current_val < 3.5:
            return 4,  f"{label} {current_val:.2f}x — elevated, needs quality"
        else:
            return 0,  f"{label} {current_val:.2f}x — expensive on book basis"
    else:
        # P/E absolute thresholds
        if current_val < 6:
            return 20, f"{label} {current_val:.1f}x — deeply undervalued on earnings (absolute)"
        elif current_val < 10:
            return 16, f"{label} {current_val:.1f}x — attractively priced on earnings"
        elif current_val < 15:
            return 12, f"{label} {current_val:.1f}x — fair value territory"
        elif current_val < 20:
            return 8,  f"{label} {current_val:.1f}x — moderately priced"
        elif current_val < 28:
            return 4,  f"{label} {current_val:.1f}x — elevated, limited margin of safety"
        else:
            return 0,  f"{label} {current_val:.1f}x — expensive, high P/E risk"


def score_valuation(current_val: float, historical_avg: float, label: str) -> Tuple[int, str]:
    if not current_val or current_val <= 0:
        return 4, f"{label}: unavailable"

    # If no historical average — use absolute thresholds (meaningful scores not a flat 8)
    if not historical_avg or historical_avg == 0:
        is_pb = 'p/b' in label.lower() or 'pb' in label.lower() or 'book' in label.lower()
        return score_valuation_absolute(current_val, label, is_pb=is_pb)

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


def score_profitability(roe: float, sector: str) -> Tuple[int, str]:
    cfg = SECTOR_CONFIG.get(sector, DEFAULT_CONFIG)
    strong, good, weak = cfg["roe_strong"], cfg["roe_good"], cfg["roe_weak"]

    if roe is None:
        return 4, "ROE: data unavailable — assume weak"

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


def score_financial_health(debt_equity: float, sector: str) -> Tuple[int, str]:
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


def score_earnings_quality(operating_cash_flow: float, net_income: float) -> Tuple[int, str]:
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


def score_momentum(price_change_3m_pct: float) -> Tuple[int, str]:
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


def get_grade_and_signal(total: int) -> Tuple[str, str]:
    if total >= 80: return "A", "Strong Setup"
    if total >= 65: return "B", "Interesting Setup"
    if total >= 50: return "C", "Monitor"
    if total >= 35: return "D", "Proceed With Caution"
    return "F", "Avoid"


def get_category(val: int, prof: int, quality: int, health: int) -> str:
    if prof >= 16 and quality >= 16:
        return "Quality Compounder at Discount" if val >= 12 else "Quality Compounder (Fairly Priced)"
    if val >= 16:
        return "Value with Quality" if prof >= 12 else "Deep Value (Quality Risk)"
    if quality <= 4:
        return "Value Trap Risk"
    if health <= 4:
        return "Leveraged Value — Handle With Care"
    return "Balanced Opportunity"


def get_key_strength(breakdown: ScoreBreakdown) -> str:
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


def get_key_watch(breakdown: ScoreBreakdown) -> str:
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


def calculate_score(stock: Dict, historical_avg: Dict) -> ScoreBreakdown:
    sector = stock.get("sector_name") or stock.get("sector") or "Food, Beverages & Tobacco"
    cfg    = SECTOR_CONFIG.get(sector, DEFAULT_CONFIG)

    val_metric   = cfg["valuation_metric"]
    current_val  = stock.get(val_metric)
    avg_key      = val_metric.replace("_ratio", "") + "_5yr_avg" # handle pe -> pe_5yr_avg, ev_ebitda -> ev_ebitda_5yr_avg
    hist_val     = historical_avg.get(avg_key) if historical_avg else None

    # Fallback: if primary metric has no value, try pe_ratio and pb_ratio
    if not current_val or current_val <= 0:
        if stock.get("pe_ratio") and stock.get("pe_ratio") > 0:
            current_val = stock.get("pe_ratio")
            hist_val = historical_avg.get("pe_5yr_avg") if historical_avg else None
            cfg = {**cfg, "valuation_label": "P/E vs sector"}
        elif stock.get("pb_ratio") and stock.get("pb_ratio") > 0:
            current_val = stock.get("pb_ratio")
            hist_val = historical_avg.get("pb_5yr_avg") if historical_avg else None
            cfg = {**cfg, "valuation_label": "P/B vs sector"}

    v_score, v_note = score_valuation(current_val, hist_val, cfg["valuation_label"])
    # ROE: try multiple column names (roe from stock_statistics)
    roe_val = stock.get("roe") or stock.get("return_on_equity")
    p_score, p_note = score_profitability(roe_val, sector)
    # Debt/Equity: try multiple column names
    de_val = stock.get("debt_to_equity") or stock.get("debt_equity")
    h_score, h_note = score_financial_health(de_val, sector)
    q_score, q_note = score_earnings_quality(
        stock.get("operating_cash_flow") or stock.get("ocf_ttm") or stock.get("operating_cashflow"),
        stock.get("net_income") or stock.get("net_income_ttm")
    )
    m_score, m_note = score_momentum(stock.get("price_change_3m_pct") or stock.get("change_3m"))

    total = v_score + p_score + h_score + q_score + m_score
    grade, signal = get_grade_and_signal(total)
    category = get_category(v_score, p_score, q_score, h_score)

    bd = ScoreBreakdown(
        ticker=stock.get("ticker") or stock.get("symbol", ""),
        company_name=stock.get("name_en") or stock.get("company_name", ""),
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
        current_price=stock.get("current_price") or stock.get("last_price", 0),
        market_cap=stock.get("market_cap", 0),
    )

    bd.key_strength = get_key_strength(bd)
    bd.key_watch    = get_key_watch(bd)

    return bd


def screen_undervalued(
    all_stocks: List[Dict],
    all_historical: Dict,
    sector_filter: str = None,
    min_score: int = 50,
    limit: int = 15,
) -> List[ScoreBreakdown]:
    results = []
    for stock in all_stocks:
        if sector_filter and stock.get("sector") != sector_filter:
            continue
        hist = all_historical.get(stock.get("ticker"), {})
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
    filtered = [
        s for s in all_stocks
        if 500_000_000  <= s.get("market_cap", 0) <= 5_000_000_000
        and (s.get("roe") or 0) >= 15
        and (s.get("debt_to_equity") or 999) <= 0.7
        and (s.get("volume", 0) * s.get("current_price", 0)) >= 500_000
    ]
    return screen_undervalued(filtered, all_historical, min_score=min_score, limit=limit)


def format_for_claude(
    scores: List[ScoreBreakdown],
    screen_type: str,
) -> str:
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

    lines.append("INSTRUCTION FOR RESPONSE:")
    lines.append("- Present this exactly as calculated. Use one card summarizing the Top 3 to Top 5.")
    lines.append("- Each stock in the summary must mention its grade, category, and one reason from its scores.")

    return "\n".join(lines)
