"""
Market Summary Handler - Handles EGX30/index/market overview queries.

Returns market performance data including:
- Index value and change
- Top gainers/losers
- Market breadth (advances/declines)
- Sector performance
"""

import asyncpg
from typing import Dict, Any, List
from ..logic.macro_service import get_macro_service


async def handle_most_active(
    conn: asyncpg.Connection,
    market_code: str = "EGX",
    language: str = "en"
) -> Dict[str, Any]:
    """Handle MARKET_MOST_ACTIVE intent."""
    
    rows = await conn.fetch("""
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, logo_url
        FROM market_tickers
        WHERE market_code = $1 AND volume IS NOT NULL
        ORDER BY volume DESC
        LIMIT 10
    """, market_code)

    if not rows:
        return {
            'success': True,
            'message': "No active stocks found" if language == 'en' else "لا توجد أسهم نشطة",
            'cards': []
        }

    movers = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        movers.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['change_percent']) if row['change_percent'] else 0,
            'volume': int(row['volume']),
            'logo_url': row['logo_url'],
            'market_code': market_code
        })

    if language == 'ar':
        message = f"أكثر 10 أسهم تداولاً اليوم في {market_code}"
    else:
        message = f"Top 10 Most Active Stocks in {market_code} by Volume"

    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'movers_table',
                'title': 'Most Active' if language == 'en' else 'الأكثر تداولاً',
                'data': {'movers': movers, 'direction': 'volume'}
            }
        ],
         'actions': [
            {'label': '🟢 Top Gainers', 'label_ar': '🟢 الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Show top gainers'},
            {'label': '🔴 Top Losers', 'label_ar': '🔴 الأكثر انخفاضاً', 'action_type': 'query', 'payload': 'Show top losers'},
            {'label': '💰 Dividend Leaders', 'label_ar': '💰 أعلى التوزيعات', 'action_type': 'query', 'payload': 'Show highest dividend stocks'},
        ]
    }


async def handle_market_summary(
    conn: asyncpg.Connection,
    market_code: str = "EGX",
    language: str = "en"
) -> Dict[str, Any]:
    """
    Get market summary including index, top movers, and breadth.
    
    Args:
        conn: Database connection
        market_code: Market to summarize (default EGX)
        language: Response language
    
    Returns:
        Dict with message, cards, and actions
    """
    try:
        # Get top gainers
        gainers = await conn.fetch("""
            SELECT symbol, name_en, last_price, change_percent, logo_url
            FROM market_tickers
            WHERE market_code = $1 AND change_percent IS NOT NULL
            ORDER BY change_percent DESC
            LIMIT 5
        """, market_code)
        
        # Get top losers
        losers = await conn.fetch("""
            SELECT symbol, name_en, last_price, change_percent, logo_url
            FROM market_tickers
            WHERE market_code = $1 AND change_percent IS NOT NULL
            ORDER BY change_percent ASC
            LIMIT 5
        """, market_code)
        
        # Get market breadth
        breadth = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE change_percent > 0) as advances,
                COUNT(*) FILTER (WHERE change_percent < 0) as declines,
                COUNT(*) FILTER (WHERE change_percent = 0 OR change_percent IS NULL) as unchanged,
                COUNT(*) as total
            FROM market_tickers
            WHERE market_code = $1
        """, market_code)
        
        # Get volume leaders
        volume_leaders = await conn.fetch("""
            SELECT symbol, name_en, last_price, volume, change_percent, logo_url
            FROM market_tickers
            WHERE market_code = $1 AND volume IS NOT NULL
            ORDER BY volume DESC
            LIMIT 5
        """, market_code)

        # P1 (H-3): EGX30 index level — cycle_prices upserts symbol='EGX30' into
        # market_tickers. Surfaces the real index level so "EGX30 level" is answered
        # with the actual value instead of "not available".
        index_row = None
        if market_code == "EGX":
            index_row = await conn.fetchrow("""
                SELECT last_price, change, change_percent
                FROM market_tickers
                WHERE symbol = 'EGX30'
                LIMIT 1
            """)
        index_level = float(index_row['last_price']) if index_row and index_row['last_price'] is not None else None
        index_chg_pct = float(index_row['change_percent']) if index_row and index_row['change_percent'] is not None else None

        # Build response
        market_name = "Egyptian Exchange (EGX)" if market_code == "EGX" else f"{market_code} Market"

        def _fmt_idx(v):
            return f"{v:,.2f}" if v is not None else None

        if language == "ar":
            message = f"📊 ملخص السوق المصري:\n"
            if index_level is not None:
                _chg = f" ({index_chg_pct:+.2f}%)" if index_chg_pct is not None else ""
                message += f"📈 مؤشر EGX30: {_fmt_idx(index_level)}{_chg}\n"
            message += f"📈 الاسهم الرابحه: {breadth['advances']} | 📉 الخاسرة: {breadth['declines']} | ⏸️ دون تغيير: {breadth['unchanged']}"
        else:
            message = f"📊 {market_name} Summary:\n"
            if index_level is not None:
                _chg = f" ({index_chg_pct:+.2f}%)" if index_chg_pct is not None else ""
                message += f"📈 EGX30 Index: {_fmt_idx(index_level)}{_chg}\n"
            message += f"📈 Advances: {breadth['advances']} | 📉 Declines: {breadth['declines']} | ⏸️ Unchanged: {breadth['unchanged']}"
        
        # Build cards
        cards = []
        
        # Market breadth card (+ EGX30 index level when available)
        _breadth_data = {
            "advances": breadth['advances'],
            "declines": breadth['declines'],
            "unchanged": breadth['unchanged'],
            "total": breadth['total']
        }
        if index_level is not None:
            _breadth_data["index_value"] = index_level
            _breadth_data["index_name"] = "EGX30"
            if index_chg_pct is not None:
                _breadth_data["index_change_percent"] = index_chg_pct
        cards.append({
            "type": "stats",
            "title": "Market Breadth" if language == "en" else "اتساع السوق",
            "data": _breadth_data
        })
        
        # Top gainers card
        if gainers:
            cards.append({
                "type": "movers_table",
                "title": "Top Gainers 📈" if language == "en" else "الأكثر ارتفاعاً 📈",
                "data": {
                    "movers": [
                        {
                            "symbol": r['symbol'],
                            "name": r['name_en'] or r['symbol'],
                            "price": float(r['last_price']) if r['last_price'] else 0,
                            "change_percent": float(r['change_percent']) if r['change_percent'] else 0,
                            "logo_url": r['logo_url'],
                        }
                        for r in gainers
                    ],
                    "direction": "up"
                }
            })
        
        # Top losers card
        if losers:
            cards.append({
                "type": "movers_table",
                "title": "Top Losers 📉" if language == "en" else "الأكثر انخفاضاً 📉",
                "data": {
                    "movers": [
                        {
                            "symbol": r['symbol'],
                            "name": r['name_en'] or r['symbol'],
                            "price": float(r['last_price']) if r['last_price'] else 0,
                            "change_percent": float(r['change_percent']) if r['change_percent'] else 0,
                            "logo_url": r['logo_url'],
                        }
                        for r in losers
                    ],
                    "direction": "down"
                }
            })
        
        # Volume leaders card
        if volume_leaders:
            cards.append({
                "type": "movers_table",
                "title": "Volume Leaders 📊" if language == "en" else "الأكثر تداولاً 📊",
                "data": {
                    "movers": [
                        {
                            "symbol": r['symbol'],
                            "name": r['name_en'] or r['symbol'],
                            "price": float(r['last_price']) if r['last_price'] else 0,
                            "volume": int(r['volume']) if r['volume'] else 0,
                            "change_percent": float(r['change_percent']) if r['change_percent'] else 0,
                            "logo_url": r['logo_url'],
                        }
                        for r in volume_leaders
                    ],
                    "direction": "volume"
                }
            })
        
        # Suggested actions
        actions = [
            {
                "label": "Top Gainers",
                "label_ar": "الأكثر ارتفاعاً",
                "action_type": "query",
                "payload": "top gainers"
            },
            {
                "label": "Top Losers",
                "label_ar": "الأكثر انخفاضاً",
                "action_type": "query",
                "payload": "top losers"
            },
            {
                "label": "Bank Stocks",
                "label_ar": "أسهم البنوك",
                "action_type": "query",
                "payload": "banking sector stocks"
            }
        ]
        
        # Issue 7 Fix: Macro context card added to MARKET_SUMMARY (market-wide view — relevant here).
        try:
            macro_svc = get_macro_service()
            macro_ctx = await macro_svc.get_macro_context(conn)
            cards.append({
                'type': 'macro_context',
                'title': 'Macro Environment' if language == 'en' else 'البيئة الاقتصادية الكلية',
                'data': macro_ctx
            })
        except Exception as macro_err:
            print(f"[Market Handler] Macro context error: {macro_err}")
        
        return {
            "success": True,
            "message": message,
            "cards": cards,
            "actions": actions
        }
        
    except Exception as e:
        error_msg = f"Error fetching market summary: {str(e)}"
        return {
            "success": False,
            "message": "Unable to fetch market summary. Please try again." if language == "en" else "تعذر جلب ملخص السوق. يرجى المحاولة مرة أخرى.",
            "cards": [{
                "type": "error",
                "title": "Error",
                "data": {"error": error_msg}
            }],
            "actions": []
        }
