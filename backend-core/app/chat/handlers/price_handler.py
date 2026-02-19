"""
Price Handler - STOCK_PRICE and STOCK_SNAPSHOT intents.
Ultra-premium responses with real OHLC from ohlc_data table.
"""

import asyncpg
from typing import Dict, Any, Optional
from datetime import datetime


# NEW: Import data card generator for structured responses
from ..bull_bear_generator import generate_data_card
# NEW: Starta Logic Engine
from ..scoring_engine import calculate_score
from ..logic.macro_service import get_macro_service



def _format_number(value: float, decimals: int = 2) -> Optional[str]:
    """Format number with commas and decimals."""
    if value is None:
        return None
    if value >= 1_000_000_000:
        return f"{value/1_000_000_000:.2f}B"
    if value >= 1_000_000:
        return f"{value/1_000_000:.2f}M"
    if value >= 1_000:
        return f"{value/1_000:.2f}K"
    return f"{value:,.{decimals}f}"


def _get_trend_emoji(change: float) -> str:
    """Get trend emoji based on change."""
    if change > 2:
        return "🚀"
    if change > 0:
        return "📈"
    if change < -2:
        return "📉"
    if change < 0:
        return "🔻"
    return "➖"


async def handle_stock_price(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle STOCK_PRICE intent - premium quote with real OHLC data.
    Joins market_tickers with ohlc_data for complete data.
    """
    # Premium query: Join market_tickers with latest ohlc_data AND stock_statistics for full deep stats
    row = await conn.fetchrow("""
        SELECT 
            m.symbol, m.name_en, m.name_ar, m.market_code, m.currency,
            m.last_price, m.change, m.change_percent, m.volume,
            COALESCE(m.open_price, o.open) as open_price,
            COALESCE(m.high, o.high) as high,
            COALESCE(m.low, o.low) as low,
            COALESCE(m.prev_close, LAG(o.close) OVER (ORDER BY o.date), o.close) as prev_close,
            m.pe_ratio, m.pb_ratio, m.dividend_yield, m.market_cap,
            m.high_52w, m.low_52w, m.sector_name,
            m.last_updated, m.logo_url,
            o.date as ohlc_date,
            ss.roe, ss.debt_equity, ss.profit_margin
        FROM market_tickers m
        LEFT JOIN ohlc_data o ON m.symbol = o.symbol 
            AND o.date = (SELECT MAX(date) FROM ohlc_data WHERE symbol = m.symbol)
        LEFT JOIN stock_statistics ss ON m.symbol = ss.symbol
        WHERE m.symbol = $1
    """, symbol)
    
    if not row:
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find stock: {symbol}" if language == 'en' else f"لم يتم العثور على السهم: {symbol}",
            'cards': [],
            'actions': []
        }
    
    data = dict(row)
    
    # Extract values with safe defaults (None instead of 0 for missing data)
    name = data['name_ar'] if language == 'ar' else data['name_en']
    price = float(data['last_price']) if data['last_price'] is not None else None
    change = float(data['change']) if data['change'] is not None else None
    change_pct = float(data['change_percent']) if data['change_percent'] is not None else None
    currency = data['currency'] or 'EGP'
    volume = int(data['volume']) if data['volume'] is not None else None
    
    # OHLC Data
    open_price = float(data['open_price']) if data['open_price'] is not None else None
    high = float(data['high']) if data['high'] is not None else None
    low = float(data['low']) if data['low'] is not None else None
    prev_close = float(data['prev_close']) if data['prev_close'] is not None else None
    
    # Ratios (already handled correctly, but ensuring consistency)
    pe_ratio = float(data['pe_ratio']) if data['pe_ratio'] else None
    pb_ratio = float(data['pb_ratio']) if data['pb_ratio'] else None
    dividend_yield = float(data['dividend_yield']) if data['dividend_yield'] else None
    market_cap = int(data['market_cap']) if data['market_cap'] else None
    high_52w = float(data['high_52w']) if data['high_52w'] else None
    low_52w = float(data['low_52w']) if data['low_52w'] else None
    
    # New Stats (Deep Analysis)
    roe = float(data['roe'] * 100) if data['roe'] else None  # Convert decimal to %
    debt_equity = float(data['debt_equity']) if data['debt_equity'] else None
    profit_margin = float(data['profit_margin'] * 100) if data['profit_margin'] else None # Convert decimal to %

    SECTOR_AR_MAP = {
        'Banks': 'بنوك',
        'Basic Resources': 'موارد أساسية',
        'Building Materials': 'مواد بناء',
        'Chemicals': 'كيماويات',
        'Construction & Materials': 'تشييد ومواد بناء',
        'Education Services': 'خدمات تعليمية',
        'Energy & Support Services': 'طاقة وخدمات مساندة',
        'Financial Services (excluding Banks)': 'خدمات مالية غير مصرفية',
        'Food, Beverages & Tobacco': 'أغذية ومشروبات',
        'Health Care & Pharmaceuticals': 'رعاية صحية وأدوية',
        'Industrial Goods, Services and Automobiles': 'سلع صناعية وسيارات',
        'IT, Media & Communication Services': 'اتصالات وإعلام',
        'Paper & Packaging': 'ورق وتغليف',
        'Real Estate': 'عقارات',
        'Shipping & Transportation Services': 'خدمات نقل وشحن',
        'Textile & Durables': 'منسوجات وسلع معمرة',
        'Trade & Distributors': 'تجارة وموزعون',
        'Travel & Leisure': 'سياحة وترفيه',
        'Utilities': 'مرافق'
    }

    sector_raw = data['sector_name'] or "N/A"
    sector = sector_raw
    if language == 'ar':
        sector = SECTOR_AR_MAP.get(sector_raw, sector_raw)
    
    # Trend analysis
    # Trend analysis
    trend_emoji = _get_trend_emoji(change_pct) if change_pct is not None else "➖"
    direction = "↑" if change and change >= 0 else ("↓" if change and change < 0 else "")
    
    # Calculate 52-week position
    position_52w = None
    position_text = ""
    if high_52w and low_52w and high_52w > low_52w:
        position_52w = (price - low_52w) / (high_52w - low_52w) * 100
        if position_52w > 80:
            position_text = "Near 52-week high" if language == 'en' else "قريب من أعلى سعر سنوي"
        elif position_52w < 20:
            position_text = "Near 52-week low" if language == 'en' else "قريب من أدنى سعر سنوي"
    
    # Build premium message
    # Build premium message
    if language == 'ar':
        lines = [f"📊 **{name}** ({symbol})\n"]
        
        # Price Line
        price_str = f"{price}" if price is not None else ""
        if price_str:
            change_part = f"({change_pct}%)" if change_pct is not None else ""
            lines.append(f"💰 **السعر:** {currency} {price_str} {direction} {change_part} {trend_emoji}")
        
        # Range
        if low is not None and high is not None:
            lines.append(f"📈 **نطاق اليوم:** {low} - {high}")
            
        # Open/Close
        open_close = []
        if open_price is not None: open_close.append(f"**الافتتاح:** {open_price}")
        if prev_close is not None: open_close.append(f"**الإغلاق السابق:** {prev_close}")
        if open_close: lines.append(f"🔓 {' | '.join(open_close)}")
        
        # Volume
        vol_str = _format_number(volume, 0)
        if vol_str: lines.append(f"📦 **الحجم:** {vol_str}")
        
        lines.append(f"\n🏢 **القطاع:** {sector}")
        
        message = "\n".join(lines)
    else:
        lines = [f"📊 **{name}** ({symbol})\n"]
        
        # Price Line
        price_str = f"{price}" if price is not None else ""
        if price_str:
            change_part = f"({change_pct}%)" if change_pct is not None else ""
            lines.append(f"💰 **Price:** {currency} {price_str} {direction} {change_part} {trend_emoji}")
        
        # Range
        if low is not None and high is not None:
            lines.append(f"📈 **Today's Range:** {low} - {high}")
            
        # Open/Close
        open_close = []
        if open_price is not None: open_close.append(f"**Open:** {open_price}")
        if prev_close is not None: open_close.append(f"**Prev Close:** {prev_close}")
        if open_close: lines.append(f"🔓 {' | '.join(open_close)}")
        
        # Volume
        vol_str = _format_number(volume, 0)
        if vol_str: lines.append(f"📦 **Volume:** {vol_str}")
        
        lines.append(f"\n🏢 **Sector:** {sector}")
        
        message = "\n".join(lines)
    
    if position_text:
        message += f"\n\n⚡ {position_text}"
    
    # Build cards
    cards = [
        {
            'type': 'stock_header',
            'data': {
                'symbol': symbol,
                'name': name,
                'market_code': data['market_code'],
                'currency': currency,
                'sector': sector,
                'logo_url': data.get('logo_url'),
                'as_of': data['last_updated'].isoformat() if data['last_updated'] else None
            }
        },
        {
            'type': 'snapshot',
            'data': {
                'last_price': price,
                'change': change,
                'change_percent': change_pct,
                'volume': volume,
                'open': open_price,
                'high': high,
                'low': low,
                'prev_close': prev_close,
                'currency': currency,
                'trend_emoji': trend_emoji
            }
        }
    ]
    
    # Add valuation card if we have data
    valuation_data = {}
    
    # 1. P/E Ratio
    if pe_ratio: valuation_data['pe_ratio'] = pe_ratio
    
    # 2. ROE (New)
    if roe: valuation_data['roe'] = roe
    
    # 3. Profit Margin (New)
    if profit_margin: valuation_data['net_profit_margin'] = profit_margin
    
    # 4. Debt to Equity (New)
    if debt_equity: valuation_data['debt_equity'] = debt_equity
    
    if pb_ratio: valuation_data['pb_ratio'] = pb_ratio
    if dividend_yield: valuation_data['dividend_yield'] = dividend_yield
    if market_cap:
        valuation_data['market_cap'] = market_cap
        valuation_data['market_cap_formatted'] = _format_number(market_cap, 0)
    if high_52w and low_52w:
        valuation_data['high_52w'] = high_52w
        valuation_data['low_52w'] = low_52w
        valuation_data['position_52w'] = position_52w
    
    if valuation_data:
        cards.append({
            'type': 'stats',
            'title': 'Valuation & Stats' if language == 'en' else 'التقييم والإحصائيات',
            'data': valuation_data

        })
    
    # NEW: Generate structured response components (data card)
    stock_data_for_analysis = {
        'symbol': symbol,
        'name': name,
        'price': price,
        'change_percent': change_pct,
        'pe_ratio': pe_ratio,
        'pb_ratio': pb_ratio,
        'roe': roe,
        'debt_equity': debt_equity,
        'profit_margin': profit_margin,
        'dividend_yield': dividend_yield,
        'market_cap': market_cap,
        'high_52w': high_52w,
        'low_52w': low_52w,
        'sector': sector_raw, # Use raw English sector for logic lookup
        'volume': volume
    }

    # ------------------------------------------------------------------
    # NEW: Starta Logic Engine Integration
    # ------------------------------------------------------------------
    try:
        # 1. Calculate Valuation Score (Sector-Specific 5-Component)
        # We need historical_avg dict. Since we just have single stock, 
        # we can pass empty dict for now, which gives default historical score, 
        # or we could fetch sector average if we modified the query.
        metrics = stock_data_for_analysis.copy()
        # Mocking empty historical averages since we only have single stock query here
        # The scoring engine handles missing history gracefully
        score_res = calculate_score(metrics, {})
        
        cards.append({
            'type': 'valuation_score', # Recognized by LLM Context
            'title': 'Starta Valuation Score' if language == 'en' else 'نتيجة تقييم ستارتا',
            'data': {
                'total_score': score_res.total,
                'valuation_score': score_res.valuation,
                'quality_score': score_res.earnings_quality,
                'momentum_score': score_res.momentum,
                'profitability_score': score_res.profitability,
                'health_score': score_res.financial_health,
                'assessment': score_res.category,
                'signal': score_res.signal,
                'grade': score_res.grade,
                'sector': sector
            }
        })
        
        # 2. Fetch Macro Context (Quantitative + Qualitative)
        macro_svc = get_macro_service()
        # Macro is usually usually market-wide, but we pass symbol for specific insights
        macro_ctx = await macro_svc.get_macro_context(conn, ticker=symbol)
        
        cards.append({
            'type': 'macro_context', # Recognized by LLM Context
            'title': 'Macro Environment' if language == 'en' else 'البيئة الاقتصادية الكلية',
            'data': macro_ctx
        })

    except Exception as logic_err:
        print(f"Logic Engine Error: {logic_err}")
    # ------------------------------------------------------------------

    
    base_actions = [
            {'label': '📊 View Chart', 'label_ar': '📊 عرض الشارت', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '💵 Dividends', 'label_ar': '💵 التوزيعات', 'action_type': 'query', 'payload': f'{symbol} dividends'},
        ]

    # Add Egypt-specific suggestions if applicable
    is_egx = data.get('market_code') == 'EGX' or currency == 'EGP'
    if is_egx:
        base_actions.extend([
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
            {'label': '⚙️ Technicals', 'label_ar': '⚙️ التحليلي الفني', 'action_type': 'query', 'payload': f'{symbol} technicals'}
        ])
    
    # Generate data card for current position
    data_card = generate_data_card(
        symbol=symbol,
        price=price,
        change=change,
        change_pct=change_pct,
        currency=currency,
        volume=volume,
        language=language
    )
    
    # Disclaimer card (NEW structured format)
    disclaimer_card = {
        'icon': '⚠️',
        'title': 'Educational Analysis' if language == 'en' else 'تحليل تعليمي',
        'text': 'This is market analysis for educational purposes, not personalized investment advice. Your decision should factor in your individual financial situation, risk tolerance, and investment timeline.' if language == 'en' else 'هذا تحليل سوقي لأغراض تعليمية، وليس نصيحة استثمارية شخصية.'
    }
    
    # Follow-up prompt (NEW)
    follow_up_prompt = f"Would you like to see {symbol}'s historical financials or a technical chart breakdown?" if language == 'en' else f"هل تريد رؤية القوائم المالية التاريخية لـ {symbol} أو تحليل الرسم البياني الفني؟"

    # Append structured components to cards list for rendering
    # IMPORTANT: Convert Pydantic models to dicts for Card.data validation
    if data_card:
        cards.append({'type': 'data_card', 'data': data_card.model_dump() if hasattr(data_card, 'model_dump') else data_card})

    if disclaimer_card:
        cards.append({'type': 'disclaimer_card', 'data': disclaimer_card})

    # Convert Pydantic models to dicts for top-level response
    data_card_dict = data_card.model_dump() if hasattr(data_card, 'model_dump') and data_card else None

    return {
        'success': True,
        'message': message,
        'cards': cards,
        'actions': base_actions,
        'disclaimer': 'Data is for informational purposes only. This is not investment advice.' if language == 'en' else 'البيانات لأغراض إعلامية فقط. هذه ليست نصيحة استثمارية.',
        'follow_up_prompt': follow_up_prompt,
        # CRITICAL: Top-level structured components for WorldClassMessage rendering
        # These are extracted by chat_service._build_response() 
        'data_card': data_card_dict,
        'disclaimer_card': disclaimer_card
    }


async def handle_stock_snapshot(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle STOCK_SNAPSHOT intent - comprehensive overview with analysis.
    """
    # Get premium price data (already includes stats)
    result = await handle_stock_price(conn, symbol, language)
    
    if not result.get('success'):
        return result
    
    # Add additional analysis message
    heading = "🔬 Deep Analysis & Insights:" if language == 'en' else "🔬 تحليل وتوصيات:"
    if language == 'ar':
        result['message'] += f"\n\n{heading}\n• اضغط على 'عرض الشارت' لرؤية الرسم البياني\n• اضغط على 'القوائم المالية' لرؤية الأداء المالي"
    else:
        result['message'] += f"\n\n{heading}\n• Click 'View Chart' for price history\n• Click 'Financials' for performance data"
    
    return result
