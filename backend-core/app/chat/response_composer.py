"""
Response Composer - 8-Layer Premium Conversational Response Builder

World-Class Conversational AI Component.

Builds ultra-premium, dynamic responses using 8 layers:
① Personal Greeting (optional - for first message or explicit greetings)
② Context Bridge (links to previous topic if follow-up)
③ Human Opening (acknowledgment)
④ Core Narrative (LLM-generated CFA-level analysis)
⑤ Key Insight (🎯 actionable takeaway)
⑥ Risk Warning (⚠️ when relevant)
⑦ Learning Section (📊 educational - handled separately)
⑧ Follow-up Prompt (💡 next action - handled separately)
"""

import re
import random
from typing import Optional, List, Dict, Tuple
from .schemas import Intent, CardType, StructuredNarrative

# Global response style policy:
# Human-opening preambles (e.g., "You are absolutely focusing on the right metrics...")
# are disabled to ensure responses start directly with substantive analysis.
ENABLE_HUMAN_OPENING = False


# ============================================================================
# LAYER ① - HUMAN OPENINGS (Acknowledge user naturally)
# ============================================================================

HUMAN_OPENINGS = {
    "acknowledgment": {
        "en": [
            "This is a critical question for understanding current market dynamics. Let's analyze the latest data to give you a clear, evidence-based answer.",
            "That is a very relevant point to investigate given recent market movements. I have pulled the specific metrics needed to clarify the situation.",
            "You've touched on a key factor that many investors are watching right now. Let's dive into the details to see what the numbers actually say.",
            "It is important to look closely at this specific aspect of the stock. I will break down the relevant figures to help you see the full picture.",
            "Let's examine this carefully, as the details often tell a different story than the headlines. Here is the data-driven analysis you need.",
        ],
        "ar": [
            "هذا سؤال جوهري لفهم ديناميكيات السوق الحالية. دعنا نحلل أحدث البيانات لنعطيك إجابة واضحة مبنية على الحقائق.",
            "هذه نقطة ممتازة للبحث فيها نظراً لتحركات السوق الأخيرة. لقد قمت بسحب المؤشرات المحددة لتوضيح الموقف بالكامل.",
            "لقد لمست عاملاً رئيسياً يراقبه العديد من المستثمرين حالياً. دعنا نتعمق في التفاصيل لنرى ما تقوله الأرقام بالفعل.",
            "من المهم جداً النظر بدقة في هذا الجانب المحدد من السهم. سأقوم بتفصيل الأرقام ذات الصلة لتكتمل لديك الصورة.",
            "دعنا نفحص هذا الأمر بعناية، فالتفاصيل غالباً ما تروي قصة مختلفة عن العناوين. إليك التحليل المبني على البيانات.",
        ]
    },
    "affirmation": {
        "en": [
            "This angle can materially change interpretation of the stock trend. Here is the direct data breakdown.",
            "That is a sensible way to approach this analysis. By looking at these specific indicators, we can cut through the market noise.",
            "This specific query helps clarify the bigger picture significantly. Let's see how the data supports this improved strategic view.",
            "Smart angle to explore—investors often overlook this detail. Here is the evidence that confirms why this matters right now.",
        ],
        "ar": [
            "أنت تركز تماماً على المقاييس الصحيحة هنا. التحقق من هذه الزاوية يكشف الاتجاه الحقيقي للأصل.",
            "هذه طريقة منطقية جداً لمقاربة التحليل. بالنظر إلى هذه المؤشرات المحددة، يمكننا تجاوز ضجيج السوق.",
            "هذا الاستفسار يساعد في توضيح الصورة الكبيرة بشكل كبير. دعنا نرى كيف تدعم البيانات هذه النظرة الاستراتيجية.",
            "زاوية ذكية للاستكشاف—غالباً ما يغفل المستثمرون عن هذا التفصيل. إليك الدليل الذي يؤكد أهمية هذا الأمر الآن.",
        ]
    },
    "neutral": {
        "en": [
            "I have pulled the latest real-time data for you. Let's examine the valuation and fundamentals together to see the full context.",
            "Here is exactly what the current market data is showing us. I've highlighted the most critical points for your review.",
            "Let me break this down into clear, actionable insights. The following analysis covers both the risks and the opportunities.",
            "Here is the complete picture based on the latest available data. Let's go through the numbers step-by-step.",
        ],
        "ar": [
            "لقد سحبت لك أحدث البيانات الفورية. دعنا نفحص الجوانب الفنية والأساسية معاً لنرى السياق الكامل.",
            "إليك بالضبط ما تظهره بيانات السوق الحالية. لقد قمت بإبراز النقاط الأكثر أهمية لمراجعتها.",
            "دعني أفصل لك هذا إلى رؤى واضحة وقابلة للتنفيذ. التحليل التالي يغطي كلاً من المخاطر والفرص المتاحة.",
            "إليك الصورة الكاملة بناءً على أحدث البيانات المتاحة. دعنا نستعرض الأرقام خطوة بخطوة.",
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
            "We can also look at the fair value estimate if you'd like.",
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
# LAYER ② - CONTEXT BRIDGE (Connect to previous conversation)
# ============================================================================

CONTEXT_BRIDGE_TEMPLATES = {
    "continuation": {
        "en": [
            "Following up on {symbol}...",
            "Continuing with {symbol}...",
            "Back to {symbol}...",
            "More on {symbol}...",
        ],
        "ar": [
            "استكمالاً لـ {symbol}...",
            "بخصوص {symbol}...",
            "المزيد عن {symbol}...",
        ]
    },
    "topic_shift": {
        "en": [
            "Now looking at {topic} for {symbol}...",
            "Shifting to {topic}...",
            "Let's check {topic} next...",
        ],
        "ar": [
            "الآن نشوف {topic} لـ {symbol}...",
            "خلينا نتفحص {topic}...",
        ]
    },
    "confirmation": {
        "en": [
            "Got it. Here's what you asked for...",
            "Absolutely. Diving deeper...",
            "Sure thing. Here we go...",
        ],
        "ar": [
            "تمام. ده اللي طلبته...",
            "أكيد. نتعمق أكتر...",
            "حاضر. يلا بينا...",
        ]
    }
}


# ============================================================================
# LAYER ⑤ - KEY INSIGHT (Actionable takeaway)
# ============================================================================

KEY_INSIGHT_TEMPLATES = {
    "bullish": {
        "en": [
            "🎯 **Key Insight**: Trading at a significant discount to historical averages with improving fundamentals.",
            "🎯 **Takeaway**: Quality business at a discounted valuation — the risk/reward skews positive.",
            "🎯 **Bottom Line**: Metrics confirm financial strength — this one deserves a closer look.",
        ],
        "ar": [
            "🎯 **النقطة الأساسية**: يتداول بخصم كبير عن المتوسطات التاريخية مع تحسن الأساسيات.",
            "🎯 **الخلاصة**: عمل عالي الجودة بتقييم مخفض — نسبة المخاطرة/العائد إيجابية.",
            "🎯 **المحصلة**: المؤشرات تؤكد قوة مالية — يستحق نظرة أعمق.",
        ]
    },
    "bearish": {
        "en": [
            "🎯 **Key Insight**: Valuation appears stretched relative to earnings power — caution warranted.",
            "🎯 **Takeaway**: Multiple warning flags in the data — this requires careful monitoring.",
            "🎯 **Bottom Line**: Risk indicators elevated — consider position sizing carefully.",
        ],
        "ar": [
            "🎯 **النقطة الأساسية**: التقييم يبدو مرتفعاً مقارنة بقوة الأرباح — الحذر مطلوب.",
            "🎯 **الخلاصة**: عدة علامات تحذيرية في البيانات — يتطلب متابعة دقيقة.",
            "🎯 **المحصلة**: مؤشرات المخاطر مرتفعة — ادرس حجم المركز بعناية.",
        ]
    },
    "neutral": {
        "en": [
            "🎯 **Key Insight**: Mixed signals — some metrics show strength while others flag caution.",
            "🎯 **Takeaway**: Neither clearly overvalued nor undervalued — wait for a catalyst or dig deeper.",
            "🎯 **Bottom Line**: The story here is nuanced — different angles tell different tales.",
        ],
        "ar": [
            "🎯 **النقطة الأساسية**: إشارات مختلطة — بعض المؤشرات قوية وأخرى تحذيرية.",
            "🎯 **الخلاصة**: لا مبالغة في التقييم ولا تخفيض — انتظر محفزاً أو تعمق أكثر.",
            "🎯 **المحصلة**: القصة هنا دقيقة — كل زاوية تحكي حكاية مختلفة.",
        ]
    }
}


# ============================================================================
# LAYER ⑥ - RISK WARNING (When appropriate)
# ============================================================================

RISK_WARNING_TEMPLATES = {
    "general": {
        "en": [
            "⚠️ *Always conduct your own research before investing.*",
            "⚠️ *Past performance doesn't guarantee future results.*",
        ],
        "ar": [
            "⚠️ *احرص على البحث بنفسك قبل الاستثمار.*",
            "⚠️ *الأداء السابق لا يضمن النتائج المستقبلية.*",
        ]
    },
    "high_risk": {
        "en": [
            "⚠️ **Risk Alert**: This stock shows elevated volatility.",
            "⚠️ **Caution**: High risk indicators detected.",
        ],
        "ar": [
            "⚠️ **تنبيه مخاطر**: السهم يظهر تقلبات عالية.",
            "⚠️ **تحذير**: مؤشرات مخاطر مرتفعة.",
        ]
    },
    "valuation": {
        "en": [
            "⚠️ *Note: Valuation appears stretched — verify with fundamentals.*",
        ],
        "ar": [
            "⚠️ *ملاحظة: التقييم يبدو مرتفع — تأكد من الأساسيات.*",
        ]
    },
    "methodology_note": {
        "en": [
            "⚠️ *Methodology Note: This screen uses sector-specific valuation metrics. Banks and financials were evaluated using P/B, while consumer and industrial stocks used P/E. Always verify with individual company analysis.*",
        ],
        "ar": [
            "⚠️ *ملاحظة منهجية: يستخدم هذا الفحص مقاييس تقييم خاصة بالقطاع. البنوك تم تقييمها بمضاعف القيمة الدفترية، بينما الشركات الاستهلاكية والصناعية بمكرر الربحية. تحقق دائماً من التحليل الفردي.*",
        ]
    },
    "portfolio_note": {
        "en": [
            "⚠️ *Portfolio Note: No single metric tells the full story. Consider diversification, position sizing, and your personal risk tolerance before acting on any comparison.*",
        ],
        "ar": [
            "⚠️ *ملاحظة المحفظة: لا يوجد مؤشر واحد يحكي القصة كاملة. فكر في التنويع وحجم المركز ومدى تحملك للمخاطر قبل اتخاذ قرار.*",
        ]
    },
    "macro_note": {
        "en": [
            "⚠️ *Macro Note: Market timing is inherently uncertain. These factors provide a framework for thinking, not a crystal ball. Position sizes should reflect conviction level.*",
        ],
        "ar": [
            "⚠️ *ملاحظة ماكرو: توقيت السوق غير مؤكد بطبيعته. هذه العوامل تقدم إطاراً للتفكير وليس كرة بلورية. حجم المراكز يجب أن يعكس مستوى القناعة.*",
        ]
    },
    "educational_note": {
        "en": [
            "⚠️ *Educational Note: This explanation is simplified for clarity. Real-world application requires considering multiple factors simultaneously. Always cross-reference with company-specific context.*",
        ],
        "ar": [
            "⚠️ *ملاحظة تعليمية: هذا الشرح مبسط للوضوح. التطبيق الفعلي يتطلب مراعاة عوامل متعددة في نفس الوقت. قارن دائماً مع سياق الشركة المحددة.*",
        ]
    },
    "liquidity_warning": {
        "en": [
            "⚠️ *Liquidity Warning: Some of these names trade with limited daily volume. Entry and exit may impact price. Consider using limit orders.*",
        ],
        "ar": [
            "⚠️ *تحذير سيولة: بعض هذه الأسهم يتم تداولها بحجم يومي محدود. الدخول والخروج قد يؤثر على السعر. فكر في استخدام أوامر محددة.*",
        ]
    }
}


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
    Composes dynamic, non-repetitive 8-layer premium responses.
    
    8-Layer Structure:
    ① Personal Greeting (for first message)
    ② Context Bridge (for follow-ups)
    ③ Human Opening (acknowledgment)
    ④ Core Narrative (LLM analysis)
    ⑤ Key Insight (actionable takeaway)
    ⑥ Risk Warning (when appropriate)
    ⑦ Learning Section (handled separately)
    ⑧ Follow-up Prompt (handled separately)
    """
    
    @classmethod
    def get_human_opening(
        cls,
        language: str,
        user_name: str = "Trader",
        last_opening_used: Optional[str] = None,
        use_name: bool = True,
        force: bool = False,  # NEW: Force opening (no random skip)
        is_follow_up: bool = False  # Whether this is a follow-up query
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Get a human opening (Layer ①).
        
        Args:
            language: 'en' or 'ar'
            user_name: User's name for personalization
            last_opening_used: Last used category (to avoid repetition)
            use_name: Whether to use name-based openings
            force: If True, ALWAYS return an opening (no 50% skip)
            is_follow_up: If True, use neutral openings only
        
        Returns:
            Tuple of (opening_text or None, category_used or None)
        """
        if not ENABLE_HUMAN_OPENING:
            return None, None

        # 50% chance to include opening (unless forced)
        if not force and random.random() > 0.5:
            return None, None
        
        # Select category pool based on scenario
        if is_follow_up:
            category_pool = ["neutral"]  # Use neutral for follow-ups (no names)
        else:
            category_pool = ["acknowledgment", "affirmation", "neutral"]  # No name-based greetings
        
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
        # opening = opening.format(name=user_name) 
        # NAME REMOVED: Name is now handled by LLM at the very start of message.
        pass
        
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
        include_guidance: bool = True,
        force_opening: bool = False  # NEW: Force opening for returning users
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
            force_opening: If True, ALWAYS include opening (no random skip)
            
        Returns:
            Tuple of (full_response, opening_category_used)
        """
        parts = []
        opening_category = None
        
        # Layer ① - Human Opening (optional or forced)
        if include_opening:
            opening, opening_category = cls.get_human_opening(
                language=language,
                user_name=user_name,
                last_opening_used=last_opening_used,
                force=force_opening,  # Pass force flag
                is_follow_up=False  # compose_full_response doesn't track follow-ups
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
    
    @classmethod
    def get_context_bridge(
        cls,
        language: str,
        bridge_type: str = "continuation",
        symbol: Optional[str] = None,
        topic: Optional[str] = None
    ) -> Optional[str]:
        """
        Get a context bridge (Layer ②) for follow-up messages.
        
        Args:
            language: 'en' or 'ar'
            bridge_type: 'continuation', 'topic_shift', or 'confirmation'
            symbol: Stock symbol for context
            topic: New topic if shifting
        """
        lang_key = language if language in ['en', 'ar'] else 'en'
        templates = CONTEXT_BRIDGE_TEMPLATES.get(bridge_type, CONTEXT_BRIDGE_TEMPLATES['continuation'])
        template = random.choice(templates.get(lang_key, templates['en']))
        
        # Fill placeholders
        result = template
        if symbol:
            result = result.replace('{symbol}', symbol)
        if topic:
            result = result.replace('{topic}', topic)
        
        return result
    
    @classmethod
    def get_key_insight(
        cls,
        language: str,
        sentiment: str = "neutral",
        user_level: str = "INTERMEDIATE"
    ) -> str:
        """
        Get a key insight (Layer ⑤).
        
        Args:
            language: 'en' or 'ar'
            sentiment: 'bullish', 'bearish', or 'neutral'
            user_level: 'NOVICE', 'INTERMEDIATE', 'EXPERT'
        """
        lang_key = language if language in ['en', 'ar'] else 'en'
        
        # NOVICE OVERRIDE: Simplify insights
        if user_level == "NOVICE":
             if sentiment == "bullish":
                 return random.choice([
                     "This setup looks quite positive. The company shows fundamental strength.",
                     "There's noticeable momentum here. The numbers support an optimistic view.",
                     "Strong indicators across the board. It's a healthy financial posture."
                 ]) if lang_key == "en" else random.choice([
                     "الوضع يبدو إيجابياً. الشركة تظهر قوة أساسية.",
                     "هناك زخم ملحوظ هنا. الأرقام تدعم نظرة متفائلة.",
                     "مؤشرات قوية بشكل عام. يعكس ذلك مركزاً مالياً صحياً."
                 ])
             elif sentiment == "bearish":
                 return random.choice([
                     "Be cautious. The current data points to several underlying risks.",
                     "There are warning signs here. The fundamentals appear stretched.",
                     "Risk levels are elevated. It requires careful monitoring before proceeding."
                 ]) if lang_key == "en" else random.choice([
                     "يجب الحذر. البيانات الحالية تشير إلى عدة مخاطر كامنة.",
                     "هناك علامات تحذيرية هنا. الأساسيات تبدو مبالغاً فيها.",
                     "مستويات المخاطر مرتفعة. يتطلب الأمر مراقبة دقيقة قبل الاستمرار."
                 ])
             else:
                 return random.choice([
                     "The data is balanced right now. Neither clearly bullish nor bearish.",
                     "Mixed signals in the numbers. Wait for more clarity before deciding.",
                     "It's a holding pattern. The financial metrics offset each other."
                 ]) if lang_key == "en" else random.choice([
                     "البيانات متوازنة حالياً. لا هي إيجابية بشكل واضح ولا سلبية.",
                     "إشارات مختلطة في الأرقام. يُفضل انتظار مزيد من الوضوح.",
                     "الوضع محايد. المقاييس المالية تعادل بعضها البعض."
                 ])

        templates = KEY_INSIGHT_TEMPLATES.get(sentiment, KEY_INSIGHT_TEMPLATES['neutral'])
        return random.choice(templates.get(lang_key, templates['en']))
    
    @classmethod
    def get_risk_warning(
        cls,
        language: str,
        risk_type: str = "general"
    ) -> str:
        """
        Get a risk warning (Layer ⑥).
        
        Args:
            language: 'en' or 'ar'
            risk_type: 'general', 'high_risk', or 'valuation'
        """
        lang_key = language if language in ['en', 'ar'] else 'en'
        templates = RISK_WARNING_TEMPLATES.get(risk_type, RISK_WARNING_TEMPLATES['general'])
        return random.choice(templates.get(lang_key, templates['en']))
    
    @classmethod
    def compose_premium_response(
        cls,
        core_narrative: str,
        language: str,
        intent: Intent,
        user_name: str = "Analyst",
        is_follow_up: bool = False,
        follow_up_type: str = "none",
        active_symbol: Optional[str] = None,
        sentiment: str = "neutral",
        include_risk_warning: bool = False,
        risk_type: str = "general",
        last_opening_used: Optional[str] = None,
        shown_card_types: Optional[List[str]] = None,
        include_opening: bool = True,
        include_guidance: bool = True,
        force_opening: bool = False,
        # Phase 3: Explicit 7-Layer Flags
        detected_insight: Optional[str] = None,
        # Phase 4: Personalization
        user_level: str = "INTERMEDIATE"
    ) -> Tuple[str, Optional['StructuredNarrative'], Optional[str]]:
        """
        Compose a premium 8-layer response (layers 1-6, 7-8 handled separately).
        Returns:
            Tuple of (full_response_text, structured_narrative, opening_category_used)
        """
        from .schemas import StructuredNarrative
        
        parts = []
        opening_category = None
        
        # Initialize structured components
        struct_greeting = None  # NO GREETINGS - removed per Phase 4 requirement
        struct_bridge = None
        struct_opening = None
        struct_insight = None
        struct_warning = None
        
        # IMPORTANT: We do NOT inject greetings anymore.
        # The LLM narrative should start with DATA, not greetings.
        # User requirement: NO \"Hi\", NO names, NO welcome messages.


        # Layer ② - Context Bridge (for follow-ups)
        if is_follow_up and active_symbol:
            bridge = cls.get_context_bridge(
                language=language,
                bridge_type=follow_up_type if follow_up_type in ['continuation', 'topic_shift', 'confirmation'] else 'continuation',
                symbol=active_symbol
            )
            if bridge:
                parts.append(bridge)
                struct_bridge = bridge
        
        # Layer ③ - Human Opening (for non-follow-ups)
        elif include_opening and not is_follow_up:
            opening, opening_category = cls.get_human_opening(
                language=language,
                user_name=user_name,
                last_opening_used=last_opening_used,
                force=force_opening,
                is_follow_up=is_follow_up
            )
            if opening:
                parts.append(opening)
                struct_opening = opening
        
        # Layer ④ - Core Narrative (always)
        if core_narrative:
            parts.append(core_narrative)
        
        # CRITICAL FIX: Prevent duplication. If Insight is shown as a CARD, do not append to TEXT.
        # expanded to include my_framework (My Take) and cases, as they serve as the insight.
        insight_card_types = [
            'key_insight', 'insight', 'daily_insight', 'my_framework', 
            'bull_case', 'bear_case', 'valuation_score', 'macro_score', 
            'technical_indicators', 'fair_value'
        ]
        insight_in_cards = shown_card_types and any(ct in shown_card_types for ct in insight_card_types)
        
        if detected_insight:
            # Use the "Thought Process" derived insight if available
            struct_insight = detected_insight
            if not insight_in_cards:
                parts.append("\n\n" + detected_insight)
        elif intent in [
            Intent.STOCK_SNAPSHOT, Intent.FINANCIALS, Intent.DIVIDENDS,
            Intent.DEEP_VALUATION, Intent.DEEP_SAFETY, Intent.FAIR_VALUE,
            Intent.FINANCIAL_HEALTH, Intent.COMPARE_STOCKS, Intent.STOCK_PRICE,
            # Expanded List for 100% Coverage
            Intent.SCREENER_PE, Intent.SCREENER_DEEP, Intent.SCREENER_GROWTH, 
            Intent.SCREENER_VALUE, Intent.SCREENER_SAFETY, Intent.SCREENER_INCOME,
            Intent.MARKET_STATUS, Intent.MARKET_SUMMARY, Intent.MARKET_MOST_ACTIVE,
            Intent.HIDDEN_GEMS, Intent.INDEX_COMPOSITION, Intent.TOP_GAINERS, Intent.TOP_LOSERS,
            Intent.STOCK_STAT, Intent.TECHNICAL_INDICATORS, Intent.MACRO_SCORE
        ]:
            insight = cls.get_key_insight(language=language, sentiment=sentiment, user_level=user_level)
            struct_insight = insight
            if not insight_in_cards:
                parts.append("\n\n" + insight)
        
        # Layer ⑥ - Risk Warning (when appropriate)
        if include_risk_warning:
            warning = cls.get_risk_warning(language=language, risk_type=risk_type)
            parts.append("\n" + warning)
            struct_warning = warning
            
        # Combine for legacy text (Legacy clients get a coherent paragraph)
        full_response_text = "".join(parts) if parts else core_narrative
        
        # Ensure core_narrative always has content (resilience)
        safe_core = core_narrative or (
            "Here is the analysis based on the latest available data."
            if language == 'en' else
            "إليك التحليل بناءً على أحدث البيانات المتاحة."
        )
        
        # Construct Structured Object (The 7-Layer Payload)
        structured_narrative = StructuredNarrative(
            personal_greeting=struct_greeting,
            context_bridge=struct_bridge,
            human_opening=struct_opening,
            core_narrative=safe_core,
            key_insight=struct_insight,
            risk_warning=struct_warning,
            follow_up_prompt=None # Handled in chat_service
        )
        
        return full_response_text, structured_narrative, opening_category


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
