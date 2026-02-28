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

# Sectors that should be treated as "no sector" for peer matching
_INVALID_SECTORS = {'UNCLASSIFIED', 'N/A', ''}

def _is_valid_sector(sector_name) -> bool:
    """Return True if sector_name is a real, usable sector for peer matching."""
    if not sector_name:
        return False
    return str(sector_name).strip().upper() not in _INVALID_SECTORS

def _canonical_symbol(symbol: str) -> str:
    """Normalize symbol for duplicate detection (COMI == COMI.CA)."""
    if not symbol:
        return ""
    return str(symbol).strip().upper().split(".")[0]

def _dedupe_symbol_inputs(symbols: List[str]) -> List[str]:
    """Deduplicate symbol inputs by canonical form while preserving order."""
    out: List[str] = []
    seen = set()
    for raw in symbols or []:
        sym = str(raw).strip().upper()
        if not sym:
            continue
        canonical = _canonical_symbol(sym)
        if canonical in seen:
            continue
        seen.add(canonical)
        out.append(sym)
    return out

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


# ---------------------------------------------------------------------------
# Issue 3 + 4 Fix: Materiality-aware winner declaration
# ---------------------------------------------------------------------------
# Percentage-based metrics require a 30% RELATIVE difference before we claim
# one is "better" than the other. E.g. 20% margin vs 22% margin = only 10%
# relative difference → too close to call → no winner declared.
_PCT_METRICS = {
    'profit_margin', 'gross_margin', 'operating_margin', 'ebitda_margin',
    'roe', 'roa', 'roic', 'roce',
    'revenue_growth', 'eps_growth',
}
# Absolute minimum difference thresholds for non-pct metrics
_ABS_MIN_DIFF = {
    'change_percent': 0.50,   # Daily change: must differ by 0.5 pp
    'pe_ratio':       1.50,   # PE: must differ by at least 1.5x
    'forward_pe':     1.50,
    'pb_ratio':       0.20,
    'peg_ratio':      0.20,
    'ev_ebitda':      1.00,
    'ev_sales':       0.30,
    'debt_equity':    0.15,
    'current_ratio':  0.20,
    'interest_coverage': 1.00,
    'altman_z_score': 0.30,
    'piotroski_f_score': 1.00,
    'asset_turnover': 0.10,
    'beta':           0.10,
}
_RELATIVE_THRESHOLD = 0.30  # 30% relative difference required for pct metrics


def _declare_winner(val1: Optional[float], val2: Optional[float],
                    direction: str, key: str) -> int:
    """Return winner index (0 or 1) or -1 if too close to call.

    - Percentage-based metrics: require ≥30% relative difference.
    - Other metrics: require a minimum absolute difference.
    Returns -1 means 'about the same' — no winner highlighted.
    """
    if val1 is None or val2 is None:
        return -1

    # Percentage / rate metrics — apply relative threshold
    if key in _PCT_METRICS:
        max_val = max(abs(val1), abs(val2))
        if max_val > 0:
            relative_diff = abs(val1 - val2) / max_val
            if relative_diff < _RELATIVE_THRESHOLD:
                return -1  # Too close to call
    else:
        # Absolute threshold check
        min_diff = _ABS_MIN_DIFF.get(key, 0.0)
        if abs(val1 - val2) < min_diff:
            return -1

    if direction == 'max':
        if val1 > val2: return 0
        if val2 > val1: return 1
    elif direction == 'min':
        if val1 < val2: return 0
        if val2 < val1: return 1
    return -1




async def handle_compare_stocks(
    conn: asyncpg.Connection,
    symbols: List[str],
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle COMPARE_STOCKS intent.
    """
    symbols = _dedupe_symbol_inputs(symbols)

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
        
        if sector_row and _is_valid_sector(sector_row['sector_name']):
            # Find the most RELEVANT competitor: same sector, closest market cap, has financial data
            first_cap_row = await conn.fetchrow(
                "SELECT market_cap FROM market_tickers WHERE symbol = $1", first_symbol)
            first_cap = first_cap_row['market_cap'] if first_cap_row else None

            peer_rows = await conn.fetch("""
                SELECT t.symbol, t.market_cap
                FROM market_tickers t
                INNER JOIN stock_statistics ss ON t.symbol = ss.symbol AND t.market_code = ss.market_code
                WHERE t.sector_name = $1 AND t.symbol != $2 AND t.market_code = $3
                  AND t.market_cap IS NOT NULL AND t.market_cap > 0
                  AND UPPER(COALESCE(t.sector_name, '')) NOT IN ('UNCLASSIFIED', 'N/A', '')
                ORDER BY ABS(t.market_cap - $4) ASC NULLS LAST
                LIMIT 20
            """, sector_row['sector_name'], first_symbol, sector_row['market_code'],
                first_cap or 0)

            first_canonical = _canonical_symbol(first_symbol)
            peer_symbol = None
            for row in peer_rows:
                candidate = row['symbol']
                if _canonical_symbol(candidate) != first_canonical:
                    peer_symbol = candidate
                    break

            if not peer_symbol:
                # Fallback: just pick largest by cap
                fallback_rows = await conn.fetch("""
                    SELECT symbol FROM market_tickers 
                    WHERE sector_name = $1 AND symbol != $2 AND market_code = $3
                    ORDER BY market_cap DESC NULLS LAST LIMIT 15
                """, sector_row['sector_name'], first_symbol, sector_row['market_code'])
                for fr in fallback_rows:
                    if _canonical_symbol(fr['symbol']) != first_canonical:
                        peer_symbol = fr['symbol']
                        break

            if peer_symbol:
                symbols.append(peer_symbol)
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
                        symbol, name_en, name_ar, market_code, currency, sector_name,
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

        # Get TTM stats from stock_statistics (unified TTM source \u2014 no annual fallback)
        stats_row = None
        try:
            stats_row = await conn.fetchrow("""
                SELECT 
                    revenue_growth, eps_growth,
                    gross_margin, operating_margin, profit_margin, ebitda_margin,
                    roe, roa, roic, roce, asset_turnover,
                    debt_equity, current_ratio, quick_ratio, interest_coverage,
                    altman_z_score, piotroski_f_score,
                    ev_ebitda, ev_sales, peg_ratio, forward_pe, p_ocf,
                    payout_ratio, revenue_ttm, net_income_ttm, eps_ttm
                FROM stock_statistics
                WHERE symbol = $1
            """, symbol)
        except Exception as e_stats:
            print(f"[COMPARE] Statistics query failed for {symbol}: {e_stats}")


        if row:
            ticker_stats = dict(row)
            name = ticker_stats['name_ar'] if language == 'ar' else ticker_stats['name_en']
            
            data_point = {
                'symbol': ticker_stats['symbol'],
                'name': name,
                'sector_name': ticker_stats.get('sector_name'), # For auto-peer fallback
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
                # Issue 2 Fix: PE source — market_tickers pe_ratio is live scraper
                # (may be forward/trailing/stale). We intentionally let stock_statistics
                # overwrite this below since TTM stats PE is more consistent.
                'pe_ratio': safe_float(ticker_stats.get('pe_ratio')),
                'pb_ratio': safe_float(ticker_stats.get('pb_ratio')),
            }

            if stats_row:
                s_stats = dict(stats_row)
                for k, v in s_stats.items():
                    data_point[k] = safe_float(v)
                # Issue 2 Fix: Ensure PE is unified — stock_statistics wins,
                # but if stock_statistics.pe_ratio is NULL, fall back to market_tickers
                if data_point.get('pe_ratio') is None:
                    data_point['pe_ratio'] = safe_float(ticker_stats.get('pe_ratio'))

                # ── Decimal → Percentage Normalization ──
                # stock_statistics stores ratios as decimals (0.335 = 33.5%).
                # Normalize to percentage format for display and threshold math.
                _DECIMAL_RATIO_KEYS = {
                    'gross_margin', 'operating_margin', 'profit_margin', 'ebitda_margin',
                    'roe', 'roa', 'roic', 'roce',
                    'revenue_growth', 'eps_growth', 'net_income_growth',
                    'payout_ratio',
                }
                for rk in _DECIMAL_RATIO_KEYS:
                    val = data_point.get(rk)
                    if val is not None and abs(val) < 1.0:
                        data_point[rk] = val * 100
            
            # Map "net_margin" request to "profit_margin" to prevent crash
            if data_point.get('profit_margin') is None and data_point.get('net_margin') is not None:
                data_point['profit_margin'] = data_point.get('net_margin')
            
            stocks_data.append(data_point)

    # Hard guard: never allow same-stock comparison after symbol normalization.
    deduped_stocks = []
    seen_stock_canon = set()
    for stock in stocks_data:
        canonical = _canonical_symbol(stock.get('symbol', ''))
        if not canonical or canonical in seen_stock_canon:
            continue
        seen_stock_canon.add(canonical)
        deduped_stocks.append(stock)
    stocks_data = deduped_stocks

    # === ROBUST FALLBACK (Chief Expert Fix) ===
    # If garbage collection left us with 1 valid stock (e.g. "Juhayna vs Garbage"),
    # we must find a peer to compare against instead of failing.
    if len(stocks_data) == 1:
        valid_stock = stocks_data[0]
        sector_name = valid_stock.get('sector_name')
        market_code = valid_stock.get('market_code', 'EGX')
        current_symbol = valid_stock['symbol']
        
        if _is_valid_sector(sector_name):
             # Smart peer: same sector, closest market cap, has financial data
             current_cap_row = await conn.fetchrow(
                 "SELECT market_cap FROM market_tickers WHERE symbol = $1", current_symbol)
             current_cap = current_cap_row['market_cap'] if current_cap_row else None

             peer_rows = await conn.fetch("""
                SELECT t.symbol, t.market_cap
                FROM market_tickers t
                INNER JOIN stock_statistics ss ON t.symbol = ss.symbol AND t.market_code = ss.market_code
                WHERE t.sector_name = $1 AND t.symbol != $2 AND t.market_code = $3
                  AND t.market_cap IS NOT NULL AND t.market_cap > 0
                  AND UPPER(COALESCE(t.sector_name, '')) NOT IN ('UNCLASSIFIED', 'N/A', '')
                ORDER BY ABS(t.market_cap - $4) ASC NULLS LAST
                LIMIT 20
            """, sector_name, current_symbol, market_code, current_cap or 0)

             peer_symbol = None
             current_canonical = _canonical_symbol(current_symbol)
             for row in peer_rows:
                 candidate = row['symbol']
                 if _canonical_symbol(candidate) != current_canonical:
                     peer_symbol = candidate
                     break

             if not peer_symbol:
                 # Fallback to simple largest
                 fallback_rows = await conn.fetch("""
                    SELECT symbol FROM market_tickers 
                    WHERE sector_name = $1 AND symbol != $2 AND market_code = $3
                    ORDER BY market_cap DESC NULLS LAST LIMIT 15
                """, sector_name, current_symbol, market_code)
                 for fr in fallback_rows:
                     if _canonical_symbol(fr['symbol']) != current_canonical:
                         peer_symbol = fr['symbol']
                         break

             if peer_symbol:
                 # FETCH PEER DATA (Duplicated logic for safety/speed without refactor)
                 # 1. Ticker
                 p_row = await conn.fetchrow("""
                    SELECT 
                        symbol, name_en, name_ar, market_code, currency, sector_name,
                        last_price, change_percent, volume,
                        pe_ratio, pb_ratio, dividend_yield, market_cap,
                        high_52w, low_52w, beta, logo_url
                    FROM market_tickers
                    WHERE symbol = $1
                 """, peer_symbol)
                 if p_row:
                     # 2. TTM Stats from stock_statistics (no annual fallback)
                     p_stats = await conn.fetchrow("""
                        SELECT 
                            revenue_growth, eps_growth,
                            gross_margin, operating_margin, profit_margin, ebitda_margin,
                            roe, roa, roic, roce, asset_turnover,
                            debt_equity, current_ratio, quick_ratio, interest_coverage,
                            altman_z_score, piotroski_f_score,
                            ev_ebitda, ev_sales, peg_ratio, forward_pe, p_ocf,
                            payout_ratio, revenue_ttm, net_income_ttm, eps_ttm
                        FROM stock_statistics
                        WHERE symbol = $1
                     """, peer_symbol)
                     
                     # Construct Peer Data Point
                     p_dict = dict(p_row)
                     p_name = p_dict['name_ar'] if language == 'ar' else p_dict['name_en']
                     
                     peer_data = {
                        'symbol': p_dict['symbol'],
                        'name': p_name,
                        'sector_name': p_dict.get('sector_name'),
                        'market_code': p_dict['market_code'],
                        'currency': p_dict['currency'],
                        'logo_url': p_dict.get('logo_url'),
                        'price': safe_float(p_dict.get('last_price')),
                        'change_percent': safe_float(p_dict.get('change_percent')),
                        'market_cap': int(p_dict['market_cap']) if p_dict.get('market_cap') else None,
                        'volume': int(p_dict['volume']) if p_dict.get('volume') else None,
                        'high_52w': safe_float(p_dict.get('high_52w')),
                        'low_52w': safe_float(p_dict.get('low_52w')),
                        'beta': safe_float(p_dict.get('beta')),
                        # COALESCE: use p_stats dividend_yield if market_tickers is NULL
                        'dividend_yield': safe_float(p_dict.get('dividend_yield')) or (safe_float(p_dict.get('ss_dividend_yield')) if p_stats else None),
                        'pe_ratio': safe_float(p_dict.get('pe_ratio')),
                        # COALESCE: use p_stats pb_ratio if market_tickers is NULL
                        'pb_ratio': safe_float(p_dict.get('pb_ratio')) or (safe_float(dict(p_stats).get('pb_ratio')) if p_stats else None),
                     }
                     
                     if p_stats:
                         for k, v in dict(p_stats).items():
                             peer_data[k] = safe_float(v)
                         # ── Decimal → Percentage Normalization (same as primary path) ──
                         _DECIMAL_RATIO_KEYS_PEER = {
                             'gross_margin', 'operating_margin', 'profit_margin', 'ebitda_margin',
                             'roe', 'roa', 'roic', 'roce',
                             'revenue_growth', 'eps_growth', 'net_income_growth',
                             'payout_ratio',
                         }
                         for rk in _DECIMAL_RATIO_KEYS_PEER:
                             val = peer_data.get(rk)
                             if val is not None and abs(val) < 1.0:
                                 peer_data[rk] = val * 100
                              
                     if peer_data.get('profit_margin') is None and peer_data.get('net_margin') is not None:
                         peer_data['profit_margin'] = peer_data.get('net_margin')
                         
                     # Final duplicate guard before append
                     if _canonical_symbol(peer_data.get('symbol', '')) != current_canonical:
                         stocks_data.append(peer_data)

    if len(stocks_data) < 2:
        existing_canons = {_canonical_symbol(d['symbol']) for d in stocks_data}
        missing = [
            s for s in symbols
            if _canonical_symbol(s) not in existing_canons
        ]
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': (
                f"Could not build a valid peer comparison for: {', '.join(missing) or ', '.join(symbols)}"
                if language == 'en'
                else f"تعذر تكوين مقارنة صحيحة بين الأقران لـ: {', '.join(missing) or ', '.join(symbols)}"
            )
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
            # Issue 8 Fix: Dividend yield is NEUTRAL — not all strong stocks pay dividends.
            # Remove 'direction' so no winner is highlighted. Show for info only.
            {'key': 'dividend_yield', 'label': 'Div Yield', 'label_ar': 'عائد التوزيعات', 'format': 'pct'},
            {'key': 'payout_ratio', 'label': 'Payout Ratio', 'label_ar': 'نسبة التوزيع', 'format': 'pct'},
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
            
            # Issue 3+4 Fix: Materiality-aware winner logic
            # Only declare a winner if the difference is meaningful.
            # - Percentage metrics: require ≥30% relative difference
            # - Other metrics: require minimum absolute difference
            direction = m.get('direction')
            if direction and len(stocks_data) == 2:
                val1 = values[0]
                val2 = values[1]
                winner_idx = _declare_winner(val1, val2, direction, key)
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
        # Issue 5 Fix: Only make qualitative PE statement if difference is meaningful
        # (at least 3x P/E points, or 30%+ relative). Avoids "Cheaper at 14x" vs "Pricier at 15x".
        if stock.get('pe_ratio') and other.get('pe_ratio'):
            pe_winner = _declare_winner(stock['pe_ratio'], other['pe_ratio'], 'min', 'pe_ratio')
            if pe_winner == 0:  # This stock has clearly lower (better) P/E
                if not nickname or nickname == stock['symbol']:
                    profile_emoji = "💰"
                    nickname = "فرصة قيمة" if language == 'ar' else "Value Opportunity"
                    profile_text = (
                        f"يتداول بمضاعفات جذابة. مكرر الربحية {stock['pe_ratio']:.1f}x." if language == 'ar'
                        else f"Attractive valuation. P/E of {stock['pe_ratio']:.1f}x."
                    )
                good_points.append(
                    f"أرخص عند مكرر ربحية {stock['pe_ratio']:.1f}x" if language == 'ar'
                    else f"Cheaper valuation at {stock['pe_ratio']:.1f}x P/E"
                )
            elif pe_winner == 1:  # Other stock has clearly lower P/E
                bad_points.append(
                    f"أغلى عند مكرر ربحية {stock['pe_ratio']:.1f}x" if language == 'ar'
                    else f"Higher multiple at {stock['pe_ratio']:.1f}x P/E"
                )
            # pe_winner == -1: too close to call, no PE comment added
        
        # Profitability
        # Issue 4 Fix: Only mention if margin difference is meaningful (30% relative)
        margin_winner = -1
        margin_label = 'profit_margin'
        if stock.get('profit_margin') and other.get('profit_margin'):
            margin_winner = _declare_winner(
                stock['profit_margin'], other['profit_margin'], 'max', 'profit_margin')
        # Fallback: check gross_margin if profit_margin didn't produce a winner
        if margin_winner == -1 and stock.get('gross_margin') and other.get('gross_margin'):
            margin_winner = _declare_winner(
                stock['gross_margin'], other['gross_margin'], 'max', 'gross_margin')
            margin_label = 'gross_margin'
        if margin_winner == 0:
            margin_val = stock.get(margin_label, 0)
            good_points.append(
                f"هوامش ربح أعلى ({margin_val:.1f}%)" if language == 'ar'
                else f"Stronger margins ({margin_val:.1f}%)"
            )
        elif margin_winner == 1:
            margin_val = stock.get(margin_label, 0)
            bad_points.append(
                f"هوامش ربح أقل ({margin_val:.1f}%)" if language == 'ar'
                else f"Lower margins ({margin_val:.1f}%)"
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
                # Issue 5 Fix: Use materiality-aware winner logic in learning section
                (
                    "**Profitability:** " + (
                        f"{stocks_data[0]['symbol']} leads with meaningfully stronger margins"
                        if _declare_winner(
                            stocks_data[0].get('profit_margin') or 0,
                            stocks_data[1].get('profit_margin') or 0, 'max', 'profit_margin') == 0
                        else (
                            f"{stocks_data[1]['symbol']} leads with meaningfully stronger margins"
                            if _declare_winner(
                                stocks_data[0].get('profit_margin') or 0,
                                stocks_data[1].get('profit_margin') or 0, 'max', 'profit_margin') == 1
                            else "Both stocks show comparable profit margins — review operating efficiency."
                        )
                    )
                ) if language == 'en' else (
                    "**الربحية:** " + (
                        f"{stocks_data[0]['symbol']} يتفوق بهوامش ربح أعلى بشكل واضح"
                        if _declare_winner(
                            stocks_data[0].get('profit_margin') or 0,
                            stocks_data[1].get('profit_margin') or 0, 'max', 'profit_margin') == 0
                        else (
                            f"{stocks_data[1]['symbol']} يتفوق بهوامش ربح أعلى بشكل واضح"
                            if _declare_winner(
                                stocks_data[0].get('profit_margin') or 0,
                                stocks_data[1].get('profit_margin') or 0, 'max', 'profit_margin') == 1
                            else "كلا السهمين لديهما هوامش متقاربة — راجع الكفاءة التشغيلية."
                        )
                    )
                ),
                (
                    "**Valuation:** " + (
                        f"{stocks_data[0]['symbol']} is trading at a clear discount (Lower P/E)"
                        if _declare_winner(
                            stocks_data[0].get('pe_ratio') or 999,
                            stocks_data[1].get('pe_ratio') or 999, 'min', 'pe_ratio') == 0
                        else (
                            f"{stocks_data[1]['symbol']} is trading at a clear discount (Lower P/E)"
                            if _declare_winner(
                                stocks_data[0].get('pe_ratio') or 999,
                                stocks_data[1].get('pe_ratio') or 999, 'min', 'pe_ratio') == 1
                            else "Both stocks are similarly priced on a P/E basis."
                        )
                    )
                ) if language == 'en' else (
                    "**التقييم:** " + (
                        f"{stocks_data[0]['symbol']} يتداول بخصم سعري واضح (مضاعف ربحية أقل)"
                        if _declare_winner(
                            stocks_data[0].get('pe_ratio') or 999,
                            stocks_data[1].get('pe_ratio') or 999, 'min', 'pe_ratio') == 0
                        else (
                            f"{stocks_data[1]['symbol']} يتداول بخصم سعري واضح (مضاعف ربحية أقل)"
                            if _declare_winner(
                                stocks_data[0].get('pe_ratio') or 999,
                                stocks_data[1].get('pe_ratio') or 999, 'min', 'pe_ratio') == 1
                            else "كلا السهمين متقاربان في التقييم."
                        )
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
