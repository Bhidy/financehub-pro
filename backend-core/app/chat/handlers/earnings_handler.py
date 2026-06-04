"""
Earnings Analysis Handler - Institutional-grade earnings results analysis.

Ported from Anthropic equity-research/skills/earnings-analysis.
Handles EARNINGS_ANALYSIS intent: quarterly results, beat/miss, YoY analysis.
"""

from app.chat.currency_utils import get_ticker_currency, is_egx_market
import asyncpg
from typing import Dict, Any, List, Optional


async def handle_earnings_analysis(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = "en",
    period: str = "annual"
) -> Dict[str, Any]:
    """
    Institutional earnings analysis: beat/miss, revenue quality check,
    YoY/QoQ comparisons, thesis tracker update.
    
    Follows equity-research/skills/earnings-analysis workflow:
    1. Pull reported financials (latest annual + prior year)
    2. Calculate YoY growth for key metrics
    3. Assess earnings quality (revenue-driven vs margin-driven)
    4. Pull sector context for comparison
    5. Return structured analysis cards
    """
    # ── 1. Get company info ──────────────────────────────────────────────────
    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency, last_price, sector_name FROM market_tickers WHERE symbol = $1",
        symbol
    )
    if not ticker:
        return {"success": False, "message": f"Symbol {symbol} not found."}

    name = ticker["name_ar"] if language == "ar" else ticker["name_en"]
    sector = ticker.get("sector_name") or "General"
    currency = get_ticker_currency(ticker)

    # ── 2. Pull latest 2 years of financials for YoY comparison ─────────────
    # SINGLE SOURCE OF TRUTH: income_statements (+ balance_sheets) — the fresh
    # canonical financials (TradingView/Yahoo, updated to the latest quarter).
    # The legacy `financial_statements` table is stockanalysis-era and froze at
    # Q3-2025, so the chat was reporting financials 2 quarters stale. We JOIN the
    # balance-sheet totals on (symbol, period_ending, period_type) and compute
    # period-over-period growth chronologically by period_ending.
    fin_rows = await conn.fetch("""
        SELECT i.fiscal_year, i.period_type, i.revenue, i.net_income, i.eps, i.gross_profit,
               i.operating_income, b.total_assets, b.total_equity,
               (i.revenue - LAG(i.revenue) OVER (ORDER BY i.period_ending)) / NULLIF(LAG(i.revenue) OVER (ORDER BY i.period_ending), 0) AS revenue_growth_yoy,
               (i.net_income - LAG(i.net_income) OVER (ORDER BY i.period_ending)) / NULLIF(ABS(LAG(i.net_income) OVER (ORDER BY i.period_ending)), 0) AS ni_growth_yoy
        FROM income_statements i
        LEFT JOIN balance_sheets b
          ON b.symbol = i.symbol AND b.period_ending = i.period_ending AND b.period_type = i.period_type
        WHERE i.symbol = $1 AND i.period_type = $2
        ORDER BY i.period_ending DESC
        LIMIT 4
    """, symbol, period)

    # Also pull from TTM statistics for live data
    stats = await conn.fetchrow("""
        SELECT ss.pe_ratio, ss.pb_ratio, ss.roe, ss.roa, ss.profit_margin, ss.revenue_growth,
               ss.eps_ttm, mt.market_cap, ss.ev_ebitda
        FROM stock_statistics ss
        LEFT JOIN market_tickers mt ON ss.symbol = mt.symbol
        WHERE ss.symbol = $1
    """, symbol)

    # ── 3. Build earnings data ───────────────────────────────────────────────
    earnings_data: Dict[str, Any] = {
        "symbol": symbol,
        "name": name,
        "sector": sector,
        "currency": currency,
        "period": period,
        "years": [],
        "quality_signal": None,
        "beat_miss_assessment": None,
    }

    if fin_rows:
        latest = dict(fin_rows[0])
        prior = dict(fin_rows[1]) if len(fin_rows) > 1 else {}

        # Revenue YoY — coerce to float (asyncpg returns numeric columns as
        # Decimal; mixing Decimal with the float thresholds below raises TypeError).
        rev_yoy = _safe_float(latest.get("revenue_growth_yoy"))
        ni_yoy = _safe_float(latest.get("ni_growth_yoy"))

        # Earnings Quality Assessment (from equity-research/earnings-analysis pattern)
        quality = "neutral"
        quality_ar = "محايد"
        if rev_yoy is not None and ni_yoy is not None:
            if rev_yoy >= 0.08:  # Revenue grew >8% YoY
                if ni_yoy >= rev_yoy * 0.7:  # NI kept pace with revenue
                    quality = "revenue_driven"
                    quality_ar = "مدفوع بالإيرادات"
                else:
                    quality = "margin_expansion"
                    quality_ar = "توسع في الهامش"
            elif ni_yoy > 0.1 and (rev_yoy is None or rev_yoy < 0.05):
                quality = "cost_driven"
                quality_ar = "مدفوع بخفض التكاليف"

        earnings_data["quality_signal"] = quality if language == "en" else quality_ar

        # Build year-by-year comparison
        for row in fin_rows:
            r = dict(row)
            year_data: Dict[str, Any] = {
                "year": r.get("fiscal_year"),
                "period_type": r.get("period_type"),
                "revenue": _safe_float(r.get("revenue")),
                "net_income": _safe_float(r.get("net_income")),
                "gross_profit": _safe_float(r.get("gross_profit")),
                "operating_income": _safe_float(r.get("operating_income")),
                "eps": _safe_float(r.get("eps")),
            }
            # Compute margins
            if year_data["revenue"] and year_data["revenue"] > 0:
                if year_data["net_income"] is not None:
                    year_data["net_margin_pct"] = round(year_data["net_income"] / year_data["revenue"] * 100, 2)
                if year_data["gross_profit"] is not None:
                    year_data["gross_margin_pct"] = round(year_data["gross_profit"] / year_data["revenue"] * 100, 2)

            earnings_data["years"].append(year_data)

        # YoY growth rates for display
        earnings_data["revenue_growth_yoy"] = _pct(rev_yoy)
        earnings_data["net_income_growth_yoy"] = _pct(ni_yoy)

    # Add TTM stats if available
    if stats:
        s = dict(stats)
        earnings_data["ttm"] = {
            "pe_ratio": _safe_float(s.get("pe_ratio")),
            "pb_ratio": _safe_float(s.get("pb_ratio")),
            "roe_pct": _safe_float(s.get("roe"), mult=100),
            "roa_pct": _safe_float(s.get("roa"), mult=100),
            "net_margin_pct": _safe_float(s.get("profit_margin"), mult=100),
            "eps": _safe_float(s.get("eps_ttm")),
            "ev_ebitda": _safe_float(s.get("ev_ebitda")),
        }

    # ── 4. Build thesis tracker (static assessment from data signals) ─────────
    thesis_signals = _assess_thesis(earnings_data, sector, language)
    earnings_data["thesis_tracker"] = thesis_signals

    # ── 5. Compose message ───────────────────────────────────────────────────
    if language == "ar":
        quality_label_map = {
            "revenue_driven": "✅ مدفوع بنمو الإيرادات (جودة عالية)",
            "margin_expansion": "✅ توسع في الهامش",
            "cost_driven": "⚠️ مدفوع بخفض التكاليف (أقل استدامة)",
            "neutral": "📊 أداء متوازن",
        }
        quality_display = quality_label_map.get(quality, "📊")
        message = (
            f"📊 **تحليل النتائج المالية — {name} ({symbol})**\n\n"
            f"جودة الأرباح: {quality_display}\n"
            f"نمو الإيرادات (سنوي): {earnings_data.get('revenue_growth_yoy', 'غير متاح')}\n"
            f"نمو صافي الربح (سنوي): {earnings_data.get('net_income_growth_yoy', 'غير متاح')}"
        )
    else:
        quality_label_map = {
            "revenue_driven": "✅ Revenue-Driven (High Quality)",
            "margin_expansion": "✅ Margin Expansion",
            "cost_driven": "⚠️ Cost-Driven Only (Lower Quality)",
            "neutral": "📊 Balanced Performance",
        }
        quality_display = quality_label_map.get(quality, "📊 Balanced")
        message = (
            f"📊 **Earnings Analysis — {name} ({symbol})**\n\n"
            f"Earnings Quality: {quality_display}\n"
            f"Revenue Growth (YoY): {earnings_data.get('revenue_growth_yoy', 'N/A')}\n"
            f"Net Income Growth (YoY): {earnings_data.get('net_income_growth_yoy', 'N/A')}"
        )

    # ── 6. Build cards ───────────────────────────────────────────────────────
    cards = [
        {
            "type": "stock_header",
            "data": {
                "symbol": symbol,
                "name": name,
                "currency": currency,
                "market_code": "EGX",
            },
        },
        {
            "type": "financials_table",
            "title": "Earnings Analysis" if language == "en" else "تحليل النتائج",
            "data": earnings_data,
        },
    ]

    # ── Recommendation D: Auto-Comps Table Card ──────────────────────────────
    # Fetch sector peers and build a comparison table alongside earnings results.
    # This implements the compare_table card format already in ChatResponse.
    try:
        peer_rows = await conn.fetch("""
            SELECT mt.symbol, mt.name_en, mt.name_ar,
                   ss.pe_ratio, ss.pb_ratio, ss.roe, ss.profit_margin, ss.ev_ebitda
            FROM market_tickers mt
            JOIN stock_statistics ss ON mt.symbol = ss.symbol AND mt.market_code = ss.market_code
            WHERE mt.sector_name = $1
              AND mt.symbol != $2
              AND mt.market_code = 'EGX'
              AND ss.pe_ratio IS NOT NULL
            ORDER BY mt.market_cap DESC
            LIMIT 4
        """, sector, symbol)

        if peer_rows:
            # Build subject company row from stats
            subject_stats = dict(stats) if stats else {}
            subject_row = {
                "symbol": symbol,
                "name": name,
                "pe": _safe_float(subject_stats.get("pe_ratio")),
                "pb": _safe_float(subject_stats.get("pb_ratio")),
                "roe": _safe_float(subject_stats.get("roe"), mult=100),
                "net_margin": _safe_float(subject_stats.get("profit_margin"), mult=100),
                "ev_ebitda": _safe_float(subject_stats.get("ev_ebitda")),
            }

            # Peer rows
            peer_comparisons = []
            all_symbols = [symbol]  # subject first
            for p in peer_rows:
                p_name = p["name_ar"] if language == "ar" else p["name_en"]
                peer_comparisons.append({
                    "symbol": p["symbol"],
                    "name": p_name,
                    "pe": _safe_float(p.get("pe_ratio")),
                    "pb": _safe_float(p.get("pb_ratio")),
                    "roe": _safe_float(p.get("roe"), mult=100),
                    "net_margin": _safe_float(p.get("profit_margin"), mult=100),
                    "ev_ebitda": _safe_float(p.get("ev_ebitda")),
                })
                all_symbols.append(p["symbol"])

            # Build compare_table in the exact ChatResponse format
            headers = [symbol] + [p["symbol"] for p in peer_rows]
            metrics_to_show = [
                ("P/E Ratio" if language == "en" else "مضاعف الربحية", "pe"),
                ("P/B Ratio" if language == "en" else "مضاعف القيمة الدفترية", "pb"),
                ("ROE %" if language == "en" else "العائد على حقوق الملكية %", "roe"),
                ("Net Margin %" if language == "en" else "هامش الربح الصافي %", "net_margin"),
                ("EV/EBITDA" if language == "en" else "قيمة المنشأة/الأرباح", "ev_ebitda"),
            ]

            all_items = [subject_row] + peer_comparisons
            table_rows = []
            for metric_label, metric_key in metrics_to_show:
                values = []
                for item in all_items:
                    val = item.get(metric_key)
                    values.append(f"{val:.1f}x" if val is not None else "N/A")
                table_rows.append({"metric": metric_label, "values": values})

            comps_card_title = (
                f"Sector Peer Comparison ({sector})" if language == "en"
                else f"مقارنة بأقران القطاع ({sector})"
            )

            cards.append({
                "type": "compare_table",
                "title": comps_card_title,
                "data": {
                    "headers": headers,
                    "rows": table_rows,
                    "subject": symbol,
                    "peers": [p["symbol"] for p in peer_rows],
                    "sector": sector,
                    "note": (
                        "Auto-generated comps from EARNINGS_ANALYSIS intent"
                        if language == "en"
                        else "مقارنة تلقائية من تحليل النتائج"
                    ),
                },
            })

    except Exception as comps_err:
        # Non-critical: comps table is a bonus, never crash earnings analysis for it
        print(f"[EarningsHandler] Comps table error (non-critical): {comps_err}")


    if language == "ar":
        actions = [
            {"label": "📊 القوائم المالية", "label_ar": "📊 القوائم المالية", "action_type": "query", "payload": f"{symbol} financials"},
            {"label": "💎 التقييم", "label_ar": "💎 التقييم", "action_type": "query", "payload": f"deep valuation {symbol}"},
            {"label": "🏆 مقارنة بالأقران", "label_ar": "🏆 مقارنة بالأقران", "action_type": "query", "payload": f"compare {symbol} to sector peers"},
        ]
    else:
        actions = [
            {"label": "📊 Financials", "label_ar": "📊 القوائم المالية", "action_type": "query", "payload": f"{symbol} financials"},
            {"label": "💎 Valuation", "label_ar": "💎 التقييم", "action_type": "query", "payload": f"deep valuation {symbol}"},
            {"label": "🏆 Peer Comparison", "label_ar": "🏆 مقارنة بالأقران", "action_type": "query", "payload": f"compare {symbol} to sector peers"},
        ]

    return {
        "success": True,
        "message": message,
        "cards": cards,
        "actions": actions,
        "source_tables": ["income_statements", "balance_sheets", "stock_statistics"],
    }


def _safe_float(val: Any, mult: float = 1.0) -> Optional[float]:
    """Safely convert to float, applying optional multiplier (e.g., for percentages)."""
    if val is None:
        return None
    try:
        return round(float(val) * mult, 4)
    except (TypeError, ValueError):
        return None


def _pct(val: Any) -> str:
    """Format a ratio as a percentage string."""
    if val is None:
        return "N/A"
    try:
        return f"{float(val) * 100:+.1f}%"
    except (TypeError, ValueError):
        return "N/A"


def _assess_thesis(data: Dict[str, Any], sector: str, language: str) -> List[Dict[str, str]]:
    """
    Generate a simple thesis tracker from available signals.
    Follows equity-research/skills/earnings-analysis thesis tracker pattern.
    """
    signals = []
    years = data.get("years", [])
    ttm = data.get("ttm", {})
    
    if not years:
        return signals

    # Signal 1: Revenue growth momentum
    rev_growth_str = data.get("revenue_growth_yoy", "N/A")
    try:
        rev_growth_val = float(rev_growth_str.replace("%", "").replace("+", ""))
        if rev_growth_val > 15:
            status = "✅ CONFIRMED" if language == "en" else "✅ مؤكد"
            detail = f"Revenue growing {rev_growth_str} YoY — above 15% growth threshold"
            detail_ar = f"نمو الإيرادات {rev_growth_str} سنوياً — فوق عتبة النمو 15%"
        elif rev_growth_val > 0:
            status = "⚠️ NEUTRAL" if language == "en" else "⚠️ محايد"
            detail = f"Revenue grew {rev_growth_str} — positive but below high-growth threshold"
            detail_ar = f"الإيرادات نمت {rev_growth_str} — إيجابي لكن دون العتبة المرتفعة"
        else:
            status = "🔴 CHALLENGED" if language == "en" else "🔴 متحدى"
            detail = f"Revenue declined {rev_growth_str} — top-line pressure"
            detail_ar = f"الإيرادات انخفضت {rev_growth_str} — ضغط على المبيعات"
    except Exception:
        status = "❓ PENDING" if language == "en" else "❓ قيد المراجعة"
        detail = "Revenue growth data pending"
        detail_ar = "بيانات نمو الإيرادات قيد الانتظار"

    signals.append({
        "thesis": "Revenue Growth Momentum" if language == "en" else "زخم نمو الإيرادات",
        "status": status,
        "detail": detail if language == "en" else detail_ar,
    })

    # Signal 2: Profitability (ROE from TTM)
    roe = ttm.get("roe_pct") if ttm else None
    if roe is not None:
        if roe > 20:
            status2 = "✅ CONFIRMED" if language == "en" else "✅ مؤكد"
            detail2 = f"ROE {roe:.1f}% — strong return generation"
            detail2_ar = f"ROE {roe:.1f}% — توليد عوائد قوية للمساهمين"
        elif roe > 12:
            status2 = "⚠️ NEUTRAL" if language == "en" else "⚠️ محايد"
            detail2 = f"ROE {roe:.1f}% — acceptable, room to improve"
            detail2_ar = f"ROE {roe:.1f}% — مقبول، ويوجد هامش للتحسين"
        else:
            status2 = "🔴 CHALLENGED" if language == "en" else "🔴 متحدى"
            detail2 = f"ROE {roe:.1f}% — below typical EGX benchmarks"
            detail2_ar = f"ROE {roe:.1f}% — دون المعايير المعتادة في البورصة المصرية"

        signals.append({
            "thesis": "Profitability Quality" if language == "en" else "جودة الربحية",
            "status": status2,
            "detail": detail2 if language == "en" else detail2_ar,
        })

    # Signal 3: Earnings quality (from quality_signal)
    quality = data.get("quality_signal", "neutral")
    if "revenue_driven" in quality or "مدفوع بالإيرادات" in quality:
        status3 = "✅ CONFIRMED" if language == "en" else "✅ مؤكد"
        detail3 = "Earnings growth is revenue-driven — durable, high quality"
        detail3_ar = "نمو الأرباح مدفوع بالإيرادات — مستدام وعالي الجودة"
    elif "cost_driven" in quality or "مدفوع بخفض التكاليف" in quality:
        status3 = "⚠️ NEUTRAL" if language == "en" else "⚠️ محايد"
        detail3 = "Earnings growth is cost-driven — less durable, monitor revenue trajectory"
        detail3_ar = "نمو الأرباح مدفوع بخفض التكاليف — أقل استدامة، تابع مسار الإيرادات"
    else:
        status3 = "❓ PENDING" if language == "en" else "❓ قيد المراجعة"
        detail3 = "Earnings quality assessment: balanced / neutral"
        detail3_ar = "تقييم جودة الأرباح: متوازن / محايد"

    signals.append({
        "thesis": "Earnings Quality" if language == "en" else "جودة الأرباح",
        "status": status3,
        "detail": detail3 if language == "en" else detail3_ar,
    })

    return signals
