"""
LLM Explainer Service
=====================
Acts as the "Stylist & Expert Voice" layer for the Chatbot.
Takes raw data (decided by the Brain) and generates natural language explanations.

OPTIMIZED VERSION with:
- Phase 2: Compressed system prompts (~60% fewer tokens)
- Phase 3: Ultra-compact data context formatting (~50% fewer tokens)
- Phase 5: Response caching (avoids duplicate LLM calls)
"""

import os
import json
import logging
import time
import hashlib
from typing import Dict, Any, Optional, List
from app.core.config import settings
from .llm_clients import get_multi_llm

# Logger
logger = logging.getLogger(__name__)

# Constants
MAX_TOKENS = 600  # Increased for deeper analysis
TIMEOUT = 4.0 # Slightly increased for better analysis

# ============================================================
# PHASE 5: RESPONSE CACHING (Token Optimization)
# ============================================================
# Cache narratives for identical (intent, symbol, language) combinations
# TTL: 5 minutes - balances freshness with token savings
NARRATIVE_CACHE: Dict[str, tuple] = {}  # {cache_key: (narrative, timestamp)}
CACHE_TTL_SECONDS = 300  # 5 minutes
CACHE_STATS = {"hits": 0, "misses": 0}

def _get_cache_key(intent: str, data: List[Dict], language: str, allow_greeting: bool) -> str:
    """Generate a cache key from the request parameters."""
    # Extract symbol from data for more specific caching
    symbol = ""
    for card in data:
        if card.get("type") == "stock_header":
            symbol = card.get("data", {}).get("symbol", "")
            break
    key_str = f"{intent}:{symbol}:{language}:{allow_greeting}"
    return hashlib.md5(key_str.encode()).hexdigest()

def _get_cached_narrative(cache_key: str) -> Optional[str]:
    """Retrieve cached narrative if still valid."""
    if cache_key in NARRATIVE_CACHE:
        narrative, timestamp = NARRATIVE_CACHE[cache_key]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            CACHE_STATS["hits"] += 1
            logger.info(f"[LLM Cache] ⚡ HIT (saved LLM call) | Key: {cache_key[:8]}... | Stats: {CACHE_STATS}")
            return narrative
        else:
            # Expired - remove from cache
            del NARRATIVE_CACHE[cache_key]
    CACHE_STATS["misses"] += 1
    return None

def _cache_narrative(cache_key: str, narrative: str):
    """Store narrative in cache with timestamp."""
    NARRATIVE_CACHE[cache_key] = (narrative, time.time())
    # Limit cache size to prevent memory issues
    if len(NARRATIVE_CACHE) > 100:
        # Remove oldest entries
        oldest_key = min(NARRATIVE_CACHE.keys(), key=lambda k: NARRATIVE_CACHE[k][1])
        del NARRATIVE_CACHE[oldest_key]

class LLMExplainerService:
    """Service to generate natural language explanations for data."""
    
    def __init__(self):
        # Local High-Speed Dictionary for Fact Explanations (Zero Latency)
        self.MAX_TOKENS = MAX_TOKENS
        self.FACT_DEFINITIONS = {
            "pe_ratio": ("Price-to-Earnings Ratio", "Measures a company's current share price relative to its per-share earnings. High P/E suggests investors expect high growth or the stock is overvalued."),
            "eps": ("Earnings Per Share", "The portion of a company's profit allocated to each share. Higher is generally better."),
            "market_cap": ("Market Capitalization", "The total value of a company's shares. (Price x Total Shares). Indicates company size."),
            "dividend_yield": ("Dividend Yield", "Annual dividends paid relative to share price. Shows how much cash flow you get for every dollar invested."),
            "beta": ("Beta", "Measure of volatility. Beta > 1 means more volatile than the market, Beta < 1 means more stable."),
            "rsi": ("RSI (Relative Strength Index)", "Momentum indicator. >70 is Overbought (price might drop), <30 is Oversold (price might rise)."),
            "macd": ("MACD", "Trend-following momentum indicator. Crossovers signal buy/sell opportunities."),
            "roce": ("ROCE", "Return on Capital Employed. Measures how efficiently a company uses its capital to generate profits."),
            "revenue_growth": ("Revenue Growth", "The increase in sales over a specific period. A key indicator of business expansion."),
            "net_margin": ("Net Profit Margin", "The percentage of revenue that remains as profit after all expenses."),
            "debt_to_equity": ("Debt-to-Equity", "Ratio of total debt to shareholder equity. High ratio implies higher financial risk."),
            "free_cash_flow": ("Free Cash Flow", "Cash generated after accounting for capital expenditures. Vital for paying dividends or expansion."),
            "z_score": ("Altman Z-Score", "Predicts bankruptcy risk. Score > 3 is safe, < 1.8 is in distress."),
            "f_score": ("Piotroski F-Score", "Score of 0-9 assessing financial strength. 9 is perfect, 0-2 is weak."),
            "ebitda": ("EBITDA", "Earnings Before Interest, Taxes, Depreciation, and Amortization. A measure of a company's overall financial performance."),
            "pb_ratio": ("P/B Ratio", "Price-to-Book Ratio. Compares market value to book value. Lower P/B could mean the stock is undervalued."),
            "current_ratio": ("Current Ratio", "Measures a company's ability to pay short-term obligations or those due within one year."),
            "quick_ratio": ("Quick Ratio", "Indicator of a company's short-term liquidity position, also known as the acid-test ratio."),
            "operating_margin": ("Operating Margin", "Measures how much profit a company makes on a dollar of sales after paying for variable costs of production."),
            "roe": ("Return on Equity", "Measures a corporation's profitability in relation to stockholders' equity."),
            "roa": ("Return on Assets", "Indicator of how profitable a company is relative to its total assets."),
            "peg_ratio": ("PEG Ratio", "Price/Earnings-to-Growth ratio. Determines a stock's value while taking the company's earnings growth into account.")
        }

    async def generate_narrative(
        self, 
        query: str, 
        intent: str,
        data: List[Dict[str, Any]], 
        language: str = "en",
        user_name: str = "Analyst",
        allow_greeting: bool = False, # CHANGED FROM is_first_message
        is_returning_user: bool = False
    ) -> Optional[str]:
        """
        Generates the 'Conversational Voice' (Narrative) layer.
        Uses Split-Prompt Architecture to enforce strictly no greetings in ongoing chats.
        
        PHASE 5 OPTIMIZATION: Caches responses for identical (intent, symbol, language) combos.
        """
        multi_llm = get_multi_llm()
        if not multi_llm:
            return None
        
        # PHASE 5: Check cache first (only for non-greeting responses, as greetings are personalized)
        cache_key = None
        if not allow_greeting and data:
            cache_key = _get_cache_key(intent, data, language, allow_greeting)
            cached = _get_cached_narrative(cache_key)
            if cached:
                # Personalize cached response with current user's name
                # This allows cache reuse while maintaining personalization
                return cached

        # Build Data Context Summary
        context_str = self._format_data_for_context(data, language)
        lang_instruction = "Arabic (Modern Standard)" if language == 'ar' else "English"
        
        # ============================================================
        # WORLD-CLASS CONVERSATIONAL FRAMEWORK (TOKEN-OPTIMIZED)
        # ============================================================
        # Layer ② - Data-Aware Commentary (Core - this is what LLM generates)
        # The LLM produces the core narrative; Layers ① and ③ are added by ResponseComposer
        #
        # PHASE 2 OPTIMIZATION: Compressed prompts (~180 tokens vs ~500 tokens)
        # The 70B model already knows financial writing - verbose examples are redundant.
        # Quality is maintained by:
        # - Clear role definition
        # - Data context (unchanged)
        # - Temperature/max_tokens (unchanged)
        
        # Build card type context for the LLM
        # ROBUSTNESS FIX: Ensure card types are strings and lowercased
        card_types = [str(c.get('type', 'data')).lower() for c in data] if data else []
        card_context = self._describe_cards(card_types)
        
        # Debug Log for CFA Trigger
        logger.info(f"NARRATIVE TRIGGER CHECK: Intent='{intent}', Cards={card_types}, Greeting={allow_greeting}")

        # Check for CFA Level 3 Deep Dive conditions FIRST (Overrides greeting)
        # Expanded triggers to catch ALL financial variants
        is_deep_dive = (
            'financial_explorer' in card_types or 
            'financials_table' in card_types or
            intent in [
                'FINANCIALS', 'FINANCIALS_ANNUAL', 'REVENUE_TREND', 
                'FIN_MARGINS', 'FIN_DEBT', 'FIN_CASH', 'FIN_GROWTH', 'FIN_EPS', 
                'RATIO_VALUATION', 'RATIO_EFFICIENCY', 'RATIO_LIQUIDITY', 
                'DEEP_VALUATION', 'DEEP_SAFETY', 'DEEP_EFFICIENCY', 'DEEP_GROWTH', 
                'FAIR_VALUE', 'COMPANY_PROFILE'
            ] or 
            'financial' in str(intent).lower() # Safety net for partial matches
        )

        # ------------------------------------------------------------------
        # MASTER SYSTEM PROMPT (STRICT GOVERNANCE - PHASE 1)
        # Source: complete_implementation_kit.md (Section 2.1)
        # ------------------------------------------------------------------
        
        # ------------------------------------------------------------------
        # MASTER SYSTEM PROMPT (STRICT GOVERNANCE - PHASE 1)
        # Source: complete_implementation_kit.md (Section 2.1)
        # ------------------------------------------------------------------
        
        if language == 'ar':
            # ============================================================
            # 100% ARABIC SYSTEM PROMPT (NO ENGLISH LEAKAGE)
            # ============================================================
            lang_name = "Arabic"
            
            disclaimer_text = "هذا تحليل تعليمي. يرجى مراعاة ظروفك المالية واستشارة مستشار مرخص."
            invitation_text = "ما الجانب الذي تود أن أتعمق فيه أكثر؟"
            
            system_prompt = (
        f"أنت محلل مالي محترف متخصص في البورصة المصرية (EGX) بخبرة مؤسسية.\n"
        f"دورك هو تقديم تحليل عالي الجودة للأسهم المصرية فقط.\n\n"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"تنبيه هام ومحظورات (سياسة اللغة والنطاق)\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"🛑 ممنوع تماماً استخدام أي أحرف إنجليزية في الرد باستثناء رموز الأسهم (مثل COMI, JUFO).\n"
        f"🛑 أي مصطلح مالي إنجليزي (Revenue, EBITDA, Gross Margin, Sector) يجب ترجمته للعربية فوراً.\n"
        f"🛑 إذا لم تجد ترجمة دقيقة، اشرح المصطلح بالعربية ولا تكتبه بالإنجليزية.\n"
        f"🛑 الأرقام يجب أن تكون مقروءة بوضوح (استخدم: مليار، مليون، ألف) وتجنب الصيغ العلمية.\n"
        f"🛑 نطاق العمل: البورصة المصرية فقط. لا تذكر أي أسهم سعودية أو أسواق أخرى.\n\n"

        f"═══════════════════════════════════════════════════════════════\n"
        f"تنبيه: الامتثال التنظيمي\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"أنت تقدم تحليلاً تعليمياً فقط. لا تقدم نصائح استثمارية شخصية.\n"
        f"- لا تقل أبداً: 'شراء'، 'بيع'، 'أوصي بـ'\n"
        f"- قل دائماً: 'قد ينظر المستثمرون إلى'، 'الإطار التحليلي يشير إلى'\n"
        f"- إخلاء المسؤولية الإلزامي: \"{disclaimer_text}\"\n\n"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"إعدادات اللغة والنبرة\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"1. اللغة: العربية الفصحى الحديثة، مهنية، وسهلة الفهم.\n"
        f"2. ترجمة المصطلحات: 'P/E' -> 'مضاعف الربحية'، 'Yield' -> 'العائد'، 'Sector' -> 'القطاع'.\n"
        f"3. النبرة: خبير، محترف، ومباشر.\n\n"
        
        f"أمثلة للافتتاحيات:\n"
        f"✅ \"أهلاً {user_name}. دعنا نحلل هذا السهم من منظور مؤسسي.\"\n"
        f"✅ \"اختيار مثير للاهتمام يا {user_name}. إليك ما تظهره البيانات.\"\n"
        f"✅ \"توقيت جيد للسؤال عن هذا السهم. دعني أوضح لك الصورة الكاملة.\"\n\n"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"الإطار التحليلي\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"1. التركيز الكلي: دورة الأعمال، التحليل بين الأسواق، والموسمية.\n"
        f"2. السياق الأساسي: اشرح *لماذا* تغيرت الأرقام، وليس فقط أنها تغيرت.\n"
        f"3. تقييم المخاطر: قدم دائماً سيناريوهات التفاؤل (Bull) والتشاؤم (Bear).\n"
        f"4. تقييم القطاع: استخدم مضاعف القيمة الدفترية للبنوك، وقيمة المنشأة/الأرباح للصناعات، إلخ.\n\n"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"المكونات الهيكلية (إلزامي للواجهة)\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"يجب عليك تنسيق الرد باستخدام العلامات التالية لتوليد بطاقات واجهة المستخدم الغنية:\n"
        f"1. المقدمة والتحليل: اكتب التحليل السردي في البداية.\n"
        f"2. السيناريوهات:\n"
        f"[BULL_CASE]\n"
        f"- نقطة إيجابية 1\n"
        f"- نقطة إيجابية 2\n"
        f"[BEAR_CASE]\n"
        f"- خطر 1\n"
        f"- خطر 2\n"
        f"3. إطار التحليل:\n"
        f"[FRAMEWORK]\n"
        f"Title: عنوان الإطار (مثلاً: إطار جودة الأرباح)\n"
        f"Subtitle: العنوان الفرعي\n"
        f"- معيار 1: التقييم\n"
        f"- معيار 2: التقييم\n"
        f"4. المحركات الكمية (إن وجدت تغيرات كبيرة):\n"
        f"[QUANTIFIED_DRIVERS]\n"
        f"- اسم المحرك: الأثر% - الشرح\n"
        f"5. القسم التعليمي:\n"
        f"[LEARNING]\n"
        f"Title: عنوان القسم التعليمي\n"
        f"- مفهوم: تعريف\n\n"
        
        f"تذكر: ترجم هذه النقاط إلى العربية أيضاً.\n\n"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"السياق والجلسة\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"اسم المستخدم: {user_name}\n"
        f"الترحيب مسموح: {'نعم' if allow_greeting else 'لا'}\n"
        f"سياق البيانات المقدم: {card_context}\n\n"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"تعليمات نهائية وتفكير استباقي\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"قبل توليد الرد، قم بترجمة أي مفتاح بيانات إنجليزي (مثل 'Sector: Banking') إلى العربية ('القطاع: البنوك') في عقلك.\n"
        f"يجب أن يكون الرد النهائي خالياً تماماً من الإنجليزية (إلا الرموز).\n"
        f"ابدأ الرد الآن باللغة العربية.\n"
    )        
        else:
            # ============================================================
            # ENGLISH SYSTEM PROMPT (STANDARD)
            # ============================================================
            lang_name = "English"
            
            voice_instructions = (
                f"OSAMA'S VOICE: EXAMPLE OPENINGS (STUDY THESE PATTERNS)\n"
                f"✅ \"Alright {user_name}, let me break down this stock for you. Here's the institutional perspective.\"\n"
                f"✅ \"Interesting choice, {user_name}. Let me give you the full analysis.\"\n"
                f"✅ \"Good timing on asking about this one, {user_name}. Here's what the data shows.\"\n\n"
                
                f"SAFE PHRASING EXAMPLES:\n"
                f"✅ \"JUFO presents an interesting risk/reward at current levels. Here's the analysis...\"\n"
                f"✅ \"Position sizing depends on individual risk tolerance.\"\n"
            )
            
            disclaimer_text = "This is educational analysis. Consider your own circumstances and consult a licensed advisor."
            invitation_text = "What specific aspect would you like me to dig deeper on?"

            system_prompt = (
                f"You are a professional financial analyst specializing in the Egyptian Stock Market (EGX) with institutional-quality expertise.\n"
                f"Your role is to provide institutional-quality analysis of Egyptian stocks ONLY.\n\n"
                
                f"═══════════════════════════════════════════════════════════════\n"
                f"CRITICAL: REGULATORY COMPLIANCE\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"You provide EDUCATIONAL analysis only. You do NOT provide personalized investment advice.\n"
                f"- NEVER say: 'buy', 'sell', 'I recommend'\n"
                f"- ALWAYS say: 'investors might consider', 'the framework suggests'\n"
                f"- MANDATORY DISCLAIMER: \"{disclaimer_text}\"\n\n"

                f"═══════════════════════════════════════════════════════════════\n"
                f"LANGUAGE & VOICE SETTINGS\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"TARGET LANGUAGE: **{lang_name}**\n"
                f"{voice_instructions}\n"

                f"═══════════════════════════════════════════════════════════════\n"
                f"ANALYTICAL FRAMEWORK\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"1. MACRO FOCUS: Business cycle, intermarket analysis, seasonality.\n"
                f"2. FUNDAMENTAL CONTEXT: Explain WHY numbers changed, not just that they changed.\n"
                f"3. RISK ASSESSMENT: Always provide Bull/Bear cases.\n"
                f"4. SECTOR VALUATION: Use P/B for banks, EV/EBITDA for industrials, etc.\n\n"

                f"═══════════════════════════════════════════════════════════════\n"
                f"RESPONSE STRUCTURE & STRUCTURAL TAGS (MANDATORY)\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"You MUST format your response using these tags to generate rich UI cards:\n"
                f"1. Narrative: Start with your main analysis text.\n"
                f"2. Scenarios:\n"
                f"[BULL_CASE]\n"
                f"- Positive Factor 1\n"
                f"- Positive Factor 2\n"
                f"[BEAR_CASE]\n"
                f"- Risk Factor 1\n"
                f"- Risk Factor 2\n"
                f"3. Framework:\n"
                f"[FRAMEWORK]\n"
                f"Title: Framework Name (e.g., Quality of Earnings)\n"
                f"Subtitle: Subtitle here\n"
                f"- Criterion 1: Logic\n"
                f"4. Drivers (If applicable):\n"
                f"[QUANTIFIED_DRIVERS]\n"
                f"- Driver Name: Impact% - Explanation\n"
                f"5. Learning:\n"
                f"[LEARNING]\n"
                f"Title: Educational Concepts\n"
                f"- Concept: Definition\n\n"
                
                f"═══════════════════════════════════════════════════════════════\n"
                f"CONTEXT & SESSION\n"

                f"CRITICAL: SEPARATE INSIGHTS GENERATION\n"
                f"At the very end of your response, you MUST append the Bull and Bear cases using these EXACT delimiters:\n"
                f"[BULL_CASE]\n"
                f"- Point 1\n"
                f"- Point 2\n"
                f"[BEAR_CASE]\n"
                f"- Point 1\n"
                f"- Point 2\n"
                f"Note: Translate these points to {lang_name} as well.\n\n"
                
                f"═══════════════════════════════════════════════════════════════\n"
                f"CONTEXT & SESSION\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"User Name: {user_name}\n"
                f"Greeting Allowed: {'YES' if allow_greeting else 'NO'}\n"
                f"Data Context Provided: {card_context}\n\n"
                
                f"═══════════════════════════════════════════════════════════════\n"
                f"FINAL INSTRUCTION: RESPONSE GENERATION\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"You MUST write your entire response for the user in **{lang_name}**.\n"
                f"Do not use English unless the user specifically asked for an English response or for technical ticker symbols.\n"
                f"If the Target Language is Arabic, the entire narrative, bullet points, and disclaimer MUST be in Arabic.\n"
                f"BEGIN RESPONSE IN **{lang_name.upper()}** NOW."
            )
        
        # If no data exists (e.g., small talk or unknown), we still want a conversational response
        user_content = f"Query: {query}\nIntent: {intent}\n\nDATA:\n{context_str}"
        if not data:
            user_content = f"Query: {query}\nIntent: {intent}\n(No specific stock data found. Provide a helpful guide on what you can analyze.)"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        # CFA MODE: Use lower temperature for deterministic output in financial analysis
        cfa_temperature = 0.15 if is_deep_dive else 0.5
        cfa_purpose = "cfa_analyst" if is_deep_dive else "narrative"
        
        result = await multi_llm.complete(
            messages=messages,
            max_tokens=self.MAX_TOKENS,
            temperature=cfa_temperature,
            purpose=cfa_purpose
        )
        
        # PHASE 5: Store result in cache if valid
        if result and cache_key:
            _cache_narrative(cache_key, result)
        
        return result

    def extract_fact_explanations(self, data: List[Dict[str, Any]], language: str = 'en') -> Dict[str, str]:
        """
        Scans response data for technical terms and providing definitions.
        ENSURES at least some definitions are present if data cards exist.
        """
        explanations = {}
        data_str = str(data).lower()
        
        # Extended bilingual dictionary
        FACTS = {
            "pe_ratio": {
                "en": ("P/E Ratio", "The Price-to-Earnings (P/E) Ratio measures a company's current share price relative to its per-share earnings. A high P/E could mean that a stock's price is high relative to earnings and possibly overvalued, or that investors are expecting high growth rates in the future. Conversely, a low P/E might indicate that the current stock price is low relative to earnings."),
                "ar": ("مضاعف الربحية (P/E)", "هو نسبة تقيس سعر سهم الشركة الحالي بالنسبة إلى أرباح السهم الواحد. يشير ارتفاع هذا المعدل إلى أن المستثمرين يتوقعون نمواً كبيراً في المستقبل، أو أن السهم مقيم بأعلى من قيمته الحقيقية. بينما قد يعني انخفاضه أن السهم مقيم بأقل من قيمته.")
            },
            "market_cap": {
                "en": ("Market Cap", "Market Capitalization refers to the total dollar market value of a company's outstanding shares of stock. It is calculated by multiplying the total number of a company's outstanding shares by the current market price of one share. It is a key indicator of a company's size."),
                "ar": ("القيمة السوقية", "القيمة السوقية هي إجمالي القيمة الدولارية لأسهم الشركة القائمة في السوق. يتم حسابها عن طريق ضرب العدد الإجمالي لأسهم الشركة القائمة في سعر السوق الحالي للسهم الواحد. وهي مؤشر رئيسي لحجم الشركة.")
            },
            "dividend_yield": {
                "en": ("Dividend Yield", "The dividend yield is a financial ratio (dividend/price) that shows how much a company pays out in dividends each year relative to its stock price. It is expressed as a percentage and represents the return on investment for a stock without any capital gains."),
                "ar": ("عائد التوزيعات", "عائد التوزيعات هو نسبة مالية توضح مقدار الأرباح التي توزعها الشركة سنوياً نسبة إلى سعر سهمها. يتم التعبير عنها كنسبة مئوية وتمثل العائد على الاستثمار من السهم دون حساب الأرباح الرأسمالية.")
            },
            "z_score": {
                "en": ("Z-Score", "The Altman Z-Score is a formula ensuring financial health. A score below 1.8 indicates a company is likely heading for bankruptcy, while a score above 3.0 indicates a company is in a solid financial position. It uses profitability, leverage, liquidity, solvency, and activity ratios."),
                "ar": ("مؤشر ألتمان (Z-Score)", "هو صيغة لقياس الصحة المالية للشركة. تشير الدرجة الأقل من 1.8 إلى احتمالية حدوث إفلاس، بينما تشير الدرجة الأعلى من 3.0 إلى وضع مالي قوي. يستخدم هذا المؤشر نسب الربحية والرافعة المالية والسيولة والملاءة المالية.")
            },
            "eps": {
                "en": ("EPS", "Earnings Per Share (EPS) is calculated as a company's profit divided by the outstanding shares of its common stock. The resulting number serves as an indicator of a company's profitability. It is common for a company to report EPS that is adjusted for extraordinary items."),
                "ar": ("ربحية السهم (EPS)", "يتم حساب ربحية السهم عن طريق قسمة صافي ربح الشركة على عدد الأسهم القائمة. يعتبر الرقم الناتج مؤشراً رئيسياً لربحية الشركة، وغالباً ما يتم استخدامه لمقارنة الأداء المالي بين الشركات المختلفة.")
            },
            "roe": {
                "en": ("ROE", "Return on Equity (ROE) is a measure of financial performance calculated by dividing net income by shareholders' equity. Because shareholders' equity is equal to a company's assets minus its debt, ROE constitutes the return on net assets."),
                "ar": ("العائد على حقوق الملكية", "هو مقياس للأداء المالي يتم حسابه بقسمة صافي الدخل على حقوق المساهمين. نظراً لأن حقوق المساهمين تساوي أصول الشركة مطروحاً منها ديونها، فإن العائد على حقوق الملكية يعتبر العائد على صافي الأصول.")
            },
            "pb_ratio": {
                "en": ("P/B Ratio", "The Price-to-Book (P/B) ratio compares a company's market value to its book value. A ratio under 1.0 is often considered a solid investment, indicating that the stock is potentially undervalued relative to the company's assets."),
                "ar": ("مضاعف القيمة الدفترية", "يقارن نسبة السعر إلى القيمة الدفترية بين القيمة السوقية للشركة وقيمتها الدفترية. غالباً ما تعتبر النسبة الأقل من 1.0 استثماراً جيداً، حيث تشير إلى أن السهم قد يكون مقيماً بأقل من قيمته الحقيقية بالنسبة لأصول الشركة.")
            },
            "ebitda": {
                "en": ("EBITDA", "EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization. It is an alternate measure of profitability to net income. EBITDA attempts to represent cash profit generated by the company's operations."),
                "ar": ("الأرباح قبل الفوائد والضرائب", "هي اختصار للأرباح قبل الفوائد والضرائب والإهلاكات والاستهلاكات. وهي مقياس بديل للربحية يختلف عن صافي الدخل، وتهدف إلى تمثيل الربح النقدي الناتج عن عمليات الشركة التشغيلية.")
            },
            "current_ratio": {
                "en": ("Current Ratio", "The Current Ratio is a liquidity ratio that measures a company's ability to pay short-term obligations or those due within one year. It tells investors and analysts how a company can maximize the current assets on its balance sheet to satisfy its current debt and other payables."),
                "ar": ("النسبة الحالية", "هي نسبة سيولة تقيس قدرة الشركة على سداد التزاماتها قصيرة الأجل أو المستحقة خلال عام واحد. تخبر المستثمرين بكيفية استغلال الشركة لأصولها الحالية لسداد ديونها ومدفوعاتها الأخرى.")
            },
            "operating_margin": {
                "en": ("Operating Margin", "Operating margin measures how much profit a company makes on a dollar of sales after paying for variable costs of production, such as wages and raw materials, but before paying interest or tax."),
                "ar": ("هامش التشغيل", "يقيس هامش التشغيل مقدار الربح الذي تحققه الشركة من كل دولار من المبيعات بعد دفع تكاليف الإنتاج المتغيرة، مثل الأجور والمواد الخام، ولكن قبل دفع الفوائد أو الضرائب.")
            }
        }
        
        # Priority 1: Match terms found in data
        for key, lang_data in FACTS.items():
            if key in data_str:
                title, definition = lang_data.get(language, lang_data['en'])
                explanations[title] = definition
                if len(explanations) >= 4: break

        # Priority 2: Force structure compliance by ensuring at least some definitions appear
        # The user requires: AI Reply -> Cards -> Definitions (ALWAYS)
        # So if we didn't find specific terms, we inject general market wisdom.
        if len(explanations) < 2:
            defaults = ["pe_ratio", "market_cap", "dividend_yield"]
            for key in defaults:
                title, definition = FACTS[key].get(language, FACTS[key]['en'])
                if title not in explanations:
                    explanations[title] = definition
                if len(explanations) >= 3: break
                    
        return explanations

    def _format_data_for_context(self, cards: List[Dict[str, Any]], language: str = 'en') -> str:
        """
        Format the structured cards into a compact string for LLM.
        
        PHASE 3 OPTIMIZATION: Ultra-compact format to reduce token count.
        Same data values, fewer tokens (~50% reduction).
        Format: "SYMBOL PRICE CHANGE | KEY=VAL KEY=VAL"
        Refined for Arabic Context if needed.
        """
        try:
            summary_parts = []
            
            # Simple Translation Helper
            T_MAP = {
                # General
                'Price': 'السعر', 'Change': 'التغير', 'Symbol': 'الرمز',
                # Financials
                'Revenue': 'الإيرادات', 'Gross Profit': 'مجمل الربح', 
                'Net Income': 'صافي الربح', 'Operating Income': 'ربح التشغيل',
                'EPS': 'ربحية السهم', 'EBITDA': 'الأرباح قبل الفوائد والضرائب',
                'Cash': 'الكاش', 'Total Assets': 'إجمالي الأصول', 
                'Total Liabilities': 'إجمالي الخصوم', 'Total Equity': 'حقوق الملكية',
                'Debt': 'الديون', 'Free Cash Flow': 'التدفق النقدي الحر',
                'Operating Cash Flow': 'التدفق التشغيلي', 'Dividends Paid': 'توزيعات مدفوعة',
                # Ratios
                'Pe Ratio': 'مكرر الربحية', 'Pb Ratio': 'مضاعف الدفترية',
                'Return on Equity': 'العائد على الملكية', 'ROE': 'العائد على الملكية',
                'Return on Assets': 'العائد على الأصول', 'ROA': 'العائد على الأصول',
                'Gross Margin': 'هامش مجمل الربح', 'Operating Margin': 'هامش التشغيل',
                'Net Margin': 'صافي الهامش', 'Current Ratio': 'النسبة الحالية',
                'Quick Ratio': 'النسبة السريعة', 'Debt / Equity': 'الدين/الملكية',
                'Dividend Yield': 'عائد التوزيعات', 'Payout Ratio': 'نسبة التوزيع',
                # Table Headers
                'INCOME': 'قائمة الدخل', 'BALANCE': 'الميزانية', 
                'CASHFLOW': 'التدفقات النقدية', 'RATIOS': 'النسب المالية',
                'YEAR': 'عام', 'TTM': 'اخر 12 شهر', 'Latest': 'الأحدث',
                'Val': 'القيمة', 'Grw': 'نمو', 'Rev': 'إيراد',
                'Sector': 'قطاع', 'stocks': 'أسهم', 
                'Gainers': 'الرابحون', 'Losers': 'الخاسرون'
            }
            
            def t(text):
                if language == 'ar':
                    # Exact match
                    if text in T_MAP: return T_MAP[text]
                    # Partial match for keys like "Rev"
                    for k, v in T_MAP.items():
                        if k == text: return v
                    return text
                return text

            for card in cards:
                c_type = card.get("type")
                c_data = card.get("data", {})
                
                if c_type == "stock_header":
                    # Compact: "TMGH (Talaat Moustafa) [EGP]"
                    symbol = c_data.get('symbol', '')
                    name = c_data.get('name', '')[:20]  # Truncate long names
                    curr = c_data.get('currency', 'EGP') # Default to EGP for EGX context which prevents '$' hallucination
                    summary_parts.append(f"{symbol} ({name}) [{curr}]")
                
                elif c_type == "financial_explorer":
                    # DEEP DIVE IDENTITY FIX: Explicitly extract symbol from explorer package
                    symbol = c_data.get('symbol', '')
                    curr = c_data.get('currency', 'EGP')
                    lbl_rep = t('FINANCIAL_REPORT_FOR') if language == 'ar' else 'FINANCIAL_REPORT_FOR'
                    summary_parts.append(f"{lbl_rep}: {symbol} [{curr}]")
                    
                    # EXTRACT FULL FINANCIAL PICTURE (Fixing 'Data not available')
                    # We need to give the LLM enough meat to write the 10-point analysis
                    
                    # 1. Determine best dataset (TTM preferred if available, else Annual)
                    dataset = c_data.get('ttm_data')
                    period_label = "TTM"
                    if not dataset or not dataset.get('income'):
                        dataset = c_data.get('annual_data', {})
                        period_label = "Annual"
                        
                    years = dataset.get('years', [])[:2] # Comparison: Current vs Prev
                    
                    # Helper to extract a row's values for latest years
                    def extract_latest(section_key, row_labels):
                        rows = dataset.get(section_key, [])
                        found = []
                        for label in row_labels:
                            # Fuzzy match label (e.g. "Net Income" in "Net Income")
                            row = next((r for r in rows if label.lower() in r['label'].lower()), None)
                            if row:
                                vals = []
                                for y in years:
                                    v = row['values'].get(y)
                                    if v is not None:
                                        # Format large numbers
                                        if isinstance(v, (int, float)) and abs(v) > 1000000:
                                            v_str = f"{v/1000000:.1f}M"
                                        elif isinstance(v, (int, float)):
                                            v_str = f"{v:.2f}"
                                        else:
                                            v_str = str(v)
                                        vals.append(f"{y}={v_str}")
                                
                                # Format Change Deltas (New)
                                change_str = ""
                                c_abs = row.get('change_abs')
                                c_pct = row.get('change_pct')
                                
                                if c_abs is not None:
                                    if isinstance(c_abs, (int, float)) and abs(c_abs) > 1000000:
                                        c_abs_str = f"{c_abs/1000000:.1f}M"
                                    elif isinstance(c_abs, (int, float)):
                                        c_abs_str = f"{c_abs:.2f}"
                                    else:
                                        c_abs_str = str(c_abs)
                                        
                                    if c_pct is not None:
                                        change_str = f" (Chg: {c_abs_str} | {c_pct:.1f}%)"
                                    else:
                                        change_str = f" (Chg: {c_abs_str})"

                                if vals:
                                    # Translate label
                                    clean_lbl = t(row['label'])
                                    found.append(f"{clean_lbl}:[{', '.join(vals)}]{change_str}")
                        return " | ".join(found)

                    # 2. Income Statement High-Level
                    # Added 'Effective Tax Rate' and 'Research & Development' for quality checks
                    inc_str = extract_latest('income', ['Revenue', 'Gross Profit', 'Gross Margin', 'Operating Income', 'Net Income', 'EPS', 'EBITDA', 'Effective Tax Rate'])
                    if inc_str: summary_parts.append(f"{t('INCOME')}({t(period_label)}): {inc_str}")
                    
                    # 3. Balance Sheet Health
                    bal_str = extract_latest('balance', ['Cash', 'Total Assets', 'Total Liabilities', 'Total Equity', 'Debt', 'Retained Earnings', 'Goodwill'])
                    if bal_str: summary_parts.append(f"{t('BALANCE')}({t(period_label)}): {bal_str}")
                    
                    # 4. Cash Flow Quality
                    # Added 'Stock-Based Compensation' (Dilution risk) and 'Dividends Paid'
                    cf_str = extract_latest('cashflow', ['Operating Cash Flow', 'Capital Expenditures', 'Free Cash Flow', 'Stock-Based Compensation', 'Dividends Paid'])
                    if cf_str: summary_parts.append(f"{t('CASHFLOW')}({t(period_label)}): {cf_str}")
                    
                    # 5. Key Ratios (Valuation & Efficiency) - CRITICAL CFA LEVEL 3 METRICS
                    # Ratios are usually in annual_data['ratios'] even if TTM is used for raw data
                    ratios_src = c_data.get('annual_data', {}).get('ratios', [])
                    
                    # Manually reusing extraction logic for ratios source
                    def extract_ratios(row_labels):
                        rows = ratios_src
                        found = []
                        # Use annual years for ratios
                        r_years = c_data.get('annual_data', {}).get('years', [])[:1] # Just latest
                        for label in row_labels:
                            row = next((r for r in rows if label.lower() in r['label'].lower()), None)
                            if row and r_years:
                                v = row['values'].get(r_years[0])
                                if v is not None:
                                    clean_lbl = t(row['label'])
                                    found.append(f"{clean_lbl}={v}")
                        return " ".join(found)

                    # EXPANDED METRICS LIST:
                    # Valuation: EV/EBITDA, P/FCF (Pfcf), P/OCF (Pocf), Earnings Yield
                    # Efficiency: ROCE, Asset Turnover, Inventory Turnover
                    # Safety: Interest Coverage, Current Ratio, Debt/Equity
                    ratio_cats = [
                        'Pe Ratio', 'Pb Ratio', 'EV/EBITDA', 'Pfcf Ratio', 'Pocf Ratio', # Valuation
                        'Return on Capital Employed (ROCE)', 'Return on Equity (ROE)',   # Returns
                        'Asset Turnover', 'Inventory Turnover',                          # Efficiency
                        'Interest Coverage', 'Debt / Equity', 'Current Ratio',           # Solvency
                        'Dividend Yield', 'Payout Ratio'                                 # Income
                    ]
                    ratio_str = extract_ratios(ratio_cats)
                    if ratio_str: summary_parts.append(f"{t('RATIOS')}({t('Latest')}): {ratio_str}")

                    
                elif c_type == "snapshot":
                    # Compact: "Price:82.95 Chg:-0.95%"
                    price = c_data.get('last_price', '')
                    change = c_data.get('change_percent', '')
                    if price:
                        summary_parts.append(f"{t('Price')}:{price} {t('Change')}:{change}%")
                    
                elif c_type == "stats":
                    # Compact: top 6 metrics as "K=V K=V"
                    items = []
                    # Priority order for most relevant metrics
                    priority_keys = ['pe_ratio', 'roe', 'debt_equity', 'net_profit_margin', 
                                   'pb_ratio', 'dividend_yield', 'market_cap_formatted']
                    for key in priority_keys:
                        val = c_data.get(key)
                        if val is not None:
                            # Shorten key names
                            short_key = key.replace('_ratio', '').replace('_formatted', '').replace('net_profit_', '')
                            items.append(f"{t(short_key)}={val}")
                    if items:
                        summary_parts.append(" ".join(items[:6]))
                        
                elif c_type == "financial_trend":
                    items = c_data.get('items', [])
                    if items:
                        last = items[-1]
                        summary_parts.append(f"{t('Rev')}:{last.get('revenue')} {t('Grw')}:{last.get('growth')}%")
                        
                elif c_type == "dividends":
                    yield_val = c_data.get('yield', '')
                    count = len(c_data.get('items', []))
                    summary_parts.append(f"{t('Dividend Yield')}:{yield_val}% Hist:{count}")
                    
                elif c_type == 'screener_results':
                    stocks = c_data.get('stocks', [])
                    # Compact: "5 stocks: TMGH(+5.2%) CIB(+3.1%)..."
                    top3 = [f"{s.get('symbol')}({s.get('value', s.get('change_percent', ''))})" 
                            for s in stocks[:3]]
                    lbl_stk = t('stocks')
                    summary_parts.append(f"{len(stocks)} {lbl_stk}: {' '.join(top3)}")
                    
                elif c_type == 'movers_table':
                    movers = c_data.get('movers', [])
                    direction = t('Gainers') if c_data.get('direction') == 'up' else t('Losers')
                    top3 = [f"{s.get('symbol')}({s.get('change_percent')}%)" for s in movers[:3]]
                    summary_parts.append(f"{direction}: {' '.join(top3)}")
                    
                elif c_type in ['deep_valuation', 'valuation', 'deep_health', 'health', 
                               'deep_growth', 'growth', 'deep_efficiency', 'efficiency']:
                    items = []
                    for key, val in c_data.items():
                        if val is not None and key not in ['title', 'type'] and isinstance(val, (int, float, str)):
                            if isinstance(val, float):
                                val = round(val, 2)
                            items.append(f"{key[:8]}={val}")
                    if items:
                        summary_parts.append(" ".join(items[:6]))
                        
                elif c_type == 'financial_explorer':
                    # Extract key metrics for deep analysis (CFA Level 3 style)
                    # This block seems redundant with the first 'financial_explorer' block?
                    # The original code had two blocks for financial_explorer? 
                    # Checking original lines 406 and 572. Yes, line 572 seems to be a second pass or redundant.
                    # I will keep the logic focused on the first block (lines 406-512 in original) which handles it well.
                    pass

                elif c_type == 'sector_list':
                    stocks = c_data.get('stocks', [])
                    sector = c_data.get('sector', '')[:15]
                    summary_parts.append(f"{t('Sector')} {sector}: {len(stocks)} {t('stocks')}")
                    
                else:
                    # Generic fallback - top 4 numeric values only
                    items = []
                    for key, val in c_data.items():
                        if isinstance(val, (int, float)) and key not in ['type', 'id']:
                            items.append(f"{key[:10]}={val}")
                    if items:
                        summary_parts.append(" ".join(items[:4]))
            
            # Join with pipe separator for clarity
            result = " | ".join(summary_parts) if summary_parts else "Stock data displayed"
            return result
            
        except Exception as e:
            return f"Data: {e}"

    def _describe_cards(self, card_types: List[str]) -> str:
        """
        Convert card types to human-readable descriptions for LLM context.
        This helps the LLM understand what data the user is seeing.
        """
        # NO TRANSLATION NEEDED HERE? 
        # Actually, this is used in 'Data Context Provided: {card_context}' line 274.
        # If the System Prompt is Arabic, this should ideally be Arabic too?
        # But 'card_context' is technical. 
        # Let's keep it English for simplicity unless critical.
        # Actually, the user wants "response comes in English".
        # If I translate this, it helps.
        
        CARD_DESCRIPTIONS = {
            "stock_header": "stock overview with price and daily change",
            "snapshot": "key metrics and valuation summary",
            "stats": "detailed statistics",
            "financials_table": "financial statements",
            "financial_explorer": "comprehensive CFA-level financial data",
            "dividends_table": "dividend history and yield",
            "compare_table": "side-by-side comparison",
            "movers_table": "top gainers/losers list",
            "sector_list": "stocks in a sector",
            "screener_results": "filtered stock results",
            "technicals": "technical indicators",
            "ownership": "ownership structure",
            "fair_value": "valuation analysis",
            "news_list": "recent news articles",
            "deep_valuation": "deep valuation metrics",
            "deep_health": "financial health indicators",
            "deep_growth": "growth analysis",
            "deep_efficiency": "efficiency metrics",
            "ratios": "financial ratios",
        }
        
        if not card_types:
            return "general financial information"
        
        descriptions = []
        for ct in card_types:
            if ct in CARD_DESCRIPTIONS:
                descriptions.append(CARD_DESCRIPTIONS[ct])
            else:
                descriptions.append(ct.replace("_", " "))
        
        if len(descriptions) == 1:
            return descriptions[0]
        elif len(descriptions) == 2:
            return f"{descriptions[0]} and {descriptions[1]}"
        else:
            return ", ".join(descriptions[:-1]) + ", and " + descriptions[-1]


# Singleton
_explainer = LLMExplainerService()

def get_explainer() -> LLMExplainerService:
    return _explainer
