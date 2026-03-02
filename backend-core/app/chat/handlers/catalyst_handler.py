"""
Catalyst Calendar Handler - Upcoming event tracking for EGX stocks.

Ported from Anthropic equity-research/skills/catalyst-calendar workflow.
Handles CATALYST_CALENDAR intent: dividend dates, analyst events, key watchlist items.

Note: Full calendar data requires a dedicated 'corporate_events' table.
If not yet available, this handler gracefully falls back to dividend signals
from stock_statistics + company calendar from corporate_actions.
"""

import asyncpg
from typing import Dict, Any, List, Optional
from datetime import datetime


async def handle_catalyst_calendar(
    conn: asyncpg.Connection,
    symbol: Optional[str] = None,
    market_code: str = "EGX",
    language: str = "en"
) -> Dict[str, Any]:
    """
    Show upcoming catalysts and key events for a stock (or market-wide).
    
    Follows catalyst-calendar workflow:
    1. Pull corporate actions (dividends, bonuses, splits)
    2. Pull any AGM/earnings schedule data
    3. Add macro catalysts (CBE meetings, earnings season)
    4. Return structured catalyst cards
    
    For market-wide queries (no symbol), returns aggregate upcoming events.
    """
    events: List[Dict[str, Any]] = []
    header_name = "EGX Market" if language == "en" else "البورصة المصرية"

    # ── 1. Stock-specific catalysts ──────────────────────────────────────────
    if symbol:
        ticker = await conn.fetchrow(
            "SELECT name_en, name_ar, currency, sector_name FROM market_tickers WHERE symbol = $1",
            symbol
        )
        if not ticker:
            return {"success": False, "message": f"Symbol {symbol} not found."}
        header_name = ticker["name_ar"] if language == "ar" else ticker["name_en"]

        # Corporate actions (dividends, bonuses)
        corp_actions = await conn.fetch("""
            SELECT action_type, ex_date, amount, ex_date, record_date, description
            FROM corporate_actions
            WHERE symbol = $1
            ORDER BY ex_date DESC
            LIMIT 10
        """, symbol)

        for ca in corp_actions:
            action_type = str(ca["action_type"] or "").lower()
            action_date = ca["ex_date"]
            amount = float(ca["amount"]) if ca["amount"] else None
            
            event_type_en = "Dividend" if "dividend" in action_type or "cash" in action_type else action_type.title()
            event_type_ar = "توزيعات نقدية" if "dividend" in action_type or "cash" in action_type else action_type

            events.append({
                "event_type": event_type_en if language == "en" else event_type_ar,
                "symbol": symbol,
                "company": header_name,
                "date": str(action_date) if action_date else "TBD",
                "ex_date": str(ca["ex_date"]) if ca.get("ex_date") else None,
                "record_date": str(ca["record_date"]) if ca.get("record_date") else None,
                "amount": f"{amount:,.2f} EGP" if amount else None,
                "description": ca["description"],
                "icon": "💰" if "dividend" in action_type else "📋",
            })



    # ── 2. Market-wide upcoming events ───────────────────────────────────────
    else:
        # Pull upcoming corporate actions across all market stocks (next 60 days)
        upcoming = await conn.fetch("""
            SELECT ca.symbol, ca.action_type, ca.ex_date, ca.amount, ca.ex_date,
                   mt.name_en, mt.name_ar, mt.sector_name
            FROM corporate_actions ca
            JOIN market_tickers mt ON ca.symbol = mt.symbol AND mt.market_code = $1
            WHERE ca.ex_date >= CURRENT_DATE
            ORDER BY ca.ex_date ASC
            LIMIT 20
        """, market_code)

        for ca in upcoming:
            action_type = str(ca["action_type"] or "").lower()
            en_name = ca["name_en"] or ca["symbol"]
            ar_name = ca["name_ar"] or ca["symbol"]
            company_name = ar_name if language == "ar" else en_name
            action_date = ca["ex_date"]
            amount = float(ca["amount"]) if ca["amount"] else None

            events.append({
                "event_type": "Dividend" if "dividend" in action_type else action_type.title(),
                "symbol": ca["symbol"],
                "company": company_name,
                "sector": ca["sector_name"],
                "date": str(action_date) if action_date else "TBD",
                "ex_date": str(ca["ex_date"]) if ca.get("ex_date") else None,
                "amount": f"{amount:,.2f} EGP" if amount else None,
                "icon": "💰" if "dividend" in action_type else "📋",
            })

    # ── 3. Add static macro catalysts (always relevant) ──────────────────────
    macro_catalysts = _get_macro_catalysts(language)

    # ── 4. Compose message ────────────────────────────────────────────────────
    num_events = len(events)
    if language == "ar":
        if symbol:
            message = (
                f"📅 **تقويم المحفزات — {header_name} ({symbol})**\n\n"
                f"تم رصد {num_events} حدث"
                + (" لا توجد أحداث مسجلة حالياً." if num_events == 0 else f" قادم.")
            )
        else:
            message = (
                f"📅 **تقويم المحفزات — {header_name}**\n\n"
                f"الأحداث الشركاتية القادمة: {num_events} حدث مسجل."
            )
    else:
        if symbol:
            message = (
                f"📅 **Catalyst Calendar — {header_name} ({symbol})**\n\n"
                + (f"{num_events} upcoming corporate event(s) found." if num_events > 0 else "No upcoming events on record.")
            )
        else:
            message = (
                f"📅 **EGX Catalyst Calendar — Upcoming Events**\n\n"
                f"{num_events} upcoming corporate event(s) across the market."
            )

    # ── 5. Build cards ─────────────────────────────────────────────────────
    cards: List[Dict[str, Any]] = []

    # Stock header (if specific stock)
    if symbol and 'ticker' in dir() and ticker:
        cards.append({
            "type": "stock_header",
            "data": {
                "symbol": symbol,
                "name": header_name,
                "currency": ticker.get("currency") or "EGP",
                "market_code": market_code,
            },
        })

    # Corporate events card
    if events:
        cards.append({
            "type": "stats",
            "title": "📅 Upcoming Corporate Events" if language == "en" else "📅 الأحداث الشركاتية القادمة",
            "data": {
                "events": events,
                "symbol": symbol or "MARKET",
                "count": num_events,
            },
        })
    else:
        # Placeholder card when no events found
        cards.append({
            "type": "stats",
            "title": "📅 Event Status" if language == "en" else "📅 حالة الأحداث",
            "data": {
                "events": [],
                "note": (
                    f"No upcoming events in the corporate actions database for {symbol or 'the market'}. "
                    f"Check company announcements on EGX directly."
                    if language == "en"
                    else f"لا توجد أحداث قادمة في قاعدة البيانات حالياً. راجع إعلانات البورصة المصرية مباشرة."
                ),
            },
        })

    # Macro catalyst card
    cards.append({
        "type": "stats",
        "title": "🌍 Macro Catalysts to Watch" if language == "en" else "🌍 المحفزات الكلية التي يجب متابعتها",
        "data": {"macro_catalysts": macro_catalysts, "source": "CBE / MOF / EGX"},
    })

    # ── 6. Actions ─────────────────────────────────────────────────────────────
    if language == "ar":
        actions = [
            {"label": "💰 أعلى عوائد التوزيعات", "label_ar": "💰 أعلى عوائد التوزيعات", "action_type": "query", "payload": "highest dividend yield stocks"},
            {"label": "📰 موجز الصباح", "label_ar": "📰 موجز الصباح", "action_type": "query", "payload": "morning brief"},
        ]
        if symbol:
            actions.insert(0, {"label": "📊 التحليل الأساسي", "label_ar": "📊 التحليل الأساسي", "action_type": "query", "payload": f"analyze {symbol}"})
    else:
        actions = [
            {"label": "💰 Top Dividends", "label_ar": "💰 أعلى التوزيعات", "action_type": "query", "payload": "highest dividend yield stocks"},
            {"label": "📰 Morning Brief", "label_ar": "📰 موجز الصباح", "action_type": "query", "payload": "morning brief"},
        ]
        if symbol:
            actions.insert(0, {"label": f"📊 Analyze {symbol}", "label_ar": f"📊 تحليل {symbol}", "action_type": "query", "payload": f"analyze {symbol}"})

    return {
        "success": True,
        "message": message,
        "cards": cards,
        "actions": actions,
        "source_tables": ["corporate_actions", "market_tickers"],
    }


def _get_macro_catalysts(language: str) -> List[Dict[str, str]]:
    """
    Static list of always-relevant EGX macro catalysts.
    These are structural factors that institutional investors track.
    """
    if language == "ar":
        return [
            {
                "catalyst": "اجتماع لجنة السياسة النقدية للبنك المركزي",
                "impact": "⭐⭐⭐ عالي",
                "relevance": "يؤثر على أسعار الفائدة وبالتالي على تقييم جميع الأسهم والقطاع المصرفي",
            },
            {
                "catalyst": "موسم نتائج الربع الأول (يناير-مارس)",
                "impact": "⭐⭐⭐ عالي",
                "relevance": "المحرك الرئيسي لحركة الأسهم في البورصة المصرية",
            },
            {
                "catalyst": "رصيد الجنيه المصري / نشرة CBE",
                "impact": "⭐⭐ متوسط",
                "relevance": "انخفاض الجنيه يؤثر على هوامش الشركات المستوردة للمواد الخام",
            },
            {
                "catalyst": "التصنيف الائتماني لمصر (موديز / S&P / فيتش)",
                "impact": "⭐⭐⭐ عالي",
                "relevance": "يؤثر على تدفق رأس المال الأجنبي إلى البورصة",
            },
        ]
    else:
        return [
            {
                "catalyst": "CBE Monetary Policy Committee Meeting",
                "impact": "⭐⭐⭐ High",
                "relevance": "Drives interest rate decisions affecting all equity valuations and especially banking sector",
            },
            {
                "catalyst": "Q1 Earnings Season (Jan–Mar)",
                "impact": "⭐⭐⭐ High",
                "relevance": "Primary stock price catalyst for EGX — most companies report in March–May",
            },
            {
                "catalyst": "EGP Exchange Rate / CBE Reserve Data",
                "impact": "⭐⭐ Medium",
                "relevance": "EGP weakness affects raw material importers' margins; positive for exporters",
            },
            {
                "catalyst": "Egypt Sovereign Credit Rating (Moody's / S&P / Fitch)",
                "impact": "⭐⭐⭐ High",
                "relevance": "Determines foreign capital flows into Egyptian equities; rating upgrades trigger rallies",
            },
        ]
