"""
Intent Router - Deterministic intent classification using keyword matching.

No ML/AI - pure rule-based scoring with bilingual keyword packs.
"""

import re
from typing import Dict, List, Optional, Tuple
from .schemas import Intent, IntentResult
from .text_normalizer import normalize_text, NormalizedText


# Keyword packs per intent: (english_keywords, arabic_keywords, weight)
INTENT_KEYWORDS: Dict[Intent, Tuple[List[str], List[str], float]] = {
    
    # =========================================================================
    # SECTOR A: DIRECT MARKET DATA & SNAPSHOTS
    # =========================================================================
    
    Intent.STOCK_PRICE: (
        ["price", "trading at", "cost", "quote", "how much", "what is the price", "current price", "last price", "close price", "s price", "give me price", "show price"],
        [
            # Formal Arabic
            "سعر", "كم سعر", "بكم", "كم يتداول", "سعر السهم", "ما سعر", "اخر سعر", "سعر الاغلاق",
            # Egyptian dialect
            "بكام", "كام", "ادينى سعر", "اديني سعر", "هات سعر", "قولى سعر", "قولي سعر",
            "عايز سعر", "عاوز سعر", "ممكن سعر", "شوفلى سعر", "شوفلي سعر",
            # Gulf dialect
            "ابي سعر", "ابغى سعر", "كيف السعر", "وش سعر", "شلون السعر",
            # Common patterns
            "سعر سهم", "سعر شركة", "سعر بنك", "تديني سعر", "تدينى سعر",
        ],
        1.0
    ),

    Intent.STOCK_MARKET_CAP: (
        ["market cap", "market capitalization", "company size", "how big is", "valuation of"],
        ["قيمة سوقية", "راسمال سوقي", "رأس المال السوقي", "حجم الشركة", "قيمه الشركه"],
        1.5
    ),

    Intent.MARKET_MOST_ACTIVE: (
        ["most active", "highest volume", "top volume", "active stocks", "traded volume"],
        ["الاكثر تداولا", "انشط الاسهم", "اعلى حجم تداول", "سيولة عالية", "تداولات"],
        1.5
    ),

    
    Intent.MARKET_STATUS: (
        ["is market open", "market status", "trading hours", "holiday", "when does market open", "when does market close", "session status", "pre-market", "market summary", "market overview", "market recap", "market brief", "index performance", "egx30", "how is market", "market update"],
        ["حالة السوق", "هل السوق مفتوح", "مواعيد التداول", "اجازة السوق", "متى يفتح السوق", "متى يغلق", "الجلسة", "ملخص السوق", "نظرة عامة على السوق", "تقرير السوق", "المؤشر", "اداء البورصة", "اخبار السوق"],
        3.0
    ),
    
    Intent.STOCK_SNAPSHOT: (
        ["snapshot", "quick look", "stock info", "brief", "dashboard", "full snapshot", "summary", "analyze", "analysis", "analyse", "check", "investigate", "summary for", "deep dive"],
        ["نبذه", "اخبرني عن", "معلومات", "تقرير سريع", "لوحة معلومات", "ملخص سهم", "نظرة سريعة", "اعرض بيانات", "حلل", "تحليل", "فحص", "ملخص لـ"],
        0.9
    ),

    # =========================================================================
    # SECTOR B: FUNDAMENTAL INTELLIGENCE (150+ Intents)
    # =========================================================================

    Intent.DEEP_VALUATION: (
        ["intrinsic value", "fair value", "is it cheap", "undervalued", "overvalued", "valuation", "target price", "worth buying", "discounted cash flow", "dcf", "margin of safety", "graham number", "price to book", "pb ratio", "peg ratio"],
        ["قيمة عادلة", "سعر مستهدف", "تقييم", "هل السهم رخيص", "هل السهم غالي", "مكرر الربحية", "القيمة الدفترية", "هامش الامان", "سعر عادل", "توصية شراء"],
        2.0
    ),
    
    Intent.DEEP_SAFETY: (
        ["safety", "risk", "safe", "financially safe", "financial safety", "bankruptcy", "financial health", "solvency", "z-score", "altman", "f-score", "piotroski", "distress", "credit risk", "leverage risk"],
        ["امان", "مخاطر", "هل السهم امن", "امن ماليا", "افلاس", "صحة مالية", "ملاءة", "مؤشر التمان", "قوة مالية", "تعثر مالي", "تحليل المخاطر"],
        2.0
    ),
    
    Intent.FAIR_VALUE: (
        ["fair value", "intrinsic value", "target price", "upside", "downside", "valuation model", "dcf", "discounted cash flow"],
        ["قيمة عادلة", "سعر عادل", "سعر مستهدف", "نموذج تقييم", "قيمة حقيقية", "سعر السهم الحقيقي"],
        2.5
    ),

    Intent.DEEP_GROWTH: (
        ["growth", "cagr", "future growth", "revenue growth", "profit growth", "eps growth", "expansion", "scalability", "growing fast", "hyper growth", "growth rate"],
        ["نمو", "معدل نمو", "توسع", "زيادة ايرادات", "زيادة ارباح", "نمو مستقبلي", "سهم نمو", "تطور الارباح"],
        2.0
    ),

    Intent.DEEP_EFFICIENCY: (
        ["efficiency", "roce", "roic", "return on capital", "asset turnover", "management efficiency", "capital allocation", "inventory turnover", "days sales outstanding"],
        ["كفاءة", "عائد على رأس المال", "دوران الاصول", "كفاءة الادارة", "توظيف الاموال", "انتاجية", "تدوير المخزون"],
        2.0
    ),

    Intent.FINANCIALS: (
        ["financials", "income statement", "balance sheet", "cash flow", "quarterly results", "annual report", "earnings report", "financial performance"],
        ["قوائم مالية", "قائمة دخل", "ميزانية", "تدفقات نقدية", "نتائج اعمال", "تقرير مالي", "الاداء المالي"],
        1.5
    ),

    Intent.FINANCIALS_ANNUAL: (
        ["annual financials", "yearly results", "annual income", "annual report", "full year"],
        ["قوائم سنوية", "نتائج سنوية", "ارباح سنوية", "تقرير سنوي", "الاداء السنوي"],
        1.8
    ),

    Intent.DIVIDENDS: (
        ["dividends", "dividend yield", "payout ratio", "ex-dividend", "cash distribution", "bonus shares", "dividend history", "when is dividend", "pays dividends"],
        ["توزيعات", "كوبون", "عائد التوزيع", "ارباح نقدية", "تاريخ التوزيع", "اسهم مجانية", "سجل التوزيعات", "بيوزع ارباح"],
        1.8
    ),

    Intent.MARKET_DIVIDEND_YIELD_LEADERS: (
        ["highest dividend yield", "best dividend stocks", "top yield", "dividend leaders"],
        ["اعلى عائد توزيعات", "افضل اسهم توزيعات", "توزيعات مرتفعة", "اسهم بتوزع ارباح"],
        2.0
    ),

    # =========================================================================
    # SECTOR C: TECHNICAL STRATEGY (75+ Intents)
    # =========================================================================

    Intent.TECHNICAL_INDICATORS: (
        ["rsi", "macd", "moving average", "sma", "ema", "bollinger bands", "stochastic", "technical analysis", "chart patterns", "support", "resistance", "breakout"],
        ["تحليل فني", "مؤشرات فنية", "متوسط متحرك", "دعم", "مقاومة", "تشبع شرائي", "تشبع بيعي", "تقاطع ايجابي", "نموذج فني"],
        2.0
    ),

    Intent.TECH_TREND: (
        ["trend", "uptrend", "downtrend", "bullish", "bearish", "momentum", "price action", "trendline"],
        ["اتجاه", "صاعد", "هابط", "ترند", "زخم", "اتجاه السعر", "مسار"],
        1.5
    ),

    Intent.TECH_LEVELS: (
        ["key levels", "pivot points", "support levels", "resistance levels", "stop loss", "entry point", "exit point"],
        ["نقاط محورية", "نقاط دعم", "نقاط مقاومة", "وقف خسارة", "نقطة دخول", "نقطة خروج", "مستويات سعرية"],
        1.5
    ),

    # =========================================================================
    # SECTOR D: CORPORATE INTELLIGENCE (50+ Intents)
    # =========================================================================

    Intent.OWNERSHIP: (
        ["ownership", "shareholders", "who owns", "major holders", "insider trading", "institutional investors", "free float", "board members", "directors"],
        ["هيكل الملكية", "مساهمين", "كبار الملاك", "تداولات المطلعين", "مجلس الادارة", "المؤسسات", "نسبة التداول الحر", "من يملك"],
        1.5
    ),

    Intent.NEWS: (
        ["latest news", "news about", "recent news", "what happened", "stock news", "announcements", "press release"],
        ["اخبار", "اخر الاخبار", "ماذا حدث", "اخبار السهم", "اعلانات", "بيان صحفي"],
        1.5
    ),

    Intent.FOLLOW_UP: (
        ["follow-up", "followup", "is that good", "tell me more", "how about", "what about", "is it good", "should i buy", "is it a buy", "worth it"],
        ["متابعة", "هل هذا جيد", "ماذا عن", "هل تنصح", "هل هو جيد", "ايه رايك"],
        1.0
    ),

    Intent.DEFINE_TERM: (
        ["define", "definition", "what is", "explain", "meaning of", "clarify", "whats a", "what is a"],
        ["عرف", "تعريف", "ما هو", "اشرح", "ما معنى", "وضح"],
        1.0
    ),
    
    Intent.CALENDAR_EARNINGS: (
        ["earnings date", "next earnings", "reporting date", "earnings calendar", "when report"],
        ["موعد النتائج", "تاريخ الارباح", "متى الاعلان", "اجندة الارباح", "اعلان النتائج"],
        1.5
    ),

    Intent.COMPANY_PROFILE: (
        ["profile", "about", "what does it do", "business model", "sector", "industry", "headquarters", "competitors", "ceo", "chairman", "management", "founded", "history", "who runs"],
        ["ملف الشركة", "نبذة", "نشاط الشركة", "قطاع", "صناعة", "منافسين", "ماذا تعمل", "الرئيس التنفيذي", "رئيس مجلس الادارة", "تاريخ التاسيس", "من يدير"],
        1.0
    ),

    # =========================================================================
    # SECTOR E: COMPARATIVE INTELLIGENCE (50+ Intents)
    # =========================================================================

    Intent.COMPARE_STOCKS: (
        ["compare", "vs", "difference", "better than", "which is better", "comparison"],
        ["مقارنة", "مقابل", "ضد", "الفرق بين", "ايهما افضل", "قارن"],
        1.5
    ),

    # =========================================================================
    # SECTOR F: DISCOVERY & SCREENER (75+ Intents)
    # =========================================================================


    Intent.SECTOR_STOCKS: (
       ["sector stocks", "banking stocks", "real estate stocks", "healthcare stocks", "industrial stocks", "companies in sector", "list banks"],
       ["اسهم قطاع", "شركات قطاع", "بنوك", "عقارات", "صناعة", "اسهم البنوك", "شركات البنوك"],
       1.5
    ),

    Intent.TOP_GAINERS: (
        ["top gainers", "best performing", "highest rising", "green stocks", "market leaders", "top movers", "top up", "best stocks", "top stocks", "best shares"],
        ["الاكثر ارتفاعا", "الرابحين", "الاسهم الخضراء", "اعلى صعود", "متصدرين", "اكبر الرابحين", "اعلى الاسهم", "افضل اسهم", "احسن اسهم", "افضل الاسهم"],
        1.5
    ),

    Intent.TOP_LOSERS: (
        ["top losers", "worst performing", "biggest fall", "red stocks", "market laggards"],
        ["الاكثر انخفاضا", "الخاسرين", "الاسهم الحمراء", "اكبر هبوط"],
        1.5
    ),
    
    Intent.SCREENER_PE: (
        ["low pe", "cheap pe", "pe under", "pe below", "cheap stocks", "undervalued stocks"],
        ["مكرر منخفض", "مضاعف ربحية اقل", "اسهم رخيصة", "ارخص اسهم", "اسهم لقطة"],
        1.2
    ),

    Intent.SCREENER_GROWTH: (
        ["high growth stocks", "fastest growing", "top growth", "best revenue growth", "growth screener"],
        ["اسهم نمو", "الاكثر نموا", "اعلى نمو مبيعات", "بحث عن نمو"],
        1.5
    ),

    Intent.SCREENER_SAFETY: (
        ["safest stocks", "low risk stocks", "strong balance sheet", "highest safety", "best rating"],
        ["اكثر امانا", "اسهم امنة", "اقل مخاطر", "قوة مالية"],
        1.5
    ),
    
    Intent.REVENUE_TREND: (
        ["revenue trend", "earnings trend", "profit trend", "sales trend", "income trend", "financial trend", "growth trend"],
        ["اتجاه الارباح", "اتجاه الايرادات", "تطور الارباح", "نمو المبيعات", "مسار الارباح"],
        2.0
    ),

    Intent.FIN_MARGINS: (
        ["profit margin", "gross margin", "net margin", "operating margin", "margins", "profitability"],
        ["هامش الربح", "هوامش الربحية", "صافي الهامش", "هامش التشغيل", "ربحية"],
        2.0
    ),

    Intent.SCREENER_INCOME: (
        ["high dividend stocks", "best yield", "income stocks", "dividend aristocrats", "passive income", "top dividend", "top dividends", "dividend stocks"],
        ["اعلى توزيعات", "اسهم عوائد", "توزيعات مرتفعة", "دخل سلبي", "افضل توزيعات", "اسهم توزيعات"],
        3.0
    ),

    # =========================================================================
    # SECTOR G: EXTENDED SCENARIOS (Enterprise Phase)
    # =========================================================================
    
    Intent.HIDDEN_GEMS: (
        ["hidden gems", "undiscovered stocks", "hidden opportunities", "find gems", "small cap value", 
         "overlooked stocks", "under the radar", "undervalued small caps", "underfollowed", "gem stocks",
         "secret stocks", "best kept secrets", "sleeper stocks", "discovery", "discover stocks"],
        ["كنوز مخفية", "فرص مخفية", "اسهم صغيرة", "اسهم غير معروفة", "اكتشافات", "جواهر السوق"],
        3.0
    ),
    
    Intent.MACRO_SCORE: (
        ["macro score", "market score", "market environment", "macro environment", "market conditions",
         "macro analysis", "economy outlook", "economic outlook", "macro outlook", "egypt economy"],
        ["تحليل كلي", "بيئة السوق", "الاقتصاد الكلي", "نظرة اقتصادية", "حالة السوق"],
        2.5
    ),
    
    Intent.MARKET_TIMING: (
        ["good time to buy", "is now good time", "should i invest now", "market timing", 
         "when to buy", "is it time to invest", "buy now or wait", "entry point", "optimal time",
         "waiting to invest", "when should i buy", "right time to buy", "is market high",
         "is market low", "should i wait", "market opportunity"],
        ["وقت مناسب للشراء", "هل الوقت مناسب", "افضل وقت للاستثمار", "متى اشتري", 
         "هل اشتري الان", "السوق غالي", "السوق رخيص", "فرصة شراء"],
        3.5
    ),
    
    Intent.INDEX_COMPOSITION: (
        ["egx 30", "egx30", "index composition", "index constituents", "index stocks", 
         "what is in egx 30", "egx 30 stocks", "main index", "benchmark index", 
         "index breakdown", "index sectors", "egx 30 sectors", "egx thirty"],
        ["ايجي اكس 30", "مؤشر البورصة", "تركيبة المؤشر", "اسهم المؤشر", 
         "مكونات المؤشر", "المؤشر الرئيسي", "الثلاثيني"],
        3.0
    ),
    
    Intent.MACRO_VIEW: (
        ["macro view", "market overview", "full market analysis", "market outlook", 
         "big picture", "macro perspective", "overall market", "comprehensive market",
         "egypt market", "egx analysis", "market summary deep"],
        ["نظرة شاملة", "تحليل شامل للسوق", "الصورة الكبيرة", "نظرة كلية", "ملخص السوق"],
        2.5
    ),

    # =========================================================================
    # SYSTEM & CHITCHAT
    # =========================================================================
    
    Intent.STOCK_STAT: (
        ["pe ratio", "price to earnings", "market cap", "eps", "beta", "volume", "average volume", "metrics", "stats", "statistics", "ratio for", "valuation metrics"],
        ["مكرر الربحية", "القيمة السوقية", "ربحية السهم", "حجم التداول", "بيانات السهم", "مؤشرات", "نسبة"],
        1.5
    ),

    Intent.HELP: (
        ["help", "options", "commands", "menu", "what can you do", "guide"],
        ["مساعدة", "اوامر", "قائمة", "ماذا تستطيع", "دليل"],
        1.0
    ),
    
    Intent.GREETING: (
        ["hello", "hi", "hey", "welcome", "good morning"],
        ["اهلا", "مرحبا", "سلام", "صباح الخير"],
        1.0
    ),
    
    Intent.GOODBYE: (
        ["bye", "goodbye", "exit", "quit", "stop"],
        ["وداعا", "باي", "خروج", "انهاء"],
        1.0
    ),

    Intent.STOCK_CHART: (
        ["chart", "graph", "price history", "show chart", "give me chart", "plot", "drawing"],
        ["شارت", "رسم بياني", "تاريخ السعر", "الشارت", "هات شارت", "اعرض شارت"],
        1.5
    ),

    Intent.IDENTITY: (
        ["who are you", "your name", "are you ai"],
        ["من انت", "اسمك", "هل انت ذكاء اصطناعي"],
        1.0
    ),
}

# Patterns for entity extraction
RANGE_PATTERNS = {
    r'\b1\s*[-]?\s*d(?:ays?)?\b': '1D',
    r'\b1\s*[-]?\s*w(?:eeks?)?\b': '1W',
    r'\b1\s*[-]?\s*m(?:onths?)?\b': '1M',
    r'\b3\s*[-]?\s*m(?:onths?)?\b': '3M',
    r'\b6\s*[-]?\s*m(?:onths?)?\b': '6M',
    r'\b1\s*[-]?\s*y(?:ears?)?\b': '1Y',
    r'\b5\s*[-]?\s*y(?:ears?)?\b': '5Y',
    r'\bmax\b': 'MAX',
    r'\ball\s*time\b': 'MAX',
    # Arabic
    r'يوم(?:\s*واحد)?': '1D',
    r'اسبوع': '1W',
    r'شهر(?:\s*واحد)?': '1M',
    r'[٣3]\s*شهور': '3M',
    r'[٦6]\s*شهور': '6M',
    r'سنه|عام': '1Y',
    r'من البدايه|تاريخ كامل': 'MAX',
}

# Threshold patterns (e.g., "PE below 10")
THRESHOLD_PATTERN = re.compile(
    r'(pe|p/e|مضاعف)\\s*(below|under|less than|<|اقل من)\\s*(\\d+(?:\\.\\d+)?)',
    re.IGNORECASE
)

# Compare patterns
# Strict pattern uses explicit comparison words
COMPARE_STRICT_PATTERN = re.compile(
    r'\b([A-Z0-9.\-\u0600-\u06FF]+)\s+(?:vs?|versus|مقابل)\s+([A-Z0-9.\-\u0600-\u06FF]+)\b',
    re.IGNORECASE
)

# Loose pattern uses "and" but will require context
COMPARE_LOOSE_PATTERN = re.compile(
    r'\b([A-Z0-9.\-\u0600-\u06FF]+)\s+(?:and|و|مع)\s+([A-Z0-9.\-\u0600-\u06FF]+)\b',
    re.IGNORECASE
)

# Fund ID pattern (4 consecutive digits like 2742, 6120) when accompanied by fund keywords
FUND_ID_PATTERN = re.compile(r'\b(\d{4})\b')

# Map common Arabic/English names to Tickers
ARABIC_TICKER_MAP = {
    # Food & Bev
    'جهينه': 'JUFO', 'جهينة': 'JUFO', 'جوهينه': 'JUFO',
    'دومتي': 'DOMT', 'دومتى': 'DOMT',
    'عبور لاند': 'OLFI',
    'ايديتا': 'EFID',
    'القاهرة للدواجن': 'POUL', 
    'الدواجن': 'POUL',

    # Fintech / Payment
    'فوري': 'FWRY', 'فورى': 'FWRY',
    'اي فاينانس': 'EFIH', 'إي فاينانس': 'EFIH', 'اي-فاينانس': 'EFIH',

    # Banks
    'التجاري الدولي': 'COMI', 'التجاري الدولى': 'COMI', 'سي اي بي': 'COMI', 'CIB': 'COMI', 'التجاري': 'COMI',
    'هيرميس': 'HRHO', 'اي اف جي': 'HRHO', 'مجموعة اي اف جي': 'HRHO',
    'كريدي اجريكول': 'CIEB',
    'قطر الوطني': 'QNBA', 'QNB': 'QNBA',
    'تنمية الصادرات': 'EBEX', 'البنك المصري': 'Ebank', # Symbol check needed (EXPA/EBEX?) - sticking to common
    'التعمير والاسكان': 'HDBK',

    # Real Estate
    'طلعت مصطفى': 'TMGH', 'طلعت مصطفي': 'TMGH', 'مجموعة طلعت': 'TMGH',
    'بالم هيلز': 'PHDC', 'بالم': 'PHDC',
    'اعمار': 'EMFD', 'اعمار مصر': 'EMFD',
    'مدينة نصر': 'MNHD', 'مدينة مصر': 'MNHD', 'mnm': 'MNHD',
    'سوديك': 'OCDI',
    'اوراسكوم للتنمية': 'ORHD', 'اوراسكوم فنادق': 'ORHD',
    'مصر الجديدة': 'HELI', 'مصر الجديده': 'HELI',

    # Industrial / Materials
    'حديد عز': 'ESRS', 'عز': 'ESRS', 'عز الدخيلة': 'ESRS',
    'السويدي': 'SWDY', 'السويدى': 'SWDY', 'اليكتريك': 'SWDY',
    'النساجون': 'ORWE', 'النساجون الشرقيون': 'ORWE',
    'أبو قير': 'ABUK', 'ابوقير': 'ABUK', 'ابو قير': 'ABUK',
    'موبكو': 'MFPC', 'مصر لانتاج الاسمدة': 'MFPC',
    'سيدي كرير': 'SKPC', 'سيدى كرير': 'SKPC', 'سيدبك': 'SKPC',
    'كيما': 'KIMA',
    'اموك': 'AMOC', 'أموك': 'AMOC',
    'الشرقية للدخان': 'EAST', 'ايسترن كومباني': 'EAST',

    # Telecom
    'المصرية للاتصالات': 'ETEL', 'مصرية للاتصالات': 'ETEL', 'وي': 'ETEL', 'we': 'ETEL',
    
    # Simple names
    'بلتون': 'BTLL',
    'القلعة': 'CCAP', 'القلعه': 'CCAP',
    'المصرية للمنتجعات': 'EGTS', 'منتجعات': 'EGTS',
}


class IntentRouter:
    """Routes user messages to intents using keyword matching."""
    
    def __init__(self):
        self.confidence_threshold = 0.3
        try:
            from .nlu.engine import NLUEngine
            self.nlu = NLUEngine()
        except:
            self.nlu = None
    
    def route(self, message: str, context: Optional[dict] = None) -> IntentResult:
        """
        Classify the intent of a message.
        
        Args:
            message: User input
            context: Conversation context (last_symbol, last_intent, etc.)
        
        Returns:
            IntentResult with intent, confidence, entities
        """
        # Normalize input
        normalized = normalize_text(message)
        text = normalized.normalized
        text_lower = text.lower()
        merged_text = (normalized.normalized + " " + text).lower()
        
        # Extract entities first (needed for deterministic overrides)
        entities = self._extract_entities(text, normalized.language)

        # ---------------------------------------------------------
        # DETERMINISTIC OVERRIDES (The "Forever Fix")
        # ---------------------------------------------------------
        # These keywords are so specific they should bypass unsure NLU
        
        # 1. Technical Analysis Overrides
        if any(w in merged_text for w in ["technicals", "technical analysis", "support", "resistance", "rsi", "macd", "pivot"]):
             # Check if we have a symbol context or entity
             has_symbol = entities.get('symbol') or (context and context.get('last_symbol'))
             
             if not has_symbol:
                 # HEURISTIC FALLBACK: Check for 3-5 letter uppercase word (potential ticker)
                 # This allows "Show COMI technicals" to route correctly even if entity extraction skipped it.
                 # Use case-insensitive search for flexibility
                 match = re.search(r'\b[A-Z0-9]{3,5}\b', text, re.IGNORECASE) 
                 if match:
                     has_symbol = True
                     # Inject into entities so ChatService sees it
                     if not entities.get('symbol'):
                         entities['symbol'] = match.group(0).upper()
            
             if has_symbol:
                 return IntentResult(
                    intent=Intent.TECHNICAL_INDICATORS,
                    confidence=1.0, # Absolute certainty
                    entities=entities,
                    missing_fields=[]
                )

        # 1. Arabic Name Pattern Override (The "Forever Fix" for Arabic)
        # Prevents "مصرية للاتصالات" from going to SECTOR_STOCKS or UNKNOWN
        # 1. Arabic Name Pattern Override (The "Forever Fix" for Arabic)
        # Prevents "مصرية للاتصالات" from going to SECTOR_STOCKS or UNKNOWN
        ARABIC_STOCK_PATTERNS = [
            # Normalized forms (ة -> ه, ى -> ي)
            'مصريه للاتصالات', 'المصريه للاتصالات', 'السويدي', 'التجاري', 
            'طلعت مصطفي', 'حديد عز', 'بالم هيلز', 'هيرميس', 'فوري', 
            'جهينه', 'دومتي', 'اوراسكوم', 'سيدي كرير', 'ابوقير', 'موبكو',
            'اي فاينانس', 'إي فاينانس', 'بلتون', 'القلعه', 'مدينه نصر',
            # Original forms (just in case)
            'مصرية للاتصالات', 'المصرية للاتصالات', 'التجارى', 'طلعت مصطفى',
            'فورى', 'جهينة', 'القلعة', 'مدينة نصر'
        ]
        
        # If text contains any of these patterns AND user is asking for price (or implied price)
        if any(p in text for p in ARABIC_STOCK_PATTERNS):
             # Check if it's explicitly NOT price (e.g. news, financials)
             if not any(k in text for k in ["اخبار", "قوائم", "ارباح", "توزيعات", "تحليل", "news", "financials"]):
                 return IntentResult(
                    intent=Intent.STOCK_PRICE,
                    confidence=0.95,
                    entities=entities,
                    missing_fields=[]
                )

        # 2. Price Overrides (The "Forever Fix" for Price)
        if any(w in merged_text for w in ["price", "quote", "stock price", "current price", "s price", "trading at"]):
             return IntentResult(
                intent=Intent.STOCK_PRICE,
                confidence=0.9,
                entities=entities,
                missing_fields=[]
            )

        # 2a. Market Cap Override (The "Forever Fix" for Valuation)
        if "market cap" in merged_text or "valuation of" in merged_text or "company size" in merged_text:
             return IntentResult(
                 intent=Intent.STOCK_MARKET_CAP, 
                 confidence=1.0, 
                 entities=entities, 
                 missing_fields=[]
             )
        
        # 2b. Financials Override
        if "annual financials" in merged_text or "annual report" in merged_text:
             entities['statement_type'] = 'income'
             return IntentResult(
                 intent=Intent.FINANCIALS_ANNUAL, # Force Annual
                 confidence=1.0, 
                 entities=entities, 
                 missing_fields=[]
             )
        
        if "financials" in merged_text or "income statement" in merged_text or "balance sheet" in merged_text:
             # Basic financials override if not caught by annual
             return IntentResult(
                 intent=Intent.FINANCIALS,
                 confidence=0.9,
                 entities=entities,
                 missing_fields=[]
             )
        #      return IntentResult(
        #         intent=Intent.FUND_NAV,
        #         confidence=1.0,
        #         entities=entities, 
        #         missing_fields=[]
        #     )

        # 3. Predefined Question Overrides (The "Forever Fix" for Chips)
        # Exact string matching for common chips to guarantee 100% routing accuracy
        if "top gainers" in merged_text or "best performing" in merged_text:
             return IntentResult(intent=Intent.TOP_GAINERS, confidence=1.0, entities=entities, missing_fields=[])
             
        if "top losers" in merged_text or "worst performing" in merged_text:
             return IntentResult(intent=Intent.TOP_LOSERS, confidence=1.0, entities=entities, missing_fields=[])
             
        if "market status" in merged_text or "is market open" in merged_text:
             return IntentResult(intent=Intent.MARKET_STATUS, confidence=1.0, entities=entities, missing_fields=[])

        if "dividend leaders" in merged_text or "best dividends" in merged_text or "highest dividend" in merged_text:
             return IntentResult(intent=Intent.MARKET_DIVIDEND_YIELD_LEADERS, confidence=1.0, entities=entities, missing_fields=[])

        if "most active" in merged_text or "highest volume" in merged_text or "top volume" in merged_text:
             return IntentResult(intent=Intent.MARKET_MOST_ACTIVE, confidence=1.0, entities=entities, missing_fields=[])
             
        if "banking sector" in merged_text or "banks in" in merged_text:
             entities['sector'] = 'Banks'  # Use 'Banks' so handler can search by name_en
             return IntentResult(intent=Intent.SECTOR_STOCKS, confidence=1.0, entities=entities, missing_fields=[])
        
        # Generic Sector Override
        # If we successfully extracted a 'sector' entity in _extract_entities, route to SECTOR_STOCKS
        # CRITICAL FIX: Only if NO symbol is present. If symbol exists (e.g. "Analyze Bank CIB"), 
        # we want the specific stock intent, not the sector list.
        if entities.get('sector') and not entities.get('symbol'):
             # Ensure it's not a false positive for a stock symbol (e.g. "Food") if that was a ticker
             # But sector map is robust.
             return IntentResult(intent=Intent.SECTOR_STOCKS, confidence=0.95, entities=entities, missing_fields=[])

        # 4. Financial Health Overrides
        if "financial health" in merged_text or "health" in merged_text:
             return IntentResult(
                intent=Intent.FINANCIAL_HEALTH,
                confidence=1.0,
                entities=entities,
                missing_fields=[]
            )

        # 5. Ownership/Shareholders Override (The "Forever Fix" for Who Owns)
        if any(w in merged_text for w in ["who owns", "shareholders", "ownership", "major holders", "owners of"]):
             return IntentResult(
                 intent=Intent.OWNERSHIP,
                 confidence=1.0,
                 entities=entities,
                 missing_fields=[]
             )

        # 6. Analyze/Snapshot Pattern (The "Chief Expert Fix")
        # Explicitly routes "Analyze [Symbol]" to STOCK_SNAPSHOT
        if any(w in merged_text for w in ["analyze", "analysis", "حلل", "deep dive", "comprehensive review"]):
             # If we have a symbol, it's definitely a snapshot request
             if entities.get('symbol') or (context and context.get('last_symbol')):
                 return IntentResult(
                    intent=Intent.STOCK_SNAPSHOT,
                    confidence=1.0,
                    entities=entities,
                    missing_fields=[]
                )
            
        # 7. Buy/Sell Advice Override (The "Follow-up Fix")
        # Explicitly routes "Should I buy [SYMBOL]" to STOCK_SNAPSHOT
        if any(p in merged_text for p in ["should i buy", "is it a buy", "worth buying", "good to buy", "buy or sell"]):
             # If we have a symbol, treat as snapshot to get full data
             if entities.get('symbol') or (context and context.get('last_symbol')):
                  return IntentResult(
                      intent=Intent.STOCK_SNAPSHOT,
                      confidence=1.0,
                      entities=entities,
                      missing_fields=[]
                  )

        # 8. Chart Overrides (The "Visual Fix")
        # Explicitly routes "Chart [Symbol]" to STOCK_CHART with 1.0 confidence
        if any(w in merged_text for w in ["chart", "graph", "price history", "شارت", "رسم بياني"]):
             if entities.get('symbol') or (context and context.get('last_symbol')):
                  return IntentResult(
                     intent=Intent.STOCK_CHART,
                     confidence=1.0,
                     entities=entities,
                     missing_fields=[]
                 )
            
        # ---------------------------------------------------------
        
        # Check for comparison (special handling)
        if entities.get('compare_symbols'):
            return IntentResult(
                intent=Intent.COMPARE_STOCKS,
                confidence=0.95,
                entities=entities,
                missing_fields=[]
            )
        
        # Score each intent
        scores: Dict[Intent, float] = {}
        
        for intent, (en_keywords, ar_keywords, weight) in INTENT_KEYWORDS.items():
            score = 0.0
            
            # English keyword matching
            for kw in en_keywords:
                if kw in text_lower:
                    score += weight * (1.0 if len(kw) > 5 else 0.7)
            
            # Arabic keyword matching
            for kw in ar_keywords:
                if kw in text:
                    score += weight * (1.0 if len(kw) > 3 else 0.7)
            
            scores[intent] = score
        
        # Find best intent
        best_intent = max(scores, key=scores.get)
        best_score = scores[best_intent]
        
        # Normalize score to 0-1 range
        max_possible = 3.0  # Adjust based on typical max scores
        confidence = min(best_score / max_possible, 1.0)

        # ---------------------------------------------------------
        # HYBRID LOGIC: Semantic Vector Search
        # ---------------------------------------------------------
        # If keyword confidence is not extremely high, try NLU
        if self.nlu and self.nlu.enabled and confidence < 0.85:
            nlu_intent_str, nlu_score = self.nlu.predict_intent(text)
            # Adjusted threshold to 0.55 to catch short/ambiguous queries like "Chart SWDY"
            if nlu_intent_str and nlu_score > confidence and nlu_score > 0.55:
                # Map string to Intent Enum
                try:
                    nlu_intent = Intent(nlu_intent_str)
                    best_intent = nlu_intent
                    confidence = float(nlu_score)
                    # Boost confidence strictly but cap at 0.95 to allow for overrides
                    # Layer 3: Robust Fallback - Don't blindly trust NLU if score is marginal
                    if nlu_score < 0.60:
                        confidence = nlu_score
                    else:
                        confidence = min(nlu_score * 1.1, 0.99)
                except ValueError:
                    pass  # NLU predicted an intent not in Enum (shouldn't happen)
        # ---------------------------------------------------------
        
        # Check if we need clarification
        missing_fields = []
        if best_intent in [Intent.STOCK_PRICE, Intent.STOCK_CHART, Intent.STOCK_STAT, 
                           Intent.FINANCIALS, Intent.DIVIDENDS, Intent.COMPANY_PROFILE,
                           Intent.STOCK_SNAPSHOT]:
            if not entities.get('symbol'):
                # Check context for last symbol
                if context and context.get('last_symbol'):
                    entities['symbol'] = context['last_symbol']
                else:
                    missing_fields.append('symbol')
        
        # Handle follow-up queries
        if confidence < self.confidence_threshold and context:
            # Might be a follow-up
            # CRITICAL FIX: Only classify as follow-up if NO new symbol is present.
            # "What about COMI?" -> Symbol 'COMI' found -> NOT a follow-up (Start new context)
            # "What about it?" -> No symbol -> Follow-up (Use context)
            
            # Check for potential ticker in text (Safety Net)
            has_potential_ticker = False
            if re.search(r'\b[A-Z0-9]{3,5}\b', text, re.IGNORECASE):
                has_potential_ticker = True
                
            if context.get('last_symbol') and not entities.get('symbol') and not has_potential_ticker:
                entities['symbol'] = context['last_symbol']
                best_intent = Intent.FOLLOW_UP
                confidence = 0.5
        
        return IntentResult(
            intent=best_intent,
            confidence=round(confidence, 2),
            entities=entities,
            missing_fields=missing_fields
        )
    
    def _extract_entities(self, text: str, language: str) -> Dict:
        """Extract entities from text using patterns."""
        # ---------------------------------------------------------
        # ARABIC NAME RESOLUTION (The "Juhayna Fix")
        # ---------------------------------------------------------
        # Pre-process Arabic names to their English tickers so regexes catch them
        # Use regex to handle boundaries better if possible, but simple replace works for now
        # Note: We iterate to perform replacement in the local 'text' variable
        for name, ticker in ARABIC_TICKER_MAP.items():
            if name in text:
                text = text.replace(name, ticker)
        
        entities = {}
        
        # Extract range
        for pattern, range_val in RANGE_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                entities['range'] = range_val
                break
        
        # Default range if chart/trend intent detected
        if 'range' not in entities:
            if any(kw in text.lower() for kw in ['chart', 'trend', 'شارت', 'اتجاه']):
                entities['range'] = '1M'  # Default to 1 month
        
        # Extract threshold
        threshold_match = THRESHOLD_PATTERN.search(text)
        if threshold_match:
            entities['metric'] = 'pe_ratio'
            entities['threshold'] = float(threshold_match.group(3))
            entities['condition'] = 'below'
        
        # Extract compare symbols
        compare_match = COMPARE_STRICT_PATTERN.search(text)
        if compare_match:
            entities['compare_symbols'] = [
                compare_match.group(1).upper(),
                compare_match.group(2).upper()
            ]
        elif any(w in text.lower() for w in ['compare', 'comparison', 'قارن', 'مقارنة', 'مقارنه']):
            compare_match = COMPARE_LOOSE_PATTERN.search(text)
            if compare_match:
                entities['compare_symbols'] = [
                    compare_match.group(1).upper(),
                    compare_match.group(2).upper()
                ]
        
        # Extract statement type
        if any(kw in text.lower() for kw in ['income', 'revenue', 'الدخل', 'الايرادات']):
            entities['statement_type'] = 'income'
        elif any(kw in text.lower() for kw in ['cash flow', 'التدفق', 'النقديه']):
            entities['statement_type'] = 'cashflow'
        
        # Extract fund_id
        # Look for 4 digits if "fund" context exists
        fund_keywords = ['fund', 'investment', 'صندوق', 'استثمار']
        is_fund_context = any(kw in text.lower() for kw in fund_keywords)
        
        fund_id_match = FUND_ID_PATTERN.search(text)
        if fund_id_match and is_fund_context:
            entities['fund_id'] = fund_id_match.group(1)
            
        # Extract Definition Term
        # Regex to capture text after "what is", "define", etc.
        define_pattern = re.compile(r'(?:what is|define|explain|meaning of|definition of|ما هو|عرف|ما معنى)\s+([a-zA-Z0-9\/\s\-]+)', re.IGNORECASE)
        define_match = define_pattern.search(text)
        if define_match:
            term = define_match.group(1).strip()
            # Stop at punctuation or "Please"
            term = re.split(r'[?.,]', term)[0].strip()
            entities['term'] = term
        
        # Also default to first 4-digit number found if we suspect fund nav
        # (This is loose, but helps with "2742 price")
        if not entities.get('fund_id') and fund_id_match:
             # Only if user specifically asks about fund price/nav/etc or just the number + price
             nav_keywords = ['price', 'nav', 'value', 'سعر', 'قيمه']
             if any(kw in text.lower() for kw in nav_keywords) and is_fund_context:
                 entities['fund_id'] = fund_id_match.group(1)
        
        # Extract sector - map keywords to actual database sector_name values
        sector_map = {
            # Banking
            'bank': 'Banks', 'banks': 'Banks', 'banking': 'Banks', 'بنوك': 'Banks',
            # Basic Resources
            # Basic Resources (Chemicals, Petrochemicals, Fertilizers built-in)
            'basic resources': 'Basic Resources', 'resources': 'Basic Resources', 'موارد اساسية': 'Basic Resources',
            'chemicals': 'Basic Resources', 'chemical': 'Basic Resources', 'petrochemicals': 'Basic Resources', 'fertilizers': 'Basic Resources', 
            'كيماويات': 'Basic Resources', 'بتروكيماويات': 'Basic Resources', 'سماد': 'Basic Resources', 'الاسمدة': 'Basic Resources', 'اسمدة': 'Basic Resources',
            # Building Materials
            'building': 'Building Materials', 'construction material': 'Building Materials', 'مواد بناء': 'Building Materials',
            # Construction
            'contracting': 'Contracting and Construction Engineering', 'construction': 'Contracting and Construction Engineering', 'مقاولات': 'Contracting and Construction Engineering',
            # Education
            'education': 'Education Services', 'schools': 'Education Services', 'تعليم': 'Education Services',
            # Financial Services (Non-Bank)
            'financial': 'Financial Services', 'financial services': 'Financial Services', 'services financial': 'Financial Services', 'خدمات مالية': 'Financial Services',
            # Food & Bev
            'food': 'Food, Beverages and Tobacco', 'beverage': 'Food, Beverages and Tobacco', 'tobacco': 'Food, Beverages and Tobacco', 'اغذية': 'Food, Beverages and Tobacco', 'مشروبات': 'Food, Beverages and Tobacco',
            # Healthcare
            'healthcare': 'Health Care and Pharmaceuticals', 'health': 'Health Care and Pharmaceuticals', 'pharma': 'Health Care and Pharmaceuticals', 'pharmaceuticals': 'Health Care and Pharmaceuticals', 'رعاية صحية': 'Health Care and Pharmaceuticals', 'ادوية': 'Health Care and Pharmaceuticals',
            # Industrial Goods
            'industrial goods': 'Industrial Goods , Services and Automobiles', 'automobiles': 'Industrial Goods , Services and Automobiles', 'auto': 'Industrial Goods , Services and Automobiles', 'cars': 'Industrial Goods , Services and Automobiles', 'سيارات': 'Industrial Goods , Services and Automobiles',
            # IT & Media
            'it': 'IT , Media and Communication Services', 'media': 'IT , Media and Communication Services', 'communication': 'IT , Media and Communication Services', 'telecom': 'IT , Media and Communication Services', 'technology': 'IT , Media and Communication Services', 'تكنولوجيا': 'IT , Media and Communication Services', 'اعلام': 'IT , Media and Communication Services', 'اتصالات': 'IT , Media and Communication Services',
            # Paper
            'paper': 'Paper and Packaging', 'packaging': 'Paper and Packaging', 'ورق': 'Paper and Packaging',
            # Real Estate
            'real estate': 'Real Estate', 'estate': 'Real Estate', 'property': 'Real Estate', 'عقارات': 'Real Estate',
            # Shipping
            'shipping': 'Shipping and Transportation Services', 'transport': 'Shipping and Transportation Services', 'transportation': 'Shipping and Transportation Services', 'nile': 'Shipping and Transportation Services', 'شحن': 'Shipping and Transportation Services', 'نقل': 'Shipping and Transportation Services',
            # Textile
            'textile': 'Textile and Durables', 'durables': 'Textile and Durables', 'clothing': 'Textile and Durables', 'نسيج': 'Textile and Durables',
            # Trade
            'trade': 'Trade and Distributors', 'distributors': 'Trade and Distributors', 'تجارة': 'Trade and Distributors', 'توزيع': 'Trade and Distributors',
            # Travel
            'travel': 'Travel and Leisure', 'leisure': 'Travel and Leisure', 'tourism': 'Travel and Leisure', 'سياحة': 'Travel and Leisure', 'ترفيه': 'Travel and Leisure',
            # Utilities
            'utilities': 'Utilities', 'utility': 'Utilities', 'مرافق': 'Utilities',
            # Energy
            'energy': 'Energy and Support Services', 'oil': 'Energy and Support Services', 'gas': 'Energy and Support Services', 'طاقة': 'Energy and Support Services',
        }
        for keyword, sector in sector_map.items():
            if keyword in text.lower():
                entities['sector'] = sector
                break
        
        # Extract Deep Screener Metric
        text_lower = text.lower()
        
        # ROE / ROA
        if "roe" in text_lower or "return on equity" in text_lower or "عائد على حقوق" in text_lower:
            entities['metric'] = 'roe'
            entities['direction'] = 'desc'
        elif "roa" in text_lower or "return on assets" in text_lower:
            entities['metric'] = 'roa'
            entities['direction'] = 'desc'
            
        # Margins
        elif "gross margin" in text_lower or "هامش ربح" in text_lower:
            entities['metric'] = 'gross_margin'
            entities['direction'] = 'desc'
        elif "operating margin" in text_lower or "هامش تشغيل" in text_lower:
            entities['metric'] = 'operating_margin'
            entities['direction'] = 'desc'
        elif "profit margin" in text_lower or "net margin" in text_lower:
            entities['metric'] = 'profit_margin'
            entities['direction'] = 'desc'
            
        # Valuation
        elif "ev/ebitda" in text_lower or "enterprise value" in text_lower:
            entities['metric'] = 'ev_ebitda'
            # usually low is better for Valuation, but users might ask "highest"... 
            # Default to ASC (cheapest) if "undervalued" or "lowest", DESC if "highest"
            if "high" in text_lower or "most" in text_lower:
                entities['direction'] = 'desc'
            else:
                entities['direction'] = 'asc'
        elif "lowest pe" in text_lower or "cheap" in text_lower:
             # Already handled by SCREENER_PE? Maybe overlap.
             pass
             
        # Debt
        elif "debt" in text_lower or "leverage" in text_lower or "ديون" in text_lower:
            entities['metric'] = 'debt_equity' # or total_debt
            if "high" in text_lower or "most" in text_lower:
                entities['direction'] = 'desc'
            else:
                entities['direction'] = 'asc' # usually lowest debt is good
                
        # Technicals
        elif "rsi" in text_lower:
            entities['metric'] = 'rsi_14'
            entities['direction'] = 'desc'
        elif "beta" in text_lower:
            entities['metric'] = 'beta_5y'
            entities['direction'] = 'desc'

        # Financial Health / Advanced
        elif "z-score" in text_lower or "altman" in text_lower or "bankrupt" in text_lower or "safe" in text_lower:
            entities['metric'] = 'altman_z_score'
            entities['direction'] = 'desc' # Higher is safer
        elif "f-score" in text_lower or "piotroski" in text_lower or "strong financial" in text_lower:
            entities['metric'] = 'piotroski_f_score'
        elif "f-score" in text_lower or "piotroski" in text_lower or "strong financial" in text_lower:
            entities['metric'] = 'piotroski_f_score'
            entities['direction'] = 'desc' # 9 is best
            
        # Efficiency / Yields (Phase 6)
        elif "roce" in text_lower or "capital employed" in text_lower:
            entities['metric'] = 'roce'
            entities['direction'] = 'desc'
        elif "asset turnover" in text_lower or "turnover" in text_lower:
            entities['metric'] = 'asset_turnover'
            entities['direction'] = 'desc'
        elif "earnings yield" in text_lower:
            entities['metric'] = 'earnings_yield'
            entities['direction'] = 'desc'
        elif "fcf yield" in text_lower or "cash flow yield" in text_lower:
            entities['metric'] = 'fcf_yield'
            entities['direction'] = 'desc'

        # ---------------------------------------------------------
        # SYMBOL EXTRACTION (The "Analyze Fix")
        # ---------------------------------------------------------
        # 1. Explicit syntax: "Analyze [SYMBOL]" or "Chart for [SYMBOL]"
        # Matches: "Analyze GGRN", "Check TMGH", "GGRN Analysis"
        symbol_context_pattern = re.compile(
            r'(?:analyze|analysis|check|stock|snapshot|chart|price|about|for|حلل|فحص|سهم|سعر|عن)\s+([a-zA-Z]{3,6})\b',
            re.IGNORECASE
        )
        symbol_match = symbol_context_pattern.search(text)
        if symbol_match:
            candidate = symbol_match.group(1).upper()
            # Filter common stopwords that might be caught (e.g "Check FOR")
            if candidate not in ["THE", "FOR", "THIS", "THAT", "STOCK", "PRICE", "TODAY", "NOW", "HERE", "CHART", "GRAPH", "SHOW", "FIND", "GIVE", "TELL", "BEST", "MOST", "WITH", "FROM", "JUST", "INTO", "DONT", "YOUR", "HAVE", "SOME", "MORE", "LESS", "THEN", "THAN", "ALSO", "ONLY", "VERY", "EVEN", "OVER", "AWAY", "BACK", "SCORE"]:
                entities['symbol'] = candidate

        # 2. Standalone Ticker Pattern (if not found above)
        # Matches strictly 3-5 uppercase letters if input is short
        if 'symbol' not in entities:
             # If the text is literally just a ticker like "GGRN" or "COMI"
             clean_text = text.strip()
             if re.match(r'^[a-zA-Z]{3,5}$', clean_text):
                 entities['symbol'] = clean_text.upper()
             
             # Or if it's "GGRN price" -> GGRN is the first word
             split_text = clean_text.split()
             for word in split_text:
                 # Check against a known "safe" list or strict regex
                 # (Common EGX tickers are 4 chars usually)
                  if re.match(r'^[A-Z]{3,5}$', word.upper()) and word.upper() not in ["THE", "FOR", "AND", "EST", "NOW", "BUY", "SELL", "HOW", "WHAT", "WHEN", "WHY", "WHO", "YES", "NOT", "PRICE", "CHART", "GRAPH", "SHOW", "FIND", "GIVE", "TELL", "BEST", "MOST", "THAT", "THIS", "WITH", "FROM", "JUST", "INTO", "DONT", "YOUR", "HAVE", "SOME", "MORE", "LESS", "THEN", "THAN", "ALSO", "ONLY", "VERY", "EVEN", "OVER", "AWAY", "BACK", "SCORE"]:
                      entities['symbol'] = word.upper()
                      break

        return entities


def create_router() -> IntentRouter:
    """Factory function to create an intent router."""
    return IntentRouter()
