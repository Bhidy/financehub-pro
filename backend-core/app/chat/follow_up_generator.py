"""
Soft Follow-Up Generator - Intent-Aware Next Step Suggestions

Generates a single, clear follow-up prompt based on the current intent
to guide the user to their next logical action.
"""

import random
from typing import Optional
from .schemas import Intent

# Intent-based follow-up suggestions
FOLLOW_UP_PROMPTS = {
    Intent.STOCK_PRICE: {
        "en": [
            "Would you like to see the full snapshot or compare with another stock?",
            "Want me to show financials or technical indicators for this stock?",
            "Shall we look at dividends or growth trends next?",
        ],
        "ar": [
            "هل تريد رؤية اللقطة الكاملة أو المقارنة مع سهم آخر؟",
            "هل أعرض لك القوائم المالية أو المؤشرات الفنية؟",
        ]
    },
    Intent.STOCK_SNAPSHOT: {
        "en": [
            "Would you like to dive into financials or compare this stock?",
            "Want to check dividends or technical analysis next?",
            "Shall I show you the growth trends or fair value estimate?",
        ],
        "ar": [
            "هل تريد التعمق في القوائم المالية أو مقارنة هذا السهم؟",
            "هل تريد مراجعة التوزيعات أو التحليل الفني؟",
        ]
    },
    Intent.FINANCIALS: {
        "en": [
            "Would you like to see dividends or profitability trends?",
            "Want me to analyze growth or compare with a competitor?",
        ],
        "ar": [
            "هل تريد رؤية التوزيعات أو اتجاهات الربحية؟",
        ]
    },
    Intent.TOP_GAINERS: {
        "en": [
            "Want to explore one of these stocks in more detail?",
            "Shall I show you the snapshot for any of these gainers?",
        ],
        "ar": [
            "هل تريد استكشاف أحد هذه الأسهم بالتفصيل؟",
        ]
    },
    Intent.TOP_LOSERS: {
        "en": [
            "Want to analyze one of these stocks to find potential opportunities?",
            "Shall I check the fundamentals for any of these losers?",
        ],
        "ar": [
            "هل تريد تحليل أحد هذه الأسهم للبحث عن فرص محتملة؟",
        ]
    },
    Intent.DIVIDENDS: {
        "en": [
            "Would you like to compare dividend yields with similar stocks?",
            "Want to check the financial health of this company?",
        ],
        "ar": [
            "هل تريد مقارنة عوائد التوزيعات مع أسهم مماثلة؟",
        ]
    },
    Intent.COMPARE_STOCKS: {
        "en": [
            "Want to add another stock to the comparison?",
            "Shall we dive deeper into one of these stocks?",
        ],
        "ar": [
            "هل تريد إضافة سهم آخر للمقارنة؟",
        ]
    },
    Intent.TECHNICAL_INDICATORS: {
        "en": [
            "Would you like to see the fundamental metrics alongside these technicals?",
            "Want to check support/resistance levels or momentum?",
        ],
        "ar": [
            "هل تريد رؤية المقاييس الأساسية بجانب هذه الفنيات؟",
        ]
    },
    Intent.DEEP_VALUATION: {
        "en": [
            "Want to check financial health or growth rates next?",
            "Shall I compare this valuation with sector peers?",
        ],
        "ar": [
            "هل تريد مراجعة الصحة المالية أو معدلات النمو؟",
        ]
    },
    Intent.DEEP_SAFETY: {
        "en": [
            "Would you like to see profitability or growth trends?",
            "Want to compare safety metrics with competitors?",
        ],
        "ar": [
            "هل تريد رؤية اتجاهات الربحية أو النمو؟",
        ]
    },
    Intent.SECTOR_STOCKS: {
        "en": [
            "Want to explore one of these sector stocks in detail?",
            "Shall I show you the top performers in this sector?",
        ],
        "ar": [
            "هل تريد استكشاف أحد أسهم هذا القطاع بالتفصيل؟",
        ]
    },
}

# Default fallback prompts for intents not explicitly listed
DEFAULT_PROMPTS = {
    "en": [
        "Let me know what you'd like to explore next.",
        "Feel free to ask about any other stock or metric.",
        "What aspect would you like to dive into?",
    ],
    "ar": [
        "أخبرني ماذا تريد استكشافه بعد ذلك.",
        "لا تتردد في السؤال عن أي سهم أو مقياس آخر.",
    ]
}


def generate_follow_up(
    intent: Intent,
    language: str = "en",
    symbol: Optional[str] = None
) -> str:
    """
    Generate a soft follow-up prompt based on the current intent.
    
    Args:
        intent: The detected Intent enum
        language: 'en' or 'ar'
        symbol: Optional stock symbol for context (unused currently)
    
    Returns:
        A single follow-up prompt string.
    """
    lang_key = language if language in ["en", "ar"] else "en"
    
    # Get prompts for this intent
    prompts = FOLLOW_UP_PROMPTS.get(intent, {}).get(lang_key)
    
    if not prompts:
        # Fallback to default
        prompts = DEFAULT_PROMPTS.get(lang_key, DEFAULT_PROMPTS["en"])
    
    return random.choice(prompts)


# Singleton pattern
_generator = None

def get_follow_up_generator():
    global _generator
    if _generator is None:
        _generator = generate_follow_up
    return _generator
