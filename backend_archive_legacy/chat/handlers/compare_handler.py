"""
Compare Handler - COMPARE_STOCKS intent.
"""

import asyncpg
from typing import Dict, Any, List


async def handle_compare_stocks(
    conn: asyncpg.Connection,
    symbols: List[str],
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle COMPARE_STOCKS intent.
    
    Args:
        conn: Database connection
        symbols: List of symbols to compare (typically 2)
        language: 'en' or 'ar'
    
    Returns:
        Dict with comparison data and line chart
    """
    if not symbols or len(symbols) < 2:
        return {
            'success': False,
            'error': 'insufficient_symbols',
            'message': "Please specify two stocks to compare" if language == 'en' else "يرجى تحديد سهمين للمقارنة"
        }
    
    # Limit to 2 symbols
    symbols = symbols[:2]
    
    # Fetch data for both symbols
    stocks_data = []
    for symbol in symbols:
        row = await conn.fetchrow("""
            SELECT 
                symbol, name_en, name_ar, market_code, currency,
                last_price, change_percent, volume,
                pe_ratio, pb_ratio, dividend_yield, market_cap,
                high_52w, low_52w, beta
            FROM market_tickers
            WHERE symbol = $1
        """, symbol)
        
        if row:
            name = row['name_ar'] if language == 'ar' else row['name_en']
            stocks_data.append({
                'symbol': row['symbol'],
                'name': name,
                'market_code': row['market_code'],
                'currency': row['currency'],
                'price': float(row['last_price']) if row['last_price'] else None,
                'change_percent': float(row['change_percent']) if row['change_percent'] else None,
                'volume': int(row['volume']) if row['volume'] else None,
                'pe_ratio': float(row['pe_ratio']) if row['pe_ratio'] else None,
                'pb_ratio': float(row['pb_ratio']) if row['pb_ratio'] else None,
                'dividend_yield': float(row['dividend_yield']) if row['dividend_yield'] else None,
                'market_cap': int(row['market_cap']) if row['market_cap'] else None,
                'high_52w': float(row['high_52w']) if row['high_52w'] else None,
                'low_52w': float(row['low_52w']) if row['low_52w'] else None,
                'beta': float(row['beta']) if row['beta'] else None,
            })
    
    if len(stocks_data) < 2:
        missing = [s for s in symbols if s not in [d['symbol'] for d in stocks_data]]
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find: {', '.join(missing)}" if language == 'en' else f"لم يتم العثور على: {', '.join(missing)}"
        }
    
    # Prepare comparison metrics
    metrics = [
        {'key': 'price', 'label': 'Price' if language == 'en' else 'السعر'},
        {'key': 'change_percent', 'label': 'Change %' if language == 'en' else 'التغيير %'},
        {'key': 'pe_ratio', 'label': 'P/E Ratio' if language == 'en' else 'مضاعف الربحية'},
        {'key': 'pb_ratio', 'label': 'P/B Ratio' if language == 'en' else 'مضاعف القيمة الدفترية'},
        {'key': 'dividend_yield', 'label': 'Dividend Yield' if language == 'en' else 'عائد التوزيعات'},
        {'key': 'market_cap', 'label': 'Market Cap' if language == 'en' else 'القيمة السوقية'},
        {'key': 'high_52w', 'label': '52W High' if language == 'en' else 'أعلى 52 أسبوع'},
        {'key': 'low_52w', 'label': '52W Low' if language == 'en' else 'أدنى 52 أسبوع'},
        {'key': 'beta', 'label': 'Beta' if language == 'en' else 'بيتا'},
    ]
    
    if language == 'ar':
        message = f"مقارنة بين {stocks_data[0]['name']} و {stocks_data[1]['name']}"
    else:
        message = f"Comparison: {stocks_data[0]['name']} vs {stocks_data[1]['name']}"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'compare_table',
                'title': 'Stock Comparison' if language == 'en' else 'مقارنة الأسهم',
                'data': {
                    'stocks': stocks_data,
                    'metrics': metrics
                }
            }
        ],
        'chart': {
            'type': 'line',
            'symbol': f"{symbols[0]} vs {symbols[1]}",
            'title': message,
            'data': [],  # Would need to fetch OHLC for both and normalize
            'range': '1M'
        },
        'actions': [
            {'label': f'{symbols[0]} Details', 'action_type': 'query', 'payload': f'Tell me about {symbols[0]}'},
            {'label': f'{symbols[1]} Details', 'action_type': 'query', 'payload': f'Tell me about {symbols[1]}'},
        ]
    }
