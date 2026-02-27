
import asyncpg
from typing import Dict, Any, List
from ..schemas import Card, CardType

async def handle_technical_indicators(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Handle technical analysis requests."""
    # Get basic ticker info
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker:
        return {'success': False, 'message': f"Symbol {symbol} not found."}

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    
    if language == 'ar':
        msg = f"🔍 **التحليل الفني لـ {name}**\n\nنعتذر، هذه المنصة مخصصة للتحليل المالي والأساسي فقط. التحليل الفني غير مدعوم في الوقت الحالي."
    else:
        msg = f"🔍 **Technical Analysis for {name}**\n\nPlease note that this is a financial and fundamental analysis platform. Technical Analysis is not supported at this stage."

    return {
        'success': True,
        'message': msg,
        'cards': [
            {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'currency': ticker['currency'], 'market_code': 'EGX'}},
        ],
        'actions': [
             {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
             {'label': '💎 Fair Value', 'label_ar': '💎 القيمة العادلة', 'action_type': 'query', 'payload': f'value {symbol}'}
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
            'message': f"No shareholder data found for {name} ({symbol}).",
            'cards': [
                {
                    'type': 'stock_header',
                    'data': {
                        'symbol': symbol,
                        'name': name,
                        'currency': ticker.get('currency') or 'EGP',
                        'market_code': 'EGX'
                    }
                },
                {
                    'type': 'ownership',
                    'title': 'Ownership Structure',
                    'data': {
                        'symbol': symbol,
                        'company_name': name,
                        'shareholders': []
                    }
                }
            ]
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
            {
                'type': 'ownership',
                'title': 'Ownership Structure',
                'data': {
                    'symbol': symbol,
                    'company_name': name,
                    'shareholders': shareholders
                }
            }
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

    # PRIMARY: stock_statistics (TTM) -- always current, never stale annual
    stats_row = await conn.fetchrow("""
        SELECT debt_equity, current_ratio, interest_coverage, roe, roa, profit_margin,
               altman_z_score, piotroski_f_score, quick_ratio
        FROM stock_statistics WHERE symbol = $1
    """, symbol)
    
    # FALLBACK: financial_ratios_history (only if stock_statistics is missing)
    row = None
    if not stats_row:
        row = await conn.fetchrow("""
            SELECT * FROM financial_ratios_history
            WHERE symbol = $1 AND period_type = 'annual'
            ORDER BY fiscal_year DESC LIMIT 1
        """, symbol)

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']

    if not stats_row and not row:
         return {
            'success': True,
            'message': f"No detailed health metrics available for {name}." if language == 'en' else f"لا توجد مقاييس صحة مالية مفصلة لـ {name}.",
            'cards': []
        }

    data = {}
    if stats_row:
        s = dict(stats_row)
        data = {
            'debt_equity': float(s['debt_equity']) if s.get('debt_equity') is not None else None,
            'current_ratio': float(s['current_ratio']) if s.get('current_ratio') is not None else None,
            'interest_cov': float(s['interest_coverage']) if s.get('interest_coverage') is not None else None,
            'roe': float(s['roe'] * 100) if s.get('roe') is not None else None,
            'roa': float(s['roa'] * 100) if s.get('roa') is not None else None,
            'net_margin': float(s['profit_margin'] * 100) if s.get('profit_margin') is not None else None,
            'altman_z_score': float(s['altman_z_score']) if s.get('altman_z_score') is not None else None,
            'piotroski_f_score': float(s['piotroski_f_score']) if s.get('piotroski_f_score') is not None else None,
        }
    elif row:
        r = dict(row)
        data = {
            'debt_equity': float(r['debt_equity']) if r.get('debt_equity') is not None else None,
            'current_ratio': float(r['current_ratio']) if r.get('current_ratio') is not None else None,
            'interest_cov': float(r['interest_coverage']) if r.get('interest_coverage') is not None else None,
            'roe': float(r['roe']) if r.get('roe') is not None else None,
            'roa': float(r['roa']) if r.get('roa') is not None else None,
            'net_margin': float(r['net_margin']) if r.get('net_margin') is not None else None,
        }

    msg = f"🏥 **Financial Health Report: {name}** (TTM)" if language == 'en' else f"🏥 **تقرير الصحة المالية: {name}** (أحدث اثني عشر شهراً)"

    return {
        'success': True,
        'message': msg,
        'cards': [
             {'type': 'ratios', 'title': 'Key Health Metrics (TTM)', 'data': data}
        ],
        'actions': [
            {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
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
    
    # Also fetch standard valuation ratios from live sources (TTM)
    ratios = await conn.fetchrow("""
        SELECT mt.pe_ratio, COALESCE(mt.pb_ratio, ss.pb_ratio) as pb_ratio,
               ss.ev_ebitda
        FROM market_tickers mt
        LEFT JOIN stock_statistics ss ON mt.symbol = ss.symbol AND mt.market_code = ss.market_code
        WHERE mt.symbol = $1
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
        ]
    }

async def handle_company_profile(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Handle company profile/info requests."""
    # 1. Fetch from market_tickers (Basic Info)
    ticker = await conn.fetchrow("SELECT name_en, name_ar, sector_name, industry, currency, market_cap, last_price FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker: return {'success': False, 'message': "Not found"}

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    sector = ticker['sector_name'] if ticker['sector_name'] else "N/A"
    
    # 2. Try to fetch from company_profiles for richer data (if it exists)
    # We use a safe try/except block to avoid crashing if table doesn't exist yet
    profile_data = {}
    try:
        profile_row = await conn.fetchrow("""
            SELECT description, website, headquarters, founded_year, ceo, chairman
            FROM company_profiles WHERE symbol = $1
        """, symbol)
        if profile_row:
            profile_data = dict(profile_row)
    except Exception:
        # Table might not exist or schema diff
        pass

    # Construct Profile Data
    data = {
        'symbol': symbol,
        'name': name,
        'sector': sector,
        'industry': ticker['industry'] or "General",
        'market_cap': int(ticker['market_cap']) if ticker['market_cap'] else 0,
        'price': float(ticker['last_price']) if ticker['last_price'] else 0,
        'currency': ticker['currency'],
        'isin': None,
        'description': profile_data.get('description'),
        'website': profile_data.get('website'),
        'headquarters': profile_data.get('headquarters'),
        'founded': profile_data.get('founded_year'),
        'ceo': profile_data.get('ceo'),
        'chairman': profile_data.get('chairman')
    }

    # Message Construction
    if language == 'ar':
        top = f"🏢 **ملف الشركة: {name} ({symbol})**"
        lines = [
            f"**القطاع:** {sector}",
            f"**الصناعة:** {ticker['industry'] or '-'}",
            f"**القيمة السوقية:** {(int(ticker['market_cap'])/1000000):.1f} مليون {ticker['currency']}" if ticker['market_cap'] else ""
        ]
        if data.get('ceo'): lines.append(f"**الرئيس التنفيذي:** {data['ceo']}")
        if data.get('description'): lines.append(f"\n{data['description']}")
    else:
        top = f"🏢 **Company Profile: {name} ({symbol})**"
        lines = [
            f"**Sector:** {sector}",
            f"**Industry:** {ticker['industry'] or '-'}",
            f"**Market Cap:** {(int(ticker['market_cap'])/1000000):.1f}M {ticker['currency']}" if ticker['market_cap'] else ""
        ]
        if data.get('ceo'): lines.append(f"**CEO:** {data['ceo']}")
        if data.get('description'): lines.append(f"\n{data['description']}")
    
    msg = top + "\n" + "\n".join([l for l in lines if l])

    return {
        'success': True,
        'message': msg,
        'cards': [
            {'type': 'company_profile', 'title': 'Company Info', 'data': data}
        ],
        'actions': [
             {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
        ]
    }
