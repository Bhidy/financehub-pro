"""
Educational Content - Financial term definitions and educational materials.

Provides structured educational responses for DEFINE_TERM intent
with definition, formula, example, caveats, and practical application.
"""

from typing import Dict, Any, Optional


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
            "text": "JUFO has 38.6% ROE - meaning for every EGP 100 of equity, it generates EGP 38.60 in annual profit. This is exceptional by EGX standards where 15-20% is considered good."
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
    }
}

# Aliases for common variations
TERM_ALIASES = {
    "return on equity": "roe",
    "pe": "pe_ratio",
    "p/e": "pe_ratio",
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
}


def get_educational_content(term: str) -> Optional[Dict[str, Any]]:
    """
    Get structured educational content for a financial term.
    
    Args:
        term: The financial term to look up
        
    Returns:
        Structured educational content or None if not found
    """
    # Normalize the term
    term_lower = term.lower().strip()
    
    # Check direct match
    if term_lower in FINANCIAL_TERMS:
        return FINANCIAL_TERMS[term_lower]
    
    # Check aliases
    for alias, canonical in TERM_ALIASES.items():
        if alias in term_lower or term_lower in alias:
            return FINANCIAL_TERMS.get(canonical)
    
    # Fuzzy match - check if term contains any key
    for key in FINANCIAL_TERMS:
        if key.replace("_", " ") in term_lower or term_lower in key.replace("_", " "):
            return FINANCIAL_TERMS[key]
    
    return None


def format_educational_response(content: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """
    Format educational content into a structured response for the frontend.
    
    Args:
        content: Raw educational content from FINANCIAL_TERMS
        language: Response language
        
    Returns:
        Formatted response with cards
    """
    return {
        "success": True,
        "conversational_text": f"Here's a comprehensive breakdown of {content['term']}:",
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
        "follow_up_prompt": f"Would you like me to calculate {content['term'].split('(')[0].strip()} for a specific stock, or explain a related metric?"
    }


def format_unknown_term_response(term: str, language: str = "en") -> Dict[str, Any]:
    """
    Response when the requested term is not in our database.
    """
    return {
        "success": True,
        "conversational_text": f"I don't have a detailed definition for '{term}' in my database yet. Here are some metrics I can explain in detail:",
        "cards": [
            {
                "type": "help",
                "data": {
                    "categories": [
                        {
                            "title": "Profitability",
                            "examples": ["What is ROE?", "Explain EBITDA", "Gross margin"]
                        },
                        {
                            "title": "Valuation",
                            "examples": ["What is P/E?", "P/B ratio", "EV/EBITDA"]
                        },
                        {
                            "title": "Financial Health",
                            "examples": ["Debt to equity", "Free cash flow", "Market cap"]
                        }
                    ]
                }
            }
        ],
        "follow_up_prompt": "Try asking about a specific metric like ROE, P/E, or dividend yield."
    }
