"""
Income Statement Explorer Handler.
Handles INCOME_EXPLORE and INCOME_TREND intents.
Provides detailed income statement data with multi-year trends.
"""
from app.chat.currency_utils import get_ticker_currency, is_egx_market
import logging
from typing import Dict, Any, List, Optional
from .column_registry import INCOME_COLUMNS, format_value, get_category_columns, scale_statement_rows

logger = logging.getLogger(__name__)


# ============================================================================
# SUB-HANDLER: Revenue Breakdown
# ============================================================================
async def handle_income_revenue_breakdown(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show revenue composition and breakdown."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _not_found(symbol, language)
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    # Industrial/Commercial stocks: revenue, cost_of_revenue, gross_profit
    # Banking stocks: interest_income_loans, fee_commission_income, etc.
    rows = await conn.fetch("""
        SELECT fiscal_year, revenue, revenue_growth, cost_of_revenue, gross_profit, gross_margin,
               interest_income_loans, interest_income_investments, total_interest_income,
               fee_income AS fee_commission_income, trading_income,
               NULL::numeric AS insurance_revenue,
               net_interest_income, interest_expense,
               provision_credit_losses AS loan_loss_provisions
        FROM income_statements WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    rows = scale_statement_rows(rows, INCOME_COLUMNS)

    if not rows:
        return _no_data(symbol, name, language)

    is_bank = rows[0].get('total_interest_income') is not None
    years = [r['fiscal_year'] for r in rows]
    
    breakdown_data = {"years": years, "is_bank": is_bank, "currency": currency, "components": []}
    
    if is_bank:
        components = [
            ("interest_income_loans", "Interest Income (Loans)"),
            ("interest_income_investments", "Interest Income (Investments)"),
            ("fee_commission_income", "Fee & Commission Income"),
            ("trading_income", "Trading Income"),
            ("insurance_revenue", "Insurance Revenue"),
        ]
        for col, label in components:
            vals = [format_value(r.get(col), "currency", currency) for r in rows]
            raw_vals = [float(r.get(col) or 0) for r in rows]
            if any(r.get(col) is not None for r in rows):
                breakdown_data["components"].append({"label": label, "values": vals, "raw": raw_vals})
        # Add total and provisions
        breakdown_data["total"] = [format_value(r.get('total_interest_income'), "currency", currency) for r in rows]
        breakdown_data["provisions"] = [format_value(r.get('loan_loss_provisions'), "currency", currency) for r in rows]
    else:
        components = [
            ("revenue", "Revenue"),
            ("cost_of_revenue", "Cost of Revenue"),
            ("gross_profit", "Gross Profit"),
        ]
        for col, label in components:
            vals = [format_value(r.get(col), "currency", currency) for r in rows]
            raw_vals = [float(r.get(col) or 0) for r in rows]
            breakdown_data["components"].append({"label": label, "values": vals, "raw": raw_vals})
        breakdown_data["margin"] = [format_value(r.get('gross_margin'), "percent", currency) for r in rows]
        breakdown_data["growth"] = [format_value(r.get('revenue_growth'), "percent", currency) for r in rows]
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'revenue_breakdown', 'title': 'Revenue Breakdown' if language == 'en' else 'تحليل الإيرادات', 'data': breakdown_data},
    ]
    
    return {
        "cards": cards,
        "conversational_text": f"Here's {symbol}'s revenue breakdown over the last {len(years)} years.",
        "actions": _build_actions(symbol, language),
    }


# ============================================================================
# SUB-HANDLER: Cost Structure
# ============================================================================
async def handle_income_cost_structure(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show cost breakdown: COGS, SGA, R&D, other."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _not_found(symbol, language)
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, revenue, cost_of_revenue, operating_expenses, sga_expense,
               rd_expense AS research_development,
               NULL::numeric AS selling_marketing, NULL::numeric AS general_admin,
               other_operating_expenses, operating_income, operating_margin
        FROM income_statements WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    rows = scale_statement_rows(rows, INCOME_COLUMNS)

    if not rows:
        return _no_data(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    cost_data = {"years": years, "currency": currency, "components": []}
    
    cost_fields = [
        ("cost_of_revenue", "Cost of Revenue", "تكلفة الإيرادات"),
        ("sga_expense", "SG&A Expense", "مصروفات بيعية وإدارية"),
        ("research_development", "R&D Expense", "مصروفات بحث وتطوير"),
        ("selling_marketing", "Selling & Marketing", "مصروفات تسويق"),
        ("general_admin", "General & Admin", "مصروفات إدارية"),
        ("other_operating_expenses", "Other Operating Expenses", "مصروفات أخرى"),
    ]
    
    for col, label_en, label_ar in cost_fields:
        if any(r.get(col) is not None for r in rows):
            cost_data["components"].append({
                "label": label_ar if language == 'ar' else label_en,
                "values": [format_value(r.get(col), "currency", currency) for r in rows],
                "raw": [float(r.get(col) or 0) for r in rows],
            })
    
    cost_data["operating_income"] = [format_value(r.get('operating_income'), "currency", currency) for r in rows]
    cost_data["operating_margin"] = [format_value(r.get('operating_margin'), "percent", currency) for r in rows]
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'cost_breakdown', 'title': 'Cost Structure' if language == 'en' else 'هيكل التكاليف', 'data': cost_data},
    ]
    
    return {
        "cards": cards,
        "conversational_text": f"Here's {symbol}'s cost structure over {len(years)} years.",
        "actions": _build_actions(symbol, language),
    }


# ============================================================================
# SUB-HANDLER: Growth Trend
# ============================================================================
async def handle_income_growth_trend(conn, symbol: str, metric: str = "revenue", language: str = "en") -> Dict[str, Any]:
    """Show multi-year growth trend for any income statement metric."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _not_found(symbol, language)
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    # Map metric to columns
    metric_map = {
        "revenue": ["revenue", "revenue_growth"],
        "net_income": ["net_income", "net_income_growth"],
        "eps": ["eps", "eps_diluted", "eps_growth"],
        "ebitda": ["ebitda", "ebitda_margin"],
        "margins": ["gross_margin", "operating_margin", "net_margin", "ebitda_margin"],
        "fcf": ["free_cashflow", "fcf_margin", "fcf_per_share"],
    }
    
    cols = metric_map.get(metric, ["revenue", "revenue_growth"])
    col_str = ", ".join(["fiscal_year"] + cols)
    
    rows = await conn.fetch(
        f"SELECT {col_str} FROM income_statements WHERE symbol=$1 ORDER BY fiscal_year ASC LIMIT 10", symbol
    )
    rows = scale_statement_rows(rows, INCOME_COLUMNS)

    if not rows:
        return _no_data(symbol, name, language)

    years = [r['fiscal_year'] for r in rows]
    series = []
    for col in cols:
        meta = INCOME_COLUMNS.get(col, {"label": col, "format": "number"})
        series.append({
            "name": meta["label"],
            "data": [float(r.get(col) or 0) for r in rows],
            "format": meta["format"],
        })
    
    trend_data = {"years": years, "series": series, "currency": currency, "metric": metric}
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'growth_trend', 'title': f'{metric.replace("_", " ").title()} Trend', 'data': trend_data},
    ]
    
    return {
        "cards": cards,
        "conversational_text": f"Here's {symbol}'s {metric.replace('_', ' ')} trend over {len(years)} years.",
        "actions": _build_actions(symbol, language),
    }


# ============================================================================
# SUB-HANDLER: EBITDA Breakdown
# ============================================================================
async def handle_income_ebitda_breakdown(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show EBITDA vs EBIT breakdown with D&A."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _not_found(symbol, language)
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, ebitda, ebitda_margin, ebit, ebit_margin, da_for_ebitda,
               operating_income, operating_margin
        FROM income_statements WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    rows = scale_statement_rows(rows, INCOME_COLUMNS)

    if not rows:
        return _no_data(symbol, name, language)

    years = [r['fiscal_year'] for r in rows]
    data = {
        "years": years, "currency": currency,
        "ebitda": [format_value(r.get('ebitda'), "currency", currency) for r in rows],
        "ebit": [format_value(r.get('ebit'), "currency", currency) for r in rows],
        "da": [format_value(r.get('da_for_ebitda'), "currency", currency) for r in rows],
        "ebitda_margin": [format_value(r.get('ebitda_margin'), "percent", currency) for r in rows],
        "ebit_margin": [format_value(r.get('ebit_margin'), "percent", currency) for r in rows],
    }
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'ebitda_breakdown', 'title': 'EBITDA Breakdown', 'data': data},
    ]
    
    return {
        "cards": cards,
        "conversational_text": f"Here's {symbol}'s EBITDA breakdown.",
        "actions": _build_actions(symbol, language),
    }


# ============================================================================
# SUB-HANDLER: Tax Analysis
# ============================================================================
async def handle_income_tax_analysis(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show tax analysis: effective tax rate, income tax over time."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _not_found(symbol, language)
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, pretax_income, income_tax, effective_tax_rate, net_income
        FROM income_statements WHERE symbol=$1 ORDER BY fiscal_year ASC LIMIT 10
    """, symbol)
    rows = scale_statement_rows(rows, INCOME_COLUMNS)

    if not rows:
        return _no_data(symbol, name, language)

    years = [r['fiscal_year'] for r in rows]
    data = {
        "years": years, "currency": currency,
        "series": [
            {"name": "Pre-Tax Income", "data": [float(r.get('pretax_income') or 0) for r in rows], "format": "currency"},
            {"name": "Income Tax", "data": [float(r.get('income_tax') or 0) for r in rows], "format": "currency"},
            {"name": "Effective Tax Rate", "data": [float(r.get('effective_tax_rate') or 0) for r in rows], "format": "percent"},
        ]
    }
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'growth_trend', 'title': 'Tax Analysis' if language == 'en' else 'تحليل الضرائب', 'data': data},
    ]
    
    return {
        "cards": cards,
        "conversational_text": f"Here's {symbol}'s tax analysis over {len(years)} years.",
        "actions": _build_actions(symbol, language),
    }


# ============================================================================
# SUB-HANDLER: Earnings Quality
# ============================================================================
async def handle_income_earnings_quality(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Compare net income vs FCF to assess earnings quality."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _not_found(symbol, language)
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, net_income, free_cashflow, earnings_continuing_ops,
               minority_interest_earnings, net_income_common
        FROM income_statements WHERE symbol=$1 ORDER BY fiscal_year ASC LIMIT 10
    """, symbol)
    rows = scale_statement_rows(rows, INCOME_COLUMNS)

    if not rows:
        return _no_data(symbol, name, language)

    years = [r['fiscal_year'] for r in rows]
    data = {
        "years": years, "currency": currency,
        "series": [
            {"name": "Net Income", "data": [float(r.get('net_income') or 0) for r in rows], "format": "currency"},
            {"name": "Free Cash Flow", "data": [float(r.get('free_cashflow') or 0) for r in rows], "format": "currency"},
        ]
    }
    
    # Quality score: FCF/NI ratio > 0.8 is good
    latest = rows[-1] if rows else None
    if latest and latest.get('net_income') and latest.get('free_cashflow'):
        ni = float(latest['net_income'])
        fcf = float(latest['free_cashflow'])
        ratio = fcf / ni if ni != 0 else 0
        data["quality_ratio"] = round(ratio, 2)
        data["quality_verdict"] = "High" if ratio > 0.8 else ("Medium" if ratio > 0.4 else "Low")
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'earnings_quality', 'title': 'Earnings Quality' if language == 'en' else 'جودة الأرباح', 'data': data},
    ]
    
    return {
        "cards": cards,
        "conversational_text": f"Here's {symbol}'s earnings quality analysis.",
        "actions": _build_actions(symbol, language),
    }


# ============================================================================
# MAIN DISPATCHER
# ============================================================================
async def handle_income_explore(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """Route to the appropriate income sub-handler based on entity hints."""
    sub_type = entities.get("explore_type", "breakdown")
    
    if sub_type in ("revenue_breakdown", "revenue breakdown", "breakdown"):
        return await handle_income_revenue_breakdown(conn, symbol, language)
    elif sub_type in ("cost_structure", "cost structure", "costs", "opex"):
        return await handle_income_cost_structure(conn, symbol, language)
    elif sub_type in ("ebitda", "ebitda_breakdown", "ebitda breakdown"):
        return await handle_income_ebitda_breakdown(conn, symbol, language)
    elif sub_type in ("tax", "tax_analysis", "tax analysis", "taxes"):
        return await handle_income_tax_analysis(conn, symbol, language)
    elif sub_type in ("quality", "earnings_quality", "earnings quality"):
        return await handle_income_earnings_quality(conn, symbol, language)
    else:
        # Default: revenue breakdown
        return await handle_income_revenue_breakdown(conn, symbol, language)


async def handle_income_trend(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """Route to growth trend for a specific metric."""
    metric = entities.get("metric", "revenue")
    return await handle_income_growth_trend(conn, symbol, metric, language)


# ============================================================================
# HELPERS
# ============================================================================
def _not_found(symbol: str, language: str) -> Dict[str, Any]:
    msg = f"لم أجد السهم {symbol}" if language == 'ar' else f"Stock {symbol} not found."
    return {"cards": [], "conversational_text": msg, "actions": []}

def _no_data(symbol: str, name: str, language: str) -> Dict[str, Any]:
    msg = f"لا توجد بيانات قائمة دخل لـ {symbol}" if language == 'ar' else f"No income statement data available for {symbol}."
    return {"cards": [], "conversational_text": msg, "actions": []}

def _build_actions(symbol: str, language: str) -> List[Dict]:
    if language == 'ar':
        return [
            {"label": "هيكل التكاليف", "label_ar": "هيكل التكاليف", "action_type": "query", "payload": f"هيكل تكاليف {symbol}"},
            {"label": "الميزانية العمومية", "label_ar": "الميزانية", "action_type": "query", "payload": f"أصول وديون {symbol}"},
            {"label": "التدفقات النقدية", "label_ar": "التدفقات النقدية", "action_type": "query", "payload": f"تدفقات {symbol} النقدية"},
        ]
    return [
        {"label": "Cost Structure", "label_ar": "هيكل التكاليف", "action_type": "query", "payload": f"{symbol} cost structure"},
        {"label": "Balance Sheet", "label_ar": "الميزانية", "action_type": "query", "payload": f"{symbol} assets and debt"},
        {"label": "Cash Flow", "label_ar": "التدفقات النقدية", "action_type": "query", "payload": f"{symbol} cash flow breakdown"},
    ]
