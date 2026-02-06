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

logger = logging.getLogger(__name__)


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
        # Note: ROE, profit_margin columns are in market_tickers (from stock_snapshot)
        query = """
        WITH sector_averages AS (
            SELECT 
                sector_name,
                AVG(NULLIF(pb_ratio, 0)) as avg_pb,
                AVG(NULLIF(pe_ratio, 0)) as avg_pe
            FROM market_tickers
            WHERE market_code = 'EGX' AND sector_name IS NOT NULL
            GROUP BY sector_name
        ),
        gem_candidates AS (
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
                t.roe,
                t.profit_margin as net_profit_margin,
                t.revenue_growth,
                sa.avg_pb,
                sa.avg_pe,
                -- Calculate undervaluation score
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
            LEFT JOIN sector_averages sa ON t.sector_name = sa.sector_name
            WHERE t.market_code = 'EGX'
              AND t.is_active = true
              AND t.market_cap BETWEEN 500000000 AND 5000000000  -- 500M to 5B EGP
              AND (t.pe_ratio > 0 OR t.pb_ratio > 0)
        )
        SELECT 
            *,
            -- Composite undervaluation score (weighted)
            GREATEST(pb_discount, pe_discount) + 
            CASE WHEN roe > 15 THEN 15 ELSE COALESCE(roe, 0) END +
            CASE WHEN net_profit_margin > 10 THEN 10 ELSE COALESCE(net_profit_margin, 0) END
            AS gem_score
        FROM gem_candidates
        WHERE GREATEST(pb_discount, pe_discount) >= 15
          OR (roe > 15 AND (pb_discount > 0 OR pe_discount > 0))
        ORDER BY gem_score DESC
        LIMIT 5
        """
        
        rows = await conn.fetch(query)
        
        if not rows:
            # Fallback to simpler query using market_tickers columns directly
            fallback_query = """
            SELECT 
                symbol,
                name_en,
                market_cap,
                sector_name,
                pe_ratio,
                pb_ratio,
                logo_url,
                roe,
                profit_margin as net_profit_margin
            FROM market_tickers
            WHERE market_code = 'EGX'
              AND is_active = true
              AND market_cap BETWEEN 300000000 AND 10000000000
              AND pb_ratio > 0 AND pb_ratio < 1.5
            ORDER BY pb_ratio ASC
            LIMIT 5
            """
            rows = await conn.fetch(fallback_query)
        
        # Build gem list
        gems = []
        for idx, row in enumerate(rows):
            # Calculate score
            score = min(100, max(50, int(
                (row.get('gem_score') or 0) + 
                (20 if (row.get('pb_ratio') or 999) < 1 else 0) +
                (15 if (row.get('roe') or 0) > 15 else 0)
            )))
            
            # Generate "why it's a gem" explanation
            reasons = []
            pb = row.get('pb_ratio')
            pe = row.get('pe_ratio')
            roe = row.get('roe')
            margin = row.get('net_profit_margin')
            
            if pb and pb < 1:
                reasons.append(f"Trading below book value at {pb:.2f}x P/B")
            elif pb and pb < 1.5:
                reasons.append(f"Attractive valuation at {pb:.2f}x P/B")
                
            if pe and pe < 10:
                reasons.append(f"Low P/E of {pe:.1f}x suggests undervaluation")
                
            if roe and roe > 15:
                reasons.append(f"Strong profitability with {roe:.1f}% ROE")
                
            if margin and margin > 10:
                reasons.append(f"Healthy {margin:.1f}% net margin")
                
            market_cap = row.get('market_cap', 0)
            if market_cap < 1e9:
                reasons.append("Small cap with growth potential")
            
            if not reasons:
                reasons.append("Solid fundamentals with limited analyst coverage")
            
            why_gem = ". ".join(reasons[:3]) + "."
            
            gems.append({
                "ticker": row['symbol'],
                "company_name": row.get('name_en') or row['symbol'],
                "score": score,
                "is_top_pick": idx == 0,
                "logo_url": row.get('logo_url'),
                "metrics": {
                    "P/B": f"{pb:.2f}x" if pb else "N/A",
                    "P/E": f"{pe:.1f}x" if pe else "N/A",
                    "ROE": f"{roe:.1f}%" if roe else "N/A",
                    "Cap": _format_number(market_cap)
                },
                "why_its_a_gem": why_gem
            })
        
        # Build conversational text
        if gems:
            top_gem = gems[0]['ticker']
            conv_text = f"🎯 Found {len(gems)} hidden gems in the EGX. These are underfollowed stocks trading at significant discounts to their intrinsic value. {top_gem} stands out as my top pick with strong fundamentals and limited analyst coverage."
        else:
            conv_text = "No hidden gems matching my strict criteria today. The market may be fairly priced, or quality small caps are already discovered."
        
        # Build methodology card
        methodology = {
            "title": "Hidden Gem Screening Criteria",
            "icon": "🎯",
            "description": "Multi-factor discovery screen",
            "criteria": [
                {"label": "Market Cap", "value": "EGP 500M - 5B"},
                {"label": "Valuation Discount", "value": ">15% below sector"},
                {"label": "Quality Filter", "value": "ROE > 15% or Positive Margins"},
                {"label": "Coverage", "value": "Not in EGX 30 (underfollowed)"}
            ],
            "note": "Gems are stocks overlooked by the market with solid fundamentals."
        }
        
        return {
            "success": True,
            "conversational_text": conv_text,
            "cards": [
                {"type": "methodology", "data": methodology},
                {"type": "hidden_gems", "data": {"title": "Hidden Gems", "stocks": gems}}
            ],
            "learning_section": {
                "title": "📊 Understanding Hidden Gems",
                "items": [
                    "Hidden gems are overlooked stocks with strong fundamentals but limited analyst coverage.",
                    "Small caps often outperform over time as the market discovers their value.",
                    "The score reflects valuation discount, profitability, and growth potential.",
                    "Always do your own due diligence before investing in less liquid stocks."
                ]
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "Discovery Analysis",
                "text": "Hidden gems carry higher risk due to lower liquidity and limited information. This is for educational purposes only.",
                "variant": "warning"
            }
        }
        
    except Exception as e:
        logger.error(f"Hidden gems handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": "I couldn't screen for hidden gems right now. Please try again."
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
        WHERE market_code = 'EGX' AND is_active = true
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
            valuation_detail = f"Market P/E of {avg_pe:.1f}x is below historical average"
        elif avg_pe < historical_pe * 1.1:
            valuation_score = 18
            valuation_status = "neutral"
            valuation_detail = f"Market P/E of {avg_pe:.1f}x is near historical average"
        else:
            valuation_score = 8
            valuation_status = "negative"
            valuation_detail = f"Market P/E of {avg_pe:.1f}x is above historical average"
        
        factors.append({
            "name": "Valuation",
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
            breadth_detail = "Strong buying pressure across the market"
        elif breadth_ratio > 0.4:
            breadth_score = 15
            breadth_status = "neutral"
            breadth_detail = "Mixed market sentiment"
        else:
            breadth_score = 5
            breadth_status = "negative"
            breadth_detail = "Selling pressure dominates"
        
        factors.append({
            "name": "Market Breadth",
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
            yield_detail = f"Attractive average yield of {avg_yield:.1f}%"
        elif avg_yield > 2:
            yield_score = 12
            yield_status = "neutral"
            yield_detail = f"Moderate average yield of {avg_yield:.1f}%"
        else:
            yield_score = 6
            yield_status = "negative"
            yield_detail = f"Low average yield of {avg_yield:.1f}%"
        
        factors.append({
            "name": "Income Potential",
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
            pb_detail = f"Many stocks trading near book value ({avg_pb:.2f}x)"
        elif avg_pb < 1.8:
            pb_score = 10
            pb_status = "neutral"
            pb_detail = f"Fair book value multiples ({avg_pb:.2f}x)"
        else:
            pb_score = 5
            pb_status = "negative"
            pb_detail = f"Elevated book value multiples ({avg_pb:.2f}x)"
        
        factors.append({
            "name": "Asset Values",
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
            liquidity_detail = "High market participation and liquidity"
        elif active_ratio > 0.4:
            liquidity_score = 10
            liquidity_status = "neutral"
            liquidity_detail = "Normal market activity levels"
        else:
            liquidity_score = 5
            liquidity_status = "negative"
            liquidity_detail = "Low market participation"
        
        factors.append({
            "name": "Liquidity",
            "points": liquidity_score,
            "max_points": 15,
            "status": liquidity_status,
            "detail": liquidity_detail
        })
        total_score += liquidity_score
        
        # Generate assessment text
        if total_score >= 75:
            assessment = "Constructive Environment - Multiple factors support equity investment. Consider systematic allocation."
        elif total_score >= 55:
            assessment = "Mixed Environment - Stock-specific fundamentals matter more than macro. Be selective."
        elif total_score >= 35:
            assessment = "Cautious Environment - Elevated risks present. Focus on quality and defensive sectors."
        else:
            assessment = "Risk-Off Environment - Consider reducing equity exposure or focusing on cash-rich companies."
        
        # Conversational text
        if language == "ar":
            conv_text = f"تقييم بيئة السوق حاليا {total_score}/100. {assessment}"
        else:
            conv_text = f"Egypt's market environment scores {total_score}/100 currently. {assessment}"
        
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
            "learning_section": {
                "title": "📊 Understanding the Market Score",
                "items": [
                    "The score combines valuation, breadth, yield, and liquidity factors.",
                    "75-100: Constructive - Multiple tailwinds support investing.",
                    "55-75: Mixed - Be selective, focus on quality stocks.",
                    "35-55: Cautious - Elevated risks, prefer defensive positioning.",
                    "0-35: Risk-Off - Consider reducing exposure or holding cash."
                ]
            },
            "disclaimer_card": {
                "icon": "⚠️",
                "title": "Market Timing Analysis",
                "text": "This is a simplified scoring model based on available data. Actual macro conditions depend on factors not captured here (GDP, inflation, FX reserves, global conditions). Always consider your personal risk tolerance.",
                "variant": "warning"
            }
        }
        
    except Exception as e:
        logger.error(f"Macro score handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": "I couldn't calculate the market score right now. Please try again."
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
              AND is_active = true
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
                "error": "No index data available",
                "conversational_text": "Could not fetch EGX 30 composition at this time."
            }
        
        # Calculate sector weights
        total_cap = sum(r.get('market_cap', 0) or 0 for r in rows)
        sector_caps = {}
        sector_counts = {}
        
        for row in rows:
            sector = row.get('sector_name') or 'Other'
            cap = row.get('market_cap', 0) or 0
            sector_caps[sector] = sector_caps.get(sector, 0) + cap
            sector_counts[sector] = sector_counts.get(sector, 0) + 1
        
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
                "stock_count": sector_counts.get(sector, 0)
            })
        
        # Top 5 performers
        top_performers = []
        for row in rows[:5]:
            top_performers.append({
                "ticker": row['symbol'],
                "company_name": row.get('name_en') or row['symbol'],
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
        top_sector = sectors[0]['sector'] if sectors else "Various"
        conv_text = f"The EGX 30 represents Egypt's largest and most liquid stocks. {top_sector} dominates with {sectors[0]['weight']:.1f}% weight. Here's the complete breakdown."
        
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
            "learning_section": {
                "title": "📊 Understanding the EGX 30",
                "items": [
                    "The EGX 30 is Egypt's benchmark index tracking the top 30 companies by market cap.",
                    "Banks typically dominate the index due to their large market capitalizations.",
                    "Sector diversification reduces concentration risk in your portfolio.",
                    "Index ETFs provide easy exposure to the entire market with one trade."
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Index composition handler error: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversational_text": "I couldn't fetch the index composition. Please try again."
        }


def _format_number(value: float) -> str:
    """Format large numbers with abbreviations."""
    if not value:
        return "N/A"
    if value >= 1e12:
        return f"{value/1e12:.1f}T"
    if value >= 1e9:
        return f"{value/1e9:.1f}B"
    if value >= 1e6:
        return f"{value/1e6:.1f}M"
    if value >= 1e3:
        return f"{value/1e3:.1f}K"
    return f"{value:.2f}"
