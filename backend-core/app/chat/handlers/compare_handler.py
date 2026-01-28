"""
Compare Handler - COMPARE_STOCKS intent.
"""

import asyncpg
from typing import Dict, Any, List, Optional
import math
from datetime import datetime, timedelta
import tls_client
import asyncio
import logging

import logging

logger = logging.getLogger(__name__)

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
    """
    if not symbols or len(symbols) < 2:
        return {
            'success': False,
            'error': 'insufficient_symbols',
            'message': "Please specify two stocks to compare" if language == 'en' else "يرجى تحديد سهمين للمقارنة"
        }
    
    symbols = symbols[:2]
    
    # 1. Fetch Fundamental Data (Smart Metrics)
    stocks_data = []
    for symbol in symbols:
        # 1. Smart Symbol Lookup (DB-Only)
        # Try exact match first, then common suffixes if not found
        # This solves "Unavailable Data" due to symbol format mismatch (e.g. COMI vs COMI.CA)
        candidates = [symbol]
        if "." not in symbol:
             # Add market suffixes based on common patterns
             candidates.append(f"{symbol}.CA") # Egypt
             candidates.append(f"{symbol}.SR") # Saudi
        
        row = None
        found_symbol = symbol
        
        for cand in candidates:
             row = await conn.fetchrow("""
                    SELECT 
                        symbol, name_en, name_ar, market_code, currency,
                        last_price, change_percent, volume,
                        pe_ratio, pb_ratio, dividend_yield, market_cap,
                        high_52w, low_52w, beta, logo_url
                    FROM market_tickers
                    WHERE symbol = $1
                """, cand)
             if row:
                 found_symbol = cand
                 break
        
        # If still no row, stick to original symbol, handled by 'if row:' check below
        
        # Update symbol for subsequent queries to match the valid DB ticker
        symbol = found_symbol

        # Get deep stats from stock_statistics
        # ENTERPRISE FIX: Wrapped in try/except to prevent schema drift from crashing the app
        stats_row = None
        try:
            stats_row = await conn.fetchrow("""
                SELECT 
                    revenue_growth, profit_growth as net_income_growth, eps_growth,
                    gross_margin, operating_margin, profit_margin, ebitda_margin,
                    roe, roa, roic, roce, asset_turnover,
                    debt_equity, current_ratio, quick_ratio, interest_coverage, altman_z_score, piotroski_f_score,
                    ev_ebitda, ev_sales, peg_ratio, forward_pe, p_ocf,
                    eps, payout_ratio
                FROM stock_statistics
                WHERE symbol = $1
            """, symbol)
        except Exception as e_stats:
            print(f"[COMPARE] Statistics query failed for {symbol}: {e_stats}")
            # Continue to fallback
        
        # Fallback Ratios
        ratios_row = None
        try:
            ratios_row = await conn.fetchrow("""
                SELECT 
                    gross_margin, net_margin as profit_margin, 
                    roe, debt_equity as debt_equity_ratio
                FROM financial_ratios_history 
                WHERE symbol = $1 AND period_type = 'annual'
                ORDER BY fiscal_year DESC 
                LIMIT 1
            """, symbol)
        except Exception as e_ratios:
             print(f"[COMPARE] Ratios query failed for {symbol}: {e_ratios}")

        if row:
            ticker_stats = dict(row)
            name = ticker_stats['name_ar'] if language == 'ar' else ticker_stats['name_en']
            
            data_point = {
                'symbol': ticker_stats['symbol'],
                'name': name,
                'market_code': ticker_stats['market_code'],
                'currency': ticker_stats['currency'],
                'logo_url': ticker_stats.get('logo_url'),
                'price': safe_float(ticker_stats.get('last_price')),
                'change_percent': safe_float(ticker_stats.get('change_percent')),
                'market_cap': int(ticker_stats['market_cap']) if ticker_stats.get('market_cap') else None,
                'volume': int(ticker_stats['volume']) if ticker_stats.get('volume') else None,
                'high_52w': safe_float(ticker_stats.get('high_52w')),
                'low_52w': safe_float(ticker_stats.get('low_52w')),
                'beta': safe_float(ticker_stats.get('beta')),
                'dividend_yield': safe_float(ticker_stats.get('dividend_yield')),
                'pe_ratio': safe_float(ticker_stats.get('pe_ratio')),
                'pb_ratio': safe_float(ticker_stats.get('pb_ratio')),
            }

            if stats_row:
                s_stats = dict(stats_row)
                for k, v in s_stats.items():
                    data_point[k] = safe_float(v)
            
            # Map "net_margin" request to "profit_margin" to prevent crash
            if data_point.get('profit_margin') is None and data_point.get('net_margin') is not None:
                data_point['profit_margin'] = data_point.get('net_margin')
            
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
            'message': f"Could not find: {', '.join(missing)}"
        }


    # 2. Smart Metric Selection
    # Define categories, labels, and "Better" direction (min/max)
    categories_config = {
        'Market Data': [
            {'key': 'market_cap', 'label': 'Market Cap', 'label_ar': 'القيمة السوقية', 'format': 'compact', 'direction': 'max'},
            {'key': 'volume', 'label': 'Volume (Avg)', 'label_ar': 'حجم التداول', 'format': 'compact', 'direction': 'max'},
            {'key': 'change_percent', 'label': 'Daily Change', 'label_ar': 'التغير اليومي', 'format': 'pct', 'direction': 'max'}
        ],
        'Valuation': [
            {'key': 'pe_ratio', 'label': 'P/E Ratio', 'label_ar': 'مضاعف الربحية', 'direction': 'min'},
            {'key': 'forward_pe', 'label': 'Fwd P/E', 'label_ar': 'مكرر مستقبلي', 'direction': 'min'},
            {'key': 'peg_ratio', 'label': 'PEG Ratio', 'label_ar': 'PEG', 'direction': 'min'},
            {'key': 'pb_ratio', 'label': 'P/B Ratio', 'label_ar': 'مضاعف الدفترية', 'direction': 'min'},
            {'key': 'ev_ebitda', 'label': 'EV/EBITDA', 'label_ar': 'EV/EBITDA', 'direction': 'min'},
            {'key': 'ev_sales', 'label': 'EV/Sales', 'label_ar': 'EV/Sales', 'direction': 'min'},
        ],
        'Profitability': [
            {'key': 'profit_margin', 'label': 'Net Margin', 'label_ar': 'هامش صافي الربح', 'format': 'pct', 'direction': 'max'},
            {'key': 'gross_margin', 'label': 'Gross Margin', 'label_ar': 'الهامش الاجمالي', 'format': 'pct', 'direction': 'max'},
            {'key': 'operating_margin', 'label': 'Op. Margin', 'label_ar': 'هامش التشغيل', 'format': 'pct', 'direction': 'max'},
            {'key': 'ebitda_margin', 'label': 'EBITDA Margin', 'label_ar': 'هامش EBITDA', 'format': 'pct', 'direction': 'max'},
        ],
        'Efficiency': [
            {'key': 'roe', 'label': 'ROE', 'label_ar': 'العائد على الحقوق', 'format': 'pct', 'direction': 'max'},
            {'key': 'roce', 'label': 'ROCE', 'label_ar': 'العائد على المال العامل', 'format': 'pct', 'direction': 'max'},
            {'key': 'roic', 'label': 'ROIC', 'label_ar': 'العائد على الاستثمار', 'format': 'pct', 'direction': 'max'},
            {'key': 'asset_turnover', 'label': 'Asset Turnover', 'label_ar': 'معدل دوران الأصول', 'direction': 'max'},
        ],
        'Growth': [
            {'key': 'revenue_growth', 'label': 'Rev Growth', 'label_ar': 'نمو المبيعات', 'format': 'pct', 'direction': 'max'},
            {'key': 'net_income_growth', 'label': 'Profit Growth', 'label_ar': 'نمو الارباح', 'format': 'pct', 'direction': 'max'},
            {'key': 'eps_growth', 'label': 'EPS Growth', 'label_ar': 'نمو ربح السهم', 'format': 'pct', 'direction': 'max'},
        ],
        'Health': [
            {'key': 'altman_z_score', 'label': 'Altman Z-Score', 'label_ar': 'مؤشر أمان (Z)', 'direction': 'max'},
            {'key': 'piotroski_f_score', 'label': 'Piotroski F-Score', 'label_ar': 'مؤشر قوة (F)', 'direction': 'max'},
            {'key': 'debt_equity', 'label': 'Debt / Equity', 'label_ar': 'الديون للملكية', 'direction': 'min'},
            {'key': 'current_ratio', 'label': 'Current Ratio', 'label_ar': 'النسبة الحالية', 'direction': 'max'},
            {'key': 'interest_coverage', 'label': 'Interest Cov.', 'label_ar': 'تغطية الفوائد', 'direction': 'max'},
        ],
        'Dividends': [
            {'key': 'dividend_yield', 'label': 'Div Yield', 'label_ar': 'عائد التوزيعات', 'format': 'pct', 'direction': 'max'},
            {'key': 'payout_ratio', 'label': 'Payout Ratio', 'label_ar': 'نسبة التوزيع', 'format': 'pct', 'direction': 'min'}, 
        ]
    }
    
    final_metrics_map = {}
    
    # Process Categories
    for cat_name, metrics_list in categories_config.items():
        chosen_metrics = []
        
        for m in metrics_list:
            key = m['key']
            
            # STRICT DATA POLICY: Only show if data exists for ALL stocks
            # "Never show NA or dashes"
            values = [s.get(key) for s in stocks_data]
            if any(v is None for v in values):
                continue
                
            # Formatting
            m['label'] = m['label_ar'] if language == 'ar' else m['label']
            
            # Winner Logic
            direction = m.get('direction')
            if direction and len(stocks_data) == 2:
                val1 = values[0]
                val2 = values[1]
                
                # Check for zero/negative handling? Generally float comparison is fine.
                winner_idx = -1
                if direction == 'max':
                    if val1 > val2: winner_idx = 0
                    elif val2 > val1: winner_idx = 1
                elif direction == 'min':
                    if val1 < val2: winner_idx = 0
                    elif val2 < val1: winner_idx = 1
                    
                if winner_idx != -1:
                    m['winner_symbol'] = stocks_data[winner_idx]['symbol']
            
            chosen_metrics.append(m)
            
        if chosen_metrics:
            final_metrics_map[cat_name] = chosen_metrics

    # Flatten for the response
    flat_metrics = []
    # Force specific order
    for cat in ['Market Data', 'Valuation', 'Profitability', 'Efficiency', 'Growth', 'Health', 'Dividends']:
        if cat in final_metrics_map:
            flat_metrics.extend(final_metrics_map[cat])

    message = f"Here is the comparison between {stocks_data[0]['name']} and {stocks_data[1]['name']}"
    if language == 'ar':
        message = f"مقارنة شاملة بين {stocks_data[0]['name']} و {stocks_data[1]['name']}"

    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'compare_table',
                'title': 'Head-to-Head Comparison' if language == 'en' else 'مقارنة رأس برأس',
                'data': {
                    'stocks': stocks_data,
                    'metrics': flat_metrics
                }
            }
        ],
        'chart': None, # Chart Removed as requested
        'learning_section': {
            'title': 'ANALYSIS INSIGHTS' if language == 'en' else 'تحليل الخبراء',
            'items': [
                "**Profitability:** " + (f"{stocks_data[0]['symbol']} leads with higher margins" if (stocks_data[0].get('profit_margin') or 0) > (stocks_data[1].get('profit_margin') or 0) else f"{stocks_data[1]['symbol']} leads efficiency"),
                "**Valuation:** " + (f"{stocks_data[0]['symbol']} is trading at a discount (Lower P/E)" if (stocks_data[0].get('pe_ratio') or 999) < (stocks_data[1].get('pe_ratio') or 999) else f"{stocks_data[1]['symbol']} is trading at a discount"),
                "**Growth:** Check the Revenue Growth metric to see who is expanding faster."
            ]
        },
        'follow_up_prompt': f"Which one has better dividends?" if language == 'en' else "أيهما يوزع أرباح أفضل؟",
        'actions': [
            {'label': f'{symbols[0]} Financials', 'action_type': 'query', 'payload': f'Show financials for {symbols[0]}'},
            {'label': f'{symbols[1]} Financials', 'action_type': 'query', 'payload': f'Show financials for {symbols[1]}'},
        ]
    }

