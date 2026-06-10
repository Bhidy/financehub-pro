
from app.chat.currency_utils import get_ticker_currency, is_egx_market
import asyncpg
from typing import Dict, Any, List
from ..schemas import Card, CardType

def _tv_rating_label(score, language: str = 'en') -> str:
    """Map TradingView recommend_all score (-1..1) to a label, mirroring the
    website's /api/v1/egx/technicals route."""
    if score is None:
        return 'Neutral' if language == 'en' else 'محايد'
    try:
        s = float(score)
    except Exception:
        return 'Neutral' if language == 'en' else 'محايد'
    if s >= 0.5:
        return 'Strong Buy' if language == 'en' else 'شراء قوي'
    if s >= 0.1:
        return 'Buy' if language == 'en' else 'شراء'
    if s <= -0.5:
        return 'Strong Sell' if language == 'en' else 'بيع قوي'
    if s <= -0.1:
        return 'Sell' if language == 'en' else 'بيع'
    return 'Neutral' if language == 'en' else 'محايد'


def _rsi_zone(rsi, language: str = 'en') -> str:
    if rsi is None:
        return ''
    try:
        r = float(rsi)
    except Exception:
        return ''
    if r >= 70:
        return 'Overbought' if language == 'en' else 'تشبع شرائي'
    if r <= 30:
        return 'Oversold' if language == 'en' else 'تشبع بيعي'
    return 'Neutral' if language == 'en' else 'محايد'


def _adx_zone(adx, language: str = 'en') -> str:
    if adx is None:
        return ''
    try:
        a = float(adx)
    except Exception:
        return ''
    if a >= 25:
        return 'Strong trend' if language == 'en' else 'اتجاه قوي'
    if a >= 20:
        return 'Developing trend' if language == 'en' else 'اتجاه ناشئ'
    return 'Weak / ranging' if language == 'en' else 'ضعيف / عرضي'


async def handle_technical_indicators(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Handle technical-indicators requests.

    Sources the SAME fresh TradingView technicals the website stock pages use
    (egx_technicals via /api/v1/egx/technicals): RSI, MACD, ADX, moving averages
    and TradingView's own composite signal, across timeframes. Factual readings
    only — no personalized entry/exit advice.
    """
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency, last_price, market_code FROM market_tickers WHERE symbol = $1",
        symbol,
    )
    if not ticker:
        return {'success': False, 'message': f"Symbol {symbol} not found."}

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = ticker['currency'] or 'EGP'
    price = float(ticker['last_price']) if ticker['last_price'] is not None else None
    header_card = {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'currency': currency, 'market_code': ticker['market_code'] or 'EGX'}}

    rows = await conn.fetch(
        """
        SELECT timeframe, rsi, macd_macd, macd_signal, stoch_k, stoch_d, cci20, adx, mom,
               recommend_all, recommend_ma, recommend_other, ema50, ema200, sma50, sma200, updated_at
        FROM egx_technicals WHERE UPPER(symbol) = $1
        """,
        symbol.upper(),
    )

    if not rows:
        msg = (f"📊 Technical indicators aren't available for {name} ({symbol}) right now."
               if language == 'en'
               else f"📊 المؤشرات الفنية غير متاحة لـ {name} ({symbol}) حالياً.")
        return {'success': True, 'message': msg, 'cards': [header_card], 'actions': []}

    def _f(v):
        try:
            return float(v) if v is not None else None
        except Exception:
            return None

    by_tf = {r['timeframe']: r for r in rows}
    d = by_tf.get('1D') or rows[0]

    rsi = _f(d['rsi'])
    macd_line = _f(d['macd_macd'])
    macd_sig = _f(d['macd_signal'])
    macd_hist = (macd_line - macd_sig) if (macd_line is not None and macd_sig is not None) else None
    adx = _f(d['adx'])
    sma50 = _f(d['sma50'])
    sma200 = _f(d['sma200'])
    rating_score = _f(d['recommend_all'])
    rating = _tv_rating_label(rating_score, language)
    weekly = by_tf.get('1W')
    weekly_rating = _tv_rating_label(_f(weekly['recommend_all']), language) if weekly else None

    # Factual MA structure context (no advice)
    ma_struct = None
    if sma50 is not None and sma200 is not None:
        if sma50 > sma200:
            ma_struct = ('50-DMA above 200-DMA (bullish MA structure)' if language == 'en'
                         else 'المتوسط 50 أعلى من المتوسط 200 (هيكل صاعد)')
        else:
            ma_struct = ('50-DMA below 200-DMA (bearish MA structure)' if language == 'en'
                         else 'المتوسط 50 أدنى من المتوسط 200 (هيكل هابط)')

    # ── Build message (factual readings) ──
    if language == 'ar':
        lines = [f"📊 **المؤشرات الفنية لـ {name}** ({symbol}) — يومي"]
        lines.append(f"• إشارة TradingView: **{rating}**" + (f" (أسبوعي: {weekly_rating})" if weekly_rating else ""))
        if rsi is not None: lines.append(f"• مؤشر RSI(14): {rsi:.2f} ({_rsi_zone(rsi, language)})")
        if macd_line is not None: lines.append(f"• MACD: {macd_line:.3f} (إشارة {macd_sig:.3f})" if macd_sig is not None else f"• MACD: {macd_line:.3f}")
        if adx is not None: lines.append(f"• ADX: {adx:.2f} ({_adx_zone(adx, language)})")
        if sma50 is not None or sma200 is not None:
            lines.append(f"• المتوسطات: 50ي {sma50:.2f} / 200ي {sma200:.2f}" if (sma50 is not None and sma200 is not None) else f"• المتوسط: {sma50 or sma200:.2f}")
        if ma_struct: lines.append(f"• {ma_struct}")
        lines.append("\n_قراءات فنية موضوعية من TradingView — ليست توصية شراء/بيع._")
    else:
        lines = [f"📊 **Technical Indicators for {name}** ({symbol}) — Daily"]
        lines.append(f"• TradingView Signal: **{rating}**" + (f" (Weekly: {weekly_rating})" if weekly_rating else ""))
        if rsi is not None: lines.append(f"• RSI (14): {rsi:.2f} ({_rsi_zone(rsi, language)})")
        if macd_line is not None: lines.append(f"• MACD: {macd_line:.3f} (signal {macd_sig:.3f})" if macd_sig is not None else f"• MACD: {macd_line:.3f}")
        if adx is not None: lines.append(f"• ADX: {adx:.2f} ({_adx_zone(adx, language)})")
        if sma50 is not None and sma200 is not None:
            lines.append(f"• Moving Avgs: 50-DMA {sma50:.2f} / 200-DMA {sma200:.2f}")
        if ma_struct: lines.append(f"• {ma_struct}")
        lines.append("\n_Objective technical readings from TradingView — not a buy/sell recommendation._")
    message = "\n".join(lines)

    # Flat metrics for the mobile metric-grid renderer (nested objects are skipped there)
    tech_metrics: Dict[str, Any] = {}
    if rsi is not None: tech_metrics['rsi_14'] = round(rsi, 2)
    if macd_line is not None: tech_metrics['macd'] = round(macd_line, 4)
    if macd_sig is not None: tech_metrics['macd_signal'] = round(macd_sig, 4)
    if adx is not None: tech_metrics['adx'] = round(adx, 2)
    if sma50 is not None: tech_metrics['sma_50'] = round(sma50, 2)
    if sma200 is not None: tech_metrics['sma_200'] = round(sma200, 2)
    tech_metrics['tv_rating'] = rating

    timeframes = []
    for tf in ['60', '240', '1D', '1W']:
        if tf in by_tf:
            timeframes.append({
                'timeframe': tf,
                'rating': _tv_rating_label(_f(by_tf[tf]['recommend_all']), language),
                'rsi': _f(by_tf[tf]['rsi']),
            })

    technicals_card = {
        'type': 'technicals',
        'title': 'Technical Indicators' if language == 'en' else 'المؤشرات الفنية',
        'data': {
            'symbol': symbol,
            'rsi': rsi,
            'macd': {'line': macd_line, 'signal': macd_sig, 'hist': macd_hist},
            'pivot': None,
            'ma': {'sma_50': sma50, 'sma_200': sma200},
            'adx': adx,
            'price': price,
            'rating': rating,
            'rating_score': rating_score,
            'weekly_rating': weekly_rating,
            'support': [],
            'resistance': [],
            'timeframes': timeframes,
            'metrics': tech_metrics,
            'source': 'tradingview',
            'updated_at': d['updated_at'].isoformat() if d['updated_at'] else None,
        },
    }

    return {
        'success': True,
        'message': message,
        'cards': [header_card, technicals_card],
        'actions': [
            {'label': '📈 Chart', 'label_ar': '📈 الشارت', 'action_type': 'query', 'payload': f'Chart {symbol} 6M'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '💎 Fair Value', 'label_ar': '💎 القيمة العادلة', 'action_type': 'query', 'payload': f'value {symbol}'},
        ],
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
                        'currency': get_ticker_currency(ticker),
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

    # Show "{name} = {symbol}" only when the name actually differs from the ticker
    # (e.g. "CIB = COMI"); otherwise the placeholder name_en (= symbol) produces an
    # ugly "COMI = COMI". When equal, show the symbol alone.
    name_differs = str(name).strip().upper() != str(symbol).strip().upper()
    if language == 'ar':
        label = f"{name} ({symbol})" if name_differs else symbol
        msg = f"🤝 كبار المساهمين في {label}\nهيكل الملكية"
    else:
        label = f"{name} ({symbol})" if name_differs else symbol
        msg = f"🤝 Major Shareholders of {label}\nOwnership Structure"

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
            {'label': '📊 Revenue Growth', 'label_ar': '📊 نمو الإيرادات', 'action_type': 'query', 'payload': f'Show {symbol} revenue and profit growth trend'},
            {'label': '🛡️ Safety Score', 'label_ar': '🛡️ درجة الأمان', 'action_type': 'query', 'payload': f'Is {symbol} financially safe? Show safety score'},
            {'label': '💎 Valuation', 'label_ar': '💎 التقييم', 'action_type': 'query', 'payload': f'Deep valuation analysis of {symbol}'},
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
            {'label': '💎 Valuation vs Peers', 'label_ar': '💎 التقييم مقابل الأقران', 'action_type': 'query', 'payload': f'How does {symbol} valuation compare to sector peers?'},
            {'label': '📈 Growth Quality', 'label_ar': '📈 جودة النمو', 'action_type': 'query', 'payload': f'Show {symbol} revenue and profit growth quality'},
            {'label': '📊 Financials', 'label_ar': '📊 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
        ]
    }

async def handle_fair_value(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    """Valuation request → vendor-sourced ratios ONLY (SOURCE-ONLY MANDATE / C-4 fix).

    The previous implementation surfaced internally-generated DCF / DDM / P-E fair-value
    MODELS plus an 'upside %' computed against a STALE price stored in the fair_values
    table. That is a house opinion (Tier-1 REMOVE) and the upside was mislabeled/stale
    (e.g. "+19.7%" while the live delta was -21.9%). We now return only vendor-sourced
    valuation ratios from the LIVE stock_stats_view and state plainly that we do not
    publish a house price target or fair-value model.
    """
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency, last_price FROM market_tickers WHERE symbol = $1",
        symbol,
    )
    if not ticker:
        return {'success': False, 'message': "Not found"}

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    currency = get_ticker_currency(ticker)

    ratios = await conn.fetchrow("""
        SELECT mt.pe_ratio,
               COALESCE(mt.pb_ratio, ss.pb_ratio) AS pb_ratio,
               ss.forward_pe, ss.dividend_yield, ss.eps_ttm, ss.roe
        FROM market_tickers mt
        LEFT JOIN stock_stats_view ss ON mt.symbol = ss.symbol AND mt.market_code = ss.market_code
        WHERE mt.symbol = $1
    """, symbol)

    stats_data = {}
    if ratios:
        if ratios['pe_ratio'] is not None: stats_data['pe_ratio'] = float(ratios['pe_ratio'])
        if ratios['pb_ratio'] is not None: stats_data['pb_ratio'] = float(ratios['pb_ratio'])
        if ratios['forward_pe'] is not None: stats_data['forward_pe'] = float(ratios['forward_pe'])
        if ratios['dividend_yield'] is not None: stats_data['dividend_yield'] = float(ratios['dividend_yield'])
        if ratios['eps_ttm'] is not None: stats_data['eps_ttm'] = float(ratios['eps_ttm'])
        if ratios['roe'] is not None: stats_data['roe'] = float(ratios['roe'])

    if language == 'ar':
        msg = (
            f"💎 **نسب تقييم {name} ({symbol})**\n\n"
            f"هذه نسب التقييم كما وردت من مزود البيانات. لا نُصدر هدفاً سعرياً أو نموذج قيمة عادلة داخلياً."
        )
    else:
        msg = (
            f"💎 **Valuation ratios — {name} ({symbol})**\n\n"
            f"These are vendor-sourced valuation ratios. We don't publish a house price "
            f"target or fair-value model."
        )

    cards = [
        {
            'type': 'stock_header',
            'data': {'symbol': symbol, 'name': name, 'currency': currency, 'market_code': 'EGX'}
        }
    ]
    if stats_data:
        cards.append({
            'type': 'stats',
            'title': 'Valuation Ratios' if language == 'en' else 'نسب التقييم',
            'data': stats_data,
        })

    return {
        'success': True,
        'message': msg,
        'cards': cards,
        'actions': [
            {'label': '📊 Financials', 'label_ar': '📊 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '📈 Analyst Targets', 'label_ar': '📈 أهداف المحللين', 'action_type': 'query', 'payload': f'{symbol} analyst price target'},
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

    # NOTE: 'company_profile' is NOT a valid CardType -> response_composer coerces it
    # to an 'error' card (so it never rendered). Emit a valid stock_header card; the
    # factual fields live in the (handler-verbatim) message above.
    return {
        'success': True,
        'message': msg,
        'cards': [
            {
                'type': 'stock_header',
                'data': {
                    'symbol': symbol,
                    'name': name,
                    'sector': sector,
                    'market_code': 'EGX',
                    'currency': get_ticker_currency(ticker),
                },
            }
        ],
        'actions': [
             {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
        ]
    }
