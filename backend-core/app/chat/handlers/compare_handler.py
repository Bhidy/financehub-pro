"""
Compare Handler - COMPARE_STOCKS intent.
"""

import asyncpg
from typing import Dict, Any, List
import math
from datetime import datetime, timedelta
from .chart_handler import fetch_ohlc_live

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
        
        # Get deep stats from stock_statistics (The Gold Mine)
        stats_row = await conn.fetchrow("""
            SELECT 
                revenue_growth, profit_growth as net_income_growth, eps_growth,
                gross_margin, operating_margin, net_margin as profit_margin,
                roe, roa, roic, roce, asset_turnover,
                debt_equity, current_ratio, quick_ratio, interest_coverage, altman_z_score,
                ev_ebitda, ev_sales, peg_ratio, forward_pe, p_ocf,
                eps
            FROM stock_statistics
            WHERE symbol = $1
        """, symbol)
        
        # Fallback Ratios
        ratios_row = await conn.fetchrow("""
            SELECT 
                gross_margin, net_margin as profit_margin, 
                roe, debt_equity as debt_equity_ratio
            FROM financial_ratios_history 
            WHERE symbol = $1 AND period_type = 'annual'
            ORDER BY fiscal_year DESC 
            LIMIT 1
        """, symbol)

        if row:
            ticker_stats = dict(row)
            name = ticker_stats['name_ar'] if language == 'ar' else ticker_stats['name_en']
            
            # Base Data
            data_point = {
                'symbol': ticker_stats['symbol'],
                'name': name,
                'market_code': ticker_stats['market_code'],
                'currency': ticker_stats['currency'],
                'price': safe_float(ticker_stats.get('last_price')),
                'change_percent': safe_float(ticker_stats.get('change_percent')),
                'market_cap': int(ticker_stats['market_cap']) if ticker_stats.get('market_cap') else None,
                'volume': int(ticker_stats['volume']) if ticker_stats.get('volume') else None,
                'high_52w': safe_float(ticker_stats.get('high_52w')),
                'low_52w': safe_float(ticker_stats.get('low_52w')),
                'beta': safe_float(ticker_stats.get('beta')),
                'dividend_yield': safe_float(ticker_stats.get('dividend_yield')),
                # Primary Valuation
                'pe_ratio': safe_float(ticker_stats.get('pe_ratio')),
                'pb_ratio': safe_float(ticker_stats.get('pb_ratio')),
            }

            # Merge Deep Stats
            if stats_row:
                s_stats = dict(stats_row)
                for k, v in s_stats.items():
                    data_point[k] = safe_float(v)
            
            # Merge History Fallback (if missing in stats)
            if ratios_row:
                r_stats = dict(ratios_row)
                if data_point.get('gross_margin') is None: data_point['gross_margin'] = safe_float(r_stats.get('gross_margin'))
                if data_point.get('profit_margin') is None: data_point['profit_margin'] = safe_float(r_stats.get('profit_margin'))
                if data_point.get('roe') is None: data_point['roe'] = safe_float(r_stats.get('roe'))
                if data_point.get('debt_equity') is None: data_point['debt_equity'] = safe_float(r_stats.get('debt_equity_ratio'))

            stocks_data.append(data_point)

    if len(stocks_data) < 2:
        missing = [s for s in symbols if s not in [d['symbol'] for d in stocks_data]]
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find: {', '.join(missing)}" if language == 'en' else f"لم يتم العثور على: {', '.join(missing)}"
        }

    # --- SMART METRIC SELECTION ---
    # Define Categories with Priority Candidates
    categories = {
        'Overview': [
            {'key': 'price', 'label': 'Price', 'label_ar': 'السعر'},
            {'key': 'change_percent', 'label': 'Change %', 'label_ar': 'التغيير %'},
            {'key': 'market_cap', 'label': 'Market Cap', 'label_ar': 'القيمة السوقية', 'format': 'compact'},
        ],
        'Valuation': [
            {'key': 'pe_ratio', 'label': 'P/E Ratio', 'label_ar': 'مضاعف الربحية'},
            {'key': 'forward_pe', 'label': 'Fwd P/E', 'label_ar': 'مكرر مستقبلي'},
            {'key': 'peg_ratio', 'label': 'PEG Ratio', 'label_ar': 'PEG'},
            {'key': 'ev_ebitda', 'label': 'EV/EBITDA', 'label_ar': 'EV/EBITDA'},
            {'key': 'pb_ratio', 'label': 'P/B Ratio', 'label_ar': 'مضاعف الدفترية'},
            {'key': 'ev_sales', 'label': 'EV/Sales', 'label_ar': 'EV/Sales'},
        ],
        'Profitability': [
            {'key': 'profit_margin', 'label': 'Net Margin', 'label_ar': 'هامش صافي الربح', 'format': 'pct'},
            {'key': 'gross_margin', 'label': 'Gross Margin', 'label_ar': 'الهامش الاجمالي', 'format': 'pct'},
            {'key': 'operating_margin', 'label': 'Op. Margin', 'label_ar': 'هامش التشغيل', 'format': 'pct'},
        ],
        'Efficiency': [
            {'key': 'roe', 'label': 'ROE', 'label_ar': 'العائد على الحقوق', 'format': 'pct'},
            {'key': 'roce', 'label': 'ROCE', 'label_ar': 'العائد على المال العامل', 'format': 'pct'},
            {'key': 'roic', 'label': 'ROIC', 'label_ar': 'العائد على الاستثمار', 'format': 'pct'},
            {'key': 'roa', 'label': 'ROA', 'label_ar': 'العائد على الأصول', 'format': 'pct'},
        ],
        'Growth': [
            {'key': 'revenue_growth', 'label': 'Rev Growth', 'label_ar': 'نمو المبيعات', 'format': 'pct'},
            {'key': 'net_income_growth', 'label': 'Profit Growth', 'label_ar': 'نمو الارباح', 'format': 'pct'},
            {'key': 'eps_growth', 'label': 'EPS Growth', 'label_ar': 'نمو الربحية', 'format': 'pct'},
        ],
        'Health': [
            {'key': 'altman_z_score', 'label': 'Altman Z', 'label_ar': 'مؤشر أمان'},
            {'key': 'interest_coverage', 'label': 'Interest Cov.', 'label_ar': 'تغطية الفوائد'},
            {'key': 'current_ratio', 'label': 'Current Ratio', 'label_ar': 'النسبة الحالية'},
            {'key': 'debt_equity', 'label': 'Debt / Equity', 'label_ar': 'الديون للملكية'},
        ],
        'Dividends': [
            {'key': 'dividend_yield', 'label': 'Div Yield', 'label_ar': 'عائد التوزيعات', 'format': 'pct'},
        ],
        'Misc': [
           {'key': 'beta', 'label': 'Beta', 'label_ar': 'بيتا'},
           {'key': 'eps', 'label': 'EPS', 'label_ar': 'ربحية السهم'},
        ]
    }
    
    final_metrics = []
    
    # 1. Overview: Always Include
    for m in categories['Overview']:
        m['label'] = m['label_ar'] if language == 'ar' else m['label']
        final_metrics.append(m)
        
    # 2. Dynamic Selection for others
    # Strategy: Pick up to 2 best from each category
    for cat_name, metrics_list in categories.items():
        if cat_name == 'Overview': continue
        
        added_count = 0
        limit = 2
        if cat_name == 'Valuation': limit = 3 # Allow more valuation
        
        for m in metrics_list:
            if added_count >= limit: break
            
            key = m['key']
            # Check availability: At least one stock has non-None, non-Zero data
            has_data = any(s.get(key) is not None for s in stocks_data)
            
            if has_data:
                m['label'] = m['label_ar'] if language == 'ar' else m['label']
                final_metrics.append(m)
                added_count += 1
    
    # --- CHART GENERATION (Normalized Percentage Comparison) ---
    chart_data = []
    try:
        history_map = {}
        target_days = 30 # Default to 1 Month comp
        start_date = datetime.now() - timedelta(days=target_days)
        
        for sym in symbols:
            # 1. Try DB
            rows = await conn.fetch("""
                SELECT date, close
                FROM ohlc_data
                WHERE symbol = $1 AND date >= $2
                ORDER BY date ASC
            """, sym, start_date.date())
            
            series = []
            if rows:
                for r in rows:
                    if r.get('close'):
                        series.append({'time': r['date'].isoformat(), 'val': float(r['close'])})
            
            # 2. Live Fallback
            if not series or len(series) < (target_days * 0.5):
                live = await fetch_ohlc_live(sym, limit=target_days + 20)
                if live:
                    # In case of fallback, try to parse
                    series = []
                    for pt in live:
                        pt_date_str = pt.get('time')
                        try:
                            pt_date = datetime.strptime(pt_date_str, '%Y-%m-%d').date()
                            if pt_date >= start_date.date():
                                series.append({'time': pt_date_str, 'val': float(pt.get('close', 0))})
                        except: pass
            
            # Sort just in case
            series.sort(key=lambda x: x['time'])
            history_map[sym] = series

        # 3. Normalize to Percentage Change (Starting at 0%)
        # Get all unique dates
        all_dates = set()
        for sym in symbols:
            for pt in history_map.get(sym, []):
                all_dates.add(pt['time'])
        
        sorted_dates = sorted(list(all_dates))
        
        # Calculate bases (First available price for each stock)
        bases = {}
        for sym in symbols:
            series = history_map.get(sym, [])
            if series:
                bases[sym] = series[0]['val']
            else:
                bases[sym] = None

        # Build chart points
        for dt in sorted_dates:
            point = {'time': dt}
            
            for sym in symbols:
                # Find value for this date
                val = next((item['val'] for item in history_map.get(sym, []) if item['time'] == dt), None)
                
                if val is not None and bases[sym] and bases[sym] > 0:
                    # PCT Change formula: ((Price - Base) / Base) * 100
                    pct_change = ((val - bases[sym]) / bases[sym]) * 100.0
                    point[sym] = round(pct_change, 2)
                    
            chart_data.append(point)

    except Exception as e:
        print(f"[COMPARE] Chart Generation Failed: {e}")
        chart_data = [] # Fallback to no chart

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
            'title': f"Performance Comparison (1M)" if language == 'en' else "مقارنة الأداء (شهر)",
            'data': chart_data,
            'range': '1M'
        },
        'actions': [
            {'label': f'{symbols[0]} Deep Dive', 'action_type': 'query', 'payload': f'Analyze {symbols[0]} financial health'},
            {'label': f'{symbols[1]} Deep Dive', 'action_type': 'query', 'payload': f'Analyze {symbols[1]} financial health'},
        ]
    }
