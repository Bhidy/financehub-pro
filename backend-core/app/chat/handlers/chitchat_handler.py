from typing import Dict, Any, Optional
import random

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
    
    # Get responses list
    options = RESPONSES.get(intent, {}).get(language, ["Hello!"])
    
    # Pick random response
    message = random.choice(options)
    
    # Add suggestions based on intent
    actions = []
    if intent in ["GREETING", "IDENTITY", "CAPABILITIES", "HELP"]:
        # Ultra Premium Suggestions (Mix of Standard + Deep)
        actions = [
            {'label': '📈 Top Gainers', 'label_ar': '📈 الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'top gainers'},
            {'label': '🛡️ Safe Stocks', 'label_ar': '🛡️ أسهم آمنة', 'action_type': 'query', 'payload': 'safest stocks with high z-score'},
            {'label': '💎 Undervalued', 'label_ar': '💎 أسهم رخيصة', 'action_type': 'query', 'payload': 'stocks with lowest ev/ebit'},
            {'label': '⚡ Efficient', 'label_ar': '⚡ كفاءة عالية', 'action_type': 'query', 'payload': 'best roce stocks'}
        ]
        
    return {
        'success': True,
        'message': message,
        'cards': [],  # No special cards for small talk typically, maybe "Suggestions" later
        'actions': actions
    }

async def handle_definition(term: str, language: str = "en") -> Dict[str, Any]:
    """Handle educational definition requests."""
    
    # Normalize term
    term_key = term.lower().replace(" ", "_").replace("-", "")
    
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
    
    # Lookup
    definition = DEFINITIONS.get(term_key, {}).get(language)
    
    if not definition:
        return {
            'success': False,
            'message': "I don't have a definition for that specific term yet." if language == 'en' else "ليس لدي تعريف لهذا المصطلح بعد.",
            'cards': [],
             'actions': []
        }
        
    return {
        'success': True,
        'message': definition,
        'cards': [],
        'actions': []
    }
