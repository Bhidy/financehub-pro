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

logger = logging.getLogger(__name__)

def safe_float(val: Any) -> Any:
    if val is None: return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f): return None
        return f
    except: return None

# --- EMBEDDED LIVE FETCH (To avoid circular imports) ---
async def fetch_ohlc_live_embedded(symbol: str, limit: int = 200) -> Optional[List[Dict]]:
    """
    Fetch OHLC data directly from StockAnalysis.com Internal API.
    Embedded in compare_handler to ensure isolation.
    """
    # Sanitize symbol
    clean_symbol = symbol.upper().strip()
    # Handle market prefixes if present (e.g. EGX:COMI -> COMI)
    if ":" in clean_symbol:
        clean_symbol = clean_symbol.split(":")[-1]
        
    url = f"https://stockanalysis.com/api/symbol/a/EGX-{clean_symbol}/history?type=full"
    
    try:
        session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": f"https://stockanalysis.com/quote/egx/{clean_symbol.lower()}/history/",
            "Accept": "application/json"
        }
        
        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: session.get(url, headers=headers, timeout_seconds=10)
        )
        
        if resp.status_code != 200:
            print(f"[COMPARE LIVE] API HTTP {resp.status_code} for {clean_symbol}") # Print to logs
            return None
            
        data = resp.json()
        history = []
        
        if 'data' in data and 'data' in data['data']:
            for row in data['data']['data']:
                try:
                    history.append({
                        "time": row.get('t'), # YYYY-MM-DD
                        "val": float(row.get('c', 0)) # Close price
                    })
                except:
                    continue
        
        history.sort(key=lambda x: x['time'])
        return history
            
    except Exception as e:
        print(f"[COMPARE LIVE] Error fetching {clean_symbol}: {e}")
        return None


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
        
        # Get deep stats from stock_statistics
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
                'pe_ratio': safe_float(ticker_stats.get('pe_ratio')),
                'pb_ratio': safe_float(ticker_stats.get('pb_ratio')),
            }

            if stats_row:
                s_stats = dict(stats_row)
                for k, v in s_stats.items():
                    data_point[k] = safe_float(v)
            
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
        ],
        'Growth': [
            {'key': 'revenue_growth', 'label': 'Rev Growth', 'label_ar': 'نمو المبيعات', 'format': 'pct'},
            {'key': 'net_income_growth', 'label': 'Profit Growth', 'label_ar': 'نمو الارباح', 'format': 'pct'},
        ],
        'Health': [
            {'key': 'altman_z_score', 'label': 'Altman Z', 'label_ar': 'مؤشر أمان'},
            {'key': 'debt_equity', 'label': 'Debt / Equity', 'label_ar': 'الديون للملكية'},
            {'key': 'current_ratio', 'label': 'Current Ratio', 'label_ar': 'النسبة الحالية'},
        ],
        'Dividends': [
            {'key': 'dividend_yield', 'label': 'Div Yield', 'label_ar': 'عائد التوزيعات', 'format': 'pct'},
        ]
    }
    
    final_metrics = []
    
    for m in categories['Overview']:
        m['label'] = m['label_ar'] if language == 'ar' else m['label']
        final_metrics.append(m)
        
    for cat_name, metrics_list in categories.items():
        if cat_name == 'Overview': continue
        
        added_count = 0
        limit = 2
        if cat_name == 'Valuation': limit = 3
        
        for m in metrics_list:
            if added_count >= limit: break
            key = m['key']
            has_data = any(s.get(key) is not None for s in stocks_data)
            if has_data:
                m['label'] = m['label_ar'] if language == 'ar' else m['label']
                final_metrics.append(m)
                added_count += 1
    
    # 3. Chart Generation (Enhanced Robustness)
    chart_data = []
    try:
        history_map = {}
        target_days = 30
        start_date = datetime.now() - timedelta(days=target_days)
        
        # Parallel fetch for DB or fallback
        # First, try DB for all
        for sym in symbols:
            series = []
            rows = await conn.fetch("""
                SELECT date, close
                FROM ohlc_data
                WHERE symbol = $1 AND date >= $2
                ORDER BY date ASC
            """, sym, start_date.date())
            
            if rows:
                for r in rows:
                    if r.get('close'):
                        series.append({'time': r['date'].isoformat(), 'val': float(r['close'])})
            
            # If DB Sparse, trigger embedded Live Fetch
            if not series or len(series) < (target_days * 0.5):
                live = await fetch_ohlc_live_embedded(sym, limit=target_days + 30)
                if live:
                    series = []
                    for pt in live:
                        pt_date_str = pt.get('time')
                        if not pt_date_str: continue
                        try:
                            pt_date = datetime.strptime(pt_date_str, '%Y-%m-%d').date()
                            if pt_date >= start_date.date():
                                series.append({'time': pt_date_str, 'val': float(pt.get('val', 0))})
                        except: pass
            
            series.sort(key=lambda x: x['time'])
            history_map[sym] = series

        # Normalize
        all_dates = set()
        for sym in symbols:
            for pt in history_map.get(sym, []):
                all_dates.add(pt['time'])
        
        if all_dates:
            sorted_dates = sorted(list(all_dates))
            bases = {}
            for sym in symbols:
                series = history_map.get(sym, [])
                if series:
                    bases[sym] = series[0]['val']
                else:
                    bases[sym] = None

            for dt in sorted_dates:
                point = {'time': dt}
                for sym in symbols:
                    # Find value for this date
                    val = next((item['val'] for item in history_map.get(sym, []) if item['time'] == dt), None)
                    
                    if val is not None and bases[sym] and bases[sym] > 0:
                        pct_change = ((val - bases[sym]) / bases[sym]) * 100.0
                        point[sym] = round(pct_change, 2)
                    # If missing, we leave it out (ApexCharts handles gaps or we can interpolate)
                
                # Only add point if at least one symbol has data
                if len(point) > 1: 
                    chart_data.append(point)

    except Exception as e:
        print(f"[COMPARE] Chart Logic Failed: {e}")
        chart_data = []

    message = f"Comparison: {stocks_data[0]['name']} vs {stocks_data[1]['name']}"
    if language == 'ar':
        message = f"مقارنة بين {stocks_data[0]['name']} و {stocks_data[1]['name']}"

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
            'title': f"Relative Performance (1M)" if language == 'en' else "الأداء النسبي (شهر)",
            'data': chart_data,
            'range': '1M'
        },
        'actions': [
            {'label': f'{symbols[0]} Deep Dive', 'action_type': 'query', 'payload': f'Analyze {symbols[0]} financial health'},
            {'label': f'{symbols[1]} Deep Dive', 'action_type': 'query', 'payload': f'Analyze {symbols[1]} financial health'},
        ]
    }
