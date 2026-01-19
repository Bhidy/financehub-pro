"""
Chart Handler - STOCK_CHART intent.
Enhanced with live data fallback when database is stale.
"""

import asyncpg
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
    Fetch OHLC data directly from StockAnalysis.com Internal API.
    Bypasses Cloudflare and HTML limit (returns ~128+ rows instead of 50).
    """
    url = f"https://stockanalysis.com/api/symbol/a/EGX-{symbol}/history?type=full"
    
    try:
        # Use tls_client to mimic a real browser to bypass protection
        session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": f"https://stockanalysis.com/quote/egx/{symbol.lower()}/history/",
            "Accept": "application/json"
        }
        
        # Run blocking request in executor
        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: session.get(url, headers=headers)
        )
        
        if resp.status_code != 200:
            logger.warning(f"[CHART LIVE] API HTTP {resp.status_code} for {symbol}")
            return None
            
        data = resp.json()
        history = []
        
        if 'data' in data and 'data' in data['data']:
            for row in data['data']['data']:
                try:
                    history.append({
                        "time": row.get('t'), # Format YYYY-MM-DD
                        "open": float(row.get('o', 0)),
                        "high": float(row.get('h', 0)),
                        "low": float(row.get('l', 0)),
                        "close": float(row.get('c', 0)),
                        "volume": int(row.get('v', 0))
                    })
                except Exception as e:
                    continue
        
        # API returns oldest first, no reverse needed usually, but let's verify sorting
        # Sort by date just to be safe
        history.sort(key=lambda x: x['time'])
        
        logger.info(f"[CHART LIVE] API Fetched {len(history)} points for {symbol}")
        return history
            
    except Exception as e:
        logger.error(f"[CHART LIVE] Error fetching {symbol}: {e}")
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
    
    # If no data in DB, try live fallback for EGX stocks
    market_code = name_row['market_code']
    is_egx = market_code == 'EGX'
    
    # If requesting 3M (90 days) or 6M (180 days), DB (approx 50 days) is insufficient.
    # Force live fetch if requested days > database depth (approx 50).
    is_long_range = days > 55
    is_sparse_db = not chart_data or len(chart_data) < (days * 0.7) # If we have less than 70% of requested days

    if is_egx and (is_sparse_db or is_long_range):
        logger.info(f"[CHART] Triggering Live Fetch (Req: {days}d, DB: {len(chart_data)}pts)")
        
        # Determine strict limit based on days requested
        # 3M = 90 days, 6M = 180 days. Using days directly ensures we ask for enough.
        limit_req = max(days + 30, 150) # Buffer added
        live_data = await fetch_ohlc_live(symbol, limit=limit_req)
        
        if live_data and len(live_data) > 0:
            # Filter by date range
            chart_data = [
                point for point in live_data 
                if datetime.strptime(point['time'], '%Y-%m-%d').date() >= start_date.date()
            ]
            data_source = "live"
            logger.info(f"[CHART] Using LIVE data for {symbol}: {len(chart_data)} points")
    
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
    currency = name_row['currency'] or 'EGP'
    
    if is_egx:
        base_actions.extend([
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
            {'label': '⚙️ Technicals', 'label_ar': '⚙️ التحليل الفني', 'action_type': 'query', 'payload': f'{symbol} technicals'}
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
