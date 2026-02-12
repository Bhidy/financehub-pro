
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import asyncpg
from app.chat.schemas import Intent

logger = logging.getLogger(__name__)

class SophisticationAnalyzer:
    """
    Analyzes user queries to determine financial sophistication level.
    Updates the user_profile with a running score (0.0 to 1.0).
    """

    # Complexity Scores for each Intent (0.0 = Novice, 1.0 = Expert)
    INTENT_SCORES = {
        Intent.GREETING: 0.1,
        Intent.HELP: 0.1,
        Intent.STOCK_PRICE: 0.2,
        Intent.MARKET_STATUS: 0.2,
        Intent.NEWS: 0.3, # Simple sentiment
        
        # Intermediate (Fundamentals, movement reasons)
        Intent.TOP_GAINERS: 0.4,
        Intent.TOP_LOSERS: 0.4,
        Intent.COMPANY_PROFILE: 0.4,
        Intent.FINANCIALS: 0.5,
        Intent.MARKET_SUMMARY: 0.5,
        
        # Advanced (Detailed metrics, complex comparisons)
        Intent.COMPARE_STOCKS: 0.7,
        Intent.FAIR_VALUE: 0.8,
        Intent.TECHNICAL_INDICATORS: 0.8,
        Intent.SCREENER_DEEP: 0.9,
        Intent.DEEP_VALUATION: 0.9,
        Intent.MACRO_VIEW: 0.8,
        Intent.SECTOR_STOCKS: 0.7
    }

    # Smoothing factor for Exponential Moving Average
    ALPHA = 0.2  # 20% weight to new query, 80% to history

    @classmethod
    async def update_user_sophistication(cls, conn: asyncpg.Connection, user_id: int, intent: Intent) -> float:
        """
        Updates the user's sophistication score based on the current intent.
        Returns the new score.
        """
        if not user_id:
            return 0.0

        try:
            # 1. Get query complexity
            # Default to 0.3 (Intermediate-Low) if unknown
            # Note: handle if intent is string or Enum
            intent_val = intent if isinstance(intent, Intent) else Intent(intent)
            query_score = cls.INTENT_SCORES.get(intent_val, 0.3)
            
            # 2. Get current profile
            row = await conn.fetchrow(
                "SELECT sophistication_score FROM user_profiles WHERE user_id = $1", 
                user_id
            )
            
            if not row:
                # Create default profile if missing
                new_score = query_score
                await conn.execute("""
                    INSERT INTO user_profiles (user_id, sophistication_score, updated_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (user_id) DO NOTHING
                """, user_id, new_score)
                return new_score
            
            current_score = row['sophistication_score']
            
            # 3. Calculate EMA
            # NewScore = (QueryScore * alpha) + (OldScore * (1 - alpha))
            new_score = (query_score * cls.ALPHA) + (current_score * (1.0 - cls.ALPHA))
            
            # 4. Update DB
            await conn.execute("""
                UPDATE user_profiles 
                SET sophistication_score = $1, updated_at = NOW()
                WHERE user_id = $2
            """, new_score, user_id)
            
            logger.info(f"🧠 Sophistication updated for User {user_id}: {current_score:.2f} -> {new_score:.2f} (Intent: {intent})")
            return new_score

        except Exception as e:
            logger.error(f"Failed to update sophistication for user {user_id}: {e}")
            return 0.0

    @classmethod
    def get_level(cls, score: float) -> str:
        """Returns a string label for the score."""
        if score < 0.3:
            return "NOVICE"
        elif score < 0.7:
            return "INTERMEDIATE"
        else:
            return "EXPERT"
