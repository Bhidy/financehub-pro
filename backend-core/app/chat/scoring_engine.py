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
        "valuation_metric": "ev_ebitda",
        "valuation_label": "EV/EBITDA vs Sector Avg",
        "roe_strong": 25.0, "roe_good": 15.0, "roe_weak": 8.0,
        "de_threshold": 0.7,
    },
    "Trade & Distributors": {
        "valuation_metric": "ev_ebitda",
        "valuation_label": "EV/EBITDA vs Sector Avg",
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
        "valuation_metric": "ev_ebitda",
        "valuation_label": "EV/EBITDA vs Sector Avg",
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
        "valuation_metric": "ev_ebitda",
        "valuation_label": "EV/EBITDA vs Sector Avg",
        "roe_strong": 15.0, "roe_good": 10.0, "roe_weak": 6.0,
        "de_threshold": 1.0,
    },
    "Energy & Support Services": {
        "valuation_metric": "ev_ebitda",
        "valuation_label": "EV/EBITDA vs Sector Avg",
        "roe_strong": 15.0, "roe_good": 10.0, "roe_weak": 6.0,
        "de_threshold": 1.0,
    },
}

DEFAULT_CONFIG = {
    "valuation_metric": "ev_ebitda",
    "valuation_label": "EV/EBITDA vs Sector Avg",
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
        score, desc = 20, f"30%+ below Sector avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= 0.20:
        score, desc = 16, f"20-30% below Sector avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= 0.10:
        score, desc = 12, f"10-20% below Sector avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= 0.00:
        score, desc = 8,  f"Near Sector avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    elif discount >= -0.15:
        score, desc = 4,  f"0-15% above Sector avg ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    else:
        score, desc = 0,  f"15%+ above Sector avg — expensive ({current_val:.1f}x vs {historical_avg:.1f}x avg)"
    return score, desc


def score_profitability(roic: float, roe: float, sector: str) -> Tuple[int, str]:
    if roic is not None:
        if roic >= 20.0:
            return 20, f"ROIC {roic:.1f}% — exceptional capital efficiency"
        elif roic >= 15.0:
            return 16, f"ROIC {roic:.1f}% — strong value creation"
        elif roic >= 10.0:
            return 12, f"ROIC {roic:.1f}% — covers cost of capital"
        elif roic >= 5.0:
            return 8,  f"ROIC {roic:.1f}% — weak capital returns"
        elif roic >= 0.0:
            return 4,  f"ROIC {roic:.1f}% — destroying value (below WACC)"
        else:
            return 0,  f"ROIC {roic:.1f}% — negative returns"
            
    # Fallback to ROE if ROIC is unavailable
    cfg = SECTOR_CONFIG.get(sector, DEFAULT_CONFIG)
    strong, good, weak = cfg.get("roe_strong", 18.0), cfg.get("roe_good", 12.0), cfg.get("roe_weak", 7.0)

    if roe is None:
        return 4, "ROE/ROIC: data unavailable"

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


def score_financial_health(interest_coverage: float, debt_equity: float, sector: str) -> Tuple[int, str]:
    is_bank = sector in ["Banks", "Financial Services", "Financials - Banks"]
    
    # Non-banks use Interest Coverage for true solvency assessment
    if not is_bank and interest_coverage is not None:
        if interest_coverage >= 10.0:
            return 20, f"Interest Coverage {interest_coverage:.1f}x — bulletproof solvency"
        elif interest_coverage >= 5.0:
            return 16, f"Interest Coverage {interest_coverage:.1f}x — strong debt service capacity"
        elif interest_coverage >= 3.0:
            return 12, f"Interest Coverage {interest_coverage:.1f}x — adequate solvency"
        elif interest_coverage >= 1.5:
            return 8,  f"Interest Coverage {interest_coverage:.1f}x — elevated solvency risk"
        elif interest_coverage >= 1.0:
            return 4,  f"Interest Coverage {interest_coverage:.1f}x — barely covering interest"
        else:
            return 0,  f"Interest Coverage {interest_coverage:.1f}x — extreme distress risk"
            
    # Fallback to D/E or Banks logic
    cfg = SECTOR_CONFIG.get(sector, DEFAULT_CONFIG)
    threshold = cfg.get("de_threshold", 0.7)

    if debt_equity is None:
        if is_bank:
            return 12, "D/E: N/A for Banks (Capital Adequacy used instead)"
        return 10, "Solvency: data unavailable"

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


def score_earnings_quality(operating_cash_flow: float, net_income: float, sector: str = "", profit_margin: float = None) -> Tuple[int, str]:
    is_bank_or_finance = sector in ["Banks", "Financial Services", "Financial Services (excluding Banks)"]
    if is_bank_or_finance and profit_margin is not None:
        if profit_margin >= 30:
            return 20, f"Net Margin {profit_margin:.1f}% — exceptional profitability (high quality)"
        elif profit_margin >= 20:
            return 16, f"Net Margin {profit_margin:.1f}% — strong profitability"
        elif profit_margin >= 10:
            return 12, f"Net Margin {profit_margin:.1f}% — solid profitability"
        elif profit_margin >= 5:
            return 8,  f"Net Margin {profit_margin:.1f}% — moderate profitability"
        elif profit_margin >= 0:
            return 4,  f"Net Margin {profit_margin:.1f}% — low profitability, watch provisions"
        else:
            return 0,  f"Negative margin — loss-making, high risk"

    if operating_cash_flow is None or net_income is None:
        return 10, "Earnings quality: data unavailable"

    if net_income <= 0:
        if operating_cash_flow > 0:
            return 8, "Net income zero/negative but positive cash flow"
        return 0, "Net income negative — loss-making business"

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


def score_momentum(relative_alpha: float) -> Tuple[int, str]:
    if relative_alpha is None:
        return 10, "Momentum: insufficient relative alpha data"

    if relative_alpha >= 15:
        score, desc = 20, f"Alpha +{relative_alpha:.1f}% vs EGX30 (3m) — severe outperformance"
    elif relative_alpha >= 5:
        score, desc = 16, f"Alpha +{relative_alpha:.1f}% vs EGX30 (3m) — strong market outperformance"
    elif relative_alpha >= 0:
        score, desc = 12, f"Alpha +{relative_alpha:.1f}% vs EGX30 (3m) — matching or slightly beating market"
    elif relative_alpha >= -10:
        score, desc = 8,  f"Alpha {relative_alpha:.1f}% vs EGX30 (3m) — lagging the market"
    elif relative_alpha >= -20:
        score, desc = 4,  f"Alpha {relative_alpha:.1f}% vs EGX30 (3m) — significant underperformance"
    else:
        score, desc = 0,  f"Alpha {relative_alpha:.1f}% vs EGX30 (3m) — severe market lag"
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
    roe_val = stock.get("roe")
    if roe_val is None:
        roe_val = stock.get("return_on_equity")
    roic_val = stock.get("roic")
    p_score, p_note = score_profitability(roic_val, roe_val, sector)
    
    # Debt/Equity & Interest Coverage
    de_val = stock.get("debt_to_equity")
    if de_val is None:
        de_val = stock.get("debt_equity")
    
    ic_val = stock.get("interest_coverage")
    h_score, h_note = score_financial_health(ic_val, de_val, sector)
    
    ocf_val = stock.get("operating_cash_flow")
    if ocf_val is None:
        ocf_val = stock.get("ocf_ttm")
    if ocf_val is None:
        ocf_val = stock.get("operating_cashflow")

    ni_val = stock.get("net_income")
    if ni_val is None:
        ni_val = stock.get("net_income_ttm")

    profit_margin_val = stock.get("profit_margin")
    if profit_margin_val is None:
        profit_margin_val = stock.get("net_profit_margin")

    q_score, q_note = score_earnings_quality(ocf_val, ni_val, sector=sector, profit_margin=profit_margin_val)
    
    relative_alpha = stock.get("relative_alpha")
    m_score, m_note = score_momentum(relative_alpha)

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
