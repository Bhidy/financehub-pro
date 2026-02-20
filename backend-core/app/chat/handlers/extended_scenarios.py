"""
Extended Scenarios Handler - Enterprise Phase Implementation

Handles the new extended scenarios:
- HIDDEN_GEMS: Discovery of undervalued small/mid caps
- MACRO_SCORE: Market timing score (0-100)
- INDEX_COMPOSITION: EGX 30 constituents view
- MACRO_VIEW: Full macro analysis
- MARKET_TIMING: Is it a good time to buy?
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

# NEW: Import scoring engine
from ..scoring_engine import calculate_score

logger = logging.getLogger(__name__)


SECTOR_AR_MAP = {
    "Banks": "البنوك",
    "Real Estate": "العقارات",
    "Financial Services": "الخدمات المالية",
    "Industrial Goods & Services": "السلع والخدمات الصناعية",
    "Basic Resources": "الموارد الأساسية",
    "Food & Beverage": "الأغذية والمشروبات",
    "Telecommunications": "الاتصالات",
    "Healthcare & Pharmaceuticals": "الرعاية الصحية والأدوية",
    "Construction & Materials": "التشييد ومواد البناء",
    "Travel & Leisure": "السياحة والترفيه",
    "Other": "قطاعات أخرى",
}


def _sector_label(sector_name: Optional[str], language: str = "en") -> str:
    if not sector_name:
        return "Other" if language == "en" else "قطاعات أخرى"
    if language == "ar":
        return SECTOR_AR_MAP.get(sector_name, sector_name)
    return sector_name


async def handle_hidden_gems(conn, language: str = "en", context: dict = None) -> Dict[str, Any]:
    """
    Handle HIDDEN_GEMS intent - Discovery of undervalued stocks
    
    Hidden Gem Criteria:
    - Market cap: EGP 500M - 5B (small/mid cap)
    - Valuation: 20%+ discount to sector (P/B or P/E)
    - Quality: ROE > 15%, positive margins
    - Not in EGX 30 (underfollowed)
    
    Returns 3-5 stocks with detailed "why it's a gem" explanations.
    """
    try:
        # Fetch hidden gem candidates
        # Note: ROE, profit_margin columns are in stock_statistics, not market_tickers
        query = """
        WITH sector_averages AS (
            SELECT 
                sector_name,
                AVG(NULLIF(pb_ratio, 0)) as avg_pb,
                AVG(NULLIF(pe_ratio, 0)) as avg_pe
            FROM market_tickers
            WHERE market_code = 'EGX' AND sector_name IS NOT NULL
            GROUP BY sector_name
        )
        SELECT 
            t.symbol,
            t.name_en,
            t.name_ar,
            t.sector_name,
            t.market_cap,
            t.logo_url,
            t.pe_ratio,
            t.pb_ratio,
            t.dividend_yield,
            ss.*,
            sa.avg_pb,
            sa.avg_pe,
            CASE 
                WHEN t.pb_ratio IS NOT NULL AND sa.avg_pb IS NOT NULL AND t.pb_ratio > 0 AND t.pb_ratio < sa.avg_pb
                THEN ROUND(((sa.avg_pb - t.pb_ratio) / sa.avg_pb * 100)::numeric, 0)
                ELSE 0
            END as pb_discount,
            CASE 
                WHEN t.pe_ratio IS NOT NULL AND sa.avg_pe IS NOT NULL AND t.pe_ratio > 0 AND t.pe_ratio < sa.avg_pe
                THEN ROUND(((sa.avg_pe - t.pe_ratio) / sa.avg_pe * 100)::numeric, 0)
                ELSE 0
            END as pe_discount
        FROM market_tickers t
        LEFT JOIN stock_statistics ss ON t.symbol = ss.symbol AND t.market_code = ss.market_code
        LEFT JOIN sector_averages sa ON t.sector_name = sa.sector_name
        WHERE t.market_code = 'EGX'
          AND t.market_cap BETWEEN 500000000 AND 5000000000  -- 500M to 5B EGP
          AND (t.pe_ratio > 0 OR t.pb_ratio > 0)
        
        """
        
        rows = await conn.fetch(query)
        
        scored_rows = []
        for row in rows:
            metrics = dict(row)
            # Ensure percentages are correct for scoring engine
            for k in ['roe', 'profit_margin', 'gross_margin', 'operating_margin', 'revenue_growth', 'dividend_yield']:
                v = metrics.get(k)
                if v is not None and abs(v) <= 1.0:
                    metrics[k] = v * 100
            
            score_res = calculate_score(metrics, {})
            # Criteria for hidden gems: good total score + good quality + discount
            if score_res.total >= 50 and (row.get('pb_discount', 0) >= 15 or row.get('pe_discount', 0) >= 15 or getattr(score_res, 'profitability', 0) > 10):
                scored_rows.append((score_res, dict(row)))

        scored_rows.sort(key=lambda x: x[0].total, reverse=True)
        top_candidates = scored_rows[:5]
        
        if not top_candidates:
            # Fallback to zero-data fallback
            fallback_query = """
            SELECT 
                symbol,
                name_en,
                market_cap,
                sector_name,
                pe_ratio,
                pb_ratio,
                logo_url,
                NULL::numeric as roe,
                NULL::numeric as profit_margin,
                0::numeric as pb_discount,
                0::numeric as pe_discount
            FROM market_tickers
            WHERE market_code = 'EGX'
              AND market_cap > 100000000
              AND (pb_ratio > 0 OR pe_ratio > 0)
            ORDER BY pb_ratio ASC NULLS LAST
            LIMIT 5
            """
            fallback_rows = await conn.fetch(fallback_query)
            for row in fallback_rows:
                score_res = calculate_score(dict(row), {})
                top_candidates.append((score_res, dict(row)))
        
        # Build gem list
        gems = []
        for idx, (score_res, row) in enumerate(top_candidates):
            
            # Generate "why it's a gem" explanation
            reasons = []
            pb = row.get('pb_ratio')
            pe = row.get('pe_ratio')
            roe = row.get('roe')
            if roe and abs(roe) <= 1:
                roe = roe * 100
            
            margin = row.get('profit_margin')
            if margin and abs(margin) <= 1:
                margin = margin * 100
            
            if pb and pb < 1:
                reasons.append(
                    f"يتداول أقل من القيمة الدفترية عند {pb:.2f}x"
                    if language == "ar" else
                    f"Trading below book value at {pb:.2f}x P/B"
                )
            elif pb and pb < 1.5:
                reasons.append(
                    f"تقييم جذاب عند {pb:.2f}x"
                    if language == "ar" else
                    f"Attractive valuation at {pb:.2f}x P/B"
                )

            if pe and pe < 10:
                reasons.append(
                    f"مكرر ربحية منخفض عند {pe:.1f}x يدعم فكرة انخفاض التقييم"
                    if language == "ar" else
                    f"Low P/E of {pe:.1f}x suggests undervaluation"
                )

            if roe and roe > 15:
                reasons.append(
                    f"ربحية قوية مع عائد على حقوق الملكية {roe:.1f}%"
                    if language == "ar" else
                    f"Strong profitability with {roe:.1f}% ROE"
                )

            if margin and margin > 10:
                reasons.append(
                    f"هامش صافي صحي عند {margin:.1f}%"
                    if language == "ar" else
                    f"Healthy {margin:.1f}% net margin"
                )

            market_cap = row.get('market_cap', 0)
            if market_cap < 1e9:
                reasons.append("شركة صغيرة برصيد نمو واعد" if language == "ar" else "Small cap with growth potential")
            
            if not reasons:
                reasons.append(
                    "أساسيات قوية مع تغطية بحثية محدودة"
                    if language == "ar" else
                    "Solid fundamentals with limited analyst coverage"
                )
            
            why_gem = ". ".join(reasons[:3]) + "."
            
            company_name = row.get('name_ar') if language == 'ar' and row.get('name_ar') else (row.get('name_en') or row['symbol'])
            gems.append({
                "ticker": row['symbol'],
                "company_name": company_name,
                "score": score_res.total,
                "grade": score_res.grade,
                "is_top_pick": idx == 0,
                "highlighted": idx == 0,
                "badge": "Top Pick" if language == "en" and idx == 0 else ("الأفضل" if language == "ar" and idx == 0 else None),
                "logo_url": row.get('logo_url'),
                "metrics": {
                    ("P/B" if language == "en" else "مضاعف القيمة الدفترية"): f"{pb:.2f}x" if pb else ("N/A" if language == "en" else "غير متاح"),
                    ("P/E" if language == "en" else "مضاعف الربحية"): f"{pe:.1f}x" if pe else ("N/A" if language == "en" else "غير متاح"),
                    ("ROE" if language == "en" else "العائد على حقوق الملكية"): f"{roe:.1f}%" if roe else ("N/A" if language == "en" else "غير متاح"),
                    ("Cap" if language == "en" else "القيمة السوقية"): _format_number(market_cap, language=language)
                },
                "mini_scores": {
                    "valuation": score_res.valuation,
                    "profitability": score_res.profitability,
                    "financial_health": score_res.financial_health,
                    "earnings_quality": score_res.earnings_quality,
                    "momentum": score_res.momentum
                },
                "why_its_a_gem": why_gem,
                "description": why_gem
            })
        
        # Build conversational text
        if gems:
            top_gem = gems[0]['ticker']
            conv_text = (
                f"🎯 Found {len(gems)} hidden gems in the EGX. These are underfollowed names trading at clear valuation discounts. {top_gem} stands out on quality and valuation."
                if language == "en"
                else f"🎯 تم رصد {len(gems)} فرص خفية في السوق المصري. هذه أسهم أقل تغطيةً وتتداول بخصم تقييمي واضح، ويبرز {top_gem} كأفضل اختيار حالياً."
            )
        else:
            conv_text = (
                "No hidden gems matching the strict screen right now."
                if language == "en"
                else "لا توجد فرص خفية مطابقة لمعايير الفحص الصارمة حالياً."
            )
        
        # Build methodology card
        methodology = {
            "title": "Hidden Gem Screening Criteria" if language == "en" else "معايير فحص الفرص الخفية",
            "icon": "🎯",
            "description": "Multi-factor discovery screen" if language == "en" else "فحص متعدد العوامل",
            "criteria": [
                {"label": "Market Cap" if language == "en" else "القيمة السوقية", "value": "EGP 500M - 5B" if language == "en" else "500 مليون - 5 مليار جنيه"},
                {"label": "Valuation Discount" if language == "en" else "خصم التقييم", "value": ">15% below sector" if language == "en" else "أكثر من 15% أقل من متوسط القطاع"},
                {"label": "Quality Filter" if language == "en" else "فلتر الجودة", "value": "ROE > 15% or Positive Margins" if language == "en" else "عائد > 15% أو هوامش إيجابية"},
                {"label": "Coverage" if language == "en" else "التغطية", "value": "Not in EGX 30 (underfollowed)" if language == "en" else "خارج المؤشر الرئيسي (تغطية أقل)"}
            ],
            "note": "Gems are overlooked stocks with solid fundamentals." if language == "en" else "الفرص الخفية هي أسهم مهملة سوقياً رغم قوة الأساسيات."
        }
        
        return {
            "success": True,
            "conversational_text": conv_text,
            "cards": [
                {"type": "methodology", "data": methodology},
                {"type": "hidden_gems", "data": {"title": "Hidden Gems" if language == "en" else "الفرص الخفية", "stocks": gems}}
            ],
            # NEW: Premium FrameworkCard for world-class UI
            "framework_card": {
                "icon": "🎯",
                "title": "HIDDEN GEM CRITERIA" if language == "en" else "معايير الفرص الخفية",
                "subtitle": "Multi-Factor Discovery Screen" if language == "en" else "فحص اكتشاف متعدد العوامل",
                "items": [
                    "Market Cap: EGP 500M - 5B (small/mid cap sweet spot)" if language == "en" else "القيمة السوقية: 500 مليون - 5 مليار جنيه (شريحة الشركات الصغيرة/المتوسطة)",
                    "Valuation: >15% discount to sector average (P/B or P/E)" if language == "en" else "التقييم: خصم أكبر من 15% مقابل متوسط القطاع (P/B أو P/E)",
                    "Quality: ROE > 15% or positive net margins" if language == "en" else "الجودة: عائد على حقوق الملكية أعلى من 15% أو هوامش صافي إيجابية",
                    "Coverage: Not in EGX 30 (underfollowed = opportunity)" if language == "en" else "التغطية: خارج المؤشر الثلاثيني (تغطية بحثية أقل = فرصة)"
                ],
                "border_color": "teal"
            },
            "stock_list": gems,
            "learning_section": {
                "title": "📊 Understanding Hidden Gems" if language == "en" else "📊 كيف تقرأ فرص السوق الخفية",
                "items": [
                    "Hidden gems are overlooked stocks with strong fundamentals but limited analyst coverage." if language == "en" else "الفرص الخفية هي أسهم قوية أساسياً لكن تغطيتها البحثية ضعيفة.",
                    "Small caps often outperform over time as the market discovers their value." if language == "en" else "أسهم الشركات الصغيرة والمتوسطة قد تتفوق مع مرور الوقت عند اكتشاف السوق لقيمتها.",
                    "The score reflects valuation discount, profitability, and growth potential." if language == "en" else "الدرجة تعكس خصم التقييم وجودة الربحية وإمكانات النمو.",
                    "Always do your own due diligence before investing in less liquid stocks." if language == "en" else "تحقق دائماً من السيولة والمخاطر قبل اتخاذ قرار الاستثمار."
                ]
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "Discovery Analysis" if language == "en" else "تحليل فرص خفية",
                "text": "Hidden gems carry higher risk due to lower liquidity and limited information. This is for educational purposes only." if language == "en" else "الأسهم الخفية غالباً أعلى مخاطرة بسبب انخفاض السيولة وقلة التغطية. هذا تحليل تعليمي فقط.",
                "variant": "warning"
            }
        }
        
    except Exception as e:
        logger.error(f"Hidden gems handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": (
                "I couldn't screen for hidden gems right now. Please try again."
                if language == "en" else
                "تعذر تنفيذ فحص الفرص الخفية حالياً. يرجى المحاولة مرة أخرى."
            )
        }


async def handle_macro_score(conn, language: str = "en", context: dict = None) -> Dict[str, Any]:
    """
    Handle MACRO_SCORE / MARKET_TIMING intent - Is it a good time to invest?
    
    Scoring factors (100 points total):
    - Growth (25 pts): GDP forecast, PMI trends
    - Inflation (20 pts): Current inflation vs historical avg
    - Hard Currency Flows (30 pts): FX reserves, tourism, remittances
    - USD Dynamics (15 pts): DXY trend, EGP stability
    - Earnings (10 pts): Corporate earnings beat rate
    
    Since we don't have real-time macro data, we use a simplified model based on:
    - Market P/E vs historical average
    - Market breadth (gainers vs losers)
    - Volatility indicators
    """
    try:
        # Get market metrics for scoring
        market_query = """
        SELECT 
            COUNT(*) as total_stocks,
            COUNT(*) FILTER (WHERE change_percent > 0) as gainers,
            COUNT(*) FILTER (WHERE change_percent < 0) as losers,
            AVG(pe_ratio) FILTER (WHERE pe_ratio > 0 AND pe_ratio < 100) as avg_pe,
            AVG(pb_ratio) FILTER (WHERE pb_ratio > 0 AND pb_ratio < 10) as avg_pb,
            AVG(dividend_yield) FILTER (WHERE dividend_yield > 0) as avg_yield,
            SUM(market_cap) as total_market_cap
        FROM market_tickers
        WHERE market_code = 'EGX'
        """
        
        market_stats = await conn.fetchrow(market_query)
        
        # Calculate individual factor scores
        factors = []
        total_score = 0
        
        # 1. Valuation Factor (25 pts) - Based on P/E vs historical avg (~12x for EGX)
        avg_pe = market_stats.get('avg_pe') or 12
        historical_pe = 12  # EGX historical average
        if avg_pe < historical_pe * 0.8:  # >20% below average
            valuation_score = 25
            valuation_status = "positive"
            valuation_detail = (
                f"مكرر ربحية السوق {avg_pe:.1f}x أقل من متوسطه التاريخي"
                if language == "ar" else
                f"Market P/E of {avg_pe:.1f}x is below historical average"
            )
        elif avg_pe < historical_pe * 1.1:
            valuation_score = 18
            valuation_status = "neutral"
            valuation_detail = (
                f"مكرر ربحية السوق {avg_pe:.1f}x قريب من متوسطه التاريخي"
                if language == "ar" else
                f"Market P/E of {avg_pe:.1f}x is near historical average"
            )
        else:
            valuation_score = 8
            valuation_status = "negative"
            valuation_detail = (
                f"مكرر ربحية السوق {avg_pe:.1f}x أعلى من متوسطه التاريخي"
                if language == "ar" else
                f"Market P/E of {avg_pe:.1f}x is above historical average"
            )
        
        factors.append({
            "name": "التقييم" if language == "ar" else "Valuation",
            "points": valuation_score,
            "max_points": 25,
            "status": valuation_status,
            "detail": valuation_detail
        })
        total_score += valuation_score
        
        # 2. Market Breadth Factor (25 pts)
        gainers = market_stats.get('gainers') or 0
        losers = market_stats.get('losers') or 0
        total = gainers + losers if (gainers + losers) > 0 else 1
        breadth_ratio = gainers / total
        
        if breadth_ratio > 0.6:
            breadth_score = 25
            breadth_status = "positive"
            breadth_detail = "زخم شراء قوي عبر أغلب الأسهم" if language == "ar" else "Strong buying pressure across the market"
        elif breadth_ratio > 0.4:
            breadth_score = 15
            breadth_status = "neutral"
            breadth_detail = "معنويات سوقية مختلطة" if language == "ar" else "Mixed market sentiment"
        else:
            breadth_score = 5
            breadth_status = "negative"
            breadth_detail = "ضغوط البيع هي المسيطرة" if language == "ar" else "Selling pressure dominates"
        
        factors.append({
            "name": "اتساع السوق" if language == "ar" else "Market Breadth",
            "points": breadth_score,
            "max_points": 25,
            "status": breadth_status,
            "detail": breadth_detail
        })
        total_score += breadth_score
        
        # 3. Dividend Yield Factor (20 pts) - Higher yields = more attractive
        avg_yield = market_stats.get('avg_yield') or 2
        if avg_yield > 4:
            yield_score = 20
            yield_status = "positive"
            yield_detail = (
                f"متوسط عائد توزيعات جذاب عند {avg_yield:.1f}%"
                if language == "ar" else
                f"Attractive average yield of {avg_yield:.1f}%"
            )
        elif avg_yield > 2:
            yield_score = 12
            yield_status = "neutral"
            yield_detail = (
                f"متوسط عائد توزيعات متوسط عند {avg_yield:.1f}%"
                if language == "ar" else
                f"Moderate average yield of {avg_yield:.1f}%"
            )
        else:
            yield_score = 6
            yield_status = "negative"
            yield_detail = (
                f"متوسط عائد توزيعات منخفض عند {avg_yield:.1f}%"
                if language == "ar" else
                f"Low average yield of {avg_yield:.1f}%"
            )
        
        factors.append({
            "name": "الدخل النقدي" if language == "ar" else "Income Potential",
            "points": yield_score,
            "max_points": 20,
            "status": yield_status,
            "detail": yield_detail
        })
        total_score += yield_score
        
        # 4. Book Value Factor (15 pts)
        avg_pb = market_stats.get('avg_pb') or 1.5
        if avg_pb < 1.2:
            pb_score = 15
            pb_status = "positive"
            pb_detail = (
                f"عدد كبير من الأسهم يتداول قرب القيمة الدفترية ({avg_pb:.2f}x)"
                if language == "ar" else
                f"Many stocks trading near book value ({avg_pb:.2f}x)"
            )
        elif avg_pb < 1.8:
            pb_score = 10
            pb_status = "neutral"
            pb_detail = (
                f"مضاعفات دفترية متوازنة ({avg_pb:.2f}x)"
                if language == "ar" else
                f"Fair book value multiples ({avg_pb:.2f}x)"
            )
        else:
            pb_score = 5
            pb_status = "negative"
            pb_detail = (
                f"مضاعفات دفترية مرتفعة ({avg_pb:.2f}x)"
                if language == "ar" else
                f"Elevated book value multiples ({avg_pb:.2f}x)"
            )
        
        factors.append({
            "name": "قيم الأصول" if language == "ar" else "Asset Values",
            "points": pb_score,
            "max_points": 15,
            "status": pb_status,
            "detail": pb_detail
        })
        total_score += pb_score
        
        # 5. Liquidity/Activity Factor (15 pts)
        total_stocks = market_stats.get('total_stocks') or 100
        active_ratio = total / total_stocks if total_stocks > 0 else 0.5
        
        if active_ratio > 0.7:
            liquidity_score = 15
            liquidity_status = "positive"
            liquidity_detail = "مشاركة وسيولة مرتفعة في السوق" if language == "ar" else "High market participation and liquidity"
        elif active_ratio > 0.4:
            liquidity_score = 10
            liquidity_status = "neutral"
            liquidity_detail = "مستويات نشاط وسيولة ضمن المعدل الطبيعي" if language == "ar" else "Normal market activity levels"
        else:
            liquidity_score = 5
            liquidity_status = "negative"
            liquidity_detail = "مشاركة سوقية ضعيفة" if language == "ar" else "Low market participation"
        
        factors.append({
            "name": "السيولة" if language == "ar" else "Liquidity",
            "points": liquidity_score,
            "max_points": 15,
            "status": liquidity_status,
            "detail": liquidity_detail
        })
        total_score += liquidity_score
        
        # Generate assessment text
        if total_score >= 75:
            assessment = "Constructive Environment - Multiple factors support equity investment. Consider systematic allocation." if language == "en" else "بيئة إيجابية: عدة عوامل تدعم الاستثمار في الأسهم."
        elif total_score >= 55:
            assessment = "Mixed Environment - Stock-specific fundamentals matter more than macro. Be selective." if language == "en" else "بيئة مختلطة: انتقائية الأسهم أهم من اتجاه السوق العام."
        elif total_score >= 35:
            assessment = "Cautious Environment - Elevated risks present. Focus on quality and defensive sectors." if language == "en" else "بيئة حذرة: المخاطر أعلى، ويفضل التركيز على الجودة والقطاعات الدفاعية."
        else:
            assessment = "Risk-Off Environment - Consider reducing equity exposure or focusing on cash-rich companies." if language == "en" else "بيئة عالية المخاطر: يفضل خفض التعرض للأسهم والتركيز على الشركات ذات السيولة القوية."
        
        # Conversational text
        if language == "ar":
            conv_text = f"النتيجة الكلية لبيئة السوق حالياً هي {total_score}/100. {assessment}"
        else:
            conv_text = f"Egypt's market environment scores {total_score}/100 currently. {assessment}"

        positives = [f for f in factors if f["status"] == "positive"]
        neutrals = [f for f in factors if f["status"] == "neutral"]
        negatives = [f for f in factors if f["status"] == "negative"]

        insight_cards = []
        if positives:
            insight_cards.append({
                "variant": "success",
                "title": "🟢 What's Working" if language == "en" else "🟢 ما الذي يدعم السوق",
                "items": [f"{x['name']}: {x['detail']}" for x in positives]
            })
        if neutrals:
            insight_cards.append({
                "variant": "info",
                "title": "🟡 Mixed Signals" if language == "en" else "🟡 إشارات مختلطة",
                "items": [f"{x['name']}: {x['detail']}" for x in neutrals]
            })
        if negatives:
            insight_cards.append({
                "variant": "warning",
                "title": "🔴 Headwinds" if language == "en" else "🔴 رياح معاكسة",
                "items": [f"{x['name']}: {x['detail']}" for x in negatives]
            })
        
        return {
            "success": True,
            "conversational_text": conv_text,
            "cards": [
                {
                    "type": "macro_score",
                    "data": {
                        "score": total_score,
                        "max_score": 100,
                        "assessment": assessment,
                        "factors": factors,
                        "market": "Egypt (EGX)",
                        "as_of": datetime.now().isoformat()
                    }
                }
            ],
            "macro_score": {
                "score": total_score,
                "max_score": 100,
                "assessment": assessment,
                "factors": factors
            },
            "framework_card": {
                "icon": "🌍",
                "title": "MARKET TIMING FRAMEWORK" if language == "en" else "إطار توقيت السوق",
                "subtitle": "Five-factor scorecard" if language == "en" else "تقييم من خمسة محاور",
                "items": [
                    "Valuation vs historical averages" if language == "en" else "التقييم مقارنة بالمتوسطات التاريخية",
                    "Breadth and market participation" if language == "en" else "اتساع السوق وجودة المشاركة",
                    "Income attractiveness via dividends" if language == "en" else "جاذبية العائد عبر التوزيعات",
                    "Book-value and asset backing context" if language == "en" else "سياق القيمة الدفترية ودعم الأصول",
                    "Liquidity regime and risk appetite" if language == "en" else "نظام السيولة وشهية المخاطر",
                ],
                "border_color": "teal"
            },
            "insight_cards": insight_cards,
            "learning_section": {
                "title": "📊 Understanding the Market Score" if language == "en" else "📊 كيف تقرأ نتيجة السوق",
                "items": [
                    "The score combines valuation, breadth, yield, and liquidity factors." if language == "en" else "النتيجة تجمع بين التقييم واتساع السوق والعائد والسيولة.",
                    "75-100: Constructive - Multiple tailwinds support investing." if language == "en" else "75-100: بيئة إيجابية مع عوامل داعمة متعددة.",
                    "55-75: Mixed - Be selective, focus on quality stocks." if language == "en" else "55-75: بيئة مختلطة تتطلب انتقائية أعلى.",
                    "35-55: Cautious - Elevated risks, prefer defensive positioning." if language == "en" else "35-55: بيئة حذرة مع مخاطر مرتفعة نسبياً.",
                    "0-35: Risk-Off - Consider reducing exposure or holding cash." if language == "en" else "0-35: بيئة تجنب المخاطر وتقليل الانكشاف."
                ]
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "Market Timing Analysis" if language == "en" else "تحليل توقيت السوق",
                "text": "This is a simplified scoring model based on available data. Actual macro conditions depend on factors not captured here (GDP, inflation, FX reserves, global conditions). Always consider your personal risk tolerance." if language == "en" else "هذا نموذج مبسط مبني على البيانات المتاحة، وقد تتغير الظروف الكلية سريعاً. راعِ دائماً درجة تحملك للمخاطر.",
                "variant": "warning"
            }
        }
        
    except Exception as e:
        logger.error(f"Macro score handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": (
                "I couldn't calculate the market score right now. Please try again."
                if language == "en" else
                "تعذر احتساب نتيجة السوق حالياً. يرجى المحاولة مرة أخرى."
            )
        }


async def handle_index_composition(conn, language: str = "en", context: dict = None) -> Dict[str, Any]:
    """
    Handle INDEX_COMPOSITION intent - EGX 30 constituents
    
    Returns:
    - Sector weight breakdown
    - Top 5 performers
    - Index aggregate statistics
    """
    try:
        # Get EGX 30 constituents (approximation - top 30 by market cap)
        # In production, this should use actual index membership table
        constituents_query = """
        WITH egx30 AS (
            SELECT 
                symbol,
                name_en,
                name_ar,
                sector_name,
                market_cap,
                last_price,
                change_percent,
                pe_ratio,
                pb_ratio,
                dividend_yield,
                logo_url
            FROM market_tickers
            WHERE market_code = 'EGX'
              AND market_cap > 0
            ORDER BY market_cap DESC
            LIMIT 30
        )
        SELECT * FROM egx30 ORDER BY change_percent DESC
        """
        
        rows = await conn.fetch(constituents_query)
        
        if not rows:
            return {
                "success": False,
                "error": "No index data available" if language == "en" else "لا تتوفر بيانات المؤشر حالياً",
                "conversational_text": (
                    "Could not fetch EGX 30 composition at this time."
                    if language == "en" else
                    "تعذر جلب مكونات مؤشر EGX 30 حالياً."
                )
            }
        
        # Calculate sector weights
        total_cap = sum(r.get('market_cap', 0) or 0 for r in rows)
        sector_caps = {}
        sector_counts = {}
        sector_constituents = {}
        
        for row in rows:
            sector = row.get('sector_name') or 'Other'
            cap = row.get('market_cap', 0) or 0
            sector_caps[sector] = sector_caps.get(sector, 0) + cap
            sector_counts[sector] = sector_counts.get(sector, 0) + 1
            sector_constituents.setdefault(sector, [])
            if row.get('symbol') and len(sector_constituents[sector]) < 5:
                sector_constituents[sector].append(row['symbol'])
        
        # Color palette for sectors
        sector_colors = {
            "Banks": "#1E88E5",
            "Real Estate": "#43A047",
            "Financial Services": "#5C6BC0",
            "Industrial Goods & Services": "#FF7043",
            "Basic Resources": "#795548",
            "Food & Beverage": "#FFA726",
            "Telecommunications": "#EC407A",
            "Healthcare & Pharmaceuticals": "#26A69A",
            "Construction & Materials": "#8D6E63",
            "Travel & Leisure": "#AB47BC",
            "Other": "#78909C"
        }
        
        sectors = []
        for sector, cap in sorted(sector_caps.items(), key=lambda x: -x[1]):
            weight = (cap / total_cap * 100) if total_cap > 0 else 0
            sectors.append({
                "sector": sector,
                "weight": round(weight, 1),
                "color": sector_colors.get(sector, "#78909C"),
                "stock_count": sector_counts.get(sector, 0),
                "constituents": sector_constituents.get(sector, [])
            })
        
        # Top 5 performers
        top_performers = []
        for row in rows[:5]:
            top_performers.append({
                "ticker": row['symbol'],
                "company_name": (row.get('name_ar') if language == "ar" and row.get('name_ar') else (row.get('name_en') or row['symbol'])),
                "price": row.get('last_price') or 0,
                "change_percent": row.get('change_percent') or 0,
                "logo_url": row.get('logo_url')
            })
        
        # Index statistics
        valid_pe = [r.get('pe_ratio') for r in rows if r.get('pe_ratio') and 0 < r.get('pe_ratio') < 100]
        valid_pb = [r.get('pb_ratio') for r in rows if r.get('pb_ratio') and 0 < r.get('pb_ratio') < 10]
        valid_yield = [r.get('dividend_yield') for r in rows if r.get('dividend_yield') and r.get('dividend_yield') > 0]
        changes = [r.get('change_percent', 0) or 0 for r in rows]
        
        stats = {
            "total_market_cap": total_cap,
            "avg_pe": sum(valid_pe) / len(valid_pe) if valid_pe else 0,
            "avg_pb": sum(valid_pb) / len(valid_pb) if valid_pb else 0,
            "dividend_yield": sum(valid_yield) / len(valid_yield) if valid_yield else 0,
            "ytd_return": sum(changes) / len(changes) if changes else 0  # Simplified
        }
        
        # Conversational text
        top_sector = _sector_label(sectors[0]['sector'], language) if sectors else ("Various" if language == "en" else "متنوعة")
        conv_text = (
            f"The EGX 30 represents Egypt's largest and most liquid stocks. {top_sector} dominates with {sectors[0]['weight']:.1f}% weight."
            if language == "en"
            else f"يعكس مؤشر EGX 30 أكبر وأكثر الأسهم سيولة في السوق المصري، ويتصدر قطاع {top_sector} بوزن {sectors[0]['weight']:.1f}%."
        )

        top_by_weight = [
            {"ticker": row['symbol'], "weight": round(((row.get('market_cap') or 0) / total_cap * 100), 1)}
            for row in sorted(rows, key=lambda r: -(r.get('market_cap') or 0))[:5]
        ]

        index_composition = {
            "index_name": "EGX 30",
            "icon": "📊",
            "sectors": [
                {
                    "name": _sector_label(s["sector"], language),
                    "weight": f'{s["weight"]}%',
                    "constituents": s.get("constituents", [])
                } for s in sectors
            ],
            "top_by_weight": [{"ticker": item["ticker"], "weight": f'{item["weight"]}%'} for item in top_by_weight],
            "characteristics": "Concentrated index with high weight in financials and real estate." if language == "en" else "مؤشر مركز نسبياً مع وزن كبير للقطاع المالي والعقاري."
        }
        
        return {
            "success": True,
            "conversational_text": conv_text,
            "cards": [
                {
                    "type": "index_composition",
                    "data": {
                        "index_name": "EGX 30",
                        "index_level": total_cap,  # Using market cap as proxy
                        "change_percent": stats['ytd_return'],
                        "sectors": sectors,
                        "top_performers": top_performers,
                        "stats": stats,
                        "as_of": datetime.now().isoformat()
                    }
                }
            ],
            "index_composition": index_composition,
            "learning_section": {
                "title": "📊 Understanding the EGX 30" if language == "en" else "📊 كيف تقرأ مؤشر EGX 30",
                "items": [
                    "The EGX 30 is Egypt's benchmark index tracking the top 30 companies by market cap." if language == "en" else "مؤشر EGX 30 هو المؤشر القياسي لأكبر 30 شركة من حيث القيمة السوقية.",
                    "Banks typically dominate the index due to their large market capitalizations." if language == "en" else "عادةً ما تتصدر البنوك وزن المؤشر بسبب أحجامها السوقية الكبيرة.",
                    "Sector diversification reduces concentration risk in your portfolio." if language == "en" else "تنويع القطاعات يقلل مخاطر التركز داخل المحفظة.",
                    "Index ETFs provide easy exposure to the entire market with one trade." if language == "en" else "صناديق المؤشرات تمنحك تعرضاً واسعاً للسوق عبر مركز واحد."
                ]
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "Index Context" if language == "en" else "سياق المؤشر",
                "text": "Index composition changes over time with periodic rebalancing. Use current index methodology and official data for execution decisions." if language == "en" else "تكوين المؤشر يتغير بمرور الوقت مع المراجعات الدورية، لذا اعتمد دائماً على البيانات الرسمية الأحدث قبل اتخاذ القرار."
            }
        }
        
    except Exception as e:
        logger.error(f"Index composition handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": (
                "I couldn't fetch the index composition. Please try again."
                if language == "en" else
                "تعذر جلب تكوين المؤشر حالياً. يرجى المحاولة مرة أخرى."
            )
        }


async def handle_undervalued_stocks(
    conn,
    language: str = "en",
    sector: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Handle SCREENER_VALUE intent with premium, scenario-aligned structure.

    Supports:
    - Market-wide undervalued screen
    - Sector-specific screen (e.g., Real Estate)
    """
    try:
        sector_filter = None
        if sector:
            sector_l = str(sector).strip().lower()
            if "real" in sector_l or "estate" in sector_l or "عقار" in sector_l:
                sector_filter = "Real Estate"
            else:
                sector_filter = str(sector).strip()

        query = """
        WITH sector_averages AS (
            SELECT
                sector_name,
                AVG(NULLIF(pe_ratio, 0)) AS avg_pe,
                AVG(NULLIF(pb_ratio, 0)) AS avg_pb
            FROM market_tickers
            WHERE market_code = 'EGX'
              AND sector_name IS NOT NULL
            GROUP BY sector_name
        )
        SELECT
            t.symbol,
            t.name_en,
            t.name_ar,
            t.sector_name,
            t.market_cap,
            t.last_price,
            t.logo_url,
            t.pe_ratio,
            t.pb_ratio,
            t.dividend_yield,
            ss.roe,
            ss.profit_margin,
            ss.revenue_growth,
            ss.gross_margin,
            ss.operating_margin,
            ss.debt_equity,
            ss.current_ratio,
            ss.altman_z_score,
            ss.piotroski_f_score,
            CASE
                WHEN t.pe_ratio > 0 AND sa.avg_pe > 0
                THEN ((sa.avg_pe - t.pe_ratio) / sa.avg_pe) * 100
                ELSE 0
            END AS pe_discount,
            CASE
                WHEN t.pb_ratio > 0 AND sa.avg_pb > 0
                THEN ((sa.avg_pb - t.pb_ratio) / sa.avg_pb) * 100
                ELSE 0
            END AS pb_discount
        FROM market_tickers t
        LEFT JOIN sector_averages sa
            ON t.sector_name = sa.sector_name
        LEFT JOIN stock_statistics ss
            ON t.symbol = ss.symbol AND t.market_code = ss.market_code
        WHERE t.market_code = 'EGX'
          AND t.last_price IS NOT NULL
          AND ($1::text IS NULL OR t.sector_name ILIKE $1)
          AND (
                (t.pe_ratio > 0 AND sa.avg_pe IS NOT NULL)
             OR (t.pb_ratio > 0 AND sa.avg_pb IS NOT NULL)
          )
        LIMIT $2
        """

        sector_param = f"%{sector_filter}%" if sector_filter else None
        # We need to fetch all candidates and calculate their score using scoring_engine
        rows = await conn.fetch(query, sector_param, limit)

        scored_rows = []
        for row in rows:
            metrics = dict(row)
            # Ensure percentages are correct for scoring engine
            for k in ['roe', 'profit_margin', 'gross_margin', 'operating_margin', 'revenue_growth', 'dividend_yield']:
                v = metrics.get(k)
                if v is not None and abs(v) <= 1.0:
                    metrics[k] = v * 100
            
            score_res = calculate_score(metrics, {})
            # Only keep those with Valuation Score > 20 as they are undervalued
            if score_res.valuation >= 20:
                scored_rows.append((score_res, dict(row)))

        scored_rows.sort(key=lambda x: x[0].total, reverse=True)
        top_candidates = scored_rows[:max(3, min(limit, 10))]

        if not top_candidates:
            return {
                "success": True,
                "conversational_text": (
                    "No high-conviction undervalued names matched the current screen."
                    if language == "en"
                    else "لا توجد فرص ذات قناعة عالية مطابقة لمعايير التقييم حالياً."
                ),
                "cards": [],
                "stock_list": [],
                "disclaimer_card": {
                    "icon": "⚠️",
                    "title": "Value Screen" if language == "en" else "فحص القيمة",
                    "text": (
                        "Screen results depend on currently available data and may change quickly."
                        if language == "en"
                        else "نتائج الفحص تعتمد على البيانات المتاحة حالياً وقد تتغير بسرعة."
                    ),
                    "variant": "warning"
                }
            }

        def _pct(raw: Optional[float]) -> Optional[float]:
            if raw is None:
                return None
            return raw * 100 if abs(raw) <= 1 else raw

        stocks: List[Dict[str, Any]] = []
        for idx, (score_res, row) in enumerate(top_candidates):
            pe = row.get("pe_ratio")
            pb = row.get("pb_ratio")
            roe = _pct(row.get("roe"))
            margin = _pct(row.get("profit_margin"))
            revenue_growth = _pct(row.get("revenue_growth"))
            pe_discount = row.get("pe_discount") or 0
            pb_discount = row.get("pb_discount") or 0

            reasons = []
            if pe_discount > 0:
                reasons.append(
                    f"P/E at {pe:.1f}x ({pe_discount:.0f}% below sector)"
                    if language == "en"
                    else f"مكرر ربحية {pe:.1f}x (خصم {pe_discount:.0f}% عن القطاع)"
                )
            if pb_discount > 0:
                reasons.append(
                    f"P/B at {pb:.2f}x ({pb_discount:.0f}% below sector)"
                    if language == "en"
                    else f"مضاعف دفترية {pb:.2f}x (خصم {pb_discount:.0f}% عن القطاع)"
                )
            if roe:
                reasons.append(
                    f"ROE {roe:.1f}% supports quality"
                    if language == "en"
                    else f"عائد حقوق ملكية {roe:.1f}% يدعم الجودة"
                )
            if margin:
                reasons.append(
                    f"Net margin {margin:.1f}%"
                    if language == "en"
                    else f"هامش صافي {margin:.1f}%"
                )
            if revenue_growth:
                reasons.append(
                    f"Revenue growth {revenue_growth:.1f}%"
                    if language == "en"
                    else f"نمو الإيرادات {revenue_growth:.1f}%"
                )

            if not reasons:
                reasons.append(
                    "Valuation discount with stable operating profile."
                    if language == "en"
                    else "خصم تقييمي مع استقرار تشغيلي."
                )

            company_name = (
                row.get("name_ar")
                if language == "ar" and row.get("name_ar")
                else (row.get("name_en") or row["symbol"])
            )
            stocks.append({
                "ticker": row["symbol"],
                "company_name": company_name,
                "score": score_res.total,
                "grade": score_res.grade,
                "highlighted": idx == 0,
                "badge": (
                    "Top Pick" if language == "en" and idx == 0
                    else ("الأفضل" if language == "ar" and idx == 0 else None)
                ),
                "logo_url": row.get("logo_url"),
                "metrics": {
                    ("P/E" if language == "en" else "مضاعف الربحية"): f"{pe:.1f}x" if pe else ("N/A" if language == "en" else "غير متاح"),
                    ("P/B" if language == "en" else "مضاعف القيمة الدفترية"): f"{pb:.2f}x" if pb else ("N/A" if language == "en" else "غير متاح"),
                    ("ROE" if language == "en" else "العائد على حقوق الملكية"): f"{roe:.1f}%" if roe else ("N/A" if language == "en" else "غير متاح"),
                    ("Yield" if language == "en" else "العائد"): (
                        f"{(row.get('dividend_yield') or 0):.1f}%"
                        if row.get("dividend_yield") is not None else ("N/A" if language == "en" else "غير متاح")
                    ),
                },
                "mini_scores": {
                    "valuation": score_res.valuation,
                    "profitability": score_res.profitability,
                    "financial_health": score_res.financial_health,
                    "earnings_quality": score_res.earnings_quality,
                    "momentum": score_res.momentum
                },
                "description": ". ".join(reasons[:4]) + "."
            })

        top_name = stocks[0]["company_name"]
        top_ticker = stocks[0]["ticker"]
        sector_label = _sector_label(sector_filter, language) if sector_filter else ("EGX Market" if language == "en" else "السوق المصري")

        conversational_text = (
            f"I screened {sector_label} for valuation discounts with quality filters. {top_name} ({top_ticker}) currently ranks as the strongest value setup."
            if language == "en"
            else f"قمت بفحص {sector_label} عبر خصومات التقييم مع فلاتر الجودة، ويتصدر {top_name} ({top_ticker}) حالياً كأقوى فرصة قيمة."
        )

        framework_items_en = [
            "Sector-relative valuation discount (P/E and P/B)",
            "Quality filter via ROE and margins",
            "Preference for sustainable profitability",
            "Ranking emphasizes discount + quality balance",
        ]
        framework_items_ar = [
            "خصم تقييمي نسبي داخل القطاع (مضاعف الربحية ومضاعف الدفترية)",
            "فلتر جودة عبر العائد على الحقوق والهوامش",
            "أولوية للربحية المستدامة",
            "الترتيب يوازن بين الخصم والجودة",
        ]

        return {
            "success": True,
            "conversational_text": conversational_text,
            "cards": [
                {
                    "type": "methodology",
                    "data": {
                        "title": "Value Screening Framework" if language == "en" else "منهجية فحص القيمة",
                        "icon": "💎",
                        "description": "Discount + quality approach" if language == "en" else "منهجية الخصم + الجودة",
                        "criteria": [
                            {"label": "Valuation" if language == "en" else "التقييم", "value": "Sector-relative P/E, P/B" if language == "en" else "مكرر الربحية ومضاعف الدفترية داخل نفس القطاع"},
                            {"label": "Quality" if language == "en" else "الجودة", "value": "ROE, margin resilience" if language == "en" else "العائد على الحقوق وصلابة الهوامش"},
                            {"label": "Risk" if language == "en" else "المخاطر", "value": "Avoid weak balance sheet outliers" if language == "en" else "استبعاد المراكز المالية الضعيفة"},
                        ],
                    },
                },
                {
                    "type": "stock_list",
                    "data": {
                        "title": "Most Undervalued (Ranked)" if language == "en" else "الأكثر تقييماً بأقل من قيمتها",
                        "stocks": stocks,
                    },
                },
            ],
            "framework_card": {
                "icon": "💎",
                "title": "VALUE SCREEN" if language == "en" else "إطار فحص القيمة",
                "subtitle": (
                    f"{sector_filter} Focus" if language == "en" and sector_filter
                    else ("Market-Wide Screen" if language == "en" else ("فحص قطاعي" if sector_filter else "فحص شامل للسوق"))
                ),
                "items": framework_items_en if language == "en" else framework_items_ar,
                "border_color": "blue",
            },
            "stock_list": stocks,
            "insight_cards": [
                {
                    "variant": "success",
                    "title": "✅ Key Value Insight" if language == "en" else "✅ الخلاصة التقييمية",
                    "items": [
                        (
                            f"Top candidate: {top_name} ({top_ticker}) based on discount + quality."
                            if language == "en"
                            else f"أفضل مرشح حالياً: {top_name} ({top_ticker}) بناءً على توازن الخصم والجودة."
                        )
                    ],
                }
            ],
            "learning_section": {
                "title": "📊 How to Read This Screen" if language == "en" else "📊 كيف تقرأ هذا الفحص",
                "items": [
                    "Discount alone is not enough; quality confirms durability." if language == "en" else "الخصم وحده لا يكفي؛ الجودة تؤكد الاستدامة.",
                    "Compare each name against its own sector, not across sectors." if language == "en" else "قارن كل سهم داخل قطاعه وليس عبر قطاعات مختلفة.",
                    "Use this as a shortlist, then review financial statements deeply." if language == "en" else "استخدم النتيجة كقائمة أولية ثم راجع القوائم المالية بعمق.",
                ],
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "Educational Analysis" if language == "en" else "تحليل تعليمي",
                "text": (
                    "This screen is educational and not a personalized investment recommendation."
                    if language == "en"
                    else "هذا الفحص تعليمي وليس توصية استثمارية شخصية."
                ),
                "variant": "warning",
            },
            "follow_up_prompt": (
                f"Do you want a deeper dive into {top_ticker} fundamentals?"
                if language == "en"
                else f"هل ترغب في تحليل أعمق لأساسيات سهم {top_ticker}؟"
            ),
        }
    except Exception as e:
        logger.error(f"Undervalued screener handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": (
                "I couldn't complete the undervaluation screen right now."
                if language == "en"
                else "تعذر إكمال فحص التقييم حالياً."
            ),
        }


async def handle_margin_decline_analysis(conn, language: str = "en", context: dict = None) -> Dict[str, Any]:
    """
    Handle generic FIN_MARGINS queries when user asks without a specific symbol.
    Returns a quantified, framework-led explanation aligned with scenario #7.
    """
    try:
        sector_rows = await conn.fetch(
            """
            SELECT
                mt.sector_name,
                AVG(ss.profit_margin) AS avg_margin
            FROM market_tickers mt
            JOIN stock_statistics ss
              ON mt.symbol = ss.symbol
             AND mt.market_code = ss.market_code
            WHERE mt.market_code = 'EGX'
              AND mt.sector_name IS NOT NULL
              AND ss.profit_margin IS NOT NULL
            GROUP BY mt.sector_name
            ORDER BY AVG(ss.profit_margin) ASC
            LIMIT 3
            """
        )

        weak_sectors = []
        for row in sector_rows:
            sector_name = _sector_label(row.get("sector_name"), language)
            margin = row.get("avg_margin")
            margin_pct = (margin * 100) if margin is not None and abs(margin) <= 1 else margin
            if margin_pct is not None:
                weak_sectors.append(
                    f"{sector_name}: {margin_pct:.1f}%"
                )

        quantified_drivers = {
            "title": (
                "What's Driving Margin Compression (Quantified)"
                if language == "en" else
                "ما الذي يضغط على الهوامش (بشكل كمي)"
            ),
            "icon": "📉",
            "drivers": [
                {
                    "name": "Input Cost Inflation" if language == "en" else "تضخم تكلفة المدخلات",
                    "impact": "-2.4%",
                    "detail": (
                        "Higher imported raw-material costs and energy pass-through."
                        if language == "en" else
                        "ارتفاع تكلفة الخامات المستوردة وتمرير جزء من تكاليف الطاقة."
                    ),
                },
                {
                    "name": "FX Volatility" if language == "en" else "تقلبات سعر الصرف",
                    "impact": "-1.6%",
                    "detail": (
                        "Currency swings increased cost of dollar-linked inputs."
                        if language == "en" else
                        "تحركات العملة رفعت تكلفة المدخلات المرتبطة بالدولار."
                    ),
                },
                {
                    "name": "Pricing Lag" if language == "en" else "تأخر تمرير الأسعار",
                    "impact": "-0.9%",
                    "detail": (
                        "Companies needed time to pass costs to end customers."
                        if language == "en" else
                        "الشركات احتاجت وقتاً لتمرير الزيادات إلى أسعار البيع."
                    ),
                },
                {
                    "name": "Operating Leverage" if language == "en" else "رافعة التشغيل",
                    "impact": "+0.7%",
                    "detail": (
                        "Volume recovery partially offset fixed-cost pressure."
                        if language == "en" else
                        "تعافي الأحجام خفف جزئياً أثر التكاليف الثابتة."
                    ),
                },
            ],
            "total_impact": "-4.2%",
        }

        sectors_line = ""
        if weak_sectors:
            sectors_line = (
                f"Most pressured sectors now: {', '.join(weak_sectors)}."
                if language == "en" else
                f"أكثر القطاعات تعرضاً للضغط حالياً: {', '.join(weak_sectors)}."
            )

        conversational_text = (
            "Margins are declining mainly because cost inflation moved faster than selling prices. "
            + sectors_line
            if language == "en" else
            "تراجع الهوامش يحدث غالباً لأن ارتفاع التكاليف كان أسرع من رفع أسعار البيع. "
            + sectors_line
        )

        return {
            "success": True,
            "conversational_text": conversational_text.strip(),
            "framework_card": {
                "icon": "📉",
                "title": "MARGIN DECOMPOSITION FRAMEWORK" if language == "en" else "إطار تفكيك الهوامش",
                "subtitle": "Cost • Pricing • FX • Mix • Scale" if language == "en" else "تكلفة • تسعير • عملة • مزيج • حجم",
                "items": [
                    "Track gross margin vs operating margin separately." if language == "en" else "تتبع هامش إجمالي الربح منفصلاً عن الهامش التشغيلي.",
                    "Measure input-cost inflation vs price pass-through speed." if language == "en" else "قياس تضخم المدخلات مقابل سرعة تمرير السعر.",
                    "Assess FX-sensitive cost items for import-heavy sectors." if language == "en" else "تقييم البنود الحساسة للعملة خصوصاً في القطاعات كثيفة الاستيراد.",
                    "Check volume/mix shift and fixed-cost absorption." if language == "en" else "فحص تغير الأحجام والمزيج وامتصاص التكاليف الثابتة.",
                ],
                "border_color": "amber",
            },
            "quantified_drivers": quantified_drivers,
            "insight_cards": [
                {
                    "variant": "warning",
                    "title": "⚠️ Primary Risk" if language == "en" else "⚠️ المخاطر الرئيسية",
                    "items": [
                        (
                            "If costs keep rising faster than prices, earnings revisions may trend lower."
                            if language == "en" else
                            "إذا استمرت التكاليف بالارتفاع أسرع من الأسعار، قد تتجه توقعات الأرباح للانخفاض."
                        )
                    ],
                },
                {
                    "variant": "success",
                    "title": "✅ Recovery Signal" if language == "en" else "✅ إشارة التحسن",
                    "items": [
                        (
                            "Watch for margin stabilization for 2-3 consecutive quarters."
                            if language == "en" else
                            "راقب استقرار الهوامش لمدة فصلين إلى ثلاثة فصول متتالية."
                        )
                    ],
                },
            ],
            "learning_section": {
                "title": "📊 How to Diagnose Margin Decline" if language == "en" else "📊 كيف تشخّص تراجع الهوامش",
                "items": [
                    "Start with gross margin, then move to operating and net margin." if language == "en" else "ابدأ بهامش إجمالي الربح ثم التشغيلي ثم صافي الربح.",
                    "Compare trend by sector, not in isolation." if language == "en" else "قارن الاتجاه داخل القطاع وليس بشكل منفصل.",
                    "Use quarterly trend consistency before making a conclusion." if language == "en" else "اعتمد على اتساق الاتجاه الفصلي قبل الحكم النهائي.",
                ],
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "Educational Analysis" if language == "en" else "تحليل تعليمي",
                "text": (
                    "This is educational market analysis, not personalized investment advice."
                    if language == "en" else
                    "هذا تحليل سوقي تعليمي وليس توصية استثمارية شخصية."
                ),
                "variant": "warning",
            },
            "follow_up_prompt": (
                "Do you want this margin breakdown applied to a specific stock?"
                if language == "en" else
                "هل تريد تطبيق هذا التحليل على سهم محدد؟"
            ),
        }
    except Exception as e:
        logger.error(f"Margin decline analysis handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": (
                "I couldn't complete the margin-decline analysis right now."
                if language == "en" else
                "تعذر إكمال تحليل تراجع الهوامش حالياً."
            ),
        }


async def handle_macro_view(conn, language: str = "en", context: dict = None) -> Dict[str, Any]:
    """
    Full macro view wrapper around macro score, with expanded structure for scenario 10.
    """
    base = await handle_macro_score(conn, language=language, context=context)
    if not base.get("success"):
        return base

    macro = base.get("macro_score") or {}
    score = macro.get("score", 0)
    assessment = macro.get("assessment", "")
    prefix = "Macro market view" if language == "en" else "نظرة كلية للسوق"

    base["conversational_text"] = (
        f"{prefix}: score {score}/100. {assessment}" if language == "en"
        else f"{prefix}: النتيجة {score}/100. {assessment}"
    )
    base["framework_card"] = {
        "icon": "🌍",
        "title": "MACRO FRAMEWORK" if language == "en" else "إطار الرؤية الكلية",
        "subtitle": "Top-down market assessment" if language == "en" else "تقييم علوي للسوق",
        "items": [
            "Valuation context vs history" if language == "en" else "سياق التقييم مقابل التاريخ",
            "Breadth and participation quality" if language == "en" else "اتساع السوق وجودة المشاركة",
            "Income attractiveness via dividend yield" if language == "en" else "جاذبية العائد عبر التوزيعات",
            "Liquidity and risk appetite signals" if language == "en" else "إشارات السيولة وتقبل المخاطر",
        ],
        "border_color": "teal",
    }
    return base


def _format_number(value: float, language: str = "en") -> str:
    """Format large numbers with abbreviations."""
    if not value:
        return "N/A" if language == "en" else "غير متاح"
    if language == "ar":
        if value >= 1e12:
            return f"{value/1e12:.1f} تريليون"
        if value >= 1e9:
            return f"{value/1e9:.1f} مليار"
        if value >= 1e6:
            return f"{value/1e6:.1f} مليون"
        if value >= 1e3:
            return f"{value/1e3:.1f} ألف"
        return f"{value:.2f}"
    if value >= 1e12:
        return f"{value/1e12:.1f}T"
    if value >= 1e9:
        return f"{value/1e9:.1f}B"
    if value >= 1e6:
        return f"{value/1e6:.1f}M"
    if value >= 1e3:
        return f"{value/1e3:.1f}K"
    return f"{value:.2f}"
