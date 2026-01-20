"""
Response Composer - 3-Layer Conversational Response Builder

Phase 3 of Starta Conversational Design.
Builds dynamic, non-repetitive responses using:
① Human Opening (optional)
② Data-Aware Commentary (core)
③ Gentle Guidance (optional)
"""

import random
from typing import Optional, List, Dict, Tuple
from .schemas import Intent, CardType


# ============================================================================
# LAYER ① - HUMAN OPENINGS (Acknowledge user naturally)
# ============================================================================

HUMAN_OPENINGS = {
    "acknowledgment": {
        "en": [
            "Good question.",
            "Let's take a clear look.",
            "That's worth looking into.",
            "Interesting choice.",
            "Let me check that for you.",
        ],
        "ar": [
            "سؤال ممتاز.",
            "خلينا نشوف كويس.",
            "ده يستاهل نتفحصه.",
            "اختيار مهم.",
        ]
    },
    "acknowledgment_with_name": {
        "en": [
            "Good question, {name}.",
            "Alright {name}, let's take a clear look.",
            "This is a smart thing to check, {name}.",
            "Got it, {name}. Let me show you.",
        ],
        "ar": [
            "سؤال ممتاز يا {name}.",
            "تمام يا {name}، خلينا نشوف.",
            "فهمتك يا {name}. أوريك.",
        ]
    },
    "affirmation": {
        "en": [
            "You're asking the right question.",
            "That's a sensible way to look at it.",
            "This helps clarify the picture.",
            "Smart angle to explore.",
        ],
        "ar": [
            "سؤالك في محله.",
            "ده تفكير صح.",
            "ده بيوضح الصورة.",
        ]
    },
    "neutral": {
        "en": [
            "Let's see what the data shows.",
            "Here's what we're looking at.",
            "Let me break this down.",
            "Here's the picture.",
        ],
        "ar": [
            "خلينا نشوف البيانات.",
            "ده اللي قدامنا.",
            "أفصّلهالك.",
        ]
    }
}

# Category names for rotation
OPENING_CATEGORIES = list(HUMAN_OPENINGS.keys())


# ============================================================================
# LAYER ③ - GENTLE GUIDANCE (Keep conversation flowing)
# ============================================================================

GUIDANCE_SUGGESTIONS = {
    "compare": {
        "en": [
            "If you want, we can compare this with another EGX stock.",
            "Would you like to see how this compares to similar companies?",
            "We can put this side by side with a competitor if you'd like.",
        ],
        "ar": [
            "لو حابب، نقدر نقارنه بسهم تاني.",
            "تحب نشوف مقارنة مع شركات مشابهة؟",
        ]
    },
    "explore": {
        "en": [
            "Next, we can look at financial strength or dividends.",
            "We can also check the technical indicators if you'd like.",
            "Want me to dig deeper into the financials?",
        ],
        "ar": [
            "نقدر نشوف الصحة المالية أو التوزيعات.",
            "تحب نتفحص المؤشرات الفنية؟",
        ]
    },
    "user_led": {
        "en": [
            "Let me know which part you'd like to explore deeper.",
            "What aspect interests you most?",
            "Feel free to ask about any specific metric.",
        ],
        "ar": [
            "قولي تحب نستكشف إيه أكتر.",
            "أي جزء يهمك أكتر؟",
        ]
    },
    "context_aware": {
        "en": [
            "Based on this, you might want to check the valuation next.",
            "The growth trend could give more context here.",
            "Looking at dividends might complete the picture.",
        ],
        "ar": [
            "بناءً على ده، ممكن تشوف التقييم.",
            "اتجاه النمو ممكن يوضح أكتر.",
        ]
    }
}

GUIDANCE_CATEGORIES = list(GUIDANCE_SUGGESTIONS.keys())


# ============================================================================
# DATA-AWARE COMMENTARY TEMPLATES (Card type to context)
# ============================================================================

CARD_CONTEXT_DESCRIPTIONS = {
    CardType.STOCK_HEADER: "stock overview",
    CardType.SNAPSHOT: "key metrics and valuation",
    CardType.STATS: "detailed statistics",
    CardType.FINANCIALS_TABLE: "financial statements",
    CardType.FINANCIAL_EXPLORER: "comprehensive financials",
    CardType.DIVIDENDS_TABLE: "dividend history",
    CardType.COMPARE_TABLE: "comparison data",
    CardType.MOVERS_TABLE: "market movers",
    CardType.SECTOR_LIST: "sector breakdown",
    CardType.SCREENER_RESULTS: "screening results",
    CardType.TECHNICALS: "technical indicators",
    CardType.OWNERSHIP: "ownership structure",
    CardType.FAIR_VALUE: "valuation analysis",
    CardType.NEWS_LIST: "recent news",
    CardType.DEEP_VALUATION: "deep valuation metrics",
    CardType.DEEP_HEALTH: "financial health indicators",
    CardType.DEEP_GROWTH: "growth analysis",
}


class ResponseComposer:
    """
    Composes dynamic, non-repetitive responses.
    
    Each response is built from 3 optional layers:
    ① Human Opening (50% chance, varies)
    ② Data-Aware Commentary (always, from LLM)
    ③ Gentle Guidance (30% chance, varies)
    """
    
    @classmethod
    def get_human_opening(
        cls,
        language: str,
        user_name: str = "Trader",
        last_opening_used: Optional[str] = None,
        use_name: bool = True
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Get a human opening (Layer ①).
        
        Returns:
            Tuple of (opening_text or None, category_used or None)
        """
        # 50% chance to include opening
        if random.random() > 0.5:
            return None, None
        
        # Choose category type based on name usage
        if use_name and user_name != "Trader" and random.random() > 0.3:
            category_pool = ["acknowledgment_with_name"]
        else:
            category_pool = ["acknowledgment", "affirmation", "neutral"]
        
        # Avoid repetition
        available = [c for c in category_pool if c != last_opening_used]
        if not available:
            available = category_pool
        
        category = random.choice(available)
        
        # Get opening
        lang_key = language if language in ['en', 'ar'] else 'en'
        openings = HUMAN_OPENINGS[category].get(lang_key, HUMAN_OPENINGS[category]['en'])
        opening = random.choice(openings)
        
        # Personalize
        opening = opening.format(name=user_name)
        
        return opening, category
    
    @classmethod
    def get_gentle_guidance(
        cls,
        language: str,
        intent: Intent,
        shown_card_types: Optional[List[str]] = None
    ) -> Optional[str]:
        """
        Get a gentle guidance suggestion (Layer ③).
        
        Returns:
            Guidance text or None (30% chance)
        """
        # 30% chance to include guidance
        if random.random() > 0.3:
            return None
        
        # Choose category based on context
        if intent in [Intent.STOCK_SNAPSHOT, Intent.STOCK_PRICE]:
            category = random.choice(["explore", "compare", "user_led"])
        elif intent in [Intent.COMPARE_STOCKS]:
            category = random.choice(["explore", "user_led"])
        elif intent in [Intent.TOP_GAINERS, Intent.TOP_LOSERS, Intent.SECTOR_STOCKS]:
            category = "user_led"
        else:
            category = random.choice(GUIDANCE_CATEGORIES)
        
        # Get guidance
        lang_key = language if language in ['en', 'ar'] else 'en'
        guidances = GUIDANCE_SUGGESTIONS[category].get(lang_key, GUIDANCE_SUGGESTIONS[category]['en'])
        
        return random.choice(guidances)
    
    @classmethod
    def describe_shown_cards(cls, card_types: List[str]) -> str:
        """
        Generate a description of what cards are being shown.
        Used to inform the LLM about context.
        """
        descriptions = []
        for ct in card_types:
            try:
                card_type = CardType(ct)
                if card_type in CARD_CONTEXT_DESCRIPTIONS:
                    descriptions.append(CARD_CONTEXT_DESCRIPTIONS[card_type])
            except ValueError:
                pass
        
        if not descriptions:
            return "financial data"
        
        if len(descriptions) == 1:
            return descriptions[0]
        
        return ", ".join(descriptions[:-1]) + " and " + descriptions[-1]
    
    @classmethod
    def compose_full_response(
        cls,
        core_narrative: str,
        language: str,
        intent: Intent,
        user_name: str = "Trader",
        last_opening_used: Optional[str] = None,
        shown_card_types: Optional[List[str]] = None,
        include_opening: bool = True,
        include_guidance: bool = True
    ) -> Tuple[str, Optional[str]]:
        """
        Compose a full 3-layer response.
        
        Args:
            core_narrative: The LLM-generated data-aware commentary
            language: 'en' or 'ar'
            intent: The detected intent
            user_name: User's name
            last_opening_used: To prevent repetition
            shown_card_types: List of card types shown
            include_opening: Whether to potentially include Layer ①
            include_guidance: Whether to potentially include Layer ③
            
        Returns:
            Tuple of (full_response, opening_category_used)
        """
        parts = []
        opening_category = None
        
        # Layer ① - Human Opening (optional)
        if include_opening:
            opening, opening_category = cls.get_human_opening(
                language=language,
                user_name=user_name,
                last_opening_used=last_opening_used
            )
            if opening:
                parts.append(opening)
        
        # Layer ② - Core Narrative (always)
        if core_narrative:
            parts.append(core_narrative)
        
        # Layer ③ - Gentle Guidance (optional)
        if include_guidance:
            guidance = cls.get_gentle_guidance(
                language=language,
                intent=intent,
                shown_card_types=shown_card_types
            )
            if guidance:
                parts.append(guidance)
        
        # Combine with proper spacing
        full_response = " ".join(parts)
        
        return full_response, opening_category


# ============================================================================
# FOLLOW-UP DETECTION (Phase 4)
# ============================================================================

FOLLOW_UP_PATTERNS_EN = [
    r"is that (good|bad|high|low|normal|okay|ok)",
    r"what (does|do) (that|this|it) mean",
    r"can you explain",
    r"tell me more",
    r"and (what about|how about)",
    r"why\??$",
    r"should i (buy|sell|hold)",
    r"what do you think",
    r"is it (safe|risky|good|bad)",
    r"explain",
    r"more details",
    r"go deeper",
]

FOLLOW_UP_PATTERNS_AR = [
    r"ده (كويس|وحش|عالي|منخفض)",
    r"يعني إيه",
    r"فسرلي",
    r"أكتر",
    r"ليه",
    r"أشتري|أبيع",
    r"رأيك إيه",
]


def is_follow_up_question(message: str, language: str = "en") -> bool:
    """
    Detect if a message is a follow-up to a previous question.
    """
    import re
    
    message_lower = message.lower().strip()
    
    # Very short messages are often follow-ups
    if len(message_lower) < 20:
        patterns = FOLLOW_UP_PATTERNS_EN if language == "en" else FOLLOW_UP_PATTERNS_AR
        for pattern in patterns:
            if re.search(pattern, message_lower, re.IGNORECASE):
                return True
    
    return False


# ============================================================================
# FOLLOW-UP RESPONSES (Context-aware)
# ============================================================================

FOLLOW_UP_RESPONSES = {
    "interpretation": {
        "en": [
            "That depends on what you compare it to — let's look at valuation and growth.",
            "In context of its recent performance, here's what stands out.",
            "If we judge it by financial health, this is generally considered solid.",
            "Let me add some context to those numbers.",
            "Here's how to interpret what we're seeing.",
        ],
        "ar": [
            "ده بيعتمد على المقارنة — خلينا نشوف التقييم والنمو.",
            "في سياق أدائه الأخير، ده اللي بيبرز.",
            "لو حكمنا بالصحة المالية، ده يعتبر كويس.",
        ]
    },
    "clarification": {
        "en": [
            "Let me clarify what this means for you.",
            "Simply put, this indicates the stock's current position.",
            "Here's a clearer breakdown.",
        ],
        "ar": [
            "خليني أوضحلك ده يعني إيه.",
            "ببساطة، ده بيوضح وضع السهم.",
        ]
    }
}


def get_follow_up_response(language: str = "en") -> str:
    """Get an appropriate follow-up response starter."""
    category = random.choice(list(FOLLOW_UP_RESPONSES.keys()))
    lang_key = language if language in ['en', 'ar'] else 'en'
    responses = FOLLOW_UP_RESPONSES[category].get(lang_key, FOLLOW_UP_RESPONSES[category]['en'])
    return random.choice(responses)


# Singleton
_response_composer = ResponseComposer()


def get_response_composer() -> ResponseComposer:
    """Get the response composer instance."""
    return _response_composer
