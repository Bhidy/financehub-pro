"""
Learning Section Generator - Educational Bullet Points for Starta

Generates 2-4 beginner-friendly bullet points explaining the metrics
shown in the user's data cards.
"""

import random
from typing import List, Dict, Any, Optional

# Metric definitions (simplified, beginner-friendly)
METRIC_DEFINITIONS = {
    "pe_ratio": {
        "en": [
            "**P/E Ratio**: Shows how much investors pay for each unit of profit. Lower can mean undervalued.",
            "**P/E Ratio**: A valuation metric comparing price to earnings. High P/E often signals growth expectations.",
        ],
        "ar": [
            "**مضاعف الربحية (P/E)**: يقيس كم يدفع المستثمرون مقابل كل وحدة ربح. الانخفاض قد يعني فرصة.",
        ]
    },
    "market_cap": {
        "en": [
            "**Market Cap**: The total value of all shares. Larger companies tend to be more stable.",
            "**Market Cap**: Company size indicator. Large-cap stocks are often less volatile.",
        ],
        "ar": [
            "**القيمة السوقية**: إجمالي قيمة أسهم الشركة. الشركات الكبيرة عادة أكثر استقراراً.",
        ]
    },
    "dividend_yield": {
        "en": [
            "**Dividend Yield**: The annual dividend as a percentage of stock price. Higher means more income.",
            "**Dividend Yield**: Shows how much cash return you get from dividends relative to price.",
        ],
        "ar": [
            "**عائد التوزيعات**: نسبة التوزيعات السنوية من سعر السهم. أعلى يعني دخل أكثر.",
        ]
    },
    "change_percent": {
        "en": [
            "**Change %**: How much the price moved today compared to yesterday's close.",
            "**Daily Change**: The percentage price movement in the current trading session.",
        ],
        "ar": [
            "**نسبة التغير**: مقدار تحرك السعر اليوم مقارنة بإغلاق الأمس.",
        ]
    },
    "roe": {
        "en": [
            "**ROE (Return on Equity)**: Shows how efficiently the company uses shareholders' money to generate profit.",
            "**ROE**: Measures profitability relative to shareholders' equity. Higher is better.",
        ],
        "ar": [
            "**العائد على حقوق الملكية (ROE)**: يقيس كفاءة الشركة في استخدام أموال المساهمين لتحقيق الأرباح.",
            "**ROE**: كلما ارتفع، كانت الشركة أكثر كفاءة في تحقيق الأرباح.",
        ]
    },
    "z_score": {
        "en": [
            "**Z-Score**: A bankruptcy predictor. Above 3.0 = safe, below 1.8 = financial distress risk.",
        ],
        "ar": [
            "**مؤشر ألتمان**: متنبئ بالإفلاس. فوق 3 = آمن، تحت 1.8 = خطر ضائقة مالية.",
        ]
    },
    "eps": {
        "en": [
            "**EPS (Earnings Per Share)**: The profit each share earns. Higher EPS often means better profitability.",
            "**EPS**: Net income divided by outstanding shares. Key metric for per-share profitability.",
        ],
        "ar": [
            "**ربحية السهم (EPS)**: الربح الذي يحققه كل سهم. ارتفاعه يعني ربحية أفضل.",
            "**EPS**: صافي الدخل مقسوم على عدد الأسهم. مقياس أساسي للربحية.",
        ]
    },
    "pb_ratio": {
        "en": [
            "**P/B Ratio**: Compares stock price to book value. Below 1.0 may indicate undervaluation.",
        ],
        "ar": [
            "**مضاعف القيمة الدفترية**: يقارن السعر بالقيمة الدفترية. أقل من 1 قد يعني تقييم منخفض.",
        ]
    },
    "current_ratio": {
        "en": [
            "**Current Ratio**: Measures ability to pay short-term debts. Above 1.5 is generally healthy.",
        ],
        "ar": [
            "**النسبة الحالية**: تقيس القدرة على سداد الديون قصيرة الأجل. فوق 1.5 صحي.",
        ]
    },
    "operating_margin": {
        "en": [
            "**Operating Margin**: Profit from operations as a percentage of revenue. Higher is better.",
            "**Operating Margin**: Shows how much profit a company makes from its core business.",
        ],
        "ar": [
            "**هامش التشغيل**: الربح التشغيلي كنسبة من الإيرادات. أعلى يعني أفضل.",
            "**هامش التشغيل**: يوضح مدى ربحية الشركة من نشاطها الأساسي.",
        ]
    },
    # NEW: Additional metrics for comprehensive Arabic coverage
    "debt_to_equity": {
        "en": [
            "**D/E Ratio**: Measures financial leverage. Below 1.0 is generally conservative.",
        ],
        "ar": [
            "**نسبة الديون/حقوق الملكية**: تقيس الرافعة المالية. أقل من 1 يعتبر محافظ.",
        ]
    },
    "revenue_growth": {
        "en": [
            "**Revenue Growth**: Year-over-year change in sales. Positive growth indicates expansion.",
        ],
        "ar": [
            "**نمو الإيرادات**: التغير السنوي في المبيعات. النمو الإيجابي يعني توسع.",
        ]
    },
    "net_margin": {
        "en": [
            "**Net Margin**: Percentage of revenue that becomes profit after all expenses.",
        ],
        "ar": [
            "**هامش صافي الربح**: نسبة الإيرادات التي تتحول لأرباح بعد كل المصروفات.",
        ]
    },
    # WORLD-CLASS: Extended Arabic Financial Metrics
    "ev_ebitda": {
        "en": [
            "**EV/EBITDA**: Enterprise value relative to earnings. Lower means potentially undervalued.",
        ],
        "ar": [
            "**قيمة المنشأة/الأرباح قبل الفوائد**: مقياس تقييم. انخفاضه قد يعني تقييم منخفض.",
        ]
    },
    "free_cash_flow": {
        "en": [
            "**Free Cash Flow**: Cash available after capital expenditures. Key for dividends and growth.",
        ],
        "ar": [
            "**التدفق النقدي الحر**: النقد المتاح بعد الإنفاق الرأسمالي. أساسي للتوزيعات والنمو.",
        ]
    },
    "roa": {
        "en": [
            "**ROA (Return on Assets)**: Shows how efficiently the company uses total assets to generate profit.",
        ],
        "ar": [
            "**العائد على الأصول (ROA)**: يقيس كفاءة استخدام الشركة لأصولها في تحقيق الأرباح.",
        ]
    },
    "gross_margin": {
        "en": [
            "**Gross Margin**: Profit after cost of goods sold. Shows pricing power and efficiency.",
        ],
        "ar": [
            "**هامش الربح الإجمالي**: الربح بعد تكلفة البضاعة. يوضح القدرة التسعيرية والكفاءة.",
        ]
    },
    "beta": {
        "en": [
            "**Beta**: Measures stock volatility vs market. Above 1 = more volatile, below 1 = less volatile.",
        ],
        "ar": [
            "**بيتا**: يقيس تقلب السهم مقارنة بالسوق. فوق 1 = أكثر تقلباً، تحت 1 = أقل تقلباً.",
        ]
    },
    "piotroski_score": {
        "en": [
            "**Piotroski Score**: Financial health score (0-9). Higher is better, 8-9 indicates strong fundamentals.",
        ],
        "ar": [
            "**مؤشر بيوتروسكي**: درجة الصحة المالية (0-9). 8-9 تعني أساسيات قوية.",
        ]
    },
    "quick_ratio": {
        "en": [
            "**Quick Ratio**: Liquidity without inventory. Above 1.0 shows strong short-term solvency.",
        ],
        "ar": [
            "**النسبة السريعة**: سيولة بدون المخزون. فوق 1 يعني ملاءة قوية على المدى القصير.",
        ]
    },
    "interest_coverage": {
        "en": [
            "**Interest Coverage**: How easily a company can pay interest. Higher = more comfortable.",
        ],
        "ar": [
            "**تغطية الفوائد**: قدرة الشركة على دفع الفوائد. أعلى = أكثر راحة.",
        ]
    },
    "eps_growth": {
        "en": [
            "**EPS Growth**: Year-over-year earnings per share change. Positive indicates improving profitability.",
        ],
        "ar": [
            "**نمو ربحية السهم**: التغير السنوي في الأرباح لكل سهم. إيجابي يعني تحسن الربحية.",
        ]
    },
    "asset_turnover": {
        "en": [
            "**Asset Turnover**: How efficiently assets generate revenue. Higher = more efficient operations.",
        ],
        "ar": [
            "**دوران الأصول**: كفاءة توليد الإيرادات من الأصول. أعلى = عمليات أكثر كفاءة.",
        ]
    },
}

# Section title rotation
SECTION_TITLES = {
    "en": [
        "📘 What These Numbers Mean",
        "💡 Explanation & Learning",
        "📊 How to Read This Data",
        "🎓 Quick Definitions",
    ],
    "ar": [
        "📘 ماذا تعني هذه الأرقام",
        "💡 شرح وتعلم",
        "📊 كيف تقرأ هذه البيانات",
        "🎓 تعريفات سريعة",
    ]
}


def generate_learning_section(
    card_types: List[str],
    card_data: List[Dict[str, Any]],
    language: str = "en",
    max_items: int = 4
) -> Optional[Dict[str, Any]]:
    """
    Generate a learning section based on the metrics shown in the cards.
    
    Returns:
        Dict with 'title' and 'items' (list of bullet strings), or None if no cards.
    """
    if not card_types and not card_data:
        return None
    
    # Collect all keys from card data
    all_keys = set()
    for card in card_data:
        data = card.get("data", {})
        all_keys.update(data.keys())
        # Also check nested items
        for item in data.get("items", []):
            if isinstance(item, dict):
                all_keys.update(item.keys())
    
    # Also check card types for context
    for ct in card_types:
        if "dividend" in ct.lower():
            all_keys.add("dividend_yield")
        if "movers" in ct.lower():
            all_keys.add("change_percent")
        if "snapshot" in ct.lower():
            all_keys.update(["pe_ratio", "market_cap", "pb_ratio"])
        if "valuation" in ct.lower():
            all_keys.update(["pe_ratio", "pb_ratio", "eps"])
        if "health" in ct.lower() or "safety" in ct.lower():
            all_keys.add("z_score")
    
    # Find matching definitions
    items = []
    lang_key = language if language in ["en", "ar"] else "en"
    
    for key in all_keys:
        if key in METRIC_DEFINITIONS:
            options = METRIC_DEFINITIONS[key].get(lang_key, METRIC_DEFINITIONS[key]["en"])
            items.append(random.choice(options))
            if len(items) >= max_items:
                break
    
    # Fallback: If we have cards but no matching definitions, add generic ones
    if len(items) < 2 and card_data:
        fallbacks = ["pe_ratio", "market_cap", "change_percent"]
        for fb in fallbacks:
            if fb in METRIC_DEFINITIONS and fb not in [i for i in all_keys]:
                options = METRIC_DEFINITIONS[fb].get(lang_key, METRIC_DEFINITIONS[fb]["en"])
                items.append(random.choice(options))
                if len(items) >= 2:
                    break
    
    if not items:
        return None
    
    # Select a random title
    title = random.choice(SECTION_TITLES.get(lang_key, SECTION_TITLES["en"]))
    
    return {
        "title": title,
        "items": items[:max_items]
    }


# Singleton pattern
_generator = None

def get_learning_generator():
    global _generator
    if _generator is None:
        _generator = generate_learning_section
    return _generator
