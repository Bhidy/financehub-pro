from typing import Dict, Any, Optional
import random
import re

# Response Database
RESPONSES = {
    "GREETING": {
        "en": [
            "Hello! Ready to analyze the markets?",
            "Hi there! How can I help your portfolio today?",
            "Welcome back to Starta."
        ],
        "ar": [
            "أهلاً بك! هل أنت مستعد لتحليل السوق؟",
            "مرحباً! كيف يمكنني مساعدتك في محفظتك اليوم؟",
            "أهلاً بك في ستارتا."
        ]
    },
    "IDENTITY": {
        "en": [
            "I am Starta, your AI Financial Analyst. I specialize in EGX stocks.",
            "I'm Starta. I process market data to give you instant insights."
        ],
        "ar": [
            "أنا 'ستارتا'، محللك المالي الذكي. أتخصص في الأسهم المصرية.",
            "أنا ستارتا. أعالج بيانات السوق لأعطيك تحليلات فورية."
        ]
    },
    "MOOD": {
        "en": [
            "I'm functioning at 100% and tracking 200+ stocks!",
            "I'm feeling bullish about helping you today."
        ],
        "ar": [
            "أعمل بكفاءة 100% وأتابع أكثر من 200 سهم!",
            "أشعر بالتفاؤل لمساعدتك اليوم."
        ]
    },
    "GRATITUDE": {
        "en": [
            "You're welcome! Happy investing.",
            "Anytime! Let me know if you need more data."
        ],
        "ar": [
            "على الرحب والسعة! استثماراً موفقاً.",
            "في أي وقت! أخبرني إذا احتجت لمزيد من البيانات."
        ]
    },
    "GOODBYE": {
        "en": [
            "Goodbye! Trade safe.",
            "See you later. Markets never sleep (metaphorically)!"
        ],
        "ar": [
            "وداعاً! تداول بأمان.",
            "أراك لاحقاً. الأسواق لا تنام!"
        ]
    },
    "CAPABILITIES": {
        "en": [
            "I can help with:\n• Stock Prices & Charts\n• Financial Statements\n• Market News & Sentiment"
        ],
        "ar": [
            "يمكنني المساعدة في:\n• أسعار الأسهم والرسوم البيانية\n• القوائم المالية\n• أخبار السوق والمشاعر"
        ]
    }
}

DEFINITIONS = {
    "pe": {
        "en": "**P/E Ratio (Price-to-Earnings):**\nMeasures a company's current share price relative to its per-share earnings. A high P/E could mean a stock's price is high relative to earnings and possibly overvalued.",
        "ar": "**مضاعف الربحية (P/E):**\nيقيس سعر السهم الحالي مقارنة بربحية السهم. ارتفاع هذا الرقم قد يعني أن السهم مقيم بأعلى من قيمته الحقيقية أو أن المستثمرين يتوقعون نمواً كبيراً."
    },
    "eps": {
        "en": "**EPS (Earnings Per Share):**\nThe portion of a company's profit allocated to each outstanding share of common stock. It serves as an indicator of a company's profitability.",
        "ar": "**ربحية السهم (EPS):**\nحصة السهم الواحد من صافي أرباح الشركة. يعتبر مؤشراً أساسياً لربحية الشركة."
    },
    "dividend": {
        "en": "**Dividend Yield:**\nA financial ratio that shows how much a company pays out in dividends each year relative to its stock price.",
        "ar": "**عائد التوزيعات:**\nنسبة توضح مقدار التوزيعات النقدية التي تدفعها الشركة سنوياً مقارنة بسعر سهمها."
    },
    "market_cap": {
        "en": "**Market Cap:**\nThe total value of a company's shares of stock. Calculated by multiplying the price of a stock by its total number of outstanding shares.",
        "ar": "**القيمة السوقية:**\nالقيمة الإجمالية لأسهم الشركة. تُحسب بضرب سعر السهم الحالي في إجمالي عدد الأسهم المصدرة."
    },
    "z_score": {
        "en": "**Altman Z-Score:**\nA formula for predicting bankruptcy. A score above 3.0 indicates safety, while below 1.8 indicates financial distress.",
        "ar": "**مؤشر ألتمان (Z-Score):**\nمعادلة للتنبؤ بمخاطر الإفلاس. النتيجة فوق 3.0 تعني الأمان، بينما تحت 1.8 تشير إلى ضائقة مالية."
    },
    "roce": {
        "en": "**ROCE (Return on Capital Employed):**\nA metric showing how efficiently a company uses its capital. Higher is better. It measures the profit generated for every dollar of capital invested.",
        "ar": "**العائد على رأس المال المستخدم (ROCE):**\nمقياس يوضح كفاءة الشركة في استخدام رأسمالها. كلما ارتفع كان أفضل."
    },
    "ev_ebit": {
        "en": "**EV/EBIT:**\nA valuation multiple that compares a company's total value (EV) to its operating profit (EBIT). Lower is often 'cheaper'. It's considered superior to P/E by many investors.",
        "ar": "**مكرر القيمة للمنشأة (EV/EBIT):**\nيقارن القيمة الإجمالية للشركة بربحها التشغيلي. الرقم الأقل يعني عادة أن السهم أرخص."
    }
}

async def handle_chitchat(intent: str, language: str = "en") -> Dict[str, Any]:
    """Handle small talk intents."""
    
    # Get responses list (Fallback only if LLM fails)
    options = RESPONSES.get(intent, {}).get(language, ["Hello!"])
    fallback_message = random.choice(options)
    
    # Add suggestions based on intent
    actions = [
        {'label': '📈 Top Gainers', 'label_ar': '📈 الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'top gainers'},
        {'label': '🛡️ Safe Stocks', 'label_ar': '🛡️ أسهم آمنة', 'action_type': 'query', 'payload': 'safest stocks with high z-score'},
        {'label': '💎 Undervalued', 'label_ar': '💎 أسهم رخيصة', 'action_type': 'query', 'payload': 'stocks with lowest ev/ebit'},
        {'label': '⚡ Efficient', 'label_ar': '⚡ كفاءة عالية', 'action_type': 'query', 'payload': 'best roce stocks'}
    ]
        
    return {
        'success': True,
        'message': fallback_message, # Static fallback
        'cards': [], 
        'actions': actions
    }


def _normalize_definition_term(raw_term: Optional[str]) -> str:
    """
    Normalize term extraction for DEFINE_TERM flows.
    Protects against polluted model outputs like:
    "'Inflation' is not a ticker symbol..."
    """
    term = str(raw_term or "").strip()
    if not term:
        return ""

    suspicious_phrases = (
        "ticker symbol",
        "assume you're asking",
        "proceed accordingly",
        "general term",
        "in my database yet",
        "detailed definition",
    )
    lowered = term.lower()

    if any(p in lowered for p in suspicious_phrases):
        quoted = re.findall(r"'([^']{2,50})'|\"([^\"]{2,50})\"", term)
        for q1, q2 in quoted:
            candidate = (q1 or q2).strip()
            if candidate:
                term = candidate
                lowered = term.lower()
                break

    term = re.sub(r"^(what is|what's|define|explain|meaning of|definition of)\s+", "", term, flags=re.IGNORECASE)
    term = re.sub(r"^(ما هو|ما معنى|ما المقصود بـ|اشرح)\s+", "", term, flags=re.IGNORECASE)

    if len(term.split()) > 8 or any(p in lowered for p in suspicious_phrases):
        term = re.split(r"[.!?،؛\n]", term, maxsplit=1)[0].strip()

    term = term.strip(" '\"`:-")
    term = re.sub(r"[?؟]+$", "", term).strip()
    words = term.split()
    if len(words) > 5:
        term = " ".join(words[:5]).strip()

    return term


async def handle_definition(term: str, language: str = "en") -> Dict[str, Any]:
    """
    Handle educational definition requests with structured EducationalCard responses.
    
    Enhanced to return rich, structured content for the EducationalCard component.
    """
    clean_term = _normalize_definition_term(term)
    if not clean_term:
        clean_term = str(term or "").strip() or ("financial term" if language == "en" else "مصطلح مالي")

    # First try the new structured educational content
    try:
        from ..educational_content import get_educational_content, format_educational_response, format_unknown_term_response
        
        content = get_educational_content(clean_term)
        
        if content:
            return format_educational_response(content, language)
        else:
            unknown = format_unknown_term_response(clean_term, language)
            if isinstance(unknown, dict):
                # Direct-message fallback path in chat_service uses `message` first.
                if not unknown.get("message") and unknown.get("conversational_text"):
                    unknown["message"] = unknown.get("conversational_text")
                return unknown
    except ImportError:
        pass
    
    # Legacy fallback for backward compatibility
    # Normalize term
    term_key = clean_term.lower().replace(" ", "_").replace("-", "")
    
    # Map common terms
    mapping = {
        "p/e": "pe", "price_to_earnings": "pe", "pe_ratio": "pe",
        "earning_per_share": "eps",
        "yield": "dividend", "dividend_yield": "dividend",
        "cap": "market_cap", "market_capitalization": "market_cap",
        "zscore": "z_score", "altman": "z_score",
        "return_on_capital": "roce",
        "enterprise_value": "ev_ebit"
    }
    term_key = mapping.get(term_key, term_key)
    
    # Lookup in legacy definitions
    definition = DEFINITIONS.get(term_key, {}).get(language)
    
    if not definition:
        # Return helpful suggestions
        if language == 'ar':
            return {
                'success': True,
                'message': f"لا يتوفر لدي تعريف تفصيلي للمصطلح '{clean_term}' حالياً. جرب السؤال عن: ROE، P/E، P/B أو EBITDA.",
                'cards': [
                    {
                        'type': 'help',
                        'data': {
                            'title': 'مصطلحات متاحة',
                            'categories': [
                                {'title': 'جرّب هذه الأسئلة:', 'examples': ['ما هو ROE؟', 'اشرح مضاعف الربحية', 'ما هو EBITDA؟']}
                            ]
                        }
                    }
                ],
                'actions': [
                    {'label': '📊 ما هو ROE؟', 'label_ar': '📊 ما هو ROE؟', 'action_type': 'query', 'payload': 'ما هو ROE؟'},
                    {'label': '💰 ما هو P/E؟', 'label_ar': '💰 ما هو P/E؟', 'action_type': 'query', 'payload': 'ما هو P/E؟'},
                    {'label': '📈 ما هو EBITDA؟', 'label_ar': '📈 ما هو EBITDA؟', 'action_type': 'query', 'payload': 'ما هو EBITDA؟'}
                ]
            }
        return {
            'success': True,
            'message': f"I don't have a detailed definition for '{clean_term}' yet. Try asking about: ROE, P/E, P/B, EBITDA, or Dividend Yield." if language == 'en' else f"ليس لدي تعريف لـ '{clean_term}' بعد. جرب السؤال عن: ROE, P/E, P/B.",
            'cards': [
                {
                    'type': 'help',
                    'data': {
                        'title': 'Available Definitions',
                        'categories': [
                            {'title': 'Try these:', 'examples': ['What is ROE?', 'Explain P/E ratio', 'What is EBITDA?']}
                        ]
                    }
                }
            ],
            'actions': [
                {'label': '📊 What is ROE?', 'action_type': 'query', 'payload': 'what is roe'},
                {'label': '💰 What is P/E?', 'action_type': 'query', 'payload': 'what is pe ratio'},
                {'label': '📈 What is EBITDA?', 'action_type': 'query', 'payload': 'explain ebitda'}
            ]
        }
    
    # Return legacy format (still works)
    return {
        'success': True,
        'message': definition,
        'cards': [],
        'actions': [
            {'label': '📊 Stock Analysis', 'action_type': 'query', 'payload': 'analyze COMI'},
            {'label': '💎 Undervalued Stocks', 'action_type': 'query', 'payload': 'undervalued stocks'}
        ]
    }
