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
# Each intent has multiple variations to prevent repetition.
# Tuple: (with_symbol_template, without_symbol_fallback)
FOLLOW_UP_TEMPLATES = {
    Intent.STOCK_PRICE: {
        "en": [
            ("Want a full risk/reward picture for {sym}? I can show bull and bear cases with fair value.", "Want a full risk/reward picture? I can show bull and bear cases with fair value."),
            ("Should I compare {sym} against its closest sector peers to see who wins on value?", "Should I compare this stock against its closest sector peers to see who wins on value?"),
            ("Want me to check if {sym} is genuinely undervalued or facing real risks that justify the price?", "Want me to check if this is genuinely undervalued or facing real risks?"),
        ],
        "ar": [
            ("تريدني أقدملك صورة المخاطرة والعائد لـ{sym} مع حالات التفاؤل والتشاؤم؟", "تريدني أقدملك صورة المخاطرة والعائد مع حالات التفاؤل والتشاؤم؟"),
            ("أقارن {sym} بأقرب أسهم القطاع لأشوف مين الأفضل قيمة؟", "أقارن السهم بأقرب أسهم القطاع لأشوف مين الأفضل قيمة؟"),
        ]
    },
    Intent.STOCK_SNAPSHOT: {
        "en": [
            ("Want me to do a full valuation deep-dive on {sym} — P/E, EV/EBIT, and price vs fair value?", "Want me to do a full valuation deep-dive — P/E, EV/EBIT, and price vs fair value?"),
            ("Shall I run the safety check on {sym} to see if the debt and cash position are solid?", "Shall I run the safety check to see if the debt and cash position are solid?"),
            ("Want to see how {sym} competes against its direct sector rivals on profitability and value?", "Want to see how this stock competes against its direct sector rivals on profitability and value?"),
        ],
        "ar": [
            ("تريدني أعمل تقييم معمق لـ{sym}؟ مكرر الربحية والقيمة العادلة؟", "تريدني أعمل تقييم معمق؟ مكرر الربحية والقيمة العادلة؟"),
            ("أراجع الأمان المالي لـ{sym}؟ وضع الديون والسيولة؟", "أراجع الأمان المالي؟ وضع الديون والسيولة؟"),
        ]
    },
    Intent.FINANCIALS: {
        "en": [
            ("Want me to check if {sym}'s profit margins are expanding or compressing — and why?", "Want me to check if profit margins are expanding or compressing — and why?"),
            ("Shall I compare {sym}'s profitability ratios against sector rivals to see where it stands?", "Shall I compare profitability ratios against sector rivals to see where it stands?"),
            ("Want a deeper look at {sym}'s cash flow quality — is the profit backed by real cash?", "Want a deeper look at cash flow quality — is the profit backed by real cash?"),
        ],
        "ar": [
            ("تريدني أتحقق من مسار هوامش ربح {sym} وهل هي متوسعة أم متضيقة؟", "تريدني أتحقق من مسار هوامش الربح وهل هي متوسعة أم متضيقة؟"),
            ("أقارن نسب الربحية لـ{sym} مع أسهم القطاع؟", "أقارن نسب الربحية مع أسهم القطاع؟"),
        ]
    },
    Intent.DEEP_VALUATION: {
        "en": [
            ("Want to stress-test {sym}'s thesis? I can show what the bull case vs bear case looks like.", "Want to stress-test this thesis? I can show what the bull case vs bear case looks like."),
            ("Shall I check {sym}'s financial health to see if the balance sheet supports this valuation?", "Shall I check financial health to see if the balance sheet supports this valuation?"),
            ("Want to see {sym}'s historical valuation range — has it ever been this cheap before?", "Want to see the historical valuation range — has it ever been this cheap before?"),
        ],
        "ar": [
            ("تريد أختبر فرضية {sym}؟ أقدر أشوف السيناريو التفاؤلي مقابل التشاؤمي.", "تريد أختبر هذه الفرضية؟ أقدر أشوف السيناريو التفاؤلي مقابل التشاؤمي."),
            ("أراجع صحة الميزانية لـ{sym} لأشوف هل تدعم هذا التقييم؟", "أراجع صحة الميزانية لأشوف هل تدعم هذا التقييم؟"),
        ]
    },
    Intent.DEEP_SAFETY: {
        "en": [
            ("Want to compare {sym}'s safety profile with its top sector peers? Who's safer?", "Want to compare the safety profile with top sector peers? Who's safer?"),
            ("Shall I check {sym}'s dividend sustainability — can the payout survive a revenue dip?", "Shall I check dividend sustainability — can the payout survive a revenue dip?"),
            ("Want a full valuation view on {sym} to see if the risk is priced in?", "Want a full valuation view to see if the risk is priced in?"),
        ],
        "ar": [
            ("تريد أقارن ملف مخاطر {sym} مع أبرز أسهم القطاع؟", "تريد أقارن ملف المخاطر مع أبرز أسهم القطاع؟"),
            ("أتحقق من استدامة توزيعات {sym} في حال انخفض الإيراد؟", "أتحقق من استدامة التوزيعات في حال انخفض الإيراد؟"),
        ]
    },
    Intent.DIVIDENDS: {
        "en": [
            ("Want to see if {sym}'s payout ratio is sustainable — or if dividends could be cut?", "Want to see if the payout ratio is sustainable — or if dividends could be cut?"),
            ("Shall I compare {sym}'s yield against the top payers in the same sector?", "Shall I compare this yield against the top payers in the same sector?"),
            ("Want to check {sym}'s free cash flow coverage — is dividend income truly safe?", "Want to check free cash flow coverage — is this dividend income truly safe?"),
        ],
        "ar": [
            ("تريد أشوف هل نسبة توزيعات {sym} مستدامة أم في خطر؟", "تريد أشوف هل نسبة التوزيعات مستدامة أم في خطر؟"),
            ("أقارن عائد {sym} مع أعلى الأسهم توزيعاً في نفس القطاع؟", "أقارن العائد مع أعلى الأسهم توزيعاً في نفس القطاع؟"),
        ]
    },
    Intent.TECHNICAL_INDICATORS: {
        "en": [
            ("Want me to overlay {sym}'s fundamentals on the chart for a complete picture?", "Want me to overlay fundamentals on the chart for a complete picture?"),
            ("Shall I check {sym}'s fair value to see if the recent price move aligns with valuation?", "Shall I check fair value to see if the recent price move aligns with valuation?"),
        ],
        "ar": [
            ("تريد نضيف الأساسيات على الرسم البياني لـ{sym} عشان الصورة تكتمل؟", "تريد نضيف الأساسيات على الرسم البياني عشان الصورة تكتمل؟"),
        ]
    },
    Intent.TOP_GAINERS: {
        "en": [
            ("Any of today's gainers catch your eye? I can break down the fundamentals behind the move to see if it's justified.",
             "Any of these gainers catch your eye? I can break down the fundamentals behind the move."),
            ("Want me to screen for which gainers have strong fundamentals vs which are just momentum plays?",
             "Want me to screen for which gainers have strong fundamentals vs which are just momentum plays?"),
            ("Want to check if the top gainer is overvalued after today's move?",
             "Want to check if the top gainer is overvalued after today's move?"),
        ],
        "ar": [
            ("أي من الأسهم الصاعدة اليوم لفت نظرك؟ أقدر أحلل لك الأساسيات وراء الحركة.",
             "أي من هذه الأسهم لفت نظرك؟ أقدر أحلل لك الأساسيات وراء الحركة."),
            ("تريدني أشوف أي الصاعدات أساسياتها قوية وأيها مجرد زخم؟",
             "تريدني أشوف أي الصاعدات أساسياتها قوية وأيها مجرد زخم؟"),
        ]
    },
    Intent.TOP_LOSERS: {
        "en": [
            ("Is any of today's losers a buying opportunity at this price? I can check the fundamentals.",
             "Any of these declines look like a buying opportunity? I can analyze the fundamentals."),
            ("Want me to identify which losers are genuinely weak vs which might be oversold?",
             "Want me to identify which losers are genuinely weak vs which might be oversold?"),
            ("Want a deeper look at the worst loser today — is it a structural issue or short-term noise?",
             "Want a deeper look at the worst loser — is it a structural issue or short-term noise?"),
        ],
        "ar": [
            ("هل أي من الخاسرين اليوم فرصة شراء بهذا السعر؟ أقدر أحلل الأساسيات.",
             "أي من هذه الانخفاضات تبدو فرصة شراء؟ أقدر أحلل الأساسيات."),
        ]
    },
    Intent.COMPARE_STOCKS: {
        "en": [
            ("Which stock in the comparison interests you most? I can do a full deep-dive on it.",
             "Which stock interests you most from this comparison? I can do a full deep-dive."),
            ("Want me to add another stock to the comparison, or deep-dive into the strongest one?",
             "Want me to add another stock to the comparison, or deep-dive into the strongest one?"),
            ("Want to see how the winner in this comparison stacks up against the full sector?",
             "Want to see how the winner stacks up against the full sector?"),
        ],
        "ar": [
            ("أي سهم في المقارنة يهمك؟ أقدر أفصل لك التحليل الكامل.",
             "أي سهم يهمك أكثر؟ أقدر أفصل لك التحليل الكامل."),
            ("تريد أضيف سهم ثالث للمقارنة أو أتعمق في الأقوى منهم؟",
             "تريد أضيف سهم ثالث للمقارنة أو أتعمق في الأقوى منهم؟"),
        ]
    },
    Intent.SECTOR_STOCKS: {
        "en": [
            ("Want me to screen this sector for the best value plays — highest quality at the cheapest price?",
             "Want me to screen this sector for the best value plays?"),
            ("Shall I rank the top stocks in this sector by financial health and dividend yield?",
             "Shall I rank the top stocks in this sector by financial health and dividend yield?"),
            ("Want me to compare the top two names in this sector head-to-head?",
             "Want me to compare the top two names in this sector head-to-head?"),
        ],
        "ar": [
            ("تريدني أبحث عن أفضل فرص القيمة في هذا القطاع؟",
             "تريدني أبحث عن أفضل فرص القيمة في هذا القطاع؟"),
            ("أرتب أسهم القطاع حسب الأمان المالي وعائد التوزيعات؟",
             "أرتب أسهم القطاع حسب الأمان المالي وعائد التوزيعات؟"),
        ]
    },
    Intent.MARKET_SUMMARY: {
        "en": [
            ("Want me to identify which sectors are best positioned in this macro environment?",
             "Want me to identify which sectors are best positioned in this macro environment?"),
            ("Shall I scan the market for hidden gems — quality stocks trading below fair value?",
             "Shall I scan the market for hidden gems — quality stocks trading below fair value?"),
            ("Want to see which sectors have the highest dividend leaders right now?",
             "Want to see which sectors have the highest dividend leaders right now?"),
        ],
        "ar": [
            ("تريدني أحدد أي القطاعات أفضل موقعاً في ظل الوضع الحالي؟",
             "تريدني أحدد أي القطاعات أفضل موقعاً في ظل الوضع الحالي؟"),
        ]
    },
    Intent.STOCK_STAT: {
        "en": [
            ("Want me to do a deep-dive on {sym}'s valuation — is this P/E cheap relative to earnings quality?", "Want me to do a deep-dive on valuation — is the P/E cheap relative to earnings quality?"),
            ("Shall I run a full safety check on {sym} to see if the balance sheet is rock-solid?", "Shall I run a full safety check to see if the balance sheet is rock-solid?"),
            ("Want to compare {sym}'s key ratios against its sector peers to see how it scores?", "Want to compare key ratios against sector peers to see how this stock scores?"),
        ],
        "ar": [
            ("تريدني أتعمق في تقييم {sym}؟ هل مكرر الربحية رخيص بالنسبة لجودة الأرباح؟", "تريدني أتعمق في التقييم؟"),
            ("أراجع ملف أمان {sym} بالكامل للتأكد من قوة الميزانية؟", "أراجع ملف الأمان بالكامل؟"),
        ]
    },
    Intent.DEEP_EFFICIENCY: {
        "en": [
            ("Want to compare {sym}'s efficiency metrics against sector peers — is this ROCE above average?", "Want to compare efficiency metrics against sector peers — is this ROCE above average?"),
            ("Shall I check {sym}'s revenue quality and whether margins are on an improving trend?", "Shall I check revenue quality and whether margins are on an improving trend?"),
        ],
        "ar": [
            ("تريد أقارن مقاييس كفاءة {sym} مع أسهم القطاع؟", "تريد أقارن مقاييس الكفاءة مع أسهم القطاع؟"),
        ]
    },
    Intent.DEEP_GROWTH: {
        "en": [
            ("Want to check if {sym}'s growth is being reflected in the current price — or if the market is missing it?", "Want to check if growth is being reflected in the current price?"),
            ("Shall I cross-check {sym}'s revenue quality against its dividend payout to see if growth is self-funded?", "Shall I cross-check revenue quality against dividend payout to see if growth is self-funded?"),
        ],
        "ar": [
            ("تريد أتحقق هل نمو {sym} ينعكس في السعر الحالي أم أن السوق يفتقده؟", "تريد أتحقق هل النمو ينعكس في السعر الحالي؟"),
        ]
    },
    Intent.COMPANY_PROFILE: {
        "en": [
            ("Want me to run the full safety and valuation check on {sym} after seeing the profile?", "Want me to run the full safety and valuation check after seeing the company profile?"),
            ("Shall I compare {sym}'s market position to its closest sector rivals?", "Shall I compare this company's market position to its closest sector rivals?"),
        ],
        "ar": [
            ("تريدني أجري فحص الأمان والتقييم الكامل لـ{sym}؟", "تريدني أجري فحص الأمان والتقييم الكامل؟"),
        ]
    },
    Intent.FAIR_VALUE: {
        "en": [
            ("Want to see {sym}'s full financial health — is the balance sheet strong enough to justify the target price?", "Want to see full financial health — is the balance sheet strong enough to justify the target price?"),
            ("Shall I compare {sym}'s valuation against the top 3 sector peers to add context to this estimate?", "Shall I compare valuation against the top 3 sector peers to add context to this estimate?"),
            ("Want to run the safety check on {sym} to see if any risks could derail reaching fair value?", "Want to run the safety check to see if any risks could derail reaching fair value?"),
        ],
        "ar": [
            ("تريد أشوف الصحة المالية الكاملة لـ{sym}؟ هل الميزانية تدعم السعر المستهدف؟", "تريد أشوف الصحة المالية الكاملة؟"),
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
        symbol: Optional stock symbol for context
    
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
