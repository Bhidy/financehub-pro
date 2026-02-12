
from enum import Enum
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class MarketTone(str, Enum):
    CRASH = "CRASH"       # < -2.0%
    CORRECTION = "CORRECTION" # -0.5% to -2.0%
    NEUTRAL = "NEUTRAL"   # -0.5% to +0.5%
    RALLY = "RALLY"       # +0.5% to +2.0%
    BOOM = "BOOM"         # > +2.0%

class MarketSentimentAnalyzer:
    """
    Analyzes market data to determine the appropriate emotional tone for the AI.
    Prevents "Happy AI" during a market crash.
    """

    @staticmethod
    def analyze_market_mood(market_summary: Dict[str, Any]) -> MarketTone:
        """
        Determines market tone based on EGX30 index change.
        Expects market_summary to contain 'change_percent'.
        """
        if not market_summary:
            return MarketTone.NEUTRAL

        try:
            # Extract change percent. Handle potential string format "1.23%"
            raw_change = market_summary.get("change_percent", 0.0)
            if isinstance(raw_change, str):
                raw_change = float(raw_change.replace("%", "").strip())
            
            change = float(raw_change)

            if change < -2.0:
                return MarketTone.CRASH
            elif change < -0.5:
                return MarketTone.CORRECTION
            elif change > 2.0:
                return MarketTone.BOOM
            elif change > 0.5:
                return MarketTone.RALLY
            else:
                return MarketTone.NEUTRAL

        except Exception as e:
            logger.error(f"Failed to analyze market mood: {e}")
            return MarketTone.NEUTRAL

    @staticmethod
    def get_tone_instruction(tone: MarketTone) -> str:
        """
        Returns the system prompt instruction for the determined tone.
        """
        INSTRUCTIONS = {
            MarketTone.CRASH: "⚠️ MARKET ALERT: The market is down significantly (>2%). Adopt a SERIOUS, REASSURING tone. Focus on risk management and long-term perspective. Do not be cheerful.",
            MarketTone.CORRECTION: "⚠️ MARKET DIP: The market is in correction mode. Be OBJECTIVE and ANALYTICAL. Await confirmation before being bullish.",
            MarketTone.NEUTRAL: "ℹ️ MARKET FLAT: The market is choppy/neutral. Be BALANCED. Focus on stock-specific catalysts rather than macro.",
            MarketTone.RALLY: "✅ MARKET RALLY: The market is up. You can be CAUTIOUSLY OPTIMISTIC. Highlight momentum but remind of risks.",
            MarketTone.BOOM: "🚀 MARKET BOOM: Strong market performance (>2%). You can be ENERGETIC and CONFIDENT. Highlight growth opportunities."
        }
        return INSTRUCTIONS.get(tone, INSTRUCTIONS[MarketTone.NEUTRAL])
