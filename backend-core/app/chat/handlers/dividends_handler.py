"""
Dividends Handler - DIVIDENDS intent.
Ultra-premium responses with graceful fallback when no history exists.
"""

from app.chat.currency_utils import get_ticker_currency, is_egx_market
import asyncpg
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from ..compliance import STARTA_GLOBAL_DISCLAIMER


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
    currency = get_ticker_currency(ticker_row)
    last_price = float(ticker_row['last_price']) if ticker_row['last_price'] else None

    # ── FRESH dividend snapshot from egx_dividends (TradingView, refreshed daily) ──
    # Same source the website stock pages use (/api/v1/egx/dividends-tv). It carries
    # the most-recent + upcoming distribution and a live yield, which the legacy
    # dividend_history table (frozen) lacks.
    tv = await conn.fetchrow("""
        SELECT div_yield, amount_recent, ex_date_recent, payment_date_recent,
               amount_upcoming, ex_date_upcoming, payment_date_upcoming,
               frequency, payout_ratio_ttm, continuous_growth
        FROM egx_dividends WHERE UPPER(symbol) = $1
    """, symbol.upper())

    def _ts_to_date(ts):
        try:
            return datetime.fromtimestamp(int(ts), tz=timezone.utc).date() if ts else None
        except Exception:
            return None

    # Current yield: prefer the fresh TradingView yield, fall back to market_tickers.
    current_yield = None
    if tv and tv['div_yield'] is not None:
        current_yield = float(tv['div_yield'])
    elif ticker_row['dividend_yield']:
        current_yield = float(ticker_row['dividend_yield'])

    payout_ratio_ttm = float(tv['payout_ratio_ttm']) if tv and tv['payout_ratio_ttm'] is not None else None
    frequency = tv['frequency'] if tv else None
    recent_ex = _ts_to_date(tv['ex_date_recent']) if tv else None
    recent_amount = float(tv['amount_recent']) if tv and tv['amount_recent'] is not None else None
    upcoming_ex = _ts_to_date(tv['ex_date_upcoming']) if tv else None
    upcoming_amount = float(tv['amount_upcoming']) if tv and tv['amount_upcoming'] is not None else None

    # Historical series — corporate_actions is SELF-EXTENDING from the daily
    # TradingView dividends cycle (June-2026; the old dividend_history table
    # froze in January and was narrating stale history).
    rows = await conn.fetch("""
        SELECT ex_date, amount AS dividend_amount
        FROM corporate_actions
        WHERE symbol = $1 AND action_type = 'Dividend' AND amount IS NOT NULL
        ORDER BY ex_date DESC
        LIMIT $2
    """, symbol, limit)

    # Deep per-fiscal-year DPS history from TradingView (egx_financials) — the
    # same multi-year series the website Dividends tab shows (up to ~20 years).
    dps_rows = await conn.fetch("""
        SELECT fiscal_year, dps
        FROM egx_financials
        WHERE symbol = $1 AND period_type = 'annual' AND dps IS NOT NULL AND dps > 0
        ORDER BY fiscal_year DESC
        LIMIT 15
    """, symbol)

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

    # Merge the fresh TradingView "recent" distribution with the historical series,
    # newest first, de-duplicated by ex-date. Guarantees the latest distribution
    # (which the frozen history misses) is always shown AND counted.
    dividends = []
    seen_dates = set()

    def _add_div(ex_date, amount):
        if not ex_date:
            return
        key = ex_date.isoformat()
        if key in seen_dates:
            return
        seen_dates.add(key)
        dividends.append({'ex_date': key, 'amount': float(amount) if amount else 0, 'currency': currency})

    if recent_ex and recent_amount:
        _add_div(recent_ex, recent_amount)
    for row in rows:
        _add_div(row['ex_date'], float(row['dividend_amount']) if row['dividend_amount'] else 0)
    dividends.sort(key=lambda d: d['ex_date'], reverse=True)

    # Trailing-12m total from the merged, deduped distributions.
    total_annual = 0
    today = datetime.now().date()
    for d in dividends:
        try:
            exd = datetime.fromisoformat(d['ex_date']).date()
        except Exception:
            exd = None
        if exd and d['amount'] and (today - exd).days <= 365:
            total_annual += d['amount']

    # If the trailing-12m sum is still 0 but the stock clearly pays a dividend
    # (positive current yield), fall back to a yield-implied annual figure so we
    # NEVER present a misleading "0.00" for a dividend-paying stock.
    annual_is_estimated = False
    if (not total_annual) and current_yield and last_price:
        total_annual = (current_yield / 100.0) * last_price
        annual_is_estimated = True

    # Build premium message
    if dividends:
        # Has dividend history
        total_str = _format_number(total_annual)
        price_str = _format_number(last_price)
        
        if language == 'ar':
             lines = [f"💵 **سجل التوزيعات لـ {name}** ({symbol})\n"]
             lines.append("📊 **الملخص:**")
             if current_yield: lines.append(f"• عائد التوزيعات الحالي: {current_yield:.2f}%")
             if total_str:
                 if annual_is_estimated:
                     lines.append(f"• التوزيعات السنوية المقدرة: ~{total_str} {currency}")
                 else:
                     lines.append(f"• إجمالي التوزيعات (آخر سنة): {total_str} {currency}")
             if recent_amount and recent_ex:
                 lines.append(f"• أحدث توزيع: {_format_number(recent_amount)} {currency} (تاريخ الاستحقاق {recent_ex.isoformat()})")
             if upcoming_amount and upcoming_ex:
                 lines.append(f"• 🔜 التوزيع القادم: {_format_number(upcoming_amount)} {currency} (تاريخ الاستحقاق {upcoming_ex.isoformat()})")
             lines.append(f"• عدد التوزيعات المسجلة: {len(dividends)}")
             if price_str: lines.append(f"• السعر الحالي: {price_str} {currency}")
             if dps_rows:
                 lines.append("")
                 lines.append("🗓️ **التوزيعات لكل سنة مالية:**")
                 for r in dps_rows:
                     lines.append(f"• {int(r['fiscal_year'])}: {float(r['dps']):.4f} {currency}/سهم")
             message = "\n".join(lines)
        else:
             lines = [f"💵 **Dividend History for {name}** ({symbol})\n"]
             lines.append("📊 **Summary:**")
             if current_yield: lines.append(f"• Current Dividend Yield: {current_yield:.2f}%")
             if total_str:
                 if annual_is_estimated:
                     lines.append(f"• Est. Annual Dividend: ~{total_str} {currency}")
                 else:
                     lines.append(f"• Total Dividends (Last Year): {total_str} {currency}")
             if recent_amount and recent_ex:
                 lines.append(f"• Most Recent: {_format_number(recent_amount)} {currency} (ex-date {recent_ex.isoformat()})")
             if upcoming_amount and upcoming_ex:
                 lines.append(f"• 🔜 Upcoming: {_format_number(upcoming_amount)} {currency} (ex-date {upcoming_ex.isoformat()})")
             lines.append(f"• Number of Distributions: {len(dividends)}")
             if price_str: lines.append(f"• Current Price: {price_str} {currency}")
             if dps_rows:
                 lines.append("")
                 lines.append("🗓️ **Dividends per fiscal year:**")
                 for r in dps_rows:
                     lines.append(f"• FY{int(r['fiscal_year'])}: {float(r['dps']):.4f} {currency}/share")
             message = "\n".join(lines)
        
        # Add dividends table card
        cards.append({
            'type': 'dividends_table',
            'title': 'Dividend History' if language == 'en' else 'سجل التوزيعات',
            'data': {
                'dividends': dividends,
                'currency': currency,
                'current_yield': current_yield,
                'total_annual': total_annual,
                'upcoming_amount': upcoming_amount,
                'upcoming_ex_date': upcoming_ex.isoformat() if upcoming_ex else None,
                'payout_ratio_ttm': payout_ratio_ttm,
                'frequency': frequency,
                'dps_per_year': [{'fiscal_year': int(r['fiscal_year']), 'dps': float(r['dps'])} for r in dps_rows],
                'source': 'tradingview'
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
            {'label': '📈 Payout Sustainability', 'label_ar': '📈 استدامة التوزيعات', 'action_type': 'query', 'payload': f'Is {symbol} dividend payout ratio sustainable? Show payout vs earnings'},
            {'label': '🛡️ Financial Safety', 'label_ar': '🛡️ الأمان المالي', 'action_type': 'query', 'payload': f'Is {symbol} financially safe and able to sustain dividends?'},
            {'label': '⚖️ Yield vs Peers', 'label_ar': '⚖️ العائد مقارنة بالأقران', 'action_type': 'query', 'payload': f'Compare {symbol} dividend yield to sector peers'},
    ]

    is_egx = is_egx_market(ticker_row)
    if is_egx:
        base_actions.extend([
        ])
    
    return {
        'success': True,
        'message': message,
        'cards': cards,
        'actions': base_actions,
        'disclaimer': STARTA_GLOBAL_DISCLAIMER
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
