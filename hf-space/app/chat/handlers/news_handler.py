"""
News Handler - Fetches stock-specific news from the database.
"""

import asyncpg
from typing import Dict, Any, List


async def handle_news(conn: asyncpg.Connection, symbol: str, limit: int = 10, language: str = 'en') -> Dict[str, Any]:
    """Handle news requests for a specific stock."""
    
    # Get basic ticker info
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol = $1", 
        symbol
    )
    if not ticker:
        return {'success': False, 'message': f"Symbol {symbol} not found.", 'cards': [], 'actions': []}

    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']

    # Fetch news for this symbol (with graceful fallback if table doesn't exist)
    try:
        rows = await conn.fetch("""
            SELECT title, source, url, publish_date, summary
            FROM news 
            WHERE symbol = $1
            ORDER BY publish_date DESC
            LIMIT $2
        """, symbol, limit)
    except Exception:
        # News table doesn't exist yet - return graceful message
        msg = f"📰 **News for {name}**\n\nNews feature coming soon! We're working on bringing you the latest market news." if language == 'en' else f"📰 **أخبار {name}**\n\nميزة الأخبار قادمة قريباً!"
        return {
            'success': True,
            'message': msg,
            'cards': [],
            'actions': _get_fallback_actions(symbol)
        }

    if not rows:
        msg = f"No recent news found for {name} ({symbol})." if language == 'en' else f"لا توجد أخبار حديثة لـ {name} ({symbol})."
        return {
            'success': True,
            'message': msg,
            'cards': [],
            'actions': _get_fallback_actions(symbol)
        }

    # Build news list
    news_items = []
    for r in rows:
        news_items.append({
            'title': r['title'],
            'source': r['source'],
            'date': str(r['publish_date']) if r['publish_date'] else None,
            'summary': r['summary'][:200] if r['summary'] else None,
            'url': r['url']
        })

    msg = f"📰 **Latest News for {name}**" if language == 'en' else f"📰 **آخر أخبار {name}**"

    return {
        'success': True,
        'message': msg,
        'cards': [
            {'type': 'stock_header', 'data': {'symbol': symbol, 'name': name, 'currency': ticker['currency']}},
            {'type': 'news_list', 'title': 'Recent News', 'data': {'items': news_items}}
        ],
        'actions': [
            {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
            {'label': '💵 Dividends', 'label_ar': '💵 التوزيعات', 'action_type': 'query', 'payload': f'{symbol} dividends'},
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
        ]
    }


def _get_fallback_actions(symbol: str) -> List[Dict[str, Any]]:
    """Return standard actions when no news is found."""
    return [
        {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'},
        {'label': '💰 Financials', 'label_ar': '💰 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
        {'label': '💵 Dividends', 'label_ar': '💵 التوزيعات', 'action_type': 'query', 'payload': f'{symbol} dividends'},
    ]
