"""
Price Handler - STOCK_PRICE and STOCK_SNAPSHOT intents.
"""

import asyncpg
from typing import Dict, Any, Optional
from datetime import datetime


async def handle_stock_price(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle STOCK_PRICE intent - quick quote.
    
    Returns:
        Dict with price data and card info
    """
    row = await conn.fetchrow("""
        SELECT 
            symbol, name_en, name_ar, market_code, currency,
            last_price, change, change_percent, volume,
            open_price, high, low, prev_close,
            last_updated
        FROM market_tickers
        WHERE symbol = $1
    """, symbol)
    
    if not row:
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find stock: {symbol}" if language == 'en' else f"لم يتم العثور على السهم: {symbol}"
        }
    
    data = dict(row)
    
    # Format message
    name = data['name_ar'] if language == 'ar' else data['name_en']
    price = data['last_price'] or 0
    change = data['change'] or 0
    change_pct = data['change_percent'] or 0
    currency = data['currency'] or 'EGP'
    
    direction = "↑" if change >= 0 else "↓"
    
    if language == 'ar':
        message = f"{name} ({symbol}): {price:.2f} {currency} {direction} ({change_pct:+.2f}%)"
    else:
        message = f"{name} ({symbol}): {currency} {price:.2f} {direction} ({change_pct:+.2f}%)"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'stock_header',
                'data': {
                    'symbol': symbol,
                    'name': name,
                    'market_code': data['market_code'],
                    'currency': currency,
                    'as_of': data['last_updated'].isoformat() if data['last_updated'] else None
                }
            },
            {
                'type': 'snapshot',
                'data': {
                    'last_price': float(price),
                    'change': float(change),
                    'change_percent': float(change_pct),
                    'volume': int(data['volume'] or 0),
                    'open': float(data['open_price'] or 0),
                    'high': float(data['high'] or 0),
                    'low': float(data['low'] or 0),
                    'prev_close': float(data['prev_close'] or 0),
                    'currency': currency
                }
            }
        ],
        'actions': [
            {'label': 'View Chart', 'label_ar': 'عرض الشارت', 'action_type': 'query', 'payload': f'Show chart for {symbol}'},
            {'label': 'Financials', 'label_ar': 'القوائم المالية', 'action_type': 'query', 'payload': f'Show financials for {symbol}'},
            {'label': 'Company Profile', 'label_ar': 'معلومات الشركة', 'action_type': 'navigate', 'payload': f'/symbol/{symbol}'}
        ]
    }


async def handle_stock_snapshot(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle STOCK_SNAPSHOT intent - comprehensive overview.
    
    Returns:
        Dict with fuller stock data including some stats
    """
    # Get base price data
    price_result = await handle_stock_price(conn, symbol, language)
    
    if not price_result['success']:
        return price_result
    
    # Add statistics if available
    stats_row = await conn.fetchrow("""
        SELECT 
            pe_ratio, pb_ratio, dividend_yield, market_cap,
            high_52w, low_52w, beta, eps, target_price
        FROM market_tickers
        WHERE symbol = $1
    """, symbol)
    
    if stats_row:
        stats_data = {
            'pe_ratio': float(stats_row['pe_ratio']) if stats_row['pe_ratio'] else None,
            'pb_ratio': float(stats_row['pb_ratio']) if stats_row['pb_ratio'] else None,
            'dividend_yield': float(stats_row['dividend_yield']) if stats_row['dividend_yield'] else None,
            'market_cap': int(stats_row['market_cap']) if stats_row['market_cap'] else None,
            'high_52w': float(stats_row['high_52w']) if stats_row['high_52w'] else None,
            'low_52w': float(stats_row['low_52w']) if stats_row['low_52w'] else None,
            'beta': float(stats_row['beta']) if stats_row['beta'] else None,
            'eps': float(stats_row['eps']) if stats_row['eps'] else None,
        }
        
        # Add stats card
        price_result['cards'].append({
            'type': 'stats',
            'title': 'Key Statistics' if language == 'en' else 'إحصائيات رئيسية',
            'data': stats_data
        })
    
    # Enhance message
    if language == 'ar':
        price_result['message'] += " | انقر لعرض المزيد من التفاصيل"
    else:
        price_result['message'] += " | Click for more details"
    
    return price_result
