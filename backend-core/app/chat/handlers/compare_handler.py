"""
Compare Handler - COMPARE_STOCKS intent.
"""

import asyncpg
from typing import Dict, Any, List
import math

def safe_float(val: Any) -> Any:
    if val is None: return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f): return None
        return f
    except: return None


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
        # Get basic ticker info
        row = await conn.fetchrow("""
            SELECT 
                symbol, name_en, name_ar, market_code, currency,
                last_price, change_percent, volume,
                pe_ratio, pb_ratio, dividend_yield, market_cap,
                high_52w, low_52w, beta
            FROM market_tickers
            WHERE symbol = $1
        """, symbol)
        
        # Get deep financial ratios (latest annual from History table)
        ratios_row = await conn.fetchrow("""
            SELECT 
                gross_margin, net_margin as profit_margin, 
                roe, debt_equity as debt_equity_ratio
            FROM financial_ratios_history 
            WHERE symbol = $1 AND period_type = 'annual'
            ORDER BY fiscal_year DESC 
            LIMIT 1
        """, symbol)
        
        # Get live growth stats from stock_statistics
        stats_row = await conn.fetchrow("""
            SELECT revenue_growth, profit_growth as net_income_growth
            FROM stock_statistics
            WHERE symbol = $1
        """, symbol)
        
        if row:
            ticker_stats = dict(row) # Convert to dict
            name = ticker_stats['name_ar'] if language == 'ar' else ticker_stats['name_en']
            data_point = {
                'symbol': ticker_stats['symbol'],
                'name': name,
                'market_code': ticker_stats['market_code'],
                'currency': ticker_stats['currency'],
                'price': safe_float(ticker_stats.get('last_price')),
                'change_percent': safe_float(ticker_stats.get('change_percent')),
                'volume': int(ticker_stats['volume']) if ticker_stats.get('volume') else None,
                'pe_ratio': safe_float(ticker_stats.get('pe_ratio')),
                'pb_ratio': safe_float(ticker_stats.get('pb_ratio')),
                'dividend_yield': safe_float(ticker_stats.get('dividend_yield')),
                'market_cap': int(ticker_stats['market_cap']) if ticker_stats.get('market_cap') else None,
                'high_52w': safe_float(ticker_stats.get('high_52w')),
                'low_52w': safe_float(ticker_stats.get('low_52w')),
                'beta': safe_float(ticker_stats.get('beta')),
            }

            # Add growth from stats_row (live)
            if stats_row:
                s_stats = dict(stats_row)
                data_point.update({
                    'revenue_growth': safe_float(s_stats.get('revenue_growth')),
                    'net_income_growth': safe_float(s_stats.get('net_income_growth')),
                })
            else:
                data_point.update({'revenue_growth': None, 'net_income_growth': None})

            # Add deep ratios if available
            if ratios_row:
                r_stats = dict(ratios_row) # Convert to dict
                data_point.update({
                    'gross_margin': safe_float(r_stats.get('gross_margin')),
                    'profit_margin': safe_float(r_stats.get('profit_margin')),
                    'roe': safe_float(r_stats.get('roe')),
                    'debt_equity_ratio': safe_float(r_stats.get('debt_equity_ratio')),
                })
            else:
                # Fill with None if missing
                data_point.update({
                   'gross_margin': None, 'profit_margin': None, 
                   'roe': None, 'debt_equity_ratio': None
                })

            stocks_data.append(data_point)
    
    if len(stocks_data) < 2:
        missing = [s for s in symbols if s not in [d['symbol'] for d in stocks_data]]
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find: {', '.join(missing)}" if language == 'en' else f"لم يتم العثور على: {', '.join(missing)}"
        }
    
    # Prepare comparison metrics (Expanded for Deep Insights)
    metrics = [
        {'key': 'price', 'label': 'Price' if language == 'en' else 'السعر'},
        {'key': 'change_percent', 'label': 'Change %' if language == 'en' else 'التغيير %'},
        {'key': 'revenue_growth', 'label': 'Rev Growth' if language == 'en' else 'نمو المبيعات', 'format': 'pct'},
        {'key': 'net_income_growth', 'label': 'Profit Growth' if language == 'en' else 'نمو الارباح', 'format': 'pct'},
        {'key': 'gross_margin', 'label': 'Gross Margin' if language == 'en' else 'هامش الربح الاجمالي', 'format': 'pct'},
        {'key': 'profit_margin', 'label': 'Net Margin' if language == 'en' else 'هامش صافي الربح', 'format': 'pct'},
        {'key': 'roe', 'label': 'ROE' if language == 'en' else 'العائد على حقوق الملكية', 'format': 'pct'},
        {'key': 'pe_ratio', 'label': 'P/E Ratio' if language == 'en' else 'مضاعف الربحية'},
        {'key': 'pb_ratio', 'label': 'P/B Ratio' if language == 'en' else 'مضاعف القيمة الدفترية'},
        {'key': 'debt_equity_ratio', 'label': 'Debt / Equity' if language == 'en' else 'الديون لحقوق الملكية'},
        {'key': 'dividend_yield', 'label': 'Dividend Yield' if language == 'en' else 'عائد التوزيعات', 'format': 'pct'},
        {'key': 'market_cap', 'label': 'Market Cap' if language == 'en' else 'القيمة السوقية', 'format': 'compact'},
        {'key': 'high_52w', 'label': '52W High' if language == 'en' else 'أعلى 52 أسبوع'},
        {'key': 'low_52w', 'label': '52W Low' if language == 'en' else 'أدنى 52 أسبوع'},
        {'key': 'beta', 'label': 'Beta' if language == 'en' else 'بيتا'},
    ]
    
    # Filter out empty rows (metrics where no stock has data)
    final_metrics = []
    for m in metrics:
        key = m['key']
        # Check if ANY stock has a non-None value for this key
        has_data = any(s.get(key) is not None for s in stocks_data)
        if has_data:
            final_metrics.append(m)
    
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
                'title': 'Deep Comparison' if language == 'en' else 'مقارنة شاملة',
                'data': {
                    'stocks': stocks_data,
                    'metrics': final_metrics
                }
            }
        ],
        'chart': {
            'type': 'line',
            'symbol': f"{symbols[0]} vs {symbols[1]}",
            'title': message,
            'data': [],
            'range': '1M'
        },
        'actions': [
            {'label': f'{symbols[0]} Deep Dive', 'action_type': 'query', 'payload': f'Analyze {symbols[0]} financial health'},
            {'label': f'{symbols[1]} Deep Dive', 'action_type': 'query', 'payload': f'Analyze {symbols[1]} financial health'},
        ]
    }
