"""
Soft Follow-Up Generator - Intent-Aware Next Step Suggestions

Generates a single, clear follow-up prompt based on the current intent
to guide the user to their next logical action.
"""

import random
from typing import Optional
from .schemas import Intent

# Intent-based follow-up suggestion TEMPLATES.
# Use {sym} as a placeholder that will be replaced with the active stock symbol.
# If no symbol is available, a version without {sym} will be used.
FOLLOW_UP_TEMPLATES = {
    Intent.STOCK_PRICE: {
        "en": [
            ("Want me to dig deeper into {sym}'s valuation, or compare it with its sector peers?", "Want me to dig deeper? I can analyze valuation or compare against sector peers."),
            ("Shall I break down {sym}'s financials, or check if it's fairly valued?", "Want a deeper look at financials or fair value?"),
            ("Want to see a full risk/reward picture for {sym} with bull and bear cases?", "Want to see the full risk/reward picture with bull and bear cases?"),
        ],
        "ar": [
            ("تريدني أتعمق في تقييم {sym} أو أقارنه بأسهم القطاع؟", "تريدني أتعمق في التقييم أو أقارنه بأسهم القطاع؟"),
            ("أحلل لك القوائم المالية لـ{sym} أو أشوف لو السهم بقيمته العادلة؟", "أحلل القوائم المالية أو أشوف القيمة العادلة؟"),
        ]
    },
    Intent.STOCK_SNAPSHOT: {
        "en": [
            ("Want me to deep-dive into {sym}'s financials, or compare it against key competitors?", "Want me to deep-dive into the financials, or compare against key competitors?"),
            ("Shall I check {sym}'s fair value and growth trends, or run a full valuation analysis?", "Shall I check fair value and growth trends, or run a full valuation analysis?"),
            ("Interested in {sym}'s dividend history or technical signals for timing?", "Interested in dividend history or technical signals for timing?"),
        ],
        "ar": [
            ("تريدني أتعمق في القوائم المالية لـ{sym} أو أقارنه بالمنافسين؟", "تريدني أتعمق في القوائم المالية أو أقارنه بالمنافسين الرئيسيين؟"),
            ("أراجع لك القيمة العادلة واتجاهات النمو لـ{sym}؟", "أراجع لك القيمة العادلة واتجاهات النمو؟"),
        ]
    },
    Intent.FINANCIALS: {
        "en": [
            ("Want me to analyze {sym}'s margin trends, or compare profitability with sector rivals?", "Want me to analyze margin trends, or compare profitability with sector rivals?"),
            ("Shall I check {sym}'s cash flow picture, or see how its growth compares historically?", "Shall I check the cash flow picture, or see how growth compares historically?"),
        ],
        "ar": [
            ("تريدني أحلل اتجاهات هوامش {sym} أو أقارن ربحيته مع منافسي القطاع؟", "تريدني أحلل اتجاهات الهوامش أو أقارن الربحية مع منافسي القطاع؟"),
            ("أراجع صورة التدفقات النقدية لـ{sym} أو النمو التاريخي؟", "أراجع صورة التدفقات النقدية أو النمو التاريخي؟"),
        ]
    },
    Intent.DEEP_VALUATION: {
        "en": [
            ("Want to compare {sym}'s valuation with sector peers, or check financial health risks?", "Want to compare this valuation with sector peers, or check financial health risks?"),
            ("Shall I analyze {sym}'s growth trends to see if the valuation discount is justified?", "Shall I analyze growth trends to see if the valuation discount is justified?"),
        ],
        "ar": [
            ("تريد مقارنة تقييم {sym} مع أسهم القطاع أو مراجعة مخاطر الصحة المالية؟", "تريد مقارنة التقييم مع أسهم القطاع أو مراجعة مخاطر الصحة المالية؟"),
        ]
    },
    Intent.DEEP_SAFETY: {
        "en": [
            ("Want me to compare {sym}'s safety metrics with competitors, or check growth quality?", "Want me to compare safety metrics with competitors, or check growth quality?"),
            ("Shall I analyze {sym}'s debt maturity profile and interest coverage in detail?", "Shall I analyze the debt maturity profile and interest coverage in detail?"),
        ],
        "ar": [
            ("تريد أقارن مقاييس أمان {sym} مع المنافسين أو أراجع جودة النمو؟", "تريد أقارن مقاييس الأمان مع المنافسين أو أراجع جودة النمو؟"),
            ("أحلل ملف استحقاق ديون {sym} وتغطية الفوائد بالتفصيل؟", "أحلل ملف استحقاق الديون وتغطية الفوائد بالتفصيل؟"),
        ]
    },
    Intent.DIVIDENDS: {
        "en": [
            ("Want to compare {sym}'s dividend yield with sector peers, or check sustainability?", "Want to compare this dividend yield with sector peers, or check sustainability?"),
            ("Shall I analyze the payout ratio and free cash flow for {sym} to see if dividends are safe?", "Shall I analyze the payout ratio and free cash flow to see if dividends are safe?"),
        ],
        "ar": [
            ("تريد مقارنة عائد توزيعات {sym} مع أسهم القطاع أو التحقق من الاستدامة؟", "تريد مقارنة عائد التوزيعات مع أسهم القطاع أو التحقق من الاستدامة؟"),
        ]
    },
    Intent.TECHNICAL_INDICATORS: {
        "en": [
            ("Want to overlay the fundamentals on top of {sym}'s technicals for a complete picture?", "Want to overlay the fundamentals on top of these technicals for a complete picture?"),
            ("Shall I check {sym}'s fair value to see if technicals align with valuation?", "Shall I check fair value to see if technicals align with valuation?"),
        ],
        "ar": [
            ("تريد نضيف الأساسيات على الفنيات لـ{sym} عشان الصورة تكتمل؟", "تريد نضيف الأساسيات على الفنيات عشان الصورة تكتمل؟"),
        ]
    },
    Intent.TOP_GAINERS: {
        "en": [
            ("{sym} is leading today's gainers — want me to break down the fundamentals behind the move?",
             "Any of these gainers catch your eye? I can break down the fundamentals behind the move."),
            ("Want me to check if {sym} is fundamentally strong or just a momentum play?",
             "Want me to check if any of these are fundamentally strong or just momentum plays?"),
        ],
        "ar": [
            ("سهم {sym} في صدارة الارتفاعات اليوم — تريدني أحلل الأساسيات وراء الحركة؟",
             "أي من هذه الأسهم لفت نظرك؟ أقدر أحلل لك الأساسيات وراء الحركة."),
        ]
    },
    Intent.TOP_LOSERS: {
        "en": [
            ("Is {sym}'s decline a buying opportunity or a warning sign? I can check the fundamentals.",
             "Any of these declines look like a buying opportunity? I can analyze the fundamentals."),
            ("Want me to check if {sym} is oversold versus genuinely weak fundamentals?",
             "Want me to check which losers might be oversold versus genuinely weak?"),
        ],
        "ar": [
            ("هل انخفاض {sym} فرصة شراء أم إشارة تحذيرية؟ أقدر أحلل الأساسيات.",
             "أي من هذه الانخفاضات تبدو فرصة شراء؟ أقدر أحلل الأساسيات."),
        ]
    },
    Intent.COMPARE_STOCKS: {
        "en": [
            ("Which competitor interests you most? I can break down the risk/reward in detail.",
             "Which competitor interests you most? I can break down the risk/reward in detail."),
            ("Want me to add another stock to the comparison, or deep-dive into one of these?",
             "Want me to add another stock to the comparison, or deep-dive into one of these?"),
        ],
        "ar": [
            ("أي منافس يهمك أكثر؟ أقدر أفصل لك المخاطرة/العائد بالتفصيل.",
             "أي منافس يهمك أكثر؟ أقدر أفصل لك المخاطرة/العائد بالتفصيل."),
        ]
    },
    Intent.SECTOR_STOCKS: {
        "en": [
            ("Want me to screen for the best value plays in this sector?",
             "Want me to screen for the best value plays in this sector?"),
            ("Interested in comparing the top names, or finding hidden gems in the sector?",
             "Interested in comparing the top names, or finding hidden gems in the sector?"),
        ],
        "ar": [
            ("تريدني أبحث عن أفضل فرص القيمة في هذا القطاع؟",
             "تريدني أبحث عن أفضل فرص القيمة في هذا القطاع؟"),
        ]
    },
    Intent.MARKET_STATUS: {
        "en": [
            ("Want me to drill down on any specific macro factor, or discuss sector implications?",
             "Want me to drill down on any specific macro factor, or discuss sector implications?"),
            ("Shall I analyze which sectors benefit most from the current macro environment?",
             "Shall I analyze which sectors benefit most from the current macro environment?"),
        ],
        "ar": [
            ("تريدني أتعمق في عامل ماكرو محدد أو أناقش تأثيره على القطاعات؟",
             "تريدني أتعمق في عامل ماكرو محدد أو أناقش تأثيره على القطاعات؟"),
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
        symbol: Optional stock symbol for context - NOW USED to make suggestions specific
    
    Returns:
        A single follow-up prompt string.
    """
    lang_key = language if language in ["en", "ar"] else "en"
    
    # Get templates for this intent
    template_list = FOLLOW_UP_TEMPLATES.get(intent, {}).get(lang_key)
    
    if not template_list:
        # Fallback to default
        prompts = DEFAULT_PROMPTS.get(lang_key, DEFAULT_PROMPTS["en"])
        return random.choice(prompts)
    
    # Pick a random template tuple (with_symbol, without_symbol)
    chosen = random.choice(template_list)
    template_with_sym, template_without_sym = chosen
    
    if symbol and "{sym}" in template_with_sym:
        return template_with_sym.format(sym=symbol)
    else:
        return template_without_sym


# Singleton pattern
_generator = None

def get_follow_up_generator():
    global _generator
    if _generator is None:
        _generator = generate_follow_up
    return _generator
