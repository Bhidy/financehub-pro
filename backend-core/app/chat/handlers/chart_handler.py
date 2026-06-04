"""
Chart Handler - STOCK_CHART intent.
Enhanced with live data fallback when database is stale.
"""

from app.chat.currency_utils import get_ticker_currency, is_egx_market
import asyncpg
import asyncio
import httpx
import logging
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

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


import tls_client

async def fetch_ohlc_live(symbol: str, limit: int = 200) -> Optional[List[Dict]]:
    """
    DEPRECATED / DISABLED — stockanalysis.com dependency removed.

    This previously fetched chart history from stockanalysis.com, which is now
    Cloudflare-blocked and deprecated as a data source. The local `ohlc_data`
    table holds full multi-year daily history for every EGX symbol (refreshed
    daily by the pipeline) and is the single source of truth for charts.

    Kept as a no-op so any lingering caller degrades gracefully (returns None)
    instead of reaching out to the retired external source.
    """
    logger.debug(f"[CHART] fetch_ohlc_live is disabled (stockanalysis removed) — symbol={symbol}")
    return None


async def handle_stock_chart(
    conn: asyncpg.Connection,
    symbol: str,
    range_code: str = '1M',
    chart_type: str = 'candlestick',
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle STOCK_CHART intent.
    
    Prioritized to database data. Live fallback only used if DB is empty.
    
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
    
    # Fetch OHLC data from database
    rows = await conn.fetch("""
        SELECT date, open, high, low, close, volume
        FROM ohlc_data
        WHERE symbol = $1 AND date >= $2
        ORDER BY date ASC
    """, symbol, start_date.date())
    
    chart_data = []
    data_source = "database"
    
    if rows:
        # Format database data
        for row in rows:
            chart_data.append({
                'time': row['date'].isoformat(),
                'open': float(row['open']) if row['open'] else None,
                'high': float(row['high']) if row['high'] else None,
                'low': float(row['low']) if row['low'] else None,
                'close': float(row['close']) if row['close'] else None,
                'volume': int(row['volume']) if row['volume'] else 0
            })
    
    # ── SINGLE SOURCE OF TRUTH: ohlc_data ──
    # ohlc_data holds full multi-year daily history for every EGX symbol
    # (e.g. COMI: 6,400+ daily bars back to 2000), refreshed daily by the pipeline.
    # The prior stockanalysis.com live fallback has been REMOVED: that source is
    # Cloudflare-blocked/deprecated, and the local table now exceeds its depth for
    # every supported range (1D…MAX). The DB is the sole authoritative source.
    market_code = name_row['market_code']
    is_egx = market_code == 'EGX'

    if not chart_data:
        return {
            'success': False,
            'error': 'no_data',
            'message': f"No chart data available for {symbol}" if language == 'en' else f"لا توجد بيانات شارت متاحة لـ {symbol}"
        }
    
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
    
    base_actions = [
        {'label': '1D', 'action_type': 'query', 'payload': f'Chart {symbol} 1D'},
        {'label': '1W', 'action_type': 'query', 'payload': f'Chart {symbol} 1W'},
        {'label': '1M', 'action_type': 'query', 'payload': f'Chart {symbol} 1M'},
        {'label': '3M', 'action_type': 'query', 'payload': f'Chart {symbol} 3M'},
        {'label': '6M', 'action_type': 'query', 'payload': f'Chart {symbol} 6M'},
    ]

    # Add Egypt-specific suggestions
    currency = get_ticker_currency(name_row)
    
    if is_egx:
        base_actions.extend([
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '🛡️ Safety Score', 'label_ar': '🛡️ درجة الأمان', 'action_type': 'query', 'payload': f'Is {symbol} financially safe? Show safety score'},
            {'label': '💵 Dividends', 'label_ar': '💵 التوزيعات', 'action_type': 'query', 'payload': f'{symbol} dividends'},
        ])

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
            'range': range_code,
            'data_source': data_source  # Useful for debugging
        },
        'actions': base_actions
    }
