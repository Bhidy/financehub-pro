"""
Balance Sheet Explorer Handler.
Handles BALANCE_EXPLORE and BALANCE_TREND intents.
Provides detailed balance sheet data with multi-year trends.
"""
import logging
from typing import Dict, Any, List
from .column_registry import BALANCE_COLUMNS, format_value

logger = logging.getLogger(__name__)


async def handle_balance_debt_structure(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show debt composition: short-term vs long-term."""
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol
    )
    if not ticker:
        return _not_found(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    rows = await conn.fetch("""
        SELECT fiscal_year, short_term_debt, current_portion_ltd, long_term_debt,
               total_debt, net_cash, net_cash_per_share, total_equity
        FROM balance_sheets WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    if not rows:
        return _no_data(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    data = {"years": years, "currency": currency, "components": []}
    for col, label in [("short_term_debt","Short-Term Debt"),("current_portion_ltd","Current Portion LTD"),
                       ("long_term_debt","Long-Term Debt"),("total_debt","Total Debt"),("net_cash","Net Cash/Debt")]:
        if any(r.get(col) is not None for r in rows):
            data["components"].append({"label": label, "values": [format_value(r.get(col), "currency", currency) for r in rows],
                                       "raw": [float(r.get(col) or 0) for r in rows]})
    if rows[0].get('total_debt') and rows[0].get('total_equity'):
        de = float(rows[0]['total_debt']) / float(rows[0]['total_equity']) if float(rows[0]['total_equity']) != 0 else 0
        data["debt_to_equity"] = round(de, 2)
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'debt_structure', 'title': 'Debt Structure' if language == 'en' else 'هيكل الديون', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s debt structure.", "actions": _actions(symbol, language)}


async def handle_balance_assets_breakdown(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show asset composition: current vs non-current."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol)
    if not ticker: return _not_found(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    rows = await conn.fetch("""
        SELECT fiscal_year, cash_equivalents, accounts_receivable, inventory,
               total_current_assets, property_plant_equipment, goodwill,
               long_term_investments, total_assets
        FROM balance_sheets WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    if not rows: return _no_data(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    latest = rows[0]
    # Build pie chart data from latest year
    pie_items = []
    for col, label in [("cash_equivalents","Cash"),("accounts_receivable","Receivables"),("inventory","Inventory"),
                       ("property_plant_equipment","PP&E"),("goodwill","Goodwill"),("long_term_investments","LT Investments")]:
        val = latest.get(col)
        if val is not None and float(val) > 0:
            pie_items.append({"label": label, "value": float(val), "formatted": format_value(val, "currency", currency)})
    
    total = float(latest.get('total_assets') or 1)
    for item in pie_items:
        item["percent"] = round(item["value"] / total * 100, 1)
    
    data = {"years": years, "currency": currency, "composition": pie_items,
            "total_assets": format_value(latest.get('total_assets'), "currency", currency),
            "current_assets": format_value(latest.get('total_current_assets'), "currency", currency)}
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'assets_breakdown', 'title': 'Assets Breakdown' if language == 'en' else 'تحليل الأصول', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s asset composition.", "actions": _actions(symbol, language)}


async def handle_balance_working_capital(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show working capital: current assets vs current liabilities."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol)
    if not ticker: return _not_found(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    rows = await conn.fetch("""
        SELECT fiscal_year, total_current_assets, total_current_liabilities, working_capital,
               cash_equivalents, accounts_receivable, inventory, accounts_payable, short_term_debt
        FROM balance_sheets WHERE symbol=$1 ORDER BY fiscal_year ASC LIMIT 10
    """, symbol)
    if not rows: return _no_data(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    data = {"years": years, "currency": currency,
            "series": [
                {"name": "Current Assets", "data": [float(r.get('total_current_assets') or 0) for r in rows], "format": "currency"},
                {"name": "Current Liabilities", "data": [float(r.get('total_current_liabilities') or 0) for r in rows], "format": "currency"},
                {"name": "Working Capital", "data": [float(r.get('working_capital') or 0) for r in rows], "format": "currency"},
            ]}
    
    latest = rows[-1]
    if latest.get('total_current_assets') and latest.get('total_current_liabilities'):
        ca = float(latest['total_current_assets'])
        cl = float(latest['total_current_liabilities'])
        data["current_ratio"] = round(ca / cl, 2) if cl != 0 else 0
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'working_capital_card', 'title': 'Working Capital' if language == 'en' else 'رأس المال العامل', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s working capital analysis.", "actions": _actions(symbol, language)}


async def handle_balance_equity_breakdown(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show equity composition."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol)
    if not ticker: return _not_found(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    rows = await conn.fetch("""
        SELECT fiscal_year, common_stock, retained_earnings, treasury_stock,
               accumulated_other_comprehensive_income, minority_interest, total_equity,
               total_common_equity, book_value_per_share, tangible_bv_per_share
        FROM balance_sheets WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    if not rows: return _no_data(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    data = {"years": years, "currency": currency, "components": []}
    for col, label in [("common_stock","Common Stock"),("retained_earnings","Retained Earnings"),
                       ("treasury_stock","Treasury Stock"),("accumulated_other_comprehensive_income","Accumulated OCI"),
                       ("minority_interest","Minority Interest")]:
        if any(r.get(col) is not None for r in rows):
            data["components"].append({"label": label, "values": [format_value(r.get(col), "currency", currency) for r in rows],
                                       "raw": [float(r.get(col) or 0) for r in rows]})
    data["total_equity"] = [format_value(r.get('total_equity'), "currency", currency) for r in rows]
    data["bvps"] = [format_value(r.get('book_value_per_share'), "per_share", currency) for r in rows]
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'equity_breakdown', 'title': 'Equity Breakdown' if language == 'en' else 'تحليل حقوق الملكية', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s equity structure.", "actions": _actions(symbol, language)}


async def handle_balance_ppe_breakdown(conn, symbol: str, language: str = "en") -> Dict[str, Any]:
    """Show PP&E component breakdown: land, buildings, machinery, etc."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", symbol)
    if not ticker: return _not_found(symbol, language)
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    
    rows = await conn.fetch("""
        SELECT fiscal_year, property_plant_equipment, ppe_land, ppe_buildings,
               ppe_machinery, ppe_construction, ppe_leasehold
        FROM balance_sheets WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 5
    """, symbol)
    if not rows: return _no_data(symbol, name, language)
    
    years = [r['fiscal_year'] for r in rows]
    latest = rows[0]
    components = []
    for col, label in [("ppe_land","Land"),("ppe_buildings","Buildings"),("ppe_machinery","Machinery & Equipment"),
                       ("ppe_construction","Under Construction"),("ppe_leasehold","Leasehold")]:
        val = latest.get(col)
        if val is not None and float(val) > 0:
            components.append({"label": label, "value": float(val), "formatted": format_value(val, "currency", currency)})
    
    total_ppe = float(latest.get('property_plant_equipment') or 1)
    for c in components:
        c["percent"] = round(c["value"] / total_ppe * 100, 1) if total_ppe > 0 else 0
    
    data = {"years": years, "currency": currency, "components": components,
            "total_ppe": format_value(latest.get('property_plant_equipment'), "currency", currency)}
    
    cards = [
        {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'market_code': 'EGX', 'currency': currency}},
        {'type': 'ppe_breakdown', 'title': 'PP&E Breakdown' if language == 'en' else 'تحليل الأصول الثابتة', 'data': data},
    ]
    return {"cards": cards, "conversational_text": f"Here's {symbol}'s PP&E breakdown.", "actions": _actions(symbol, language)}


# ============================================================================
# MAIN DISPATCHERS
# ============================================================================
async def handle_balance_explore(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    sub = entities.get("explore_type", "assets")
    if sub in ("debt", "debt_structure", "debt structure", "loans"):
        return await handle_balance_debt_structure(conn, symbol, language)
    elif sub in ("equity", "equity_breakdown", "equity breakdown", "shareholders"):
        return await handle_balance_equity_breakdown(conn, symbol, language)
    elif sub in ("working_capital", "working capital", "liquidity"):
        return await handle_balance_working_capital(conn, symbol, language)
    elif sub in ("ppe", "ppe_breakdown", "fixed assets", "property"):
        return await handle_balance_ppe_breakdown(conn, symbol, language)
    else:
        return await handle_balance_assets_breakdown(conn, symbol, language)

async def handle_balance_trend(conn, symbol: str, entities: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """Show balance sheet trend for any category."""
    # Default to working capital trend
    return await handle_balance_working_capital(conn, symbol, language)


# ============================================================================
# HELPERS
# ============================================================================
def _not_found(s, l):
    return {"cards": [], "conversational_text": f"Stock {s} not found.", "actions": []}
def _no_data(s, n, l):
    return {"cards": [], "conversational_text": f"No balance sheet data for {s}.", "actions": []}
def _actions(symbol, language):
    if language == 'ar':
        return [
            {"label": "هيكل الديون", "label_ar": "هيكل الديون", "action_type": "query", "payload": f"ديون {symbol}"},
            {"label": "حقوق الملكية", "label_ar": "حقوق الملكية", "action_type": "query", "payload": f"حقوق ملكية {symbol}"},
            {"label": "التدفقات النقدية", "label_ar": "التدفقات النقدية", "action_type": "query", "payload": f"تدفقات {symbol} النقدية"},
        ]
    return [
        {"label": "Debt Structure", "label_ar": "هيكل الديون", "action_type": "query", "payload": f"{symbol} debt structure"},
        {"label": "Equity Breakdown", "label_ar": "حقوق الملكية", "action_type": "query", "payload": f"{symbol} equity breakdown"},
        {"label": "Cash Flow", "label_ar": "التدفقات النقدية", "action_type": "query", "payload": f"{symbol} cash flow breakdown"},
    ]
