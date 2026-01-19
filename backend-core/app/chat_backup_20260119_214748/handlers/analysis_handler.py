
import asyncpg
from typing import Dict, Any, List
from ..schemas import Card, CardType

async def handle_technical_indicators(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Handle technical analysis requests."""
    # Get basic ticker info
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker:
        return {'success': False, 'message': f"Symbol {symbol} not found."}

    # Fetch latest technicals
    row = await conn.fetchrow("""
        SELECT * FROM technical_levels 
        WHERE symbol = $1 
        ORDER BY calc_date DESC LIMIT 1
    """, symbol)

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    
    if not row:
        return {
            'success': True,
            'message': f"No technical data available for {name} ({symbol}) yet.",
            'cards': []
        }

    # Construct Technicals Card
    data = {
        'symbol': symbol,
        'date': str(row['calc_date']),
        'rsi': float(row['rsi_14']) if row['rsi_14'] else None,
        'macd': {
            'line': float(row['macd_line']) if row['macd_line'] else 0,
            'signal': float(row['macd_signal']) if row['macd_signal'] else 0,
            'hist': float(row['macd_histogram']) if row['macd_histogram'] else 0
        },
        'support': [float(row[k]) for k in ['support_1', 'support_2', 'support_3'] if row[k]],
        'resistance': [float(row[k]) for k in ['resistance_1', 'resistance_2', 'resistance_3'] if row[k]],
        'ma': {
            'sma_50': float(row['sma_50']) if row['sma_50'] else None,
            'sma_200': float(row['sma_200']) if row['sma_200'] else None,
        },
        'pivot': float(row['pivot_point']) if row['pivot_point'] else None
    }

    msg_lines = [f"🔍 **{'التحليل الفني لـ' if language == 'ar' else 'Technical Analysis for'} {name}**"]
    
    rsi_str = f"{data['rsi']}" if data['rsi'] else None
    pivot_str = f"{data['pivot']}" if data['pivot'] else None
    
    if rsi_str: msg_lines.append(f"RSI: {rsi_str}")
    if pivot_str: msg_lines.append(f"{'الارتكاز' if language == 'ar' else 'Pivot'}: {pivot_str}")
    
    if len(msg_lines) == 1:
        # No data case
        msg = f"🔍 **{name}**\n\n{'لا توجد بيانات فنية متاحة الآن.' if language == 'ar' else 'No technical indicators available currently.'}"
    else:
        msg = "\n".join(msg_lines)

    return {
        'success': True,
        'message': msg,
        'cards': [
            {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'currency': ticker['currency'], 'market_code': 'EGX'}},
            {'type': 'technicals', 'title': 'Technical Indicators', 'data': data}
        ],
        'actions': [
             {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'}
        ]
    }

async def handle_ownership(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Handle ownership/shareholders requests."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker:
        return {'success': False, 'message': "Symbol not found"}

    rows = await conn.fetch("""
        SELECT shareholder_name, shareholder_name_en, ownership_percent, shares_held, as_of_date
        FROM major_shareholders
        WHERE symbol = $1
        ORDER BY ownership_percent DESC
    """, symbol)

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    
    if not rows:
        return {
            'success': True,
            'message': f"No shareholder data found for {name}.",
            'cards': []
        }

    shareholders = []
    for r in rows:
        s_name = r['shareholder_name'] if language == 'ar' and r['shareholder_name'] else (r['shareholder_name_en'] or r['shareholder_name'])
        shareholders.append({
            'name': s_name,
            'percent': float(r['ownership_percent']) if r['ownership_percent'] is not None else 0.0,
            'shares': float(r['shares_held']) if r['shares_held'] is not None else 0.0,
            'date': str(r['as_of_date'])
        })

    if language == 'ar':
        msg = f"🤝 كبار المساهمين في {name} = {symbol}\nهيكل الملكية"
    else:
        # EXACT REQUESTED FORMAT: "Major Shareholders of CIB = COMI" -> "{name} = {symbol}"
        msg = f"🤝 Major Shareholders of {name} = {symbol}\nOwnership Structure"

    return {
        'success': True,
        'message': msg,
        'cards': [
            {'type': 'ownership', 'title': 'Ownership Structure', 'data': {'shareholders': shareholders}}
        ],
        'actions': [
            {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '💵 Dividends', 'label_ar': '💵 التوزيعات', 'action_type': 'query', 'payload': f'{symbol} dividends'},
            {'label': '⚙️ Technicals', 'label_ar': '⚙️ التحليل الفني', 'action_type': 'query', 'payload': f'{symbol} technicals'},
        ]
    }

async def handle_financial_health(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Handle health/ratio requests."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker: return {'success': False, 'message': "Not found"}

    # Fetch latest Extended Ratios
    row = await conn.fetchrow("""
        SELECT * FROM financial_ratios_history
        WHERE symbol = $1 AND period_type = 'annual'
        ORDER BY fiscal_year DESC LIMIT 1
    """, symbol)
    
    # Fallback to stock_statistics if history is empty
    stats_row = None
    if not row:
        stats_row = await conn.fetchrow("""
            SELECT * FROM stock_statistics WHERE symbol = $1
        """, symbol)

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']

    if not row and not stats_row:
         return {
            'success': True,
            'message': f"No detailed health metrics available for {name}." if language == 'en' else f"لا توجد مقاييس صحة مالية مفصلة لـ {name}.",
            'cards': []
        }

    data = {}
    if row:
        r_stats = dict(row)
        data = {
            'debt_equity': float(r_stats['debt_equity']) if r_stats.get('debt_equity') is not None else None,
            'current_ratio': float(r_stats['current_ratio']) if r_stats.get('current_ratio') is not None else None,
            'interest_cov': float(r_stats['interest_coverage']) if r_stats.get('interest_coverage') is not None else None,
            'roe': float(r_stats['roe']) if r_stats.get('roe') is not None else None,
            'roa': float(r_stats['roa']) if r_stats.get('roa') is not None else None,
            'net_margin': float(r_stats['net_margin']) if r_stats.get('net_margin') is not None else None,
        }
    elif stats_row:
        s_stats = dict(stats_row)
        # Map stock_statistics columns to health data
        data = {
            'debt_equity': float(s_stats['debt_equity']) if s_stats.get('debt_equity') is not None else None,
            'current_ratio': float(s_stats['current_ratio']) if s_stats.get('current_ratio') is not None else None,
            'interest_cov': float(s_stats['interest_coverage']) if s_stats.get('interest_coverage') is not None else None,
            'roe': float(s_stats['roe']) if s_stats.get('roe') is not None else None,
            'roa': float(s_stats['roa']) if s_stats.get('roa') is not None else None,
            'net_margin': float(s_stats['profit_margin']) if s_stats.get('profit_margin') is not None else None,
        }

    msg = f"🏥 **Financial Health Report: {name}**" if language == 'en' else f"🏥 **تقرير الصحة المالية: {name}**"

    return {
        'success': True,
        'message': msg,
        'cards': [
             {'type': 'ratios', 'title': 'Key Health Metrics', 'data': data}
        ],
        'actions': [
            {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
            {'label': '💵 Dividends', 'label_ar': '💵 التوزيعات', 'action_type': 'query', 'payload': f'{symbol} dividends'},
        ]
    }

async def handle_fair_value(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Handle fair value / valuation requests."""
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency, last_price FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker: return {'success': False, 'message': "Not found"}
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']

    rows = await conn.fetch("""
        SELECT valuation_model, fair_value, upside_percent
        FROM fair_values
        WHERE symbol = $1
        ORDER BY valuation_date DESC
    """, symbol)

    if not rows:
         return {
            'success': True,
            'message': f"No fair value models available for {name}.",
            'cards': []
        }
    
    models = []
    for r in rows:
        models.append({
            'model': r['valuation_model'],
            'value': float(r['fair_value']) if r['fair_value'] is not None else 0.0,
            'upside': float(r['upside_percent']) if r['upside_percent'] is not None else 0.0
        })
    
    # Also fetch standard valuation ratios
    ratios = await conn.fetchrow("""
        SELECT pe_ratio, pb_ratio, ev_ebitda 
        FROM financial_ratios_history 
        WHERE symbol=$1 ORDER BY fiscal_year DESC LIMIT 1
    """, symbol)

    val_data = {
        'current_price': float(ticker['last_price']) if ticker['last_price'] else 0,
        'currency': ticker['currency'],
        'models': models,
        'pe': float(ratios['pe_ratio']) if ratios and ratios['pe_ratio'] else None,
        'pb': float(ratios['pb_ratio']) if ratios and ratios['pb_ratio'] else None
    }

    msg = f"💎 **Valuation Analysis: {name}**" if language == 'en' else f"💎 **تحليل التقييم: {name}**"

    return {
        'success': True,
        'message': msg,
        'cards': [
            {'type': 'fair_value', 'title': 'Fair Value & Valuation', 'data': val_data}
        ],
        'actions': [
            {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '⚙️ Technicals', 'label_ar': '⚙️ التحليل الفني', 'action_type': 'query', 'payload': f'{symbol} technicals'},
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
        ]
    }
