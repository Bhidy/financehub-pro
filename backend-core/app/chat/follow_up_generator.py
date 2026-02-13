"""
Soft Follow-Up Generator - Intent-Aware Next Step Suggestions

Generates a single, clear follow-up prompt based on the current intent
to guide the user to their next logical action.
"""

import random
from typing import Optional
from .schemas import Intent

# Intent-based follow-up suggestions (enhanced to match template scenarios)
FOLLOW_UP_PROMPTS = {
    Intent.STOCK_PRICE: {
        "en": [
            "Want me to dig deeper into the valuation, or compare this with its sector peers?",
            "Shall I break down the financials, or check if the stock is fairly valued?",
            "Want to see the full risk/reward picture with bull and bear cases?",
        ],
        "ar": [
            "تريدني أتعمق في التقييم أو أقارنه بأسهم القطاع؟",
            "أحلل لك القوائم المالية أو أشوف لو السهم بقيمته العادلة؟",
            "تحب تشوف صورة المخاطرة/العائد الكاملة بالسيناريوهات؟",
        ]
    },
    Intent.STOCK_SNAPSHOT: {
        "en": [
            "Want me to deep-dive into the financials, or compare this against key competitors?",
            "Shall I check fair value and growth trends, or run a full valuation analysis?",
            "Interested in the dividend history or technical signals for timing?",
        ],
        "ar": [
            "تريدني أتعمق في القوائم المالية أو أقارنه بالمنافسين الرئيسيين؟",
            "أراجع لك القيمة العادلة واتجاهات النمو؟",
            "تريد تشوف تاريخ التوزيعات أو الإشارات الفنية للتوقيت؟",
        ]
    },
    Intent.FINANCIALS: {
        "en": [
            "Want me to analyze margin trends, or compare profitability with sector rivals?",
            "Shall I check the cash flow picture, or see how growth compares historically?",
        ],
        "ar": [
            "تريدني أحلل اتجاهات الهوامش أو أقارن الربحية مع منافسي القطاع؟",
            "أراجع صورة التدفقات النقدية أو النمو التاريخي؟",
        ]
    },
    Intent.TOP_GAINERS: {
        "en": [
            "Any of these gainers catch your eye? I can break down the fundamentals behind the move.",
            "Want me to check if any of these are fundamentally strong or just momentum plays?",
        ],
        "ar": [
            "أي من هذه الأسهم لفت نظرك؟ أقدر أحلل لك الأساسيات وراء الحركة.",
            "تحب أشوف لو في منهم قوي من ناحية الأساسيات أم حركة مضاربة؟",
        ]
    },
    Intent.TOP_LOSERS: {
        "en": [
            "Any of these declines look like a buying opportunity? I can analyze the fundamentals.",
            "Want me to check which losers might be oversold versus genuinely weak?",
        ],
        "ar": [
            "أي من هذه الانخفاضات تبدو فرصة شراء؟ أقدر أحلل الأساسيات.",
            "تحب أشوف مين فيهم ده بيع مبالغ فيه ومين ضعيف فعلاً؟",
        ]
    },
    Intent.DIVIDENDS: {
        "en": [
            "Want to compare this dividend yield with sector peers, or check sustainability?",
            "Shall I analyze the payout ratio and free cash flow to see if dividends are safe?",
        ],
        "ar": [
            "تريد مقارنة عائد التوزيعات مع أسهم القطاع أو التحقق من الاستدامة؟",
            "أحلل لك نسبة التوزيع والتدفق النقدي الحر لمعرفة أمان التوزيعات؟",
        ]
    },
    Intent.COMPARE_STOCKS: {
        "en": [
            "Which competitor interests you most? I can break down the risk/reward in detail.",
            "Want me to add another stock to the comparison, or deep-dive into one of these?",
            "Shall I run a full valuation analysis on the strongest candidate?",
        ],
        "ar": [
            "أي منافس يهمك أكثر؟ أقدر أفصل لك المخاطرة/العائد بالتفصيل.",
            "تحب أضيف سهم تاني للمقارنة أو أتعمق في واحد من دول؟",
            "أعمل تحليل تقييم كامل لأقوى مرشح؟",
        ]
    },
    Intent.TECHNICAL_INDICATORS: {
        "en": [
            "Want to overlay the fundamentals on top of these technicals for a complete picture?",
            "Shall I check fair value to see if technicals align with valuation?",
        ],
        "ar": [
            "تريد نضيف الأساسيات على الفنيات عشان الصورة تكتمل؟",
            "أراجع القيمة العادلة لنشوف لو الفنيات متوافقة مع التقييم؟",
        ]
    },
    Intent.DEEP_VALUATION: {
        "en": [
            "Want to compare this valuation with sector peers, or check financial health risks?",
            "Shall I analyze growth trends to see if the valuation discount is justified?",
        ],
        "ar": [
            "تريد مقارنة التقييم مع أسهم القطاع أو مراجعة مخاطر الصحة المالية؟",
            "أحلل اتجاهات النمو لمعرفة هل خصم التقييم مبرر؟",
        ]
    },
    Intent.DEEP_SAFETY: {
        "en": [
            "Want me to compare safety metrics with competitors, or check growth quality?",
            "Shall I analyze the debt maturity profile and interest coverage in detail?",
        ],
        "ar": [
            "تريد أقارن مقاييس الأمان مع المنافسين أو أراجع جودة النمو؟",
            "أحلل ملف استحقاق الديون وتغطية الفوائد بالتفصيل؟",
        ]
    },
    Intent.SECTOR_STOCKS: {
        "en": [
            "Want me to screen for the best value plays in this sector?",
            "Interested in comparing the top names, or finding hidden gems in the sector?",
        ],
        "ar": [
            "تريدني أبحث عن أفضل فرص القيمة في هذا القطاع؟",
            "تحب أقارن الأسماء الكبيرة أو ألاقي الجواهر المخفية في القطاع؟",
        ]
    },
    # NEW intents matching template scenarios
    Intent.MARKET_STATUS: {
        "en": [
            "Want me to drill down on any specific macro factor, or discuss sector implications?",
            "Shall I analyze which sectors benefit most from the current macro environment?",
        ],
        "ar": [
            "تريدني أتعمق في عامل ماكرو محدد أو أناقش تأثيره على القطاعات؟",
            "أحلل أي القطاعات تستفيد أكتر من البيئة الحالية؟",
        ]
    },
}

# Default fallback prompts (enhanced)
DEFAULT_PROMPTS = {
    "en": [
        "What would you like to explore next? I can analyze any EGX stock, compare peers, or screen for opportunities.",
        "Ask me about any stock, sector, or financial metric — I'm ready to dig in.",
        "Want a stock analysis, peer comparison, or market overview? Just ask.",
    ],
    "ar": [
        "إيه اللي تحب تستكشفه؟ أقدر أحلل أي سهم في البورصة أو أقارن أو أبحث عن فرص.",
        "اسألني عن أي سهم أو قطاع أو مقياس مالي — جاهز أتعمق.",
        "تحب تحليل سهم أو مقارنة أو نظرة عامة على السوق؟ قولي.",
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
