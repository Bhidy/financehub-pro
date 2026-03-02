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
            "**P/E Ratio** (Price-to-Earnings): Formula: Price per Share ÷ EPS. Shows how much investors pay per unit of profit. Lower P/E may mean undervalued, but always compare within the same sector. ⚠️ Banks often have different P/E ranges than consumer stocks. EGX benchmarks: Banks 5-8x, Consumer 12-18x, Real Estate 8-14x.",
            "**P/E Ratio**: A valuation metric comparing price to earnings. High P/E signals growth expectations; low P/E could be a bargain or a value trap. Always check alongside growth rate (PEG ratio).",
        ],
        "ar": [
            "**مضاعف الربحية (P/E)**: المعادلة: سعر السهم ÷ ربحية السهم. يقيس كم يدفع المستثمرون مقابل كل وحدة ربح. الانخفاض قد يعني فرصة، لكن قارن دائماً داخل نفس القطاع. معايير البورصة: بنوك 5-8x، استهلاكي 12-18x.",
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
            "**ROE (Return on Equity)**: Formula: Net Income ÷ Shareholders' Equity. Measures how efficiently a company generates profit from shareholders' money. Example: JUFO's 38.6% ROE = EGP 38.60 profit per EGP 100 equity. ⚠️ Caveat: High leverage inflates ROE — always check alongside D/E ratio. Benchmarks: Banks 15-20%, Consumer 18-25%, Real Estate 12-18%.",
            "**ROE**: The gold standard of profitability metrics. Shows return generated on shareholders' capital. Higher is better, but verify it's not artificially inflated by excessive debt.",
        ],
        "ar": [
            "**العائد على حقوق الملكية (ROE)**: المعادلة: صافي الدخل ÷ حقوق المساهمين. يقيس كفاءة تحويل أموال المساهمين إلى أرباح. ⚠️ تحذير: الرافعة العالية تضخم المؤشر — راجع نسبة الدين/الملكية دائماً. المعايير: بنوك 15-20%، استهلاكي 18-25%.",
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
            "**EPS (Earnings Per Share)**: Formula: Net Income ÷ Shares Outstanding. The profit each share earns. Higher EPS = better profitability. Compare YoY growth to see if earnings are improving. ⚠️ One-time gains can inflate EPS temporarily.",
            "**EPS**: Net income divided by outstanding shares. Key for calculating P/E and tracking profitability trends over time.",
        ],
        "ar": [
            "**ربحية السهم (EPS)**: المعادلة: صافي الدخل ÷ عدد الأسهم. الربح الذي يحققه كل سهم. ارتفاعه يعني ربحية أفضل. ⚠️ الأرباح الاستثنائية قد تضخم الرقم مؤقتاً.",
        ]
    },
    "pb_ratio": {
        "en": [
            "**P/B Ratio** (Price-to-Book): Formula: Market Price ÷ Book Value per Share. Below 1.0 may mean the stock trades below its asset value — potential bargain. ⚠️ Critical for banks. Irrelevant for tech/service companies with few tangible assets. EGX benchmarks: Banks 0.8-1.5x, Real Estate 0.5-1.2x.",
        ],
        "ar": [
            "**مضاعف القيمة الدفترية (P/B)**: المعادلة: سعر السوق ÷ القيمة الدفترية. أقل من 1 قد يعني أن السهم يتداول تحت قيمة أصوله. ⚠️ مهم للبنوك، غير مفيد لشركات الخدمات. المعايير: بنوك 0.8-1.5x، عقارات 0.5-1.2x.",
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
            "**D/E Ratio** (Debt-to-Equity): Formula: Total Debt ÷ Shareholders' Equity. Below 1.0 is conservative; above 2.0 is high leverage. ⚠️ Banks naturally carry higher D/E. Always check alongside Free Cash Flow and Interest Coverage to assess real risk. EGX ranges: Industrials <0.8, Real Estate 0.5-1.5.",
        ],
        "ar": [
            "**نسبة الديون/حقوق الملكية (D/E)**: المعادلة: إجمالي الدين ÷ حقوق الملكية. أقل من 1 محافظ، فوق 2 رافعة عالية. ⚠️ راجع التدفق النقدي الحر وتغطية الفوائد لتقييم المخاطر الحقيقية.",
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

    # =========================================================================
    # FINANCIAL-SERVICES-PLUGINS ADDITIONS (ported from Anthropic repo)
    # These cover institutional-grade concepts now surfaced in chatbot responses
    # =========================================================================

    "earnings_beat_miss": {
        "en": [
            "**Earnings Beat vs Miss**: A 'beat' means actual EPS exceeded analyst consensus estimates. Magnitude matters: a 1-2% beat is noise; >5% is a genuine signal. Equally important: check if the beat was *revenue-driven* (higher quality) or *cost-cut driven* (less durable). EGX context: With fewer analysts covering EGX, beat/miss signals can be more significant.",
            "**Earnings Surprise**: When reported earnings differ from consensus. Positive surprise = beat (stock typically rallies). Negative = miss (stock typically drops). Watch: EPS beats from one-time gains (asset sales, FX gains) don't warrant re-rating — sustainable beats from recurring revenue do.",
        ],
        "ar": [
            "**تجاوز أو خيبة التوقعات**: 'التجاوز' يعني أن الأرباح الفعلية تجاوزت توقعات المحللين. الحجم مهم: تجاوز أقل من 2% ضجيج، أما فوق 5% فهو إشارة حقيقية. الأهم: راجع ما إذا كان التجاوز مدفوعاً بنمو الإيرادات (جودة عالية) أم بخفض التكاليف (أقل استدامة).",
        ]
    },

    "wacc": {
        "en": [
            "**WACC (Weighted Average Cost of Capital)**: The minimum return a company must earn to satisfy all capital providers. Formula: WACC = (E/V × Cost of Equity) + (D/V × Cost of Debt × (1-Tax)). For Egypt: WACC is typically 25-32% for EGX companies given high T-bill rates (~20-22%). A DCF based on WACC below 22% for a local EGX company is likely miscalibrated.",
        ],
        "ar": [
            "**تكلفة رأس المال المرجحة (WACC)**: الحد الأدنى من العوائد التي يجب أن تحققها الشركة لإرضاء جميع مزودي رأس المال. لشركات البورصة المصرية: 25-32% تقريباً نظراً لارتفاع أسعار الفائدة. أي نموذج DCF بـ WACC أقل من 22% لشركة محلية يحتاج مراجعة.",
        ]
    },

    "dcf_model": {
        "en": [
            "**DCF (Discounted Cash Flow)**: A valuation method that estimates *intrinsic value* by projecting future free cash flows and discounting them back to today using WACC. The core question: what is this company worth if we owne it for 10 years? Terminal value (years 6+) typically represents 50-70% of DCF value — if it exceeds 75%, the model is over-reliant on distant assumptions.",
        ],
        "ar": [
            "**نموذج التدفق النقدي المخصوم (DCF)**: طريقة تقييم تحسب 'القيمة الجوهرية' بتوقع التدفقات النقدية المستقبلية وخصمها للحاضر باستخدام WACC. السؤال الجوهري: ما قيمة هذه الشركة لو امتلكناها 10 سنوات؟ القيمة النهائية (السنوات 6+) عادة 50-70% من إجمالي القيمة — فوق 75% يعني الاعتماد المفرط على افتراضات بعيدة.",
        ]
    },

    "catalyst_calendar": {
        "en": [
            "**Catalyst Calendar**: Catalysts are specific events that can re-rate a stock: earnings reports, dividend announcements, regulatory approvals, major contracts, or macro events (CBE rate decisions). Institutional investors map catalysts 6-12 months ahead because stocks often move *before* the event as the market prices in expectations. Key rule: news is priced in fast — position before, not after.",
        ],
        "ar": [
            "**تقويم المحفزات**: المحفزات هي أحداث محددة يمكنها إعادة تقييم السهم: نتائج ربعية، توزيعات، موافقات تنظيمية، عقود كبرى، أو قرارات البنك المركزي. المستثمرون المحترفون يخططون لها 6-12 شهراً مسبقاً لأن الأسهم غالباً تتحرك *قبل* الحدث. القاعدة الذهبية: الأخبار تُسعَّر بسرعة — تمركز قبلها لا بعدها.",
        ]
    },

    "investment_thesis": {
        "en": [
            "**Investment Thesis**: The core argument for owning a stock — a concise, testable statement of why this company will create value. A strong thesis identifies 2-3 specific milestones to confirm or reject it (e.g., 'Banking thesis: CBE cuts + loan growth > 15% + NPL below 3%'). If those milestones aren't hit in 2 quarters, the thesis breaks and the position should be reconsidered.",
        ],
        "ar": [
            "**أطروحة الاستثمار**: الحجة الجوهرية لامتلاك سهم — جملة موجزة وقابلة للاختبار تشرح لماذا ستخلق هذه الشركة قيمة. الأطروحة القوية تحدد 2-3 معالم محددة لتأكيدها أو رفضها. إذا لم تتحقق هذه المعالم خلال ربعين، تنكسر الأطروحة ويجب إعادة النظر في المركز.",
        ]
    },

    "nim": {
        "en": [
            "**NIM (Net Interest Margin)**: The spread between what a bank earns on loans and what it pays on deposits, expressed as a percentage of interest-earning assets. Formula: NIM = (Interest Income - Interest Expense) / Average Earning Assets. For EGX banks, NIM is the #1 profitability driver. CBE rate cuts compress NIM but stimulate loan volume — the net effect depends on the bank's deposit mix.",
        ],
        "ar": [
            "**صافي هامش الفائدة (NIM)**: الفرق بين ما تكسبه البنوك من القروض وما تدفعه على الودائع، كنسبة من الأصول المدرة للفائدة. لبنوك البورصة المصرية، NIM هو المحرك الرئيسي للربحية. خفض أسعار الفائدة يضغط على NIM لكنه يحفز حجم القروض — الأثر الصافي يعتمد على تركيبة الودائع.",
        ]
    },

    "pre_sales": {
        "en": [
            "**Pre-Sales (Real Estate)**: Contracted sales before construction completion. This is the leading indicator for Egyptian real estate developers — NOT reported revenues (which follow delivery). A developer with EGP 20bn pre-sales backlog has 18-24 months of visibility on future revenue recognition. Watch: pre-sales velocity QoQ is more important than reported net income for real estate stocks.",
        ],
        "ar": [
            "**المبيعات المبدئية (العقارات)**: العقود المبرمة قبل استكمال البناء. هذا هو المؤشر المتقدم لمطوري العقارات المصريين — وليس الإيرادات المُبلَّغ عنها (التي تتبع التسليم). مطور بـ 20 مليار جنيه في المبيعات المبدئية يمتلك رؤية 18-24 شهراً على الإيرادات المستقبلية. المبيعات المبدئية الفصلية أهم من صافي الربح لأسهم العقارات.",
        ]
    },

    "comps_analysis": {
        "en": [
            "**Comparable Company Analysis (Comps)**: A relative valuation method that benchmarks a stock against its peers. Key output: a table showing EV/EBITDA, P/E, P/B across 4-6 similar companies, with the median as the benchmark. If a stock trades at a 30% discount to its peer median P/E with similar fundamentals, that gap is worth investigating. EGX limitation: thin peer groups in some sectors (only 1-2 listed peers).",
        ],
        "ar": [
            "**تحليل الشركات المماثلة (Comps)**: طريقة تقييم نسبي تقارن السهم بأقرانه. الناتج الرئيسي: جدول يعرض EV/EBITDA وP/E وP/B عبر 4-6 شركات مشابهة، مع الوسيط كمعيار مرجعي. إذا تداول سهم بخصم 30% عن وسيط القطاع مع أساسيات مشابهة، يستحق البحث. قيد البورصة المصرية: بعض القطاعات بها 1-2 أسهم مدرجة فقط.",
        ]
    },
}

# Section title rotation
SECTION_TITLES = {
    "en": [
        "⚠️ Important Disclaimer",
        "💡 Financial Notice",
        "📊 Data Context (Not Advice)",
        "🎓 Analytical Parameters",
    ],
    "ar": [
        "⚠️ إخلاء مسؤولية تنبيهي",
        "💡 اشعار مالي هام",
        "📊 سياق البيانات (ليست نصيحة)",
        "🎓 معايير التحليل",
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
            all_keys.update(["pe_ratio", "pb_ratio", "eps", "dcf_model", "wacc"])
        if "health" in ct.lower() or "safety" in ct.lower():
            all_keys.add("z_score")
        # NEW: financial-services-plugins additions
        if "earnings" in ct.lower() or "results" in ct.lower():
            all_keys.update(["earnings_beat_miss", "investment_thesis"])
        if "comps" in ct.lower() or "compare" in ct.lower() or "peer" in ct.lower():
            all_keys.add("comps_analysis")
        if "dcf" in ct.lower() or "fair_value" in ct.lower() or "intrinsic" in ct.lower():
            all_keys.update(["dcf_model", "wacc"])
        if "catalyst" in ct.lower():
            all_keys.add("catalyst_calendar")
        if "bank" in ct.lower() or "financial" in ct.lower():
            all_keys.add("nim")
        if "real_estate" in ct.lower() or "property" in ct.lower() or "presales" in ct.lower():
            all_keys.add("pre_sales")
    
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
