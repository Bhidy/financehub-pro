"""
Universal Financial Handler.
Handles RATIO_TREND, ADVANCED_STATS, OWNERSHIP_DETAIL, EV_ANALYSIS,
SCORE_DETAIL, and UNIVERSAL_FINANCIAL (catch-all) intents.

Uses the column registry to dynamically answer ANY financial question
about EGX stocks by finding the right columns and querying the DB.
"""
import logging
import re
from typing import Dict, Any, List, Optional
from .column_registry import (
    INCOME_COLUMNS, BALANCE_COLUMNS, CASHFLOW_COLUMNS,
    ALL_REGISTRIES, find_columns_by_keyword, format_value
)

logger = logging.getLogger(__name__)


def _is_bank_like_sector(raw_sector: Optional[str]) -> bool:
    """Altman Z-Score is not a reliable metric for banks/financial institutions."""
    if not raw_sector:
        return False
    sector = str(raw_sector).strip().lower()
    return (
        "bank" in sector
        or "financial" in sector
        or "بنوك" in sector
        or "مصارف" in sector
        or "خدمات مالية" in sector
    )


# ============================================================================
# RATIO TREND: Historical ratio charts (5-year)
# ============================================================================
async def handle_ratio_trend(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """Show historical ratio trends from financial_ratios_history."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    metric = entities.get("metric", "pe_ratio")
    
    # Map user-friendly names to database columns
    ratio_groups = {
        "valuation": ["pe_ratio", "pb_ratio", "ps_ratio", "ptbv_ratio"],
        "profitability": ["roe", "roa", "roce"],
        "margins": ["gross_margin", "operating_margin", "net_margin"],
        "leverage": ["debt_equity", "debt_assets", "debt_ebitda", "interest_coverage"],
        "liquidity": ["current_ratio", "quick_ratio"],
        "efficiency": ["asset_turnover", "inventory_turnover", "receivables_turnover"],
        "yield": ["dividend_yield", "earnings_yield", "fcf_yield", "payout_ratio"],
        "ev": ["enterprise_value", "ev_ebitda", "ev_sales"],
        "pe": ["pe_ratio", "pe_forward", "peg_ratio"],
    }
    
    cols = ratio_groups.get(metric, [metric])
    col_str = ", ".join(["fiscal_year"] + cols)
    
    try:
        rows = await conn.fetch(
            f"SELECT {col_str} FROM financial_ratios_history WHERE symbol=$1 ORDER BY fiscal_year ASC LIMIT 10", symbol
        )
    except Exception as e:
        logger.warning(f"Ratio trend query failed for {symbol}: {e}")
        return _nd(symbol, name, language)
    
    if not rows:
        return _nd(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    labels = {
        "pe_ratio": "P/E Ratio", "pb_ratio": "P/B Ratio", "ps_ratio": "P/S Ratio",
        "ptbv_ratio": "P/TBV", "roe": "Return on Equity", "roa": "Return on Assets",
        "roce": "Return on Capital Employed", "gross_margin": "Gross Margin",
        "operating_margin": "Operating Margin", "net_margin": "Net Margin",
        "debt_equity": "Debt/Equity", "debt_assets": "Debt/Assets",
        "debt_ebitda": "Debt/EBITDA", "interest_coverage": "Interest Coverage",
        "current_ratio": "Current Ratio", "quick_ratio": "Quick Ratio",
        "asset_turnover": "Asset Turnover", "inventory_turnover": "Inventory Turnover",
        "receivables_turnover": "Receivables Turnover", "dividend_yield": "Dividend Yield",
        "earnings_yield": "Earnings Yield", "fcf_yield": "FCF Yield",
        "payout_ratio": "Payout Ratio", "enterprise_value": "Enterprise Value",
        "ev_ebitda": "EV/EBITDA", "ev_sales": "EV/Sales",
        "pe_forward": "Forward P/E", "peg_ratio": "PEG Ratio",
    }
    
    series = []
    for col in cols:
        if any(r.get(col) is not None for r in rows):
            is_pct = col in ("roe","roa","roce","gross_margin","operating_margin","net_margin",
                            "dividend_yield","earnings_yield","fcf_yield","payout_ratio")
            series.append({
                "name": labels.get(col, col.replace("_", " ").title()),
                "data": [float(r.get(col) or 0) for r in rows],
                "format": "percent" if is_pct else "ratio",
            })
    
    data = {"years": years, "series": series, "currency": currency, "metric": metric}
    title = f'{metric.replace("_", " ").title()} History' if metric in ratio_groups else labels.get(metric, metric)
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'ratio_history_chart', 'title': title, 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s {title.lower()} over the years.", "actions": _act(symbol, language)}


# ============================================================================
# ADVANCED STATS: Unused stock_statistics fields
# ============================================================================
async def handle_advanced_stats(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """Show advanced stats from stock_statistics: yields, turnover, BV, etc."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker: return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    row = await conn.fetchrow("""
        SELECT p_tbv, p_ocf, p_fcf, fcf_yield, earnings_yield,
               asset_turnover, inventory_turnover,
               bvps, book_value, net_cash, working_capital,
               fcf_per_share, ocf_ttm, fcf_ttm,
               altman_z_score, piotroski_f_score,
               insider_ownership, institutional_ownership, float_shares, shares_outstanding,
               enterprise_value, ev_earnings, ev_ebit, ev_fcf
        FROM stock_statistics WHERE symbol=$1
    """, symbol)
    
    if not row: return _nd(symbol, name, language)
    
    # Group metrics by category
    categories = {
        "Advanced Valuation": [
            ("P/TBV", row.get('p_tbv'), "ratio"), ("P/OCF", row.get('p_ocf'), "ratio"),
            ("P/FCF", row.get('p_fcf'), "ratio"),
        ],
        "Yield Metrics": [
            ("Earnings Yield", row.get('earnings_yield'), "percent"),
            ("FCF Yield", row.get('fcf_yield'), "percent"),
        ],
        "Efficiency": [
            ("Asset Turnover", row.get('asset_turnover'), "ratio"),
            ("Inventory Turnover", row.get('inventory_turnover'), "ratio"),
        ],
        "Intrinsic Data": [
            ("Book Value/Share", row.get('bvps'), "per_share"),
            ("Net Cash", row.get('net_cash'), "currency"),
            ("Working Capital", row.get('working_capital'), "currency"),
            ("FCF/Share", row.get('fcf_per_share'), "per_share"),
        ],
        "Quality Scores": [
            ("Altman Z-Score", row.get('altman_z_score'), "score"),
            ("Piotroski F-Score", row.get('piotroski_f_score'), "score"),
        ],
    }
    
    metric_groups = []
    for group_name, metrics in categories.items():
        items = []
        for label, val, fmt in metrics:
            if val is not None:
                items.append({"label": label, "value": format_value(val, fmt, currency), "raw": float(val)})
        if items:
            metric_groups.append({"group": group_name, "items": items})
    
    data = {"currency": currency, "groups": metric_groups}
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'advanced_stats', 'title': 'Advanced Statistics' if language == 'en' else 'إحصائيات متقدمة', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s advanced statistics.", "actions": _act(symbol, language)}


# ============================================================================
# OWNERSHIP DETAIL
# ============================================================================
async def handle_ownership_detail(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show insider vs institutional vs float."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker: return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    row = await conn.fetchrow("""
        SELECT insider_ownership, institutional_ownership, float_shares, shares_outstanding, market_cap
        FROM stock_statistics WHERE symbol=$1
    """, symbol)
    
    if not row: return _nd(symbol, name, language)
    
    insider = float(row.get('insider_ownership') or 0) * 100
    institutional = float(row.get('institutional_ownership') or 0) * 100
    public_float = 100 - insider - institutional
    
    data = {
        "currency": currency,
        "pie": [
            {"label": "Insider", "percent": round(insider, 1)},
            {"label": "Institutional", "percent": round(institutional, 1)},
            {"label": "Public Float", "percent": round(max(public_float, 0), 1)},
        ],
        "shares_outstanding": format_value(row.get('shares_outstanding'), "number"),
        "float_shares": format_value(row.get('float_shares'), "number"),
        "market_cap": format_value(row.get('market_cap'), "currency", currency),
    }
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'ownership_structure', 'title': 'Ownership Structure' if language == 'en' else 'هيكل الملكية', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s ownership structure.", "actions": _act(symbol, language)}


# ============================================================================
# SCORE DETAIL: Z-Score and F-Score explained
# ============================================================================
async def handle_score_detail(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """Show Z-Score or F-Score with explanation."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency, sector_name FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker: return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    row = await conn.fetchrow("""
        SELECT altman_z_score, piotroski_f_score FROM stock_statistics WHERE symbol=$1
    """, symbol)
    
    if not row: return _nd(symbol, name, language)
    
    score_type = entities.get("score_type", "z_score")
    
    if score_type == "f_score":
        score = row.get('piotroski_f_score')
        data = {
            "score_name": "Piotroski F-Score",
            "score_value": int(score) if score is not None else None,
            "max_score": 9,
            "interpretation": _f_score_interp(int(score)) if score is not None else "N/A",
            "description": "The Piotroski F-Score (0-9) measures financial health using 9 criteria: profitability, leverage, liquidity, and operating efficiency.",
            "criteria": [
                "Net Income > 0", "Operating Cash Flow > 0", "ROA Increasing",
                "OCF > Net Income", "Debt Ratio Decreasing", "Current Ratio Increasing",
                "No New Shares Issued", "Gross Margin Increasing", "Asset Turnover Increasing"
            ]
        }
    else:
        score = row.get('altman_z_score')
        is_bank_sector = _is_bank_like_sector(ticker.get("sector_name"))
        if is_bank_sector:
            data = {
                "score_name": "Altman Z-Score",
                "score_value": None,
                "interpretation": "Not Applicable for Banks",
                "description": (
                    "Altman Z-Score is designed for non-financial corporates and is not a "
                    "reliable risk model for banks. For banks, prioritize capital adequacy, "
                    "asset quality (NPLs), provisioning coverage, and funding/liquidity structure."
                ),
                "criteria": [
                    "Capital adequacy / CET1 trend",
                    "NPL ratio and coverage",
                    "Provisioning discipline",
                    "Loan-to-deposit and liquidity profile",
                    "Cost-to-income and operating resilience",
                ],
            }
        elif score is None:
            data = {
                "score_name": "Altman Z-Score",
                "score_value": None,
                "interpretation": "Unavailable — Missing Inputs",
                "description": (
                    "Altman Z-Score could not be computed because one or more required financial "
                    "inputs are missing. Please verify balance-sheet and income-statement coverage."
                ),
            }
        else:
            data = {
                "score_name": "Altman Z-Score",
                "score_value": round(float(score), 2),
                "zones": {"safe": "> 2.99", "grey": "1.81 - 2.99", "distress": "< 1.81"},
                "interpretation": _z_score_interp(float(score)),
                "description": "The Altman Z-Score predicts bankruptcy probability using 5 financial ratios weighted by profitability, leverage, liquidity, solvency, and activity.",
            }
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'score_detail', 'title': data["score_name"], 'data': data},
    ]
    if data.get("interpretation") == "Not Applicable for Banks":
        conversational_text = (
            f"{symbol} is in a financial-services sector where Altman Z-Score is not methodologically reliable. "
            f"I switched the safety framing to bank-appropriate risk lenses."
        )
    else:
        conversational_text = f"Here's {symbol}'s {data['score_name']} analysis."
    return {"cards": cards, "conversational_text": conversational_text, "actions": _act(symbol, language)}


# ============================================================================
# UNIVERSAL FINANCIAL: Dynamic catch-all
# ============================================================================
async def handle_universal_financial(conn, symbol: str, message: str, language: str = "en") -> Dict[str, Any]:
    """
    Dynamic catch-all handler. Uses keyword matching against the column registry
    to find relevant columns, queries the DB, and returns a dynamic_data_card.
    """
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    # Extract keywords from the message
    msg_lower = message.lower()
    # Remove the symbol from the message to get pure keywords
    msg_clean = re.sub(r'\b\w{3,5}\b', '', msg_lower) if len(msg_lower) > 10 else msg_lower
    
    # Search all registries for matching columns
    matched = []
    for table, registry in ALL_REGISTRIES.items():
        for col_name, meta in registry.items():
            score = 0
            for kw in meta.get("keywords", []):
                if kw in msg_lower:
                    score = max(score, len(kw))
            if meta["label"].lower() in msg_lower:
                score = max(score, len(meta["label"]))
            if score > 0:
                matched.append({"table": table, "column": col_name, "meta": meta, "score": score})
    
    # Sort by relevance and take top 8 columns
    matched.sort(key=lambda x: x["score"], reverse=True)
    matched = matched[:8]
    
    if not matched:
        # Try broader search
        words = [w for w in msg_lower.split() if len(w) > 3 and w not in ('what', 'show', 'give', 'tell', 'much', 'about', 'stock', 'company')]
        for word in words:
            results = find_columns_by_keyword(word, limit=5)
            for r in results:
                registry = ALL_REGISTRIES[r["table"]]
                meta = registry[r["column"]]
                matched.append({"table": r["table"], "column": r["column"], "meta": meta, "score": len(word)})
        matched = matched[:8]
    
    if not matched:
        return {
            "cards": [],
            "conversational_text": f"I couldn't find specific financial data matching your question for {symbol}. Try asking about revenue, debt, cash flow, or specific ratios.",
            "actions": _act(symbol, language),
        }
    
    # Group by table and query
    results_by_table = {}
    for m in matched:
        t = m["table"]
        if t not in results_by_table:
            results_by_table[t] = []
        results_by_table[t].append(m)
    
    data_items = []
    for table, cols in results_by_table.items():
        col_names = [c["column"] for c in cols]
        col_str = ", ".join(["fiscal_year"] + col_names)
        try:
            rows = await conn.fetch(
                f"SELECT {col_str} FROM {table} WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5", symbol
            )
            if rows:
                for c in cols:
                    col_name = c["column"]
                    meta = c["meta"]
                    values = []
                    for r in rows:
                        val = r.get(col_name)
                        values.append({
                            "year": r['fiscal_year'],
                            "raw": float(val) if val is not None else None,
                            "formatted": format_value(val, meta["format"], currency),
                        })
                    data_items.append({
                        "label": meta["label"],
                        "label_ar": meta.get("label_ar", ""),
                        "category": meta["category"],
                        "format": meta["format"],
                        "values": values,
                    })
        except Exception as e:
            logger.warning(f"Universal handler query failed for {table}: {e}")
    
    data = {"currency": currency, "items": data_items}
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'dynamic_data_card', 'title': 'Financial Data' if language == 'en' else 'بيانات مالية', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's the financial data I found for {symbol}.", "actions": _act(symbol, language)}


# ============================================================================
# HELPERS
# ============================================================================
def _nf(s, l): return {"cards": [], "conversational_text": f"Stock {s} not found.", "actions": []}
def _nd(s, n, l): return {"cards": [], "conversational_text": f"No data found for {s}.", "actions": []}
def _z_score_interp(z):
    if z > 2.99: return "Safe Zone — Low bankruptcy risk"
    if z > 1.81: return "Grey Zone — Moderate risk, monitor closely"
    return "Distress Zone — High bankruptcy risk"
def _f_score_interp(f):
    if f >= 7: return "Strong — Financially healthy"
    if f >= 4: return "Average — Mixed signals"
    return "Weak — Financial concerns"
def _act(symbol, language):
    if language == 'ar':
        return [
            {"label": "تحليل الإيرادات", "label_ar": "تحليل الإيرادات", "action_type": "query", "payload": f"إيرادات {symbol}"},
            {"label": "هيكل الديون", "label_ar": "هيكل الديون", "action_type": "query", "payload": f"ديون {symbol}"},
            {"label": "اتجاه النسب المالية", "label_ar": "اتجاه النسب", "action_type": "query", "payload": f"اتجاه نسب {symbol}"},
        ]
    return [
        {"label": "Revenue Breakdown", "label_ar": "تحليل الإيرادات", "action_type": "query", "payload": f"{symbol} revenue breakdown"},
        {"label": "Debt Structure", "label_ar": "هيكل الديون", "action_type": "query", "payload": f"{symbol} debt structure"},
        {"label": "Ratio Trends", "label_ar": "اتجاه النسب", "action_type": "query", "payload": f"{symbol} ratio trend valuation"},
    ]
