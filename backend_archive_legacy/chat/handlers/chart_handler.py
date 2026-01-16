"""
Chart Handler - STOCK_CHART intent.
"""

import asyncpg
from typing import Dict, Any, List
from datetime import datetime, timedelta


# Range mappings
RANGE_DAYS = {
    '1D': 1,
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    '5Y': 1825,
    'MAX': 3650,
}


async def handle_stock_chart(
    conn: asyncpg.Connection,
    symbol: str,
    range_code: str = '1M',
    chart_type: str = 'candlestick',
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle STOCK_CHART intent.
    
    Args:
        conn: Database connection
        symbol: Stock symbol
        range_code: Time range (1D, 1W, 1M, 3M, 6M, 1Y, MAX)
        chart_type: 'candlestick' or 'line'
        language: 'en' or 'ar'
    
    Returns:
        Dict with chart data payload
    """
    # Get company name
    name_row = await conn.fetchrow("""
        SELECT name_en, name_ar, market_code, currency
        FROM market_tickers WHERE symbol = $1
    """, symbol)
    
    if not name_row:
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find stock: {symbol}" if language == 'en' else f"لم يتم العثور على السهم: {symbol}"
        }
    
    # Calculate date range
    days = RANGE_DAYS.get(range_code, 30)
    start_date = datetime.now() - timedelta(days=days)
    
    # Fetch OHLC data
    rows = await conn.fetch("""
        SELECT date, open, high, low, close, volume
        FROM ohlc_data
        WHERE symbol = $1 AND date >= $2
        ORDER BY date ASC
    """, symbol, start_date.date())
    
    if not rows:
        return {
            'success': False,
            'error': 'no_data',
            'message': f"No chart data available for {symbol}" if language == 'en' else f"لا توجد بيانات شارت متاحة لـ {symbol}"
        }
    
    # Format data
    chart_data = []
    for row in rows:
        chart_data.append({
            'time': row['date'].isoformat(),
            'open': float(row['open']) if row['open'] else None,
            'high': float(row['high']) if row['high'] else None,
            'low': float(row['low']) if row['low'] else None,
            'close': float(row['close']) if row['close'] else None,
            'volume': int(row['volume']) if row['volume'] else 0
        })
    
    # Downsample if too many points
    max_points = 200
    if len(chart_data) > max_points:
        step = len(chart_data) // max_points
        chart_data = chart_data[::step]
    
    name = name_row['name_ar'] if language == 'ar' else name_row['name_en']
    
    if language == 'ar':
        message = f"شارت {name} ({symbol}) - {range_code}"
    else:
        message = f"{name} ({symbol}) Chart - {range_code}"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'stock_header',
                'data': {
                    'symbol': symbol,
                    'name': name,
                    'market_code': name_row['market_code'],
                    'currency': name_row['currency']
                }
            }
        ],
        'chart': {
            'type': chart_type,
            'symbol': symbol,
            'title': f"{symbol} - {range_code}",
            'data': chart_data,
            'range': range_code
        },
        'actions': [
            {'label': '1D', 'action_type': 'query', 'payload': f'Chart {symbol} 1D'},
            {'label': '1W', 'action_type': 'query', 'payload': f'Chart {symbol} 1W'},
            {'label': '1M', 'action_type': 'query', 'payload': f'Chart {symbol} 1M'},
            {'label': '1Y', 'action_type': 'query', 'payload': f'Chart {symbol} 1Y'},
            {'label': 'MAX', 'action_type': 'query', 'payload': f'Chart {symbol} MAX'},
        ]
    }
