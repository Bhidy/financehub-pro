"""
Macro Scorer - Analyzes market environment for timing recommendations.

Generates a 0-100 Macro Score based on the framework from complete_implementation_kit.md:
- Growth (0-25 points)
- Inflation (0-20 points)
- Hard Currency Flows (0-30 points)
- USD Dynamics (0-15 points)
- Earnings (0-10 points)
"""

from typing import Dict, Any, List
from .schemas import MacroScoreCard, MacroFactor


class MacroScorer:
    """
    Calculate macro environment score (0-100) for market timing.
    
    Based on Osama's institutional framework:
    - GROWTH: 25 points (GDP forecast, actual, PMI)
    - INFLATION: 20 points (current vs historical, trend)
    - HARD CURRENCY: 30 points (FX reserves, tourism, Suez, remittances)
    - USD DYNAMICS: 15 points (DXY, EGP stability)
    - EARNINGS: 10 points (beat rate)
    """
    
    def calculate_score(self, data: Dict[str, Any]) -> MacroScoreCard:
        """
        Calculate comprehensive macro score.
        
        Args:
            data: Dict with macro indicators (from macro_data table)
        
        Returns:
            MacroScoreCard with score, assessment, and factor breakdown
        """
        
        # Calculate each component
        growth_score, growth_status = self._score_growth(data)
        inflation_score, inflation_status = self._score_inflation(data)
        currency_score, currency_status = self._score_currency(data)
        usd_score, usd_status = self._score_usd_dynamics(data)
        earnings_score, earnings_status = self._score_earnings(data)
        
        # Total score
        total_score = growth_score + inflation_score + currency_score + usd_score + earnings_score
        
        # Build factors list
        factors = [
            MacroFactor(
                name="GDP Growth",
                points=growth_score,
                max_points=25,
                status=growth_status
            ),
            MacroFactor(
                name="Inflation",
                points=inflation_score,
                max_points=20,
                status=inflation_status
            ),
            MacroFactor(
                name="Hard Currency",
                points=currency_score,
                max_points=30,
                status=currency_status
            ),
            MacroFactor(
                name="USD Dynamics",
                points=usd_score,
                max_points=15,
                status=usd_status
            ),
            MacroFactor(
                name="Earnings",
                points=earnings_score,
                max_points=10,
                status=earnings_status
            )
        ]
        
        # Get assessment
        assessment = self._get_assessment(total_score)
        
        return MacroScoreCard(
            score=total_score,
            max_score=100,
            assessment=assessment,
            factors=factors
        )
    
    def _score_growth(self, data: Dict) -> tuple[int, str]:
        """Growth indicators (0-25 points)"""
        score = 0
        
        # GDP forecast (0-10 points)
        gdp_forecast = data.get('gdp_forecast', 0)
        if gdp_forecast > 5:
            score += 10
        elif gdp_forecast > 3:
            score += 7
        elif gdp_forecast > 1:
            score += 4
        
        # Actual recent GDP (0-10 points)
        gdp_actual = data.get('gdp_actual', 0)
        if gdp_actual > 5:
            score += 10
        elif gdp_actual > 3:
            score += 7
        elif gdp_actual > 1:
            score += 4
        
        # PMI (0-5 points)
        pmi = data.get('pmi', 0)
        if pmi > 50:
            score += 5
        elif pmi > 45:
            score += 3
        
        score = min(score, 25)
        
        # Determine status
        if score >= 18:
            status = "positive"
        elif score >= 10:
            status = "neutral"
        else:
            status = "negative"
        
        return score, status
    
    def _score_inflation(self, data: Dict) -> tuple[int, str]:
        """Inflation indicators (0-20 points)"""
        score = 0
        
        # Current inflation vs historical (0-10 points)
        inflation_current = data.get('inflation_yoy', 0)
        inflation_historical_avg = data.get('inflation_historical_avg', 18)
        
        if inflation_current < inflation_historical_avg * 0.8:
            score += 10
        elif inflation_current < inflation_historical_avg:
            score += 5
        
        # Inflation trend (0-10 points)
        inflation_trend = data.get('inflation_trend', 'stable')
        if inflation_trend == 'declining':
            score += 10
        elif inflation_trend == 'stable':
            score += 5
        
        score = min(score, 20)
        
        if score >= 15:
            status = "positive"
        elif score >= 8:
            status = "neutral"
        else:
            status = "negative"
        
        return score, status
    
    def _score_currency(self, data: Dict) -> tuple[int, str]:
        """Hard currency flows (0-30 points)"""
        score = 0
        
        # FX reserves trend (0-10 points)
        fx_reserves_change = data.get('fx_reserves_3m_change_pct', 0)
        if fx_reserves_change > 5:
            score += 10
        elif fx_reserves_change > 0:
            score += 5
        
        # Tourism (0-7 points)
        tourism_yoy = data.get('tourism_revenues_yoy_change', 0)
        if tourism_yoy > 10:
            score += 7
        elif tourism_yoy > 0:
            score += 4
        
        # Suez Canal (0-7 points)
        suez_yoy = data.get('suez_revenues_yoy_change', 0)
        if suez_yoy > 5:
            score += 7
        elif suez_yoy > 0:
            score += 4
        
        # Remittances (0-6 points)
        remittances_yoy = data.get('remittances_yoy_change', 0)
        if remittances_yoy > 5:
            score += 6
        elif remittances_yoy > 0:
            score += 3
        
        score = min(score, 30)
        
        if score >= 22:
            status = "positive"
        elif score >= 12:
            status = "neutral"
        else:
            status = "negative"
        
        return score, status
    
    def _score_usd_dynamics(self, data: Dict) -> tuple[int, str]:
        """USD & EGP dynamics (0-15 points)"""
        score = 0
        
        # DXY trend (0-7 points) - weakening USD is good for EM
        dxy_change = data.get('dxy_3m_change_pct', 0)
        if dxy_change < -2:
            score += 7
        elif dxy_change < 0:
            score += 4
        
        # EGP stability (0-8 points) - lower volatility is better
        egp_volatility = data.get('egp_3m_volatility', 0)
        if egp_volatility < 2:
            score += 8
        elif egp_volatility < 5:
            score += 4
        
        score = min(score, 15)
        
        if score >= 11:
            status = "positive"
        elif score >= 6:
            status = "neutral"
        else:
            status = "negative"
        
        return score, status
    
    def _score_earnings(self, data: Dict) -> tuple[int, str]:
        """Earnings season performance (0-10 points)"""
        earnings_beat_rate = data.get('earnings_beat_rate_pct', 50)
        
        if earnings_beat_rate > 60:
            score = 10
            status = "positive"
        elif earnings_beat_rate > 40:
            score = 5
            status = "neutral"
        else:
            score = 0
            status = "negative"
        
        return score, status
    
    def _get_assessment(self, score: int) -> str:
        """Convert score to qualitative assessment"""
        if score >= 75:
            return "Strong Buy Environment"
        elif score >= 50:
            return "Cautiously Constructive"
        elif score >= 25:
            return "Caution Warranted"
        else:
            return "Risk-Off"


# Singleton instance
_macro_scorer = MacroScorer()


def get_macro_scorer() -> MacroScorer:
    """Get the macro scorer instance."""
    return _macro_scorer


async def calculate_macro_score(conn, market_code: str = "EGX") -> MacroScoreCard:
    """
    Calculate macro score from database data.
    
    Args:
        conn: Database connection
        market_code: Market to analyze (EGX, TASI, etc.)
    
    Returns:
        MacroScoreCard with full breakdown
    """
    
    # Try to fetch macro data from database
    try:
        row = await conn.fetchrow("""
            SELECT 
                gdp_forecast, gdp_actual, pmi,
                inflation_yoy, inflation_historical_avg, inflation_trend,
                fx_reserves_3m_change_pct, tourism_revenues_yoy_change,
                suez_revenues_yoy_change, remittances_yoy_change,
                dxy_3m_change_pct, egp_3m_volatility,
                earnings_beat_rate_pct
            FROM macro_data
            WHERE market_code = $1
            ORDER BY as_of DESC
            LIMIT 1
        """, market_code)
        
        if row:
            data = dict(row)
        else:
            # Fallback to reasonable defaults for Egypt
            data = {
                'gdp_forecast': 4.2,
                'gdp_actual': 3.8,
                'pmi': 48.5,
                'inflation_yoy': 28.5,
                'inflation_historical_avg': 18.0,
                'inflation_trend': 'declining',
                'fx_reserves_3m_change_pct': 2.5,
                'tourism_revenues_yoy_change': 12.0,
                'suez_revenues_yoy_change': -15.0,  # Houthi impact
                'remittances_yoy_change': 5.0,
                'dxy_3m_change_pct': 0.5,
                'egp_3m_volatility': 3.0,
                'earnings_beat_rate_pct': 55.0
            }
    except Exception:
        # Database error - use defaults
        data = {
            'gdp_forecast': 4.2,
            'gdp_actual': 3.8,
            'pmi': 48.5,
            'inflation_yoy': 28.5,
            'inflation_historical_avg': 18.0,
            'inflation_trend': 'declining',
            'fx_reserves_3m_change_pct': 2.5,
            'tourism_revenues_yoy_change': 12.0,
            'suez_revenues_yoy_change': -15.0,
            'remittances_yoy_change': 5.0,
            'dxy_3m_change_pct': 0.5,
            'egp_3m_volatility': 3.0,
            'earnings_beat_rate_pct': 55.0
        }
    
    scorer = get_macro_scorer()
    return scorer.calculate_score(data)
