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


def _format_compact_number(value: Optional[float]) -> str:
    if value is None:
        return "N/A"
    if abs(value) >= 1_000_000_000:
        return f"{value/1_000_000_000:.2f}B"
    if abs(value) >= 1_000_000:
        return f"{value/1_000_000:.2f}M"
    if abs(value) >= 1_000:
        return f"{value/1_000:.2f}K"
    return f"{value:.2f}"


def _format_compare_value(value: Any, fmt: Optional[str], language: str = "en") -> str:
    if value is None:
        return "N/A" if language == "en" else "غير متاح"
    try:
        num = float(value)
    except Exception:
        return str(value)

    if fmt == "pct":
        return f"{num:.2f}%"
    if fmt == "compact":
        return _format_compact_number(num)
    return f"{num:.2f}"




async def handle_compare_stocks(
    conn: asyncpg.Connection,
    symbols: List[str],
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle COMPARE_STOCKS intent.
    """
    # AUTO-PEER LOGIC: If only 1 symbol, find a competitor in same sector
    if not symbols:
        return {
            'success': False,
            'error': 'insufficient_symbols',
            'message': "Please specify a stock to compare" if language == 'en' else "يرجى تحديد سهم للمقارنة"
        }
        
    if len(symbols) == 1:
        # Fetch sector of the first symbol
        first_symbol = symbols[0]
        # Normalize first
        candidates = [first_symbol]
        if "." not in first_symbol: candidates.append(f"{first_symbol}.CA")
        
        sector_row = None
        for cand in candidates:
             sector_row = await conn.fetchrow("SELECT sector_name, market_code FROM market_tickers WHERE symbol = $1", cand)
             if sector_row:
                 first_symbol = cand # Use correct symbol
                 break
        
        if sector_row and sector_row['sector_name']:
            # Find largest competitor in same sector (excluding self)
            peer_row = await conn.fetchrow("""
                SELECT symbol FROM market_tickers 
                WHERE sector_name = $1 AND symbol != $2 AND market_code = $3
                ORDER BY market_cap DESC LIMIT 1
            """, sector_row['sector_name'], first_symbol, sector_row['market_code'])
            
            if peer_row:
                symbols.append(peer_row['symbol'])
                # Append to list so loop below processes both
            else:
                 return {
                    'success': False,
                    'error': 'no_peers_found',
                    'message': f"No competitors found for {first_symbol}" if language == 'en' else f"لا يوجد منافسين لـ {first_symbol}"
                }
        else:
             return {
                'success': False,
                'error': 'symbol_not_found',
                'message': f"Could not find stock {first_symbol}" if language == 'en' else f"لم يتم العثور على السهم {first_symbol}"
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
             # candidates.append(f"{symbol}.SE") # Saudi - DISABLED per user request (EGX Only)
        
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
        
        if not row:
            # Skip if not found
            print(f"[COMPARE] Skipped unknown symbol: {symbol}")
            continue
        
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
                    payout_ratio
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
            {'key': 'ev_ebitda', 'label': 'EV/EBITDA', 'label_ar': 'قيمة المنشأة إلى الأرباح التشغيلية', 'direction': 'min'},
            {'key': 'ev_sales', 'label': 'EV/Sales', 'label_ar': 'قيمة المنشأة إلى المبيعات', 'direction': 'min'},
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
            {'key': 'altman_z_score', 'label': 'Altman Z-Score', 'label_ar': 'مؤشر أمان ألتمان', 'direction': 'max'},
            {'key': 'piotroski_f_score', 'label': 'Piotroski F-Score', 'label_ar': 'مؤشر قوة بيوتروسكي', 'direction': 'max'},
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

    # ========================================================================
    # NEW: Generate CharacterCards (Stock Personalities)
    # ========================================================================
    # These give each stock a memorable identity based on data-driven heuristics
    character_cards = []
    
    for i, stock in enumerate(stocks_data):
        other = stocks_data[1 - i]  # The other stock for comparison
        
        # Determine personality based on data
        profile_emoji = "📊"
        nickname = stock['symbol']
        profile_text = ""
        good_points = []
        bad_points = []
        
        # Market Cap comparison
        if stock.get('market_cap') and other.get('market_cap'):
            if stock['market_cap'] > other['market_cap'] * 2:
                profile_emoji = "🏋️"
                nickname = "القائد السوقي" if language == 'ar' else "Market Leader"
                profile_text = (
                    f"مهيمن بالحجم. القيمة السوقية {stock['market_cap'] / 1e9:.1f} مليار." if language == 'ar'
                    else f"Dominant Scale. Market cap {stock['market_cap'] / 1e9:.1f}B."
                )
                good_points.append("مزايا الحجم والقيادة" if language == 'ar' else "Scale leadership advantages")
            elif stock['market_cap'] < other['market_cap'] / 2:
                profile_emoji = "🌱"
                nickname = "المنافس الصاعد" if language == 'ar' else "Emerging Challenger"
                profile_text = (
                    "أصغر حجماً لكنه يتمتع بالمرونة وإمكانات النمو." if language == 'ar'
                    else "Smaller capitalization with potential agility."
                )
                good_points.append("مساحة نمو أكبر" if language == 'ar' else "More room to grow")
                bad_points.append("قوة سوقية أقل" if language == 'ar' else "Less market power")
        
        # Valuation positioning
        if stock.get('pe_ratio') and other.get('pe_ratio'):
            if stock['pe_ratio'] < other['pe_ratio']:
                if not nickname or nickname == stock['symbol']:
                    profile_emoji = "💰"
                    nickname = "فرصة قيمة" if language == 'ar' else "Value Opportunity"
                    profile_text = (
                        f"يتداول بمضاعفات جذابة. مكرر الربحية {stock['pe_ratio']:.1f}x." if language == 'ar'
                        else f"Attractive valuation. P/E of {stock['pe_ratio']:.1f}x."
                    )
                good_points.append(
                    f"أرخص عند مكرر ربحية {stock['pe_ratio']:.1f}x" if language == 'ar'
                    else f"Cheaper at {stock['pe_ratio']:.1f}x P/E"
                )
            else:
                bad_points.append(
                    f"أغلى عند مكرر ربحية {stock['pe_ratio']:.1f}x" if language == 'ar'
                    else f"Pricier at {stock['pe_ratio']:.1f}x P/E"
                )
        
        # Profitability
        if stock.get('profit_margin') and other.get('profit_margin'):
            if stock['profit_margin'] > other['profit_margin']:
                good_points.append(
                    f"هوامش ربح أعلى ({stock['profit_margin']:.1f}%)" if language == 'ar'
                    else f"Higher margins ({stock['profit_margin']:.1f}%)"
                )
            else:
                bad_points.append(
                    f"هوامش ربح أقل ({stock['profit_margin']:.1f}%)" if language == 'ar'
                    else f"Lower margins ({stock['profit_margin']:.1f}%)"
                )
        
        # Growth
        if stock.get('revenue_growth'):
            if stock['revenue_growth'] > 10:
                good_points.append(
                    f"نمو قوي بالإيرادات ({stock['revenue_growth']:.1f}%)" if language == 'ar'
                    else f"Growing revenue ({stock['revenue_growth']:.1f}%)"
                )
            elif stock['revenue_growth'] < 0:
                bad_points.append(
                    f"تراجع الإيرادات ({stock['revenue_growth']:.1f}%)" if language == 'ar'
                    else f"Revenue declining ({stock['revenue_growth']:.1f}%)"
                )
        
        # Dividend income
        if stock.get('dividend_yield'):
            if stock['dividend_yield'] > 3:
                good_points.append(
                    f"عائد توزيعات مرتفع ({stock['dividend_yield']:.1f}%)" if language == 'ar'
                    else f"High dividend ({stock['dividend_yield']:.1f}%)"
                )
        
        # Fallback profile
        if not profile_text:
            profile_text = "أداء قوي ضمن القطاع." if language == 'ar' else "Strong sector performer."
        if not nickname or nickname == stock['symbol']:
            nickname = f"السهم المنافس {i+1}" if language == 'ar' else f"Peer Stock {i+1}"
        
        character_cards.append({
            'emoji': profile_emoji,
            'nickname': nickname,
            'ticker': stock['symbol'],
            'company_name': stock['name'],
            'profile': profile_text,
            'good': good_points[:3],  # Limit to 3
            'bad': bad_points[:2]     # Limit to 2
        })

    # Build top-level comparison table payload for WorldClassMessage renderer
    comparison_rows = []
    for metric in flat_metrics[:16]:
        key = metric.get('key')
        if not key:
            continue
        comparison_rows.append({
            'metric': metric.get('label', key),
            'values': [
                _format_compare_value(stock.get(key), metric.get('format'), language)
                for stock in stocks_data
            ],
            'winner_symbol': metric.get('winner_symbol')
        })

    comparison_table = {
        'title': 'Peer Comparison' if language == 'en' else 'مقارنة الأقران',
        'icon': '⚖️',
        'headers': ['Metric' if language == 'en' else 'المؤشر'] + [stock['symbol'] for stock in stocks_data],
        'rows': comparison_rows
    }

    framework_card = {
        'icon': '🧭',
        'title': 'COMPARISON FRAMEWORK' if language == 'en' else 'إطار المقارنة',
        'subtitle': 'Valuation • Quality • Growth • Risk' if language == 'en' else 'تقييم • جودة • نمو • مخاطر',
        'items': [
            'Valuation: P/E, P/B, EV/EBITDA' if language == 'en' else 'التقييم: مضاعف الربحية ومضاعف الدفترية وقيمة المنشأة إلى الأرباح التشغيلية',
            'Profitability: margins and capital efficiency' if language == 'en' else 'الربحية: الهوامش وكفاءة رأس المال',
            'Growth momentum: revenue, earnings, EPS' if language == 'en' else 'زخم النمو: الإيرادات والأرباح وربحية السهم',
            'Risk profile: leverage and balance-sheet resilience' if language == 'en' else 'ملف المخاطر: الرافعة المالية ومتانة المركز المالي',
        ],
        'border_color': 'blue',
    }

    disclaimer_card = {
        'icon': '⚠️',
        'title': 'Educational Comparison' if language == 'en' else 'مقارنة تعليمية',
        'text': (
            'This comparison is educational and not a personalized investment recommendation.'
            if language == 'en'
            else 'هذه المقارنة تعليمية وليست توصية استثمارية شخصية.'
        ),
        'variant': 'warning'
    }

    return {
        'success': True,
        'message': message,
        'conversational_text': message,
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
        'comparison_table': comparison_table,
        'framework_card': framework_card,
        # NEW: Character Cards for stock personalities
        'character_cards': character_cards,
        'insight_cards': [
            {
                'variant': 'info',
                'title': '🧠 Comparison Snapshot' if language == 'en' else '🧠 خلاصة المقارنة',
                'items': [
                    (
                        f"{stocks_data[0]['symbol']} vs {stocks_data[1]['symbol']}: review valuation, profitability, growth, and risk together."
                        if language == 'en'
                        else f"مقارنة {stocks_data[0]['symbol']} مع {stocks_data[1]['symbol']} يجب أن تجمع بين التقييم والربحية والنمو والمخاطر."
                    )
                ]
            }
        ],
        'disclaimer_card': disclaimer_card,
        'learning_section': {
            'title': 'ANALYSIS INSIGHTS' if language == 'en' else 'تحليل الخبراء',
            'items': [
                (
                    "**Profitability:** " + (
                        f"{stocks_data[0]['symbol']} leads with higher margins"
                        if (stocks_data[0].get('profit_margin') or 0) > (stocks_data[1].get('profit_margin') or 0)
                        else f"{stocks_data[1]['symbol']} leads efficiency"
                    )
                ) if language == 'en' else (
                    "**الربحية:** " + (
                        f"{stocks_data[0]['symbol']} يتفوق بهوامش أعلى"
                        if (stocks_data[0].get('profit_margin') or 0) > (stocks_data[1].get('profit_margin') or 0)
                        else f"{stocks_data[1]['symbol']} يتفوق في الكفاءة التشغيلية"
                    )
                ),
                (
                    "**Valuation:** " + (
                        f"{stocks_data[0]['symbol']} is trading at a discount (Lower P/E)"
                        if (stocks_data[0].get('pe_ratio') or 999) < (stocks_data[1].get('pe_ratio') or 999)
                        else f"{stocks_data[1]['symbol']} is trading at a discount"
                    )
                ) if language == 'en' else (
                    "**التقييم:** " + (
                        f"{stocks_data[0]['symbol']} يتداول بخصم سعري (مضاعف ربحية أقل)"
                        if (stocks_data[0].get('pe_ratio') or 999) < (stocks_data[1].get('pe_ratio') or 999)
                        else f"{stocks_data[1]['symbol']} يتداول بخصم سعري"
                    )
                ),
                (
                    "**Growth:** Check revenue growth to see who is expanding faster."
                    if language == 'en' else
                    "**النمو:** راقب نمو الإيرادات لتحديد الشركة الأسرع في التوسع."
                )
            ]
        },
        'follow_up_prompt': f"Which one has better dividends?" if language == 'en' else "أيهما يوزع أرباح أفضل؟",
        'actions': [
            {
                'label': f'💰 {symbols[0]} Financials',
                'label_ar': f'💰 القوائم المالية {symbols[0]}',
                'action_type': 'query',
                'payload': f'Show financials for {symbols[0]}'
            },
            {
                'label': f'💰 {symbols[1]} Financials',
                'label_ar': f'💰 القوائم المالية {symbols[1]}',
                'action_type': 'query',
                'payload': f'Show financials for {symbols[1]}'
            },
        ]
    }
