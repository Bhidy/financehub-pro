"""
Bull/Bear Case Generator - Generates structured insight cards for stock analysis.

Analyzes stock data and generates Bull Case (upside) and Bear Case (downside)
insight cards matching the HTML mockup structure.
"""

from typing import Optional, List, Dict, Any
from .schemas import InsightCard, InsightCardVariant, DataCard


def generate_bull_bear_cases(
    stock_data: Dict[str, Any],
    language: str = "en"
) -> tuple[Optional[InsightCard], Optional[InsightCard]]:
    """
    Generate Bull Case and Bear Case insight cards from stock data.
    
    Args:
        stock_data: Stock fundamentals, ratios, and metrics
        language: "en" or "ar"
    
    Returns:
        Tuple of (bull_case, bear_case) InsightCards
    """
    
    # Extract key metrics
    pe_ratio = stock_data.get('pe_ratio')
    pb_ratio = stock_data.get('pb_ratio')
    roe = stock_data.get('roe')
    debt_to_equity = stock_data.get('debt_to_equity')
    dividend_yield = stock_data.get('dividend_yield')
    revenue_growth = stock_data.get('revenue_growth')
    net_margin = stock_data.get('net_margin')
    market_cap = stock_data.get('market_cap')
    sector = stock_data.get('sector', 'Unknown')
    
    # Sector averages (hardcoded - could be from DB)
    SECTOR_PE = {
        'Banks': 7.0, 'Financial Services': 10.0, 'Food, Beverages & Tobacco': 14.0,
        'Real Estate': 12.0, 'Basic Resources': 8.0, 'Industrial Goods': 10.0,
        'default': 12.0
    }
    avg_pe = SECTOR_PE.get(sector, SECTOR_PE['default'])
    
    # Build Bull Case items
    bull_items = []
    bear_items = []
    
    # 1. Valuation analysis
    if pe_ratio:
        if pe_ratio < avg_pe * 0.8:
            discount = round((1 - pe_ratio / avg_pe) * 100)
            bull_items.append(f"Trading at {discount}% discount to sector P/E average ({pe_ratio:.1f}x vs {avg_pe:.0f}x)")
        elif pe_ratio > avg_pe * 1.2:
            premium = round((pe_ratio / avg_pe - 1) * 100)
            bear_items.append(f"Trading at {premium}% premium to sector P/E ({pe_ratio:.1f}x vs {avg_pe:.0f}x)")
    
    if pb_ratio:
        if pb_ratio < 1.0:
            bear_items.append(f"P/B below 1.0x ({pb_ratio:.2f}x) - trading below book value, may indicate concerns")
        elif pb_ratio < 1.5:
            bull_items.append(f"Attractive P/B ratio ({pb_ratio:.2f}x) - reasonable value for quality")
    
    # 2. Profitability analysis
    if roe:
        if roe > 20:
            bull_items.append(f"Strong ROE of {roe:.1f}% indicates excellent capital efficiency")
        elif roe > 15:
            bull_items.append(f"Solid ROE of {roe:.1f}% demonstrates profitable operations")
        elif roe < 8:
            bear_items.append(f"Weak ROE of {roe:.1f}% suggests capital allocation concerns")
    
    if net_margin:
        if net_margin > 20:
            bull_items.append(f"High net margin ({net_margin:.1f}%) suggests pricing power and cost control")
        elif net_margin < 5:
            bear_items.append(f"Thin net margin ({net_margin:.1f}%) leaves little room for error")
    
    # 3. Balance sheet health
    if debt_to_equity is not None:
        if debt_to_equity > 0.7:
            bear_items.append(f"Elevated D/E ratio ({debt_to_equity:.2f}x) - refinancing risk in high-rate environment")
        elif debt_to_equity < 0.3:
            bull_items.append(f"Low leverage ({debt_to_equity:.2f}x D/E) - strong balance sheet flexibility")
    
    # 4. Growth analysis  
    if revenue_growth:
        if revenue_growth > 15:
            bull_items.append(f"Strong revenue growth ({revenue_growth:.1f}% YoY) signals market share gains")
        elif revenue_growth < 0:
            bear_items.append(f"Declining revenues ({revenue_growth:.1f}% YoY) raises demand concerns")
    
    # 5. Dividend analysis
    if dividend_yield:
        if dividend_yield > 5:
            bull_items.append(f"Attractive dividend yield ({dividend_yield:.1f}%) provides income cushion")
        elif dividend_yield == 0:
            bear_items.append("No dividend could indicate reinvestment phase or cash constraints")
    
    # Ensure we have enough items in each case
    if len(bull_items) < 2:
        if market_cap and market_cap > 10_000_000_000:  # > 10B
            bull_items.append("Large-cap status provides institutional support and liquidity")
        else:
            bull_items.append("Mid-cap profile offers growth potential with reasonable liquidity")
    
    if len(bear_items) < 2:
        bear_items.append("Currency volatility may impact import costs and margins")
        bear_items.append("Macroeconomic uncertainty could pressure consumer spending")
    
    # Estimate upside/downside (simplified)
    upside_pct = min(50, max(10, int((avg_pe / pe_ratio - 1) * 100))) if pe_ratio else 30
    downside_pct = min(40, max(10, int((pe_ratio / avg_pe - 0.5) * 50))) if pe_ratio else 20
    
    # Create Bull Case card
    bull_title_en = f"📈 Bull Case (+{upside_pct}% upside)"
    bull_title_ar = f"📈 الحالة الإيجابية (+{upside_pct}% صعود)"
    
    bull_case = InsightCard(
        variant=InsightCardVariant.SUCCESS,
        title=bull_title_en if language == "en" else bull_title_ar,
        items=bull_items[:5]  # Max 5 items
    )
    
    # Create Bear Case card
    bear_title_en = f"📉 Bear Case (-{downside_pct}% downside)"
    bear_title_ar = f"📉 الحالة السلبية (-{downside_pct}% هبوط)"
    
    bear_case = InsightCard(
        variant=InsightCardVariant.WARNING,
        title=bear_title_en if language == "en" else bear_title_ar,
        items=bear_items[:5]  # Max 5 items
    )
    
    return bull_case, bear_case


def generate_data_card(
    symbol: str,
    price: float,
    change: float,
    change_pct: float,
    volume: Optional[int] = None,
    avg_volume: Optional[int] = None,
    currency: str = "EGP",
    language: str = "en"
) -> DataCard:
    """
    Generate a Current Position data card for a stock.
    
    Args:
        symbol: Stock ticker
        price: Current price
        change: Price change (absolute)
        change_pct: Price change (percentage)
        volume: Current volume
        avg_volume: Average volume (for comparison)
        currency: Currency code
        language: "en" or "ar"
    
    Returns:
        DataCard with formatted price and volume context
    """
    
    # Format price
    price_str = f"{currency} {price:,.2f}"
    
    # Format change
    sign = "+" if change >= 0 else ""
    change_str = f"{sign}{change:,.2f} ({sign}{change_pct:.2f}%)"
    
    # Format volume context
    volume_context = None
    if volume:
        vol_str = f"{volume / 1_000_000:.1f}M" if volume >= 1_000_000 else f"{volume / 1_000:.0f}K"
        
        if avg_volume and avg_volume > 0:
            vol_ratio = (volume / avg_volume - 1) * 100
            if vol_ratio > 0:
                volume_context = f"Volume: {vol_str} shares ({vol_ratio:.0f}% above 3-month average)"
            else:
                volume_context = f"Volume: {vol_str} shares ({abs(vol_ratio):.0f}% below 3-month average)"
        else:
            volume_context = f"Volume: {vol_str} shares"
    
    return DataCard(
        label="CURRENT POSITION" if language == "en" else "المركز الحالي",
        icon="📊",
        price=price_str,
        change=change_str,
        change_positive=change >= 0,
        volume_context=volume_context
    )


def generate_insight_card(
    title: str,
    items: List[str],
    variant: str = "info",
    language: str = "en"
) -> InsightCard:
    """
    Generate a generic insight card.
    
    Args:
        title: Card title with emoji
        items: List of bullet points
        variant: "success", "warning", "info", or "neutral"
        language: "en" or "ar"
    
    Returns:
        InsightCard with specified variant
    """
    
    variant_map = {
        "success": InsightCardVariant.SUCCESS,
        "warning": InsightCardVariant.WARNING,
        "info": InsightCardVariant.INFO,
        "neutral": InsightCardVariant.NEUTRAL
    }
    
    return InsightCard(
        variant=variant_map.get(variant, InsightCardVariant.INFO),
        title=title,
        items=items
    )
