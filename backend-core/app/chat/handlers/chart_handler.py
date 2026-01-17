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


async def fetch_ohlc_live(symbol: str, limit: int = 200) -> Optional[List[Dict]]:
    """
    Fetch OHLC data directly from StockAnalysis.com.
    Used as fallback when database data is stale.
    """
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}/history/"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code != 200:
                logger.warning(f"[CHART LIVE] HTTP {resp.status_code} for {symbol}")
                return None
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            table = soup.find('table')
            if not table:
                logger.warning(f"[CHART LIVE] No table found for {symbol}")
                return None
            
            rows = table.find_all('tr')[1:]  # Skip header
            history = []
            
            def parse_num(s):
                s = s.replace(',', '').replace('$', '').strip()
                if s in ['-', 'N/A', '']:
                    return 0
                try:
                    return float(s)
                except:
                    return 0
            
            for row in rows[:limit]:
                cells = row.find_all('td')
                if len(cells) >= 6:
                    try:
                        date_str = cells[0].get_text(strip=True)
                        try:
                            date_obj = datetime.strptime(date_str, "%b %d, %Y")
                            date = date_obj.strftime("%Y-%m-%d")
                        except:
                            date = date_str
                        
                        history.append({
                            "time": date,
                            "open": parse_num(cells[1].get_text(strip=True)),
                            "high": parse_num(cells[2].get_text(strip=True)),
                            "low": parse_num(cells[3].get_text(strip=True)),
                            "close": parse_num(cells[4].get_text(strip=True)),
                            "volume": int(parse_num(cells[5].get_text(strip=True)))
                        })
                    except Exception as e:
                        continue
            
            # Reverse to get chronological order (oldest first)
            history.reverse()
            logger.info(f"[CHART LIVE] Fetched {len(history)} points for {symbol}")
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
    
    if is_egx and not chart_data:
        logger.info(f"[CHART] DB empty for {symbol} - Attempting live fetch")
        
        live_data = await fetch_ohlc_live(symbol, limit=min(days + 30, 500))
        
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
