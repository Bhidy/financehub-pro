"""
Dividends Handler - DIVIDENDS intent.
Ultra-premium responses with graceful fallback when no history exists.
"""

import asyncpg
from typing import Dict, Any, List, Optional
from datetime import datetime


def _format_number(value: float, decimals: int = 2) -> Optional[str]:
    """Format number with commas."""
    if value is None:
        return None
    return f"{value:,.{decimals}f}"


async def handle_dividends(
    conn: asyncpg.Connection,
    symbol: str,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle DIVIDENDS intent with ultra-premium formatting.
    Gracefully handles missing dividend history by showing current yield.
    """
    # Get company info including current dividend yield from market_tickers
    ticker_row = await conn.fetchrow("""
        SELECT name_en, name_ar, market_code, currency, 
               dividend_yield, last_price, pe_ratio, market_cap
        FROM market_tickers WHERE symbol = $1
    """, symbol)
    
    if not ticker_row:
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find stock: {symbol}" if language == 'en' else f"لم يتم العثور على السهم: {symbol}",
            'cards': [],
            'actions': []
        }
    
    name = ticker_row['name_ar'] if language == 'ar' else ticker_row['name_en']
    currency = ticker_row['currency'] or 'EGP'
    current_yield = float(ticker_row['dividend_yield']) if ticker_row['dividend_yield'] else None
    last_price = float(ticker_row['last_price']) if ticker_row['last_price'] else None
    
    # Fetch dividend history - use ACTUAL column names from table
    # Table has: id, symbol, ex_date, dividend_amount
    rows = await conn.fetch("""
        SELECT ex_date, dividend_amount
        FROM dividend_history
        WHERE symbol = $1
        ORDER BY ex_date DESC
        LIMIT $2
    """, symbol, limit)
    
    # Build cards based on available data
    cards = [
        {
            'type': 'stock_header',
            'data': {
                'symbol': symbol,
                'name': name,
                'market_code': ticker_row['market_code'],
                'currency': currency
            }
        }
    ]
    
    # Calculate totals from history
    dividends = []
    total_annual = 0
    
    for row in rows:
        ex_date = row['ex_date']
        amount = float(row['dividend_amount']) if row['dividend_amount'] else 0
        
        dividends.append({
            'ex_date': ex_date.isoformat() if ex_date else None,
            'amount': amount,
            'currency': currency
        })
        
        # Sum last year's dividends
        if ex_date and amount and (datetime.now().date() - ex_date).days <= 365:
            total_annual += amount
    
    # Build premium message
    if dividends:
        # Has dividend history
        total_str = _format_number(total_annual)
        price_str = _format_number(last_price)
        
        if language == 'ar':
             lines = [f"💵 **سجل التوزيعات لـ {name}** ({symbol})\n"]
             lines.append("📊 **الملخص:**")
             if current_yield: lines.append(f"• عائد التوزيعات الحالي: {current_yield:.2f}%")
             if total_str: lines.append(f"• إجمالي التوزيعات (آخر سنة): {total_str} {currency}")
             lines.append(f"• عدد التوزيعات المسجلة: {len(dividends)}")
             if price_str: lines.append(f"• السعر الحالي: {price_str} {currency}")
             message = "\n".join(lines)
        else:
             lines = [f"💵 **Dividend History for {name}** ({symbol})\n"]
             lines.append("📊 **Summary:**")
             if current_yield: lines.append(f"• Current Dividend Yield: {current_yield:.2f}%")
             if total_str: lines.append(f"• Total Dividends (Last Year): {total_str} {currency}")
             lines.append(f"• Number of Distributions: {len(dividends)}")
             if price_str: lines.append(f"• Current Price: {price_str} {currency}")
             message = "\n".join(lines)
        
        # Add dividends table card
        cards.append({
            'type': 'dividends_table',
            'title': 'Dividend History' if language == 'en' else 'سجل التوزيعات',
            'data': {
                'dividends': dividends,
                'currency': currency,
                'current_yield': current_yield,
                'total_annual': total_annual
            }
        })
    
    elif current_yield:
        # No history but has yield from market_tickers - show graceful message
        annual_dividend = (current_yield / 100 * last_price) if last_price else None
        
        price_str = _format_number(last_price)
        est_div_str = _format_number(annual_dividend)
        
        if language == 'ar':
            lines = [f"💵 **توزيعات {name}** ({symbol})\n"]
            lines.append("📊 **معلومات العائد:**")
            lines.append(f"• عائد التوزيعات الحالي: **{current_yield:.2f}%** ✅")
            if price_str: lines.append(f"• السعر الحالي: {price_str} {currency}")
            if est_div_str: lines.append(f"• التوزيعات السنوية المقدرة: ~{est_div_str} {currency}/سهم")
            lines.append("\n📌 سجل التوزيعات التفصيلي غير متاح حالياً")
            message = "\n".join(lines)
        else:
            lines = [f"💵 **{name}** ({symbol}) **Dividends**\n"]
            lines.append("📊 **Yield Information:**")
            lines.append(f"• Current Dividend Yield: **{current_yield:.2f}%** ✅")
            if price_str: lines.append(f"• Current Price: {price_str} {currency}")
            if est_div_str: lines.append(f"• Est. Annual Dividend: ~{est_div_str} {currency}/share")
            lines.append("\n📌 Detailed dividend history is not available at this time")
            message = "\n".join(lines)
        
        # Add yield summary card
        cards.append({
            'type': 'stats',
            'title': 'Dividend Yield' if language == 'en' else 'عائد التوزيعات',
            'data': {
                'dividend_yield': current_yield,
                'pe_ratio': float(ticker_row['pe_ratio']) if ticker_row['pe_ratio'] else None,
                'market_cap': int(ticker_row['market_cap']) if ticker_row['market_cap'] else None
            }
        })
    
    else:
        # No yield data at all
        if language == 'ar':
            message = f"❌ لا توجد بيانات توزيعات متاحة لـ {name} ({symbol})"
        else:
            message = f"❌ No dividend data available for {name} ({symbol})"
    
    base_actions = [
            {'label': '📊 Chart', 'label_ar': '📊 الشارت', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
    ]

    is_egx = ticker_row['market_code'] == 'EGX' or currency == 'EGP'
    if is_egx:
        base_actions.extend([
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
            {'label': '⚙️ Technicals', 'label_ar': '⚙️ التحليل الفني', 'action_type': 'query', 'payload': f'{symbol} technicals'},
        ])
    
    return {
        'success': True,
        'message': message,
        'cards': cards,
        'actions': base_actions,
        'disclaimer': 'Dividend data is for informational purposes only. Past dividends do not guarantee future distributions.' if language == 'en' else 'بيانات التوزيعات لأغراض إعلامية فقط. التوزيعات السابقة لا تضمن توزيعات مستقبلية.'
    }


async def handle_dividend_leaders(
    conn: asyncpg.Connection,
    market_code: str = None,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle DIVIDEND_LEADERS intent - top dividend yield stocks."""
    
    # Query top dividend yield stocks from market_tickers
    query = """
        SELECT symbol, name_en, name_ar, dividend_yield, last_price, market_code, currency
        FROM market_tickers
        WHERE dividend_yield IS NOT NULL AND dividend_yield > 0
    """
    params = []
    
    if market_code:
        query += " AND market_code = $1"
        params.append(market_code)
        query += f" ORDER BY dividend_yield DESC LIMIT ${len(params) + 1}"
        params.append(limit)
    else:
        query += f" ORDER BY dividend_yield DESC LIMIT $1"
        params.append(limit)
    
    rows = await conn.fetch(query, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No dividend-paying stocks found" if language == 'en' else "لم يتم العثور على أسهم توزع أرباحاً",
            'cards': [],
            'actions': []
        }
    
    # Build movers list
    stocks = []
    for row in rows:
        stocks.append({
            'symbol': row['symbol'],
            'name': row['name_ar'] if language == 'ar' else row['name_en'],
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['dividend_yield']) if row['dividend_yield'] else 0,
            'market_code': row['market_code']
        })
    
    market_label = f" ({market_code})" if market_code else ""
    if language == 'ar':
        message = f"💵 **أعلى عوائد التوزيعات{market_label}** - أفضل {len(stocks)} أسهم"
    else:
        message = f"💵 **Top Dividend Yields{market_label}** - Best {len(stocks)} stocks"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'movers_table',
                'title': 'Dividend Leaders' if language == 'en' else 'قادة التوزيعات',
                'data': {
                    'movers': stocks,
                    'direction': 'up'
                }
            }
        ],
        'actions': []
    }
