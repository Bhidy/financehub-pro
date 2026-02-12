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

import random
from typing import Optional, List, Dict, Tuple
from .schemas import Intent, CardType, StructuredNarrative


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
            "Good question.",
            "Alright, let's take a clear look.",
            "This is a smart thing to check.",
            "Got it. Let me show you.",
        ],
        "ar": [
            "سؤال ممتاز.",
            "تمام، خلينا نشوف.",
            "فهمتك. أوريك.",
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
            "🎯 **Key Insight**: The fundamentals suggest strength here.",
            "🎯 **Takeaway**: Metrics point to a solid position.",
            "🎯 **Bottom Line**: This looks financially healthy.",
        ],
        "ar": [
            "🎯 **النقطة الأساسية**: الأساسيات تشير لقوة.",
            "🎯 **الخلاصة**: المؤشرات إيجابية.",
        ]
    },
    "bearish": {
        "en": [
            "🎯 **Key Insight**: Caution warranted based on current metrics.",
            "🎯 **Takeaway**: Some warning signs to monitor.",
            "🎯 **Bottom Line**: Worth watching closely.",
        ],
        "ar": [
            "🎯 **النقطة الأساسية**: الحذر مطلوب.",
            "🎯 **الخلاصة**: في علامات تحتاج متابعة.",
        ]
    },
    "neutral": {
        "en": [
            "🎯 **Key Insight**: A balanced picture overall.",
            "🎯 **Takeaway**: Mixed signals — dig deeper before deciding.",
            "🎯 **Bottom Line**: Neither strongly bullish nor bearish.",
        ],
        "ar": [
            "🎯 **النقطة الأساسية**: الصورة متوازنة.",
            "🎯 **الخلاصة**: إشارات مختلطة.",
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
        force: bool = False  # NEW: Force opening (no random skip)
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Get a human opening (Layer ①).
        
        Args:
            language: 'en' or 'ar'
            user_name: User's name for personalization
            last_opening_used: Last used category (to avoid repetition)
            use_name: Whether to use name-based openings
            force: If True, ALWAYS return an opening (no 50% skip)
        
        Returns:
            Tuple of (opening_text or None, category_used or None)
        """
        # 50% chance to include opening (unless forced)
        if not force and random.random() > 0.5:
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
                force=force_opening  # Pass force flag
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
        sentiment: str = "neutral"
    ) -> str:
        """
        Get a key insight (Layer ⑤).
        
        Args:
            language: 'en' or 'ar'
            sentiment: 'bullish', 'bearish', or 'neutral'
        """
        lang_key = language if language in ['en', 'ar'] else 'en'
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
        force_opening: bool = False
    ) -> Tuple[str, Optional['StructuredNarrative'], Optional[str]]:
        """
        Compose a premium 8-layer response (layers 1-6, 7-8 handled separately).
        Returns:
            Tuple of (full_response_text, structured_narrative, opening_category_used)
        """
        from .schemas import StructuredNarrative
        
        parts = []
        opening_category = None
        
        # Components for Structured Response
        struct_greeting = None
        struct_bridge = None
        struct_opening = None
        struct_insight = None
        struct_warning = None
        
        # Layer ① - Personal Greeting (Explicitly separate if forcing opening or new session)
        # Note: We keep this simple for now. If 'include_opening' is T, we might get a name in Layer 3.
        # But specifically, if we want a "Personal Greeting" as Layer 1, we can synthesis it.
        if force_opening or (include_opening and not is_follow_up):
             # Simple localized greeting
             if language == 'ar':
                 struct_greeting = f"أهلاً {user_name.split()[0]}"
             else:
                 struct_greeting = f"Hi {user_name.split()[0]}"

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
                force=force_opening
            )
            if opening:
                parts.append(opening)
                struct_opening = opening
        
        # Layer ④ - Core Narrative (always)
        if core_narrative:
            parts.append(core_narrative)
        
        # Layer ⑤ - Key Insight (for stock-related intents)
        if intent in [
            Intent.STOCK_SNAPSHOT, Intent.FINANCIALS, Intent.DIVIDENDS,
            Intent.DEEP_VALUATION, Intent.DEEP_SAFETY, Intent.FAIR_VALUE,
            Intent.FINANCIAL_HEALTH, Intent.COMPARE_STOCKS
        ]:
            insight = cls.get_key_insight(language=language, sentiment=sentiment)
            parts.append("\n\n" + insight)
            struct_insight = insight
        
        # Layer ⑥ - Risk Warning (when appropriate)
        if include_risk_warning:
            warning = cls.get_risk_warning(language=language, risk_type=risk_type)
            parts.append("\n" + warning)
            struct_warning = warning
            
        # Combine for legacy text
        full_response_text = "".join(parts) if parts else core_narrative
        
        # Construct Structured Object
        structured_narrative = StructuredNarrative(
            personal_greeting=struct_greeting,
            context_bridge=struct_bridge,
            human_opening=struct_opening,
            core_narrative=core_narrative,
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
