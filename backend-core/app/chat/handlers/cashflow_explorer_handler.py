"""
Cash Flow Statement Explorer Handler.
Handles CASHFLOW_EXPLORE and CASHFLOW_TREND intents.
Provides detailed cashflow analysis with multi-year trends.
"""
from app.chat.currency_utils import get_ticker_currency, is_egx_market
import logging
from typing import Dict, Any, List
from .column_registry import CASHFLOW_COLUMNS, format_value, scale_statement_rows

logger = logging.getLogger(__name__)


async def handle_cashflow_waterfall(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show cash flow waterfall: operating → investing → financing → net."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker: return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, cash_from_operating, cash_from_investing, cash_from_financing,
               fx_effect, net_change_cash, beginning_cash, ending_cash
        FROM cashflow_statements WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    rows = scale_statement_rows(rows, CASHFLOW_COLUMNS)
    if not rows: return _nd(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    data = {"years": years, "currency": currency, "waterfall": []}
    for r in rows:
        data["waterfall"].append({
            "year": r['fiscal_year'],
            "operating": float(r.get('cash_from_operating') or 0),
            "investing": float(r.get('cash_from_investing') or 0),
            "financing": float(r.get('cash_from_financing') or 0),
            "fx": float(r.get('fx_effect') or 0),
            "net": float(r.get('net_change_cash') or 0),
            "beginning": float(r.get('beginning_cash') or 0),
            "ending": float(r.get('ending_cash') or 0),
        })
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'cashflow_waterfall', 'title': 'Cash Flow Waterfall' if language == 'en' else 'شلال التدفقات النقدية', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s cash flow waterfall.", "actions": _act(symbol, language)}


async def handle_cashflow_capex_trend(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show capital expenditure trend."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol)
    if not ticker: return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, capex, cash_from_operating, free_cashflow, sale_of_ppe
        FROM cashflow_statements WHERE symbol=$1 ORDER BY fiscal_year ASC LIMIT 10
    """, symbol)
    rows = scale_statement_rows(rows, CASHFLOW_COLUMNS)
    if not rows: return _nd(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    data = {"years": years, "currency": currency, "series": [
        {"name": "CapEx", "data": [float(r.get('capex') or 0) for r in rows], "format": "currency"},
        {"name": "Operating CF", "data": [float(r.get('cash_from_operating') or 0) for r in rows], "format": "currency"},
        {"name": "Free Cash Flow", "data": [float(r.get('free_cashflow') or 0) for r in rows], "format": "currency"},
    ]}
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'growth_trend', 'title': 'CapEx & FCF Trend' if language == 'en' else 'اتجاه الإنفاق الرأسمالي', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s CapEx and FCF trend.", "actions": _act(symbol, language)}


async def handle_cashflow_debt_activity(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show debt issuance vs repayment."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol)
    if not ticker: return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, total_debt_issued, total_debt_repaid, net_debt_issued,
               dividends_paid, share_repurchases, share_issuances, cash_from_financing
        FROM cashflow_statements WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    rows = scale_statement_rows(rows, CASHFLOW_COLUMNS)
    if not rows: return _nd(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    data = {"years": years, "currency": currency, "components": []}
    for col, label in [("total_debt_issued","Debt Issued"),("total_debt_repaid","Debt Repaid"),
                       ("net_debt_issued","Net Debt Activity"),("dividends_paid","Dividends Paid"),
                       ("share_repurchases","Share Buybacks"),("share_issuances","Share Issuances")]:
        if any(r.get(col) is not None for r in rows):
            data["components"].append({
                "label": label,
                "values": [format_value(r.get(col), "currency", currency) for r in rows],
                "raw": [float(r.get(col) or 0) for r in rows]
            })
    data["total_financing"] = [format_value(r.get('cash_from_financing'), "currency", currency) for r in rows]
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'debt_activity', 'title': 'Financing Activity' if language == 'en' else 'نشاط التمويل', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s financing activity.", "actions": _act(symbol, language)}


async def handle_cashflow_fcf_analysis(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show FCF vs Net Income comparison + FCF quality metrics."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol)
    if not ticker: return _nf(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)
    
    rows = await conn.fetch("""
        SELECT fiscal_year, net_income, cash_from_operating, free_cashflow,
               fcf_growth, fcf_margin, fcf_per_share, levered_fcf, unlevered_fcf
        FROM cashflow_statements WHERE symbol=$1 ORDER BY fiscal_year ASC LIMIT 10
    """, symbol)
    rows = scale_statement_rows(rows, CASHFLOW_COLUMNS)
    if not rows: return _nd(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    data = {"years": years, "currency": currency, "series": [
        {"name": "Net Income", "data": [float(r.get('net_income') or 0) for r in rows], "format": "currency"},
        {"name": "Operating CF", "data": [float(r.get('cash_from_operating') or 0) for r in rows], "format": "currency"},
        {"name": "Free Cash Flow", "data": [float(r.get('free_cashflow') or 0) for r in rows], "format": "currency"},
    ]}
    
    latest = rows[-1]
    if latest.get('net_income') and latest.get('free_cashflow'):
        ni = float(latest['net_income'])
        fcf = float(latest['free_cashflow'])
        data["fcf_to_ni_ratio"] = round(fcf / ni, 2) if ni != 0 else 0
    data["fcf_per_share"] = format_value(latest.get('fcf_per_share'), "per_share", currency)
    data["fcf_margin"] = format_value(latest.get('fcf_margin'), "percent", currency)
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'fcf_vs_income', 'title': 'FCF vs Net Income' if language == 'en' else 'مقارنة التدفق النقدي الحر بالأرباح', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s FCF vs Net Income analysis.", "actions": _act(symbol, language)}


# ============================================================================
# DISPATCHERS
# ============================================================================
async def handle_cashflow_explore(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    sub = entities.get("explore_type", "waterfall")
    if sub in ("waterfall", "breakdown", "sources"):
        return await handle_cashflow_waterfall(conn, symbol, language)
    elif sub in ("capex", "capital expenditure", "investing"):
        return await handle_cashflow_capex_trend(conn, symbol, language)
    elif sub in ("debt", "debt_activity", "financing", "buyback", "buybacks"):
        return await handle_cashflow_debt_activity(conn, symbol, language)
    elif sub in ("fcf", "free cash flow", "fcf analysis", "fcf_vs_income"):
        return await handle_cashflow_fcf_analysis(conn, symbol, language)
    else:
        return await handle_cashflow_waterfall(conn, symbol, language)

async def handle_cashflow_trend(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    return await handle_cashflow_capex_trend(conn, symbol, language)


# ============================================================================
# HELPERS
# ============================================================================
def _nf(s, l): return {"cards": [], "conversational_text": f"Stock {s} not found.", "actions": []}
def _nd(s, n, l): return {"cards": [], "conversational_text": f"No cash flow data for {s}.", "actions": []}
def _act(symbol, language):
    if language == 'ar':
        return [
            {"label": "إنفاق رأسمالي", "label_ar": "إنفاق رأسمالي", "action_type": "query", "payload": f"إنفاق {symbol} الرأسمالي"},
            {"label": "نشاط التمويل", "label_ar": "نشاط التمويل", "action_type": "query", "payload": f"نشاط تمويل {symbol}"},
            {"label": "قائمة الدخل", "label_ar": "قائمة الدخل", "action_type": "query", "payload": f"إيرادات {symbol}"},
        ]
    return [
        {"label": "CapEx Trend", "label_ar": "إنفاق رأسمالي", "action_type": "query", "payload": f"{symbol} capex trend"},
        {"label": "Financing Activity", "label_ar": "نشاط التمويل", "action_type": "query", "payload": f"{symbol} debt activity"},
        {"label": "Income Statement", "label_ar": "قائمة الدخل", "action_type": "query", "payload": f"{symbol} revenue breakdown"},
    ]
