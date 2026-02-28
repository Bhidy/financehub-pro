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
            "Good to see you, {name}! 👋 I'm ready to help you analyze the Egyptian stock market with real-time data and insights.",
            "Hey {name}! It's a great time to explore the market. I'm here to provide you with expert analysis and data.",
            "Welcome back to Starta! Let's dive deep into the latest market trends and find some opportunities together.",
            "Great to have you here, {name}! Whether you're tracking a portfolio or looking for new stocks, I'm ready to assist.",
        ],
        "ar": [
            "أهلاً بك يا {name}! 👋 أنا جاهز لمساعدتك في تحليل سوق الأسهم المصري باستخدام بيانات ولحظية ورؤى دقيقة.",
            "سعيد بوجودك معنا! هذا وقت ممتاز لاستكشاف السوق، وأنا هنا لأوفر لك كل التحليلات والبيانات التي تحتاجها.",
            "مرحباً بك في ستارتا! دعنا نتعمق في أحدث اتجاهات السوق ونبحث معاً عن أفضل الفرص الاستثمارية.",
            "أهلاً {name}! سواء كنت تتابع محفظتك أو تبحث عن فرص جديدة، أنا مستعد تماماً لمساعدتك."
        ]
    },
    "professional_intro": {
        "en": [
            "Hello {name}. I am Starta, your advanced financial intelligence assistant. I'm here to help you dissect EGX stocks with precision.",
            "Good to have you using Starta. Let's look at the data together and uncover the financial health of your favorite companies.",
            "Welcome to Starta's premium analysis. What specific stock or sector would you like to examine in detail today?",
            "I'm Starta, your AI financial analyst. I can process complex financial reports and market data to give you clear answers.",
        ],
        "ar": [
            "مرحباً {name}. أنا ستارتا، مساعدك المالي الذكي. أنا هنا لمساعدتك في تحليل أسهم البورصة المصرية بدقة واحترافية.",
            "شرفت باستخدمك لستارتا. دعنا ننظر إلى البيانات معاً ونكتشف الصحة المالية للشركات التي تهمك.",
            "مرحباً بك في التحليل المتقدم من ستارتا. ما هو السهم أو القطاع الذي تود فحصه بالتفصيل اليوم؟",
            "أنا ستارتا، محللك المالي بالذكاء الاصطناعي. يمكنني معالجة التقارير المالية المعقدة لتقديم إجابات واضحة ومباشرة."
        ]
    },
    "friendly_minimal": {
        "en": [
            "Hey there! 👋 I'm all set to crunch some numbers and pull up the latest charts for you.",
            "Hi {name}! I hope you're having a productive day. Let me know which stock is on your mind.",
            "Hello! I'm standing by to help you navigate the market complexity with simple, data-driven answers.",
            "Hey! Ready to turn market noise into clear signals? Just ask me about any symbol or company.",
        ],
        "ar": [
            "أهلاً بك! 👋 أنا مستعد تماماً لتحليل الأرقام وعرض أحدث الرسوم البيانية من أجلك.",
            "مرحباً {name}! أتمنى لك يوماً مثمراً. أخبرني عن السهم الذي تفكر فيه حالياً.",
            "أهلاً وسهلاً! أنا هنا لمساعدتك في تجاوز تعقيدات السوق بإجابات بسيطة ومدعومة بالبيانات.",
            "أهلاً! جاهز لتحويل ضجيج السوق إلى إشارات واضحة؟ فقط اسألني عن أي رمز أو شركة."
        ]
    },
    "coaching": {
        "en": [
            "Ready to make smart investment decisions, {name}? I can help you evaluate risks and growth potential instantly.",
            "Let's build your market knowledge today. Ask me about P/E ratios, dividends, or fair value estimates.",
            "Great timing — volatility can create opportunities. I'm ready to break down any stock's fundamentals for you.",
            "Let's turn raw data into actionable insights today. I can compare stocks or deep-dive into financial statements.",
        ],
        "ar": [
            "جاهز لاتخاذ قرارات استثمارية ذكية يا {name}؟ يمكنني مساعدتك في تقييم المخاطر وفرص النمو في لحظات.",
            "دعنا نبني معرفتك بالسوق اليوم. اسألني عن مكررات الربحية، التوزيعات، أو القيمة العادلة.",
            "توقيت ممتاز — التقلبات قد تخلق فرصاً. أنا جاهز لتحليل أساسيات أي سهم بالتفصيل من أجلك.",
            "دعنا نحول البيانات الخام إلى رؤى قابلة للتنفيذ اليوم. يمكنني مقارنة الأسهم أو الغوص في القوائم المالية."
        ]
    },
    "neutral": {
        "en": [
            "How can I help you analyze the market today? I have access to prices, financials, and news.",
            "What would you like to know? I can screen for top stocks or checking specific company details.",
            "I'm ready when you are. Just type a symbol or a question about the Egyptian market.",
            "What can I help you with? Whether it's valuation or fundamentals, I'm here to assist.",
        ],
        "ar": [
            "كيف يمكنني مساعدتك في تحليل السوق اليوم؟ لدي وصول للأسعار، القوائم المالية، والأخبار.",
            "ما الذي تود معرفته؟ يمكنني البحث عن أفضل الأسهم أو فحص تفاصيل شركة محددة.",
            "أنا جاهز في أي وقت. فقط اكتب رمز السهم أو سؤالك عن السوق المصري.",
            "بماذا يمكنني مساعدتك؟ سواء كان تقييماً أو تحليلاً أساسياً، أنا هنا للمساعدة."
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
