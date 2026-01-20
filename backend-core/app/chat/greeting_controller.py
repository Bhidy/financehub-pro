"""
Greeting Controller - Category-Based Rotation Engine

Phase 2 of Starta Conversational Design.
Ensures greetings are never repetitive and only shown when appropriate.
"""

import random
from typing import Optional, Tuple
from .schemas import Intent


# ============================================================================
# GREETING CATEGORIES (5 Types - Never repeat same category twice)
# ============================================================================

GREETING_CATEGORIES = {
    "warm_welcome": {
        "en": [
            "Good to see you, {name}! 👋",
            "Hey {name}! Ready to explore some stocks?",
            "Welcome! Let's dive into the market together.",
            "Great to have you here, {name}!",
        ],
        "ar": [
            "أهلاً {name}! 👋",
            "سعيد بوجودك! خلينا نبدأ.",
            "مرحباً! جاهز نستكشف السوق سوا.",
        ]
    },
    "professional_intro": {
        "en": [
            "Hello {name}. I'm here to help you analyze EGX stocks.",
            "Good to have you. Let's look at the data together.",
            "Welcome to Starta. What would you like to analyze?",
            "I'm Starta, your financial analyst. How can I assist?",
        ],
        "ar": [
            "مرحباً {name}. أنا ستارتا، محللك المالي.",
            "أهلاً بك. خلينا نحلل البيانات سوا.",
            "مرحباً! إزاي أقدر أساعدك النهارده؟",
        ]
    },
    "friendly_minimal": {
        "en": [
            "Hey there! 👋",
            "Hi {name}!",
            "Hello!",
            "Hey!",
        ],
        "ar": [
            "أهلاً! 👋",
            "مرحباً {name}!",
            "أهلاً وسهلاً!",
        ]
    },
    "coaching": {
        "en": [
            "Ready to make smart investment decisions, {name}?",
            "Let's build your market knowledge today.",
            "Great timing — I'm ready to break down any stock for you.",
            "Let's turn data into insights today.",
        ],
        "ar": [
            "جاهز نتخذ قرارات استثمارية ذكية؟",
            "خلينا نبني معرفتك بالسوق النهارده.",
            "توقيت ممتاز — جاهز أحلل أي سهم ليك.",
        ]
    },
    "neutral": {
        "en": [
            "How can I help you today?",
            "What would you like to know?",
            "I'm ready when you are.",
            "What can I help you with?",
        ],
        "ar": [
            "إزاي أقدر أساعدك؟",
            "تحب تعرف إيه؟",
            "جاهز أساعدك.",
        ]
    }
}

# Categories list for rotation
CATEGORY_NAMES = list(GREETING_CATEGORIES.keys())


class GreetingController:
    """
    Controls when and how greetings are shown.
    
    Rules:
    - Max 1 greeting per session (unless explicit "hello" from user)
    - Never repeat the same category twice
    - Only greet on appropriate intents
    """
    
    # Intents that explicitly request greetings
    GREETING_INTENTS = {Intent.GREETING, Intent.IDENTITY, Intent.CAPABILITIES, Intent.MOOD, Intent.GRATITUDE}
    
    # Intents where greeting is forbidden (data queries)
    DATA_INTENTS = {
        Intent.STOCK_PRICE, Intent.STOCK_SNAPSHOT, Intent.STOCK_CHART,
        Intent.FINANCIALS, Intent.DIVIDENDS, Intent.TECHNICAL_INDICATORS,
        Intent.TOP_GAINERS, Intent.TOP_LOSERS, Intent.SECTOR_STOCKS,
        Intent.COMPARE_STOCKS, Intent.NEWS, Intent.FAIR_VALUE,
        Intent.DEEP_VALUATION, Intent.DEEP_SAFETY, Intent.DEEP_GROWTH,
    }
    
    @classmethod
    def should_greet(
        cls,
        intent: Intent,
        is_new_session: bool,
        greeting_already_shown: bool,
        turn_count: int
    ) -> bool:
        """
        Determine if a greeting should be shown.
        
        Returns True only if:
        - First message AND not a data query, OR
        - User explicitly said hello/hi (GREETING intent)
        """
        # Never greet on data queries
        if intent in cls.DATA_INTENTS:
            return False
        
        # Always greet if user says hello
        if intent in cls.GREETING_INTENTS:
            return True
        
        # Greet on first message if conversational intent
        if is_new_session and not greeting_already_shown and turn_count <= 1:
            return True
        
        return False
    
    @classmethod
    def get_greeting(
        cls,
        language: str,
        user_name: str = "Trader",
        last_category: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Get a greeting message with category rotation.
        
        Args:
            language: 'en' or 'ar'
            user_name: User's name for personalization
            last_category: Last used category (to avoid repetition)
            
        Returns:
            Tuple of (greeting_text, category_used)
        """
        # Get available categories (exclude last used)
        available = [c for c in CATEGORY_NAMES if c != last_category]
        if not available:
            available = CATEGORY_NAMES
        
        # Random selection
        category = random.choice(available)
        
        # Get greetings for this category and language
        lang_key = language if language in ['en', 'ar'] else 'en'
        greetings = GREETING_CATEGORIES[category].get(lang_key, GREETING_CATEGORIES[category]['en'])
        
        # Random greeting from category
        greeting = random.choice(greetings)
        
        # Personalize with name (50% chance if name is default)
        if user_name == "Trader" and random.random() > 0.5:
            greeting = greeting.replace("{name}", "").replace("  ", " ").strip()
            greeting = greeting.replace(", !", "!").replace(" !", "!")
        else:
            greeting = greeting.format(name=user_name)
        
        return greeting, category


# Singleton instance
_greeting_controller = GreetingController()


def get_greeting_controller() -> GreetingController:
    """Get the greeting controller instance."""
    return _greeting_controller
