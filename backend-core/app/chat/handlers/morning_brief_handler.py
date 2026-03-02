"""
Morning Brief Handler - Daily EGX market pre-session brief.

Ported from Anthropic equity-research/skills/morning-note workflow.
Handles MORNING_BRIEF intent: overnight context, market recap, stocks in focus.
"""

import asyncpg
from typing import Dict, Any, List
from datetime import datetime


async def handle_morning_brief(
    conn: asyncpg.Connection,
    market_code: str = "EGX",
    language: str = "en"
) -> Dict[str, Any]:
    """
    Generate a concise pre-session market brief following the morning-note workflow:
    1. Previous session top movers (gainers + losers)
    2. Market breadth (advances/declines)
    3. Most active stocks by volume
    4. Sector winner snapshot
    5. Compose structured brief
    
    EGX specific: Trading 10:00–14:30 Cairo (UTC+2), Sunday–Thursday.
    """
    # ── 1. Top gainers from previous session ────────────────────────────────
    gainers = await conn.fetch("""
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, logo_url, sector_name
        FROM market_tickers
        WHERE market_code = $1 AND change_percent IS NOT NULL AND change_percent > 0
        ORDER BY change_percent DESC
        LIMIT 5
    """, market_code)

    # ── 2. Top losers ────────────────────────────────────────────────────────
    losers = await conn.fetch("""
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, logo_url, sector_name
        FROM market_tickers
        WHERE market_code = $1 AND change_percent IS NOT NULL AND change_percent < 0
        ORDER BY change_percent ASC
        LIMIT 5
    """, market_code)

    # ── 3. Market breadth ────────────────────────────────────────────────────
    breadth = await conn.fetchrow("""
        SELECT 
            COUNT(*) FILTER (WHERE change_percent > 0) as advances,
            COUNT(*) FILTER (WHERE change_percent < 0) as declines,
            COUNT(*) FILTER (WHERE change_percent = 0 OR change_percent IS NULL) as unchanged,
            COUNT(*) as total,
            ROUND(AVG(change_percent)::numeric, 2) as avg_change,
            ROUND(SUM(volume)::numeric, 0) as total_volume
        FROM market_tickers
        WHERE market_code = $1
    """, market_code)

    # ── 4. Volume leaders (stocks in focus) ──────────────────────────────────
    volume_leaders = await conn.fetch("""
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, logo_url, sector_name
        FROM market_tickers
        WHERE market_code = $1 AND volume IS NOT NULL
        ORDER BY volume DESC
        LIMIT 5
    """, market_code)

    # ── 5. Sector performance snapshot ───────────────────────────────────────
    sector_perf = await conn.fetch("""
        SELECT sector_name,
               ROUND(AVG(change_percent)::numeric, 2) AS avg_change,
               COUNT(*) AS stock_count
        FROM market_tickers
        WHERE market_code = $1 AND sector_name IS NOT NULL AND change_percent IS NOT NULL
        GROUP BY sector_name
        HAVING COUNT(*) >= 2
        ORDER BY avg_change DESC
        LIMIT 8
    """, market_code)

    # ── 6. Compose the brief message ─────────────────────────────────────────
    now_str = datetime.utcnow().strftime("%A, %d %b %Y")
    advances = breadth["advances"] if breadth else 0
    declines = breadth["declines"] if breadth else 0
    unchanged = breadth["unchanged"] if breadth else 0
    avg_chg = float(breadth["avg_change"]) if breadth and breadth["avg_change"] else 0.0
    
    # Determine market tone
    if advances > declines * 1.5:
        tone = "🟢 Bullish" if language == "en" else "🟢 صاعد"
    elif declines > advances * 1.5:
        tone = "🔴 Bearish" if language == "en" else "🔴 هابط"
    else:
        tone = "⚪ Mixed" if language == "en" else "⚪ متذبذب"

    if language == "ar":
        message = (
            f"📰 **موجز الصباح — البورصة المصرية ({now_str})**\n\n"
            f"**نبرة السوق:** {tone}\n"
            f"📈 رابحة: {advances} | 📉 خاسرة: {declines} | ⏸️ دون تغيير: {unchanged}\n"
            f"متوسط التغير: {avg_chg:+.2f}%\n\n"
            f"**السؤال الرئيسي لليوم:** هل يمكن للزخم أن يستمر أم أن هذا انتعاش مؤقت؟"
        )
    else:
        message = (
            f"📰 **EGX Morning Brief — {now_str}**\n\n"
            f"**Market Tone:** {tone}\n"
            f"📈 Advances: {advances} | 📉 Declines: {declines} | ⏸️ Unchanged: {unchanged}\n"
            f"Average Change: {avg_chg:+.2f}%\n\n"
            f"**Key Question for Today:** Can momentum hold, or is this a technical bounce?"
        )

    # ── 7. Build cards ────────────────────────────────────────────────────────
    cards: List[Dict[str, Any]] = []

    # Market breadth summary card
    cards.append({
        "type": "stats",
        "title": "Market Breadth" if language == "en" else "اتساع السوق",
        "data": {
            "advances": advances,
            "declines": declines,
            "unchanged": unchanged,
            "total": breadth["total"] if breadth else 0,
            "avg_change": avg_chg,
            "tone": "bullish" if advances > declines * 1.5 else ("bearish" if declines > advances * 1.5 else "mixed"),
        },
    })

    # Top gainers card
    if gainers:
        cards.append({
            "type": "movers_table",
            "title": "📈 Top Gainers" if language == "en" else "📈 الأكثر ارتفاعاً",
            "data": {
                "movers": [
                    {
                        "symbol": r["symbol"],
                        "name": (r["name_ar"] if language == "ar" else r["name_en"]) or r["symbol"],
                        "price": float(r["last_price"]) if r["last_price"] else 0,
                        "change_percent": float(r["change_percent"]) if r["change_percent"] else 0,
                        "volume": int(r["volume"]) if r["volume"] else 0,
                        "logo_url": r["logo_url"],
                        "sector": r["sector_name"],
                    }
                    for r in gainers
                ],
                "direction": "up",
            },
        })

    # Top losers card
    if losers:
        cards.append({
            "type": "movers_table",
            "title": "📉 Top Losers" if language == "en" else "📉 الأكثر انخفاضاً",
            "data": {
                "movers": [
                    {
                        "symbol": r["symbol"],
                        "name": (r["name_ar"] if language == "ar" else r["name_en"]) or r["symbol"],
                        "price": float(r["last_price"]) if r["last_price"] else 0,
                        "change_percent": float(r["change_percent"]) if r["change_percent"] else 0,
                        "volume": int(r["volume"]) if r["volume"] else 0,
                        "logo_url": r["logo_url"],
                        "sector": r["sector_name"],
                    }
                    for r in losers
                ],
                "direction": "down",
            },
        })

    # Stocks in focus (volume leaders)
    if volume_leaders:
        cards.append({
            "type": "movers_table",
            "title": "🔍 Stocks in Focus" if language == "en" else "🔍 الأسهم تحت المجهر",
            "data": {
                "movers": [
                    {
                        "symbol": r["symbol"],
                        "name": (r["name_ar"] if language == "ar" else r["name_en"]) or r["symbol"],
                        "price": float(r["last_price"]) if r["last_price"] else 0,
                        "change_percent": float(r["change_percent"]) if r["change_percent"] else 0,
                        "volume": int(r["volume"]) if r["volume"] else 0,
                        "logo_url": r["logo_url"],
                        "sector": r["sector_name"],
                    }
                    for r in volume_leaders
                ],
                "direction": "volume",
            },
        })

    # Sector performance table
    if sector_perf:
        sector_rows = [
            {
                "sector": r["sector_name"],
                "avg_change_pct": float(r["avg_change"]) if r["avg_change"] else 0,
                "stock_count": int(r["stock_count"]),
            }
            for r in sector_perf
        ]
        cards.append({
            "type": "stats",
            "title": "📊 Sector Performance" if language == "en" else "📊 أداء القطاعات",
            "data": {"sectors": sector_rows},
        })

    # ── 8. Actions ────────────────────────────────────────────────────────────
    if language == "ar":
        actions = [
            {"label": "🟢 الأكثر ارتفاعاً", "label_ar": "🟢 الأكثر ارتفاعاً", "action_type": "query", "payload": "top gainers today"},
            {"label": "🔴 الأكثر انخفاضاً", "label_ar": "🔴 الأكثر انخفاضاً", "action_type": "query", "payload": "top losers today"},
            {"label": "💰 أعلى عوائد التوزيعات", "label_ar": "💰 أعلى عوائد التوزيعات", "action_type": "query", "payload": "highest dividend yield stocks"},
            {"label": "📊 ملخص القطاع المصرفي", "label_ar": "📊 ملخص القطاع المصرفي", "action_type": "query", "payload": "banking sector overview"},
        ]
    else:
        actions = [
            {"label": "🟢 Top Gainers", "label_ar": "🟢 الأكثر ارتفاعاً", "action_type": "query", "payload": "top gainers today"},
            {"label": "🔴 Top Losers", "label_ar": "🔴 الأكثر انخفاضاً", "action_type": "query", "payload": "top losers today"},
            {"label": "💰 Top Dividends", "label_ar": "💰 أعلى التوزيعات", "action_type": "query", "payload": "highest dividend yield stocks"},
            {"label": "📊 Banking Sector", "label_ar": "📊 القطاع المصرفي", "action_type": "query", "payload": "banking sector overview"},
        ]

    return {
        "success": True,
        "message": message,
        "cards": cards,
        "actions": actions,
        "source_tables": ["market_tickers"],
    }
