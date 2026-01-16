"""
Financials Handler - FINANCIALS and REVENUE_TREND intents.
"""

import asyncpg
from typing import Dict, Any, Optional
from datetime import datetime


async def handle_financials(
    conn: asyncpg.Connection,
    symbol: str,
    statement_type: str = 'income',
    period_type: str = 'annual',
    limit: int = 4,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle FINANCIALS intent.
    
    Args:
        conn: Database connection
        symbol: Stock symbol
        statement_type: 'income', 'balance', 'cashflow'
        period_type: 'annual' or 'quarterly'
        limit: Number of periods to show
        language: 'en' or 'ar'
    
    Returns:
        Dict with financial data
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
    
    # Fetch financial statements
    rows = await conn.fetch("""
        SELECT 
            fiscal_year, fiscal_quarter, period_type, statement_type,
            revenue, gross_profit, operating_income, net_income,
            total_assets, total_liabilities, total_equity,
            operating_cashflow, investing_cashflow, financing_cashflow,
            end_date
        FROM financial_statements
        WHERE symbol = $1 AND period_type = $2
        ORDER BY fiscal_year DESC, fiscal_quarter DESC NULLS LAST
        LIMIT $3
    """, symbol, period_type, limit)
    
    if not rows:
        return {
            'success': True,
            'message': f"No financial data available for {symbol}" if language == 'en' else f"لا توجد بيانات مالية لـ {symbol}",
            'cards': []
        }
    
    currency = name_row['currency'] or 'EGP'
    name = name_row['name_ar'] if language == 'ar' else name_row['name_en']
    
    # Format financial data
    periods = []
    for row in rows:
        period_label = f"{row['fiscal_year']}"
        if row['fiscal_quarter']:
            period_label += f" Q{row['fiscal_quarter']}"
        
        periods.append({
            'period': period_label,
            'revenue': float(row['revenue']) if row['revenue'] else None,
            'gross_profit': float(row['gross_profit']) if row['gross_profit'] else None,
            'operating_income': float(row['operating_income']) if row['operating_income'] else None,
            'net_income': float(row['net_income']) if row['net_income'] else None,
            'total_assets': float(row['total_assets']) if row['total_assets'] else None,
            'total_liabilities': float(row['total_liabilities']) if row['total_liabilities'] else None,
            'total_equity': float(row['total_equity']) if row['total_equity'] else None,
        })
    
    statement_titles = {
        'income': {'en': 'Income Statement', 'ar': 'قائمة الدخل'},
        'balance': {'en': 'Balance Sheet', 'ar': 'الميزانية العمومية'},
        'cashflow': {'en': 'Cash Flow Statement', 'ar': 'قائمة التدفقات النقدية'}
    }
    
    title = statement_titles.get(statement_type, statement_titles['income'])[language]
    period_label = 'Annual' if period_type == 'annual' else 'Quarterly'
    period_label_ar = 'سنوي' if period_type == 'annual' else 'ربع سنوي'
    
    if language == 'ar':
        message = f"البيانات المالية لـ {name} ({symbol}) - {period_label_ar}"
    else:
        message = f"{name} ({symbol}) Financials - {period_label}"
    
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
                    'currency': currency
                }
            },
            {
                'type': 'financials_table',
                'title': title,
                'data': {
                    'periods': periods,
                    'currency': currency,
                    'period_type': period_type,
                    'statement_type': statement_type
                }
            }
        ],
        'actions': [
            {'label': 'Annual', 'label_ar': 'سنوي', 'action_type': 'query', 'payload': f'{symbol} annual financials'},
            {'label': 'Quarterly', 'label_ar': 'ربع سنوي', 'action_type': 'query', 'payload': f'{symbol} quarterly financials'},
            {'label': 'View Chart', 'label_ar': 'عرض الشارت', 'action_type': 'query', 'payload': f'Chart {symbol}'},
        ]
    }


async def handle_revenue_trend(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle REVENUE_TREND intent - show revenue over time as line chart."""
    
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
    
    # Fetch revenue data
    rows = await conn.fetch("""
        SELECT fiscal_year, revenue, net_income
        FROM financial_statements
        WHERE symbol = $1 AND period_type = 'annual' AND revenue IS NOT NULL
        ORDER BY fiscal_year ASC
        LIMIT 10
    """, symbol)
    
    if not rows:
        return {
            'success': True,
            'message': f"No revenue data available for {symbol}" if language == 'en' else f"لا توجد بيانات إيرادات لـ {symbol}",
            'cards': []
        }
    
    name = name_row['name_ar'] if language == 'ar' else name_row['name_en']
    
    # Format for line chart
    chart_data = []
    for row in rows:
        chart_data.append({
            'time': str(row['fiscal_year']),
            'revenue': float(row['revenue']) if row['revenue'] else 0,
            'net_income': float(row['net_income']) if row['net_income'] else 0
        })
    
    if language == 'ar':
        message = f"اتجاه الإيرادات لـ {name} ({symbol})"
    else:
        message = f"Revenue Trend for {name} ({symbol})"
    
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
            'type': 'line',
            'symbol': symbol,
            'title': 'Revenue Trend' if language == 'en' else 'اتجاه الإيرادات',
            'data': chart_data,
            'range': 'ALL'
        }
    }
