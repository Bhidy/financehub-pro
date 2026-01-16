"""
Dividends Handler - DIVIDENDS intent.
"""

import asyncpg
from typing import Dict, Any
from datetime import datetime


async def handle_dividends(
    conn: asyncpg.Connection,
    symbol: str,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle DIVIDENDS intent.
    
    Args:
        conn: Database connection
        symbol: Stock symbol
        limit: Number of dividend records to show
        language: 'en' or 'ar'
    
    Returns:
        Dict with dividend history
    """
    # Get company name and current yield
    ticker_row = await conn.fetchrow("""
        SELECT name_en, name_ar, market_code, currency, dividend_yield, last_price
        FROM market_tickers WHERE symbol = $1
    """, symbol)
    
    if not ticker_row:
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find stock: {symbol}" if language == 'en' else f"لم يتم العثور على السهم: {symbol}"
        }
    
    # Fetch dividend history
    rows = await conn.fetch("""
        SELECT ex_date, pay_date, amount, dividend_type, frequency
        FROM dividend_history
        WHERE symbol = $1
        ORDER BY ex_date DESC
        LIMIT $2
    """, symbol, limit)
    
    name = ticker_row['name_ar'] if language == 'ar' else ticker_row['name_en']
    currency = ticker_row['currency'] or 'EGP'
    current_yield = ticker_row['dividend_yield']
    
    if not rows:
        # No dividend history, but still show current yield if available
        if current_yield:
            if language == 'ar':
                message = f"{name} ({symbol}) - عائد التوزيعات الحالي: {current_yield:.2f}%"
            else:
                message = f"{name} ({symbol}) - Current Dividend Yield: {current_yield:.2f}%"
        else:
            if language == 'ar':
                message = f"لا توجد سجلات توزيعات لـ {symbol}"
            else:
                message = f"No dividend history found for {symbol}"
        
        return {
            'success': True,
            'message': message,
            'cards': [
                {
                    'type': 'stock_header',
                    'data': {
                        'symbol': symbol,
                        'name': name,
                        'market_code': ticker_row['market_code'],
                        'currency': currency
                    }
                }
            ] if current_yield else []
        }
    
    # Format dividend records
    dividends = []
    total_annual = 0
    
    for row in rows:
        ex_date = row['ex_date']
        pay_date = row['pay_date']
        amount = row['amount']
        
        dividends.append({
            'ex_date': ex_date.isoformat() if ex_date else None,
            'pay_date': pay_date.isoformat() if pay_date else None,
            'amount': float(amount) if amount else 0,
            'type': row['dividend_type'] or 'Cash',
            'frequency': row['frequency'] or 'Annual'
        })
        
        if amount and ex_date:
            # Sum last year's dividends
            if (datetime.now().date() - ex_date).days <= 365:
                total_annual += float(amount)
    
    # Calculate yield based on total annual dividends
    calculated_yield = None
    if total_annual > 0 and ticker_row['last_price']:
        calculated_yield = (total_annual / float(ticker_row['last_price'])) * 100
    
    if language == 'ar':
        message = f"سجل التوزيعات لـ {name} ({symbol})"
        if current_yield:
            message += f" - العائد: {current_yield:.2f}%"
    else:
        message = f"Dividend History for {name} ({symbol})"
        if current_yield:
            message += f" - Yield: {current_yield:.2f}%"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'stock_header',
                'data': {
                    'symbol': symbol,
                    'name': name,
                    'market_code': ticker_row['market_code'],
                    'currency': currency
                }
            },
            {
                'type': 'dividends_table',
                'title': 'Dividend History' if language == 'en' else 'سجل التوزيعات',
                'data': {
                    'dividends': dividends,
                    'currency': currency,
                    'current_yield': float(current_yield) if current_yield else None,
                    'total_annual': total_annual
                }
            }
        ],
        'actions': [
            {'label': 'Price', 'label_ar': 'السعر', 'action_type': 'query', 'payload': f'Price of {symbol}'},
            {'label': 'Financials', 'label_ar': 'القوائم المالية', 'action_type': 'query', 'payload': f'Financials of {symbol}'},
        ]
    }
