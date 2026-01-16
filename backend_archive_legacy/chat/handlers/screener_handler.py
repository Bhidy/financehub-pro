"""
Screener Handler - TOP_GAINERS, TOP_LOSERS, SECTOR_STOCKS, DIVIDEND_LEADERS, SCREENER_PE.
"""

import asyncpg
from typing import Dict, Any, List, Optional


async def handle_top_gainers(
    conn: asyncpg.Connection,
    market_code: Optional[str] = None,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle TOP_GAINERS intent."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, market_code
        FROM market_tickers
        WHERE change_percent IS NOT NULL AND change_percent > 0
    """
    params = []
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY change_percent DESC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No gainers found today" if language == 'en' else "لا توجد أسهم رابحة اليوم",
            'cards': []
        }
    
    movers = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        movers.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['change_percent']),
            'volume': int(row['volume']) if row['volume'] else 0,
            'market_code': row['market_code']
        })
    
    market_label = f" ({market_code})" if market_code else ""
    if language == 'ar':
        message = f"أعلى {len(movers)} أسهم ارتفاعاً اليوم{market_label}"
    else:
        message = f"Top {len(movers)} Gainers Today{market_label}"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'movers_table',
                'title': 'Top Gainers' if language == 'en' else 'الأكثر ارتفاعاً',
                'data': {'movers': movers, 'direction': 'up'}
            }
        ],
        'actions': [
            {'label': 'View Losers', 'label_ar': 'الأكثر انخفاضاً', 'action_type': 'query', 'payload': 'Show top losers'},
            {'label': 'View All', 'label_ar': 'عرض الكل', 'action_type': 'navigate', 'payload': '/markets'}
        ]
    }


async def handle_top_losers(
    conn: asyncpg.Connection,
    market_code: Optional[str] = None,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle TOP_LOSERS intent."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, market_code
        FROM market_tickers
        WHERE change_percent IS NOT NULL AND change_percent < 0
    """
    params = []
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY change_percent ASC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No losers found today" if language == 'en' else "لا توجد أسهم خاسرة اليوم",
            'cards': []
        }
    
    movers = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        movers.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['change_percent']),
            'volume': int(row['volume']) if row['volume'] else 0,
            'market_code': row['market_code']
        })
    
    market_label = f" ({market_code})" if market_code else ""
    if language == 'ar':
        message = f"أعلى {len(movers)} أسهم انخفاضاً اليوم{market_label}"
    else:
        message = f"Top {len(movers)} Losers Today{market_label}"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'movers_table',
                'title': 'Top Losers' if language == 'en' else 'الأكثر انخفاضاً',
                'data': {'movers': movers, 'direction': 'down'}
            }
        ],
        'actions': [
            {'label': 'View Gainers', 'label_ar': 'الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Show top gainers'},
            {'label': 'View All', 'label_ar': 'عرض الكل', 'action_type': 'navigate', 'payload': '/markets'}
        ]
    }


async def handle_sector_stocks(
    conn: asyncpg.Connection,
    sector: str,
    limit: int = 20,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle SECTOR_STOCKS intent."""
    
    rows = await conn.fetch("""
        SELECT symbol, name_en, name_ar, last_price, change_percent, market_cap, sector_name
        FROM market_tickers
        WHERE LOWER(sector_name) LIKE $1
        ORDER BY market_cap DESC NULLS LAST
        LIMIT $2
    """, f"%{sector.lower()}%", limit)
    
    if not rows:
        return {
            'success': False,
            'error': 'sector_not_found',
            'message': f"No stocks found in sector: {sector}" if language == 'en' else f"لم يتم العثور على أسهم في قطاع: {sector}"
        }
    
    stocks = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        stocks.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['change_percent']) if row['change_percent'] else 0,
            'market_cap': int(row['market_cap']) if row['market_cap'] else 0
        })
    
    sector_name = rows[0]['sector_name'] if rows else sector
    
    if language == 'ar':
        message = f"أسهم قطاع {sector_name} ({len(stocks)} سهم)"
    else:
        message = f"{sector_name} Sector Stocks ({len(stocks)} stocks)"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'sector_list',
                'title': sector_name,
                'data': {'stocks': stocks, 'sector': sector_name}
            }
        ]
    }


async def handle_dividend_leaders(
    conn: asyncpg.Connection,
    market_code: Optional[str] = None,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle DIVIDEND_LEADERS intent."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, dividend_yield, market_code
        FROM market_tickers
        WHERE dividend_yield IS NOT NULL AND dividend_yield > 0
    """
    params = []
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY dividend_yield DESC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No dividend stocks found" if language == 'en' else "لم يتم العثور على أسهم توزيعات",
            'cards': []
        }
    
    leaders = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        leaders.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'dividend_yield': float(row['dividend_yield']),
            'market_code': row['market_code']
        })
    
    if language == 'ar':
        message = f"أعلى {len(leaders)} أسهم في عائد التوزيعات"
    else:
        message = f"Top {len(leaders)} Dividend Yielding Stocks"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'screener_results',
                'title': 'Dividend Leaders' if language == 'en' else 'أعلى التوزيعات',
                'data': {'stocks': leaders, 'metric': 'dividend_yield'}
            }
        ]
    }


async def handle_screener_pe(
    conn: asyncpg.Connection,
    threshold: float,
    market_code: Optional[str] = None,
    limit: int = 20,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle SCREENER_PE intent - stocks with PE below threshold."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, pe_ratio, market_cap, market_code
        FROM market_tickers
        WHERE pe_ratio IS NOT NULL AND pe_ratio > 0 AND pe_ratio < $1
    """
    params = [threshold]
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY pe_ratio ASC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': f"No stocks found with PE below {threshold}" if language == 'en' else f"لم يتم العثور على أسهم بمضاعف ربحية أقل من {threshold}",
            'cards': []
        }
    
    stocks = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        stocks.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'pe_ratio': float(row['pe_ratio']),
            'market_cap': int(row['market_cap']) if row['market_cap'] else 0,
            'market_code': row['market_code']
        })
    
    if language == 'ar':
        message = f"أسهم بمضاعف ربحية أقل من {threshold} ({len(stocks)} سهم)"
    else:
        message = f"Stocks with PE below {threshold} ({len(stocks)} found)"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'screener_results',
                'title': f'PE < {threshold}',
                'data': {'stocks': stocks, 'metric': 'pe_ratio', 'threshold': threshold}
            }
        ]
    }
