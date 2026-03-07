"""
Educational Content - Financial term definitions and educational materials.

Provides structured educational responses for DEFINE_TERM intent
with definition, formula, example, caveats, and practical application.
"""

import difflib
import re
from typing import Dict, Any, Optional, Iterable, List


# ============================================================================
# Financial Term Database
# ============================================================================

FINANCIAL_TERMS = {
    # Profitability Metrics
    "roe": {
        "term": "Return on Equity (ROE)",
        "icon": "📊",
        "definition": "ROE measures how efficiently a company generates profit from shareholder equity. It shows how much net income is generated per EGP of equity investment.",
        "formula": "ROE = Net Income / Shareholders' Equity",
        "example": {
            "title": "Egyptian Context Example",
            "text": "Company A has 38.6% ROE - meaning for every EGP 100 of equity, it generates EGP 38.60 in annual profit. This is exceptional by EGX standards where 15-20% is considered good."
        },
        "caveats": [
            "High leverage can artificially inflate ROE (debt substitutes equity)",
            "One-time gains or losses can distort the metric",
            "Compare ROE within same sector - banks naturally have lower ROE than consumer goods",
            "Negative ROE means the company is losing money"
        ],
        "practical_application": "I look for ROE > 15% + D/E < 1.0x for quality stocks. High ROE with low debt is the best combination.",
        "related_metrics": ["ROA", "ROCE", "ROIC"]
    },
    
    "pe_ratio": {
        "term": "Price-to-Earnings Ratio (P/E)",
        "icon": "💰",
        "definition": "The P/E ratio shows how much investors are willing to pay per EGP of earnings. A higher P/E suggests investors expect higher future growth.",
        "formula": "P/E = Market Price / Earnings Per Share (EPS)",
        "example": {
            "title": "Egyptian Context Example",
            "text": "If COMI trades at EGP 50 with EPS of EGP 10, its P/E is 5x. This is low for EGX banks (average ~8x), suggesting potential undervaluation OR lower growth expectations."
        },
        "caveats": [
            "P/E is meaningless for companies with negative earnings",
            "One-time charges can make P/E look expensive",
            "Cyclical companies may have low P/E at peak earnings (value trap)",
            "Always compare P/E to growth rate (PEG ratio)"
        ],
        "practical_application": "I use P/E as a starting point, not a conclusion. Low P/E + high ROE + low debt = potential opportunity.",
        "related_metrics": ["PEG", "Forward P/E", "EV/EBITDA"]
    },
    
    "pb_ratio": {
        "term": "Price-to-Book Ratio (P/B)",
        "icon": "📚",
        "definition": "P/B compares a stock's market price to its book value (assets minus liabilities). A P/B < 1 means the stock trades below the value of its net assets.",
        "formula": "P/B = Market Price / Book Value Per Share",
        "example": {
            "title": "Egyptian Context Example",
            "text": "COMI at P/B of 0.9x means you can buy EGP 1 of bank assets for EGP 0.90. This is attractive IF asset quality is good. Many EGX banks trade below book."
        },
        "caveats": [
            "Book value can be manipulated through accounting",
            "Intangible-heavy companies (tech, brands) often have high P/B",
            "P/B is most useful for asset-heavy sectors: banks, real estate, industrials",
            "Compare to sector average, not absolute thresholds"
        ],
        "practical_application": "For banks and real estate, I target P/B < 1.0x with ROE > 15%. That's the 'value sweet spot.'",
        "related_metrics": ["P/TBV", "NAV", "Book Value"]
    },
    
    "dividend_yield": {
        "term": "Dividend Yield",
        "icon": "💵",
        "definition": "Dividend yield shows the annual dividend payment as a percentage of the stock price. Higher yield means more income per EGP invested.",
        "formula": "Dividend Yield = Annual Dividend Per Share / Market Price × 100",
        "example": {
            "title": "Egyptian Context Example",
            "text": "If ETEL pays EGP 2 annual dividend and trades at EGP 40, its yield is 5%. With Egyptian T-Bill rates around 20%+, a 5% equity yield needs growth upside to be attractive."
        },
        "caveats": [
            "High yield may signal the stock has fallen (distress)",
            "Dividends can be cut - past payments don't guarantee future ones",
            "Payout ratio > 80% may be unsustainable",
            "Compare to risk-free rate (Egyptian T-bills)"
        ],
        "practical_application": "I look for growing dividends + payout ratio < 60% + stable earnings. Sustainable income beats high yield.",
        "related_metrics": ["Payout Ratio", "Dividend Growth Rate", "DPS"]
    },
    
    "ebitda": {
        "term": "EBITDA",
        "icon": "📈",
        "definition": "Earnings Before Interest, Taxes, Depreciation, and Amortization. EBITDA shows operational profitability by stripping out financing and non-cash items.",
        "formula": "EBITDA = Operating Income + Depreciation + Amortization",
        "example": {
            "title": "Egyptian Context Example",
            "text": "A telecom company with high depreciation (network equipment) may show low net income but strong EBITDA. This reveals the true cash-generating power of operations."
        },
        "caveats": [
            "EBITDA ignores capital expenditure requirements",
            "Not a substitute for cash flow analysis",
            "Can mask companies burning through capital",
            "Depreciation IS a real cost for capital-intensive businesses"
        ],
        "practical_application": "I use EBITDA to compare companies in capital-intensive industries. But I always check CapEx vs Depreciation to see if maintenance is covered.",
        "related_metrics": ["EBIT", "Operating Margin", "EV/EBITDA"]
    },
    
    "free_cash_flow": {
        "term": "Free Cash Flow (FCF)",
        "icon": "💸",
        "definition": "FCF is the cash a company generates after accounting for capital expenditures. It's the cash available to pay dividends, reduce debt, or reinvest.",
        "formula": "FCF = Operating Cash Flow - Capital Expenditures",
        "example": {
            "title": "Egyptian Context Example",
            "text": "If SWDY generates EGP 1B operating cash but spends EGP 800M on new factories, its FCF is EGP 200M. This is the cash actually available to shareholders."
        },
        "caveats": [
            "FCF can be negative during expansion phases",
            "Working capital changes can distort short-term FCF",
            "Compare FCF to net income - should be similar over time",
            "Look at FCF yield (FCF/Market Cap) for valuation"
        ],
        "practical_application": "I love companies with FCF > Net Income consistently. It shows earnings quality. Negative FCF without growth investment is a red flag.",
        "related_metrics": ["FCF Yield", "Cash Conversion", "Operating Cash Flow"]
    },
    
    "debt_to_equity": {
        "term": "Debt-to-Equity Ratio (D/E)",
        "icon": "⚖️",
        "definition": "D/E measures financial leverage by comparing total debt to shareholder equity. Higher D/E means more debt financing and higher financial risk.",
        "formula": "D/E = Total Debt / Shareholders' Equity",
        "example": {
            "title": "Egyptian Context Example",
            "text": "A real estate company with D/E of 1.5x has EGP 150 in debt for every EGP 100 of equity. In Egypt's high-interest environment (25%+ rates), this leverage is expensive."
        },
        "caveats": [
            "Different sectors have different normal D/E levels",
            "Banks excluded - they're leverage businesses by design",
            "Look at interest coverage ratio alongside D/E",
            "Short-term debt is riskier than long-term debt"
        ],
        "practical_application": "For non-financial companies, I prefer D/E < 0.5x in Egypt's high-rate environment. Low debt = survival power.",
        "related_metrics": ["Interest Coverage", "Net Debt/EBITDA", "Debt/Assets"]
    },
    
    "market_cap": {
        "term": "Market Capitalization",
        "icon": "🏢",
        "definition": "Market cap is the total market value of a company's outstanding shares. It determines size classification and index eligibility.",
        "formula": "Market Cap = Share Price × Shares Outstanding",
        "example": {
            "title": "Egyptian Context Example",
            "text": "COMI with share price EGP 50 and 1B shares has a market cap of EGP 50B. This makes it a 'large cap' in Egypt and an EGX 30 component."
        },
        "caveats": [
            "Market cap reflects what the market THINKS, not intrinsic value",
            "High market cap doesn't mean high quality or low risk",
            "Small caps (<EGP 500M) have higher risk but potentially higher returns",
            "Free float market cap may differ from total market cap"
        ],
        "practical_application": "I use market cap for position sizing. Large caps (>EGP 10B) for core holdings, small caps for speculative allocations.",
        "related_metrics": ["Enterprise Value", "Free Float", "Share Price"]
    },
    
    "gross_margin": {
        "term": "Gross Margin",
        "icon": "📊",
        "definition": "Gross margin measures the percentage of revenue retained after direct production costs. It shows pricing power and production efficiency.",
        "formula": "Gross Margin = (Revenue - COGS) / Revenue × 100",
        "example": {
            "title": "Egyptian Context Example",
            "text": "A food company with 30% gross margin keeps EGP 30 from every EGP 100 in sales after paying for ingredients and production. Higher margin = more pricing power."
        },
        "caveats": [
            "Gross margin varies widely by industry",
            "Commodity businesses have naturally lower margins",
            "Watch for margin compression from raw material inflation",
            "Compare year-over-year, not just absolute level"
        ],
        "practical_application": "I look for stable or expanding gross margins. Declining margins often precede earnings disappointments.",
        "related_metrics": ["Operating Margin", "Net Margin", "COGS"]
    },
    
    "ev_ebitda": {
        "term": "EV/EBITDA",
        "icon": "🔍",
        "definition": "Enterprise Value to EBITDA compares total company value (equity + debt - cash) to operational earnings. It's a debt-neutral valuation metric.",
        "formula": "EV/EBITDA = Enterprise Value / EBITDA",
        "example": {
            "title": "Egyptian Context Example",
            "text": "A company with EV of EGP 10B and EBITDA of EGP 1B has EV/EBITDA of 10x. This is fair for industrials. Below 6x often signals undervaluation."
        },
        "caveats": [
            "Not useful for capital-light businesses",
            "Ignores capital expenditure requirements",
            "Compare to sector averages, not absolute thresholds",
            "Negative EBITDA makes this metric useless"
        ],
        "practical_application": "EV/EBITDA is my preferred valuation metric because it captures debt. I compare to historical average and sector peers.",
        "related_metrics": ["P/E", "EV/Sales", "EV/EBIT"]
    },

    "ttm": {
        "term": "Trailing Twelve Months (TTM)",
        "icon": "🗓️",
        "definition": "TTM means the latest rolling 12-month period, not a calendar year. It keeps the analysis current by combining the most recent reported quarters.",
        "formula": "TTM = Sum of the latest 4 reported quarters for income and cash flow metrics",
        "example": {
            "title": "Egyptian Context Example",
            "text": "If a company reported Q1, Q2, Q3, and Q4 revenue of EGP 2B, 2.2B, 2.4B, and 2.6B, its TTM revenue is EGP 9.2B. That is more current than using last full-year revenue from an older annual report."
        },
        "caveats": [
            "TTM is rolling, so it changes every quarter",
            "Balance sheet items are usually read from the latest quarter, not summed",
            "Seasonal businesses can look stronger or weaker depending on where you are in the cycle",
            "Always compare TTM to prior TTM or sector peers for context"
        ],
        "practical_application": "I use TTM to avoid stale annual numbers. It is the right lens when you want the latest profitability, cash flow, or valuation ratios.",
        "related_metrics": ["YoY Growth", "QoQ Growth", "YTD"]
    },

    "yoy_growth": {
        "term": "Year-over-Year (YoY)",
        "icon": "📆",
        "definition": "YoY compares a metric with the same period one year earlier. It filters out seasonality better than comparing one quarter to the immediately previous quarter.",
        "formula": "YoY Growth = (Current Period - Same Period Last Year) / Same Period Last Year",
        "example": {
            "title": "Egyptian Context Example",
            "text": "If Q3 revenue this year is EGP 3.0B versus EGP 2.4B in Q3 last year, YoY growth is 25%. That is usually more meaningful than comparing Q3 with Q2."
        },
        "caveats": [
            "One-off base effects can exaggerate growth rates",
            "Inflation can boost nominal YoY growth without real volume improvement",
            "Always check margins alongside growth"
        ],
        "practical_application": "I prefer YoY when assessing whether growth is durable because it neutralizes normal seasonal swings.",
        "related_metrics": ["TTM", "QoQ Growth", "Revenue Growth"]
    },

    "qoq_growth": {
        "term": "Quarter-over-Quarter (QoQ)",
        "icon": "📈",
        "definition": "QoQ compares the latest quarter with the immediately previous quarter. It is useful for short-term trend changes and inflection points.",
        "formula": "QoQ Growth = (Current Quarter - Previous Quarter) / Previous Quarter",
        "example": {
            "title": "Egyptian Context Example",
            "text": "If quarterly earnings rise from EGP 500M to EGP 575M, QoQ growth is 15%. That can signal improving momentum before the annual trend fully shows it."
        },
        "caveats": [
            "QoQ can be noisy in seasonal sectors",
            "A single strong quarter does not guarantee a durable trend",
            "Use alongside YoY and TTM to avoid overreacting"
        ],
        "practical_application": "I use QoQ to spot accelerating or weakening momentum early, then confirm it with YoY and TTM trends.",
        "related_metrics": ["YoY Growth", "TTM", "Revenue Growth"]
    },

    "ytd": {
        "term": "Year-to-Date (YTD)",
        "icon": "📅",
        "definition": "YTD measures performance from the start of the current calendar year up to today or the latest reporting date.",
        "formula": "YTD Return = (Current Value - Value at Start of Year) / Value at Start of Year",
        "example": {
            "title": "Egyptian Context Example",
            "text": "If a stock started the year at EGP 20 and now trades at EGP 24, its YTD return is 20%. That shows how it performed so far this year."
        },
        "caveats": [
            "YTD resets every new year, so it is not a long-term measure",
            "A strong YTD move may reflect valuation expansion, not earnings improvement",
            "Always compare YTD with the index and sector"
        ],
        "practical_application": "I use YTD to judge relative market performance this year, not intrinsic value.",
        "related_metrics": ["TTM", "YoY Growth", "Total Return"]
    }
}

TERM_ALIASES = {
    "return on equity": "roe",
    "pe": "pe_ratio",
    "p/e": "pe_ratio",
    "p e": "pe_ratio",
    "p e ratio": "pe_ratio",
    "pe ratio": "pe_ratio",
    "price-earnings": "pe_ratio",
    "price to earnings": "pe_ratio",
    "price earnings": "pe_ratio",
    "pb": "pb_ratio",
    "p/b": "pb_ratio",
    "price to book": "pb_ratio",
    "price book": "pb_ratio",
    "dividend": "dividend_yield",
    "yield": "dividend_yield",
    "earnings before interest": "ebitda",
    "fcf": "free_cash_flow",
    "cash flow": "free_cash_flow",
    "de ratio": "debt_to_equity",
    "d/e": "debt_to_equity",
    "leverage": "debt_to_equity",
    "market value": "market_cap",
    "company size": "market_cap",
    "gross profit margin": "gross_margin",
    "cogs margin": "gross_margin",
    "ev/ebitda": "ev_ebitda",
    "enterprise value": "ev_ebitda",
    "ttm": "ttm",
    "trailing twelve months": "ttm",
    "trailing 12 months": "ttm",
    "last 12 months": "ttm",
    "latest 12 months": "ttm",
    "rolling 12 months": "ttm",
    "yoy": "yoy_growth",
    "year over year": "yoy_growth",
    "year-over-year": "yoy_growth",
    "annual growth": "yoy_growth",
    "qoq": "qoq_growth",
    "quarter over quarter": "qoq_growth",
    "quarter-over-quarter": "qoq_growth",
    "sequential growth": "qoq_growth",
    "ytd": "ytd",
    "year to date": "ytd",
    "year-to-date": "ytd",
}

TERM_DISPLAY_OVERRIDES = {
    "roe": "ROE",
    "pe_ratio": "P/E",
    "pb_ratio": "P/B",
    "dividend_yield": "Dividend Yield",
    "ebitda": "EBITDA",
    "free_cash_flow": "Free Cash Flow",
    "debt_to_equity": "Debt-to-Equity",
    "market_cap": "Market Cap",
    "gross_margin": "Gross Margin",
    "ev_ebitda": "EV/EBITDA",
    "ttm": "TTM",
    "yoy_growth": "YoY",
    "qoq_growth": "QoQ",
    "ytd": "YTD",
}

TERM_CATEGORY_OVERRIDES = {
    "roe": "profitability",
    "ebitda": "profitability",
    "gross_margin": "profitability",
    "free_cash_flow": "cash_flow",
    "pe_ratio": "valuation",
    "pb_ratio": "valuation",
    "ev_ebitda": "valuation",
    "market_cap": "valuation",
    "dividend_yield": "income",
    "debt_to_equity": "financial_health",
    "ttm": "time_periods",
    "yoy_growth": "time_periods",
    "qoq_growth": "time_periods",
    "ytd": "time_periods",
}

TERM_CATEGORY_LABELS = {
    "en": {
        "profitability": "Profitability",
        "valuation": "Valuation",
        "cash_flow": "Cash Flow",
        "financial_health": "Financial Health",
        "income": "Income",
        "time_periods": "Time Periods",
        "general": "Key Terms",
    },
    "ar": {
        "profitability": "الربحية",
        "valuation": "التقييم",
        "cash_flow": "التدفقات النقدية",
        "financial_health": "المتانة المالية",
        "income": "الدخل",
        "time_periods": "الفترات الزمنية",
        "general": "مصطلحات مهمة",
    },
}


def get_term_display_name(term_key: str) -> str:
    content = FINANCIAL_TERMS.get(term_key, {})
    return TERM_DISPLAY_OVERRIDES.get(term_key) or content.get("term") or term_key.replace("_", " ").title()


def _normalize_lookup_text(value: str) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"^(what is|what's|define|explain|meaning of|definition of)\s+", "", text)
    text = re.sub(r"^(ما هو|ما معنى|ما المقصود بـ|اشرح)\s+", "", text)
    text = re.sub(r"[?؟]+$", "", text).strip()
    return text


def _all_aliases_for_term(term_key: str) -> List[str]:
    content = FINANCIAL_TERMS.get(term_key, {})
    aliases = {
        term_key,
        term_key.replace("_", " "),
        get_term_display_name(term_key).lower(),
        str(content.get("term", "")).lower(),
    }
    for alias, canonical in TERM_ALIASES.items():
        if canonical == term_key:
            aliases.add(alias.lower())
    return [a.strip() for a in aliases if a and a.strip()]


def match_educational_term(term: str) -> Optional[str]:
    """Resolve a raw user term into a canonical glossary key."""
    term_lower = _normalize_lookup_text(term)
    if not term_lower:
        return None

    if term_lower in FINANCIAL_TERMS:
        return term_lower

    if term_lower in TERM_ALIASES:
        return TERM_ALIASES[term_lower]

    for alias, canonical in TERM_ALIASES.items():
        if _text_contains_alias(term_lower, alias):
            return canonical

    for key in FINANCIAL_TERMS:
        key_label = key.replace("_", " ")
        if term_lower == key_label or _text_contains_alias(term_lower, key_label):
            return key

    return None


def _iter_text_fragments(value: Any) -> Iterable[str]:
    if value is None:
        return
    if isinstance(value, str):
        if value.strip():
            yield value
        return
    if isinstance(value, dict):
        for key, item in value.items():
            key_text = str(key).strip()
            if key_text:
                yield key_text
                if "_" in key_text:
                    yield key_text.replace("_", " ")
            yield from _iter_text_fragments(item)
        return
    if isinstance(value, (list, tuple, set)):
        for item in value:
            yield from _iter_text_fragments(item)


def _text_contains_alias(text: str, alias: str) -> bool:
    escaped = re.escape(alias.lower())
    return bool(re.search(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", text))


def extract_explainable_terms(source: Any, max_terms: int = 8) -> List[Dict[str, str]]:
    """
    Pull educationally explainable terms from arbitrary response payloads.

    This is used to build dynamic "What is ...?" prompts from real response content,
    instead of falling back to static canned examples.
    """
    fragments = [frag for frag in _iter_text_fragments(source)]
    if not fragments:
        return []

    matches: List[tuple[int, str]] = []
    for fragment in fragments:
        text = _normalize_lookup_text(fragment)
        if not text:
            continue
        for term_key in FINANCIAL_TERMS.keys():
            aliases = sorted(_all_aliases_for_term(term_key), key=len, reverse=True)
            for alias in aliases:
                if len(alias) < 2:
                    continue
                if _text_contains_alias(text, alias):
                    pos = text.find(alias)
                    matches.append((pos if pos >= 0 else 9999, term_key))
                    break

    ordered: List[Dict[str, str]] = []
    seen: set[str] = set()
    for _, term_key in sorted(matches, key=lambda item: (item[0], get_term_display_name(item[1]))):
        if term_key in seen:
            continue
        seen.add(term_key)
        ordered.append(
            {
                "key": term_key,
                "display": get_term_display_name(term_key),
                "category": TERM_CATEGORY_OVERRIDES.get(term_key, "general"),
            }
        )
        if len(ordered) >= max_terms:
            break
    return ordered


def build_definition_prompt(term_display: str, language: str = "en") -> str:
    return f"ما معنى {term_display}؟" if language == "ar" else f"What is {term_display}?"


def build_definition_followups(
    source: Any,
    language: str = "en",
    max_terms: int = 2,
    exclude_terms: Optional[List[str]] = None
) -> List[Dict[str, str]]:
    excluded = {str(term).strip().lower() for term in (exclude_terms or []) if str(term).strip()}
    followups: List[Dict[str, str]] = []
    for item in extract_explainable_terms(source, max_terms=max_terms + len(excluded)):
        if item["display"].lower() in excluded or item["key"].lower() in excluded:
            continue
        prompt = build_definition_prompt(item["display"], language)
        followups.append({"text": prompt, "payload": prompt, "type": "definition"})
        if len(followups) >= max_terms:
            break
    return followups


def build_dynamic_help_categories(terms: List[Dict[str, str]], language: str = "en") -> List[Dict[str, Any]]:
    labels = TERM_CATEGORY_LABELS.get(language, TERM_CATEGORY_LABELS["en"])
    grouped: Dict[str, List[str]] = {}
    for item in terms:
        category = item.get("category") or "general"
        grouped.setdefault(category, [])
        prompt = build_definition_prompt(item["display"], language)
        if prompt not in grouped[category]:
            grouped[category].append(prompt)

    categories: List[Dict[str, Any]] = []
    for category_key, prompts in grouped.items():
        if not prompts:
            continue
        categories.append(
            {
                "title": labels.get(category_key, labels["general"]),
                "examples": prompts[:3],
            }
        )
    return categories


def suggest_related_explainable_terms(term: str, max_terms: int = 6) -> List[Dict[str, str]]:
    lookup = _normalize_lookup_text(term)
    if not lookup:
        return []

    search_pool: Dict[str, str] = {}
    for term_key in FINANCIAL_TERMS.keys():
        search_pool[get_term_display_name(term_key).lower()] = term_key
        for alias in _all_aliases_for_term(term_key):
            search_pool[alias.lower()] = term_key

    close_matches = difflib.get_close_matches(lookup, list(search_pool.keys()), n=max_terms * 3, cutoff=0.35)
    seen: set[str] = set()
    related: List[Dict[str, str]] = []
    for matched in close_matches:
        term_key = search_pool.get(matched)
        if not term_key or term_key in seen:
            continue
        seen.add(term_key)
        related.append(
            {
                "key": term_key,
                "display": get_term_display_name(term_key),
                "category": TERM_CATEGORY_OVERRIDES.get(term_key, "general"),
            }
        )
        if len(related) >= max_terms:
            break
    return related


def get_educational_content(term: str) -> Optional[Dict[str, Any]]:
    """
    Get structured educational content for a financial term.
    
    Args:
        term: The financial term to look up
        
    Returns:
        Structured educational content or None if not found
    """
    term_key = match_educational_term(term)
    return FINANCIAL_TERMS.get(term_key) if term_key else None


def format_educational_response(content: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """
    Format educational content into a structured response for the frontend.
    
    Args:
        content: Raw educational content from FINANCIAL_TERMS
        language: Response language
        
    Returns:
        Formatted response with cards
    """
    if language == "ar":
        term_text = content.get("term", "المؤشر المالي")
        # High-quality Arabic educational response for the most requested term.
        if "ROE" in term_text.upper():
            return {
                "success": True,
                "conversational_text": "سؤال ممتاز. هذا شرح عملي ومؤسسي لمؤشر العائد على حقوق الملكية.",
                "educational_cards": [
                    {
                        "variant": "definition",
                        "title": "العائد على حقوق الملكية",
                        "content": "يقيس العائد على حقوق الملكية كفاءة الشركة في تحقيق أرباح من أموال المساهمين. ببساطة: لكل 100 جنيه حقوق ملكية، كم تحقق الشركة من أرباح؟"
                    },
                    {
                        "variant": "formula",
                        "title": "المعادلة",
                        "content": "العائد على حقوق الملكية = صافي الربح / حقوق الملكية"
                    },
                    {
                        "variant": "example",
                        "title": "مثال عملي",
                        "content": "إذا حققت شركة صافي ربح 2.7 مليار جنيه وحقوق ملكية 7.1 مليار جنيه، فإن العائد على حقوق الملكية يقارب 38.6%."
                    },
                    {
                        "variant": "when_misleading",
                        "title": "متى قد يكون مضللاً",
                        "content": "- الاقتراض المرتفع قد يرفع العائد بشكل مصطنع.\n- الأرباح الاستثنائية لمرة واحدة قد تشوه القراءة.\n- الأفضل مقارنة المؤشر داخل نفس القطاع."
                    },
                    {
                        "variant": "example",
                        "title": "كيف أستخدمه عملياً",
                        "content": "- ابحث عن عائد أعلى من متوسط القطاع مع مديونية منضبطة.\n- قيّم استمرارية المؤشر عبر عدة سنوات وليس سنة واحدة.\n- اربطه بالهوامش وجودة التدفقات النقدية."
                    }
                ],
                "cards": [
                    {
                        "type": "educational",
                        "data": {
                            "term": "العائد على حقوق الملكية (ROE)",
                            "icon": "📊",
                            "sections": [
                                {
                                    "type": "definition",
                                    "title": "📖 التعريف",
                                    "content": "يقيس العائد على حقوق الملكية كفاءة الشركة في تحقيق أرباح من أموال المساهمين."
                                },
                                {
                                    "type": "formula",
                                    "title": "🔢 المعادلة",
                                    "content": "ROE = صافي الربح / حقوق الملكية"
                                },
                                {
                                    "type": "example",
                                    "title": "📍 مثال عملي",
                                    "content": "إذا حققت شركة صافي ربح 2.7 مليار جنيه وحقوق ملكية 7.1 مليار جنيه، فإن ROE يقارب 38.6%."
                                },
                                {
                                    "type": "caveats",
                                    "title": "⚠️ متى قد يكون مضللاً",
                                    "items": [
                                        "الاقتراض المرتفع قد يرفع ROE بشكل مصطنع.",
                                        "الأرباح الاستثنائية لمرة واحدة قد تشوه القراءة.",
                                        "يجب مقارنة ROE داخل نفس القطاع وليس بين قطاعات مختلفة."
                                    ]
                                },
                                {
                                    "type": "application",
                                    "title": "🎯 كيف أستخدمه عملياً",
                                    "content": "أفضل شركات ذات ROE أعلى من متوسط القطاع مع مديونية منضبطة واستقرار عبر عدة سنوات."
                                }
                            ],
                            "related_metrics": ["العائد على الأصول", "العائد على رأس المال المستثمر", "نسبة الدين إلى حقوق الملكية"]
                        }
                    }
                ],
                "learning_section": {
                    "title": "📊 خلاصة سريعة",
                    "items": [
                        "**ROE المرتفع** يعني عادةً كفاءة تشغيلية أعلى.",
                        "**ROE وحده لا يكفي** ويجب قراءته مع المديونية.",
                        "**الاتساق عبر الزمن** أهم من رقم سنة واحدة."
                    ]
                },
                "disclaimer_card": {
                    "icon": "⚠️",
                    "title": "تحليل تعليمي",
                    "text": "هذا الشرح تعليمي وليس توصية استثمارية.",
                    "variant": "warning"
                },
                "follow_up_prompt": "هل تريد أن أحسب ROE لسهم معين أو أقارنه بمتوسط القطاع؟"
            }

        # Generic Arabic fallback for other terms
        return {
            "success": True,
            "conversational_text": f"إليك شرحاً تعليمياً مبسطاً لمؤشر: {term_text}.",
            "educational_cards": [
                {
                    "variant": "definition",
                    "title": term_text,
                    "content": content.get("definition", "") or "شرح تعليمي مبسط لهذا المؤشر."
                },
                {
                    "variant": "formula",
                    "title": "المعادلة",
                    "content": content.get("formula", "") or "غير متاح"
                },
                {
                    "variant": "example",
                    "title": "مثال",
                    "content": content.get("example", {}).get("text", "") or "غير متاح"
                },
                {
                    "variant": "when_misleading",
                    "title": "ملاحظات مهمة",
                    "content": "\n".join([f"- {x}" for x in (content.get("caveats", []) or []) if str(x).strip()]) or "راجع السياق القطاعي ولا تعتمد على المؤشر منفرداً."
                },
                {
                    "variant": "example",
                    "title": "التطبيق العملي",
                    "content": content.get("practical_application", "") or "استخدم المؤشر مع مؤشرات أخرى وراجع اتجاهه عبر عدة سنوات."
                }
            ],
            "cards": [
                {
                    "type": "educational",
                    "data": {
                        "term": term_text,
                        "icon": content.get("icon", "📘"),
                        "sections": [
                            {
                                "type": "definition",
                                "title": "📖 التعريف",
                                "content": content.get("definition", "")
                            },
                            {
                                "type": "formula",
                                "title": "🔢 المعادلة",
                                "content": content.get("formula", "")
                            },
                            {
                                "type": "example",
                                "title": "📍 مثال",
                                "content": content.get("example", {}).get("text", "")
                            },
                            {
                                "type": "caveats",
                                "title": "⚠️ ملاحظات مهمة",
                                "items": content.get("caveats", [])
                            },
                            {
                                "type": "application",
                                "title": "🎯 التطبيق العملي",
                                "content": content.get("practical_application", "")
                            }
                        ],
                        "related_metrics": content.get("related_metrics", [])
                    }
                }
            ],
            "learning_section": {
                "title": f"📊 نقاط أساسية حول {term_text}",
                "items": [
                    "قارن المؤشر داخل نفس القطاع للحصول على قراءة أدق.",
                    "استخدم المؤشر مع مؤشرات أخرى وليس منفرداً.",
                    "راجع الاتجاه التاريخي للمؤشر عبر عدة سنوات."
                ]
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "تحليل تعليمي",
                "text": "هذا الشرح تعليمي وليس توصية استثمارية.",
                "variant": "warning"
            },
            "follow_up_prompt": "هل تريد تطبيق هذا المؤشر على سهم معين؟"
        }

    return {
        "success": True,
        "conversational_text": f"Here's a comprehensive breakdown of {content['term']}:",
        "educational_cards": [
            {
                "variant": "definition",
                "title": content["term"],
                "content": content.get("definition", "")
            },
            {
                "variant": "formula",
                "title": "Formula",
                "content": content.get("formula", "")
            },
            {
                "variant": "example",
                "title": content.get("example", {}).get("title", "Example"),
                "content": content.get("example", {}).get("text", "")
            },
            {
                "variant": "when_misleading",
                "title": "When It's Misleading",
                "content": "\n".join([f"- {x}" for x in (content.get("caveats", []) or []) if str(x).strip()]) or "Always compare within sector and validate with multiple metrics."
            },
            {
                "variant": "example",
                "title": "How I Use It",
                "content": content.get("practical_application", "")
            }
        ],
        "cards": [
            {
                "type": "educational",
                "data": {
                    "term": content["term"],
                    "icon": content["icon"],
                    "sections": [
                        {
                            "type": "definition",
                            "title": "📖 Definition",
                            "content": content["definition"]
                        },
                        {
                            "type": "formula",
                            "title": "🔢 Formula",
                            "content": content["formula"]
                        },
                        {
                            "type": "example",
                            "title": f"📍 {content['example']['title']}",
                            "content": content["example"]["text"]
                        },
                        {
                            "type": "caveats",
                            "title": "⚠️ When It's Misleading",
                            "items": content["caveats"]
                        },
                        {
                            "type": "application",
                            "title": "🎯 How I Use It",
                            "content": content["practical_application"]
                        }
                    ],
                    "related_metrics": content.get("related_metrics", [])
                }
            }
        ],
        "learning_section": {
            "title": f"📊 Key Takeaways for {content['term']}",
            "items": [
                content["definition"][:100] + "...",
                f"Formula: {content['formula']}",
                content["caveats"][0] if content["caveats"] else "Compare across similar companies",
                content["practical_application"][:80] + "..."
            ]
        },
        "disclaimer_card": {
            "icon": "⚠️",
            "title": "Educational Analysis",
            "text": "This explanation is educational and not personalized investment advice.",
            "variant": "warning"
        },
        "follow_up_prompt": f"Would you like me to calculate {content['term'].split('(')[0].strip()} for a specific stock, or explain a related metric?"
    }


def format_unknown_term_response(term: str, language: str = "en") -> Dict[str, Any]:
    """
    Response when the requested term is not in our database.
    """
    related_terms = suggest_related_explainable_terms(term)
    categories = build_dynamic_help_categories(related_terms, language) if related_terms else []

    if language == "ar":
        result = {
            "success": True,
            "conversational_text": f"لا يتوفر حالياً تعريف تفصيلي للمصطلح: {term}. هذه أهم المؤشرات التي يمكنني شرحها بدقة:",
            "cards": [],
            "follow_up_prompt": "أعد صياغة المصطلح أو اسأل عن مؤشر مشابه وسأشرحه لك."
        }
        if categories:
            result["cards"].append({"type": "help", "data": {"categories": categories}})
            result["follow_up_prompt"] = categories[0]["examples"][0]
        return result

    result = {
        "success": True,
        "conversational_text": f"I don't have a detailed definition for '{term}' in my database yet. Here are some metrics I can explain in detail:",
        "cards": [],
        "follow_up_prompt": "Try rephrasing the term or ask about a related metric and I'll explain it."
    }
    if categories:
        result["cards"].append({"type": "help", "data": {"categories": categories}})
        result["follow_up_prompt"] = categories[0]["examples"][0]
    return result
