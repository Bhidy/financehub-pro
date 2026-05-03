"""
Score Breakdown Handler - Show the detailed Starta score for a specific stock.
Triggered when user asks: "Show me inside the COMI score", "What's COMI's score?",
"Break down the MICH score", etc.

Returns a premium card showing the 5-component score: Valuation, Profitability,
Financial Health, Earnings Quality, and Momentum.
"""

from app.chat.currency_utils import get_ticker_currency, is_egx_market
import asyncpg
from typing import Dict, Any, Optional
from ..scoring_engine import calculate_score, ScoreBreakdown


def _grade_color(grade: str) -> str:
    """Return a color class based on grade."""
    return {"A": "green", "B": "teal", "C": "yellow", "D": "orange", "F": "red"}.get(grade, "gray")


def _score_bar(score: int, max_score: int = 20) -> str:
    """Return a simple bar representation of a score out of max."""
    filled = round((score / max_score) * 10)
    return "█" * filled + "░" * (10 - filled)


async def handle_score_breakdown(
    conn: asyncpg.Connection,
    symbol: str,
    market_code: str = "EGX",
    language: str = "en"
) -> Dict[str, Any]:
    """
    Fetch all data needed for the scoring engine and return a premium breakdown card.
    
    Shows:
    - Overall score (0-100) with letter grade (A-F)
    - 5 component scores: Valuation, Profitability, Health, Quality, Momentum
    - Key strength and key watch point
    - Signal category (e.g., "Quality Compounder at Discount")
    """

    # 1. Fetch core ticker data
    ticker_row = await conn.fetchrow("""
        SELECT symbol, name_en, name_ar, sector_name, last_price, change_percent,
               market_cap, pe_ratio, pb_ratio, currency, market_code
        FROM market_tickers
        WHERE symbol = $1
    """, symbol)

    if not ticker_row:
        return {
            "success": False,
            "message": f"Stock {symbol} not found in the database.",
            "cards": []
        }

    # 2. Fetch statistics (ROE, D/E, margins, OCF, Net Income, etc.)
    stats_row = await conn.fetchrow("""
        SELECT roe, roa, debt_equity, current_ratio, interest_coverage,
               profit_margin, ocf_ttm, net_income_ttm, revenue_ttm,
               altman_z_score, piotroski_f_score, pe_ratio, pb_ratio,
               ev_ebitda, price_change_52w
        FROM stock_statistics
        WHERE symbol = $1
    """, symbol)

    # 3. Compile into raw dict for scoring engine
    stock_dict = dict(ticker_row)
    if stats_row:
        for key, val in dict(stats_row).items():
            if val is not None and key not in stock_dict:
                stock_dict[key] = val
            elif val is not None:
                # stats take precedence for financial metrics
                stock_dict[key] = val

    # Normalize field names for scoring engine
    # ROE is stored as decimal (e.g., 0.469 = 46.9%), scoring engine uses %
    roe_raw = stock_dict.get("roe")
    if roe_raw is not None and abs(roe_raw) < 5:  # If decimal form like 0.469
        stock_dict["roe"] = roe_raw * 100

    # 4. Run scoring engine
    breakdown: ScoreBreakdown = calculate_score(stock_dict, historical_avg={})

    # 5. Build the response
    name = ticker_row["name_ar"] if language == "ar" and ticker_row.get("name_ar") else ticker_row["name_en"]
    sector = ticker_row["sector_name"] or "General"
    price = float(ticker_row["last_price"]) if ticker_row["last_price"] else 0
    change_pct = float(ticker_row["change_percent"]) if ticker_row["change_percent"] is not None else 0
    currency = get_ticker_currency(ticker_row)

    grade_color = _grade_color(breakdown.grade)

    # Build component details list
    components = [
        {
            "name": "Valuation" if language == "en" else "التقييم",
            "score": breakdown.valuation,
            "max": 20,
            "note": breakdown.valuation_note,
            "icon": "💰"
        },
        {
            "name": "Profitability" if language == "en" else "الربحية",
            "score": breakdown.profitability,
            "max": 20,
            "note": breakdown.profitability_note,
            "icon": "📈"
        },
        {
            "name": "Financial Health" if language == "en" else "الصحة المالية",
            "score": breakdown.financial_health,
            "max": 20,
            "note": breakdown.financial_health_note,
            "icon": "🛡️"
        },
        {
            "name": "Earnings Quality" if language == "en" else "جودة الأرباح",
            "score": breakdown.earnings_quality,
            "max": 20,
            "note": breakdown.earnings_quality_note,
            "icon": "🔍"
        },
        {
            "name": "Momentum" if language == "en" else "الزخم",
            "score": breakdown.momentum,
            "max": 20,
            "note": breakdown.momentum_note,
            "icon": "⚡"
        },
    ]

    if language == "en":
        message = (
            f"🎯 **{name} ({symbol}) — Starta Score Breakdown**\n\n"
            f"Overall Score: **{breakdown.total}/100** | Grade: **{breakdown.grade}** | "
            f"Signal: *{breakdown.signal}*\n"
            f"Category: **{breakdown.category}**\n\n"
            f"**Key Strength:** {breakdown.key_strength}\n"
            f"**Watch Out For:** {breakdown.key_watch}"
        )
        key_insight = (
            f"{symbol} scores **{breakdown.total}/100 ({breakdown.grade})** — {breakdown.signal}. "
            f"The strongest pillar is its {components[max(range(5), key=lambda i: components[i]['score'])]['name'].lower()}, "
            f"while {components[min(range(5), key=lambda i: components[i]['score'])]['name'].lower()} is the primary watch point."
        )
    else:
        message = (
            f"🎯 **{name} ({symbol}) — تفاصيل درجة سهم ستارتا**\n\n"
            f"الدرجة الإجمالية: **{breakdown.total}/100** | التقييم: **{breakdown.grade}** | "
            f"الإشارة: *{breakdown.signal}*\n"
            f"الفئة: **{breakdown.category}**\n\n"
            f"**أبرز نقطة قوة:** {breakdown.key_strength}\n"
            f"**نقطة انتباه:** {breakdown.key_watch}"
        )
        key_insight = (
            f"سهم {symbol} حصل على **{breakdown.total}/100 ({breakdown.grade})** — {breakdown.signal}. "
            f"أقوى محاور التقييم هو {components[max(range(5), key=lambda i: components[i]['score'])]['name']}."
        )

    return {
        "success": True,
        "message": message,
        "key_insight": key_insight,
        "cards": [
            {
                "type": "score_breakdown",
                "title": f"{symbol} Score Breakdown" if language == "en" else f"تفاصيل درجة {symbol}",
                "data": {
                    "symbol": symbol,
                    "name": name,
                    "total": breakdown.total,
                    "grade": breakdown.grade,
                    "grade_color": grade_color,
                    "signal": breakdown.signal,
                    "category": breakdown.category,
                    "price": price,
                    "change_percent": change_pct,
                    "currency": currency,
                    "sector": sector,
                    "components": components,
                    "key_strength": breakdown.key_strength,
                    "key_watch": breakdown.key_watch,
                }
            }
        ],
        "actions": [
            {
                "label": f"🛡️ {symbol} Safety Deep Dive",
                "label_ar": f"🛡️ تحليل مخاطر {symbol}",
                "action_type": "query",
                "payload": f"How safe is {symbol}? Check Altman Z-Score and debt risk"
            },
            {
                "label": f"📊 {symbol} Financials",
                "label_ar": f"📊 قوائم مالية {symbol}",
                "action_type": "query",
                "payload": f"{symbol} financial performance and margins"
            },
            {
                "label": f"💰 {symbol} Valuation",
                "label_ar": f"💰 تقييم {symbol}",
                "action_type": "query",
                "payload": f"Is {symbol} fairly valued? Show deep valuation"
            },
        ]
    }
