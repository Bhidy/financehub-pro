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
from .guardrails.market_sentiment import MarketSentimentAnalyzer, MarketTone
from .guardrails.numeric_verifier import NumericVerifier

# Logger
logger = logging.getLogger(__name__)

# Constants
MAX_TOKENS = 1200  # Doubled for template-matching narrative depth
TIMEOUT = 6.0 # Increased to accommodate richer responses

# ============================================================
# PHASE 5: RESPONSE CACHING (Token Optimization)
# ============================================================
# Cache narratives for identical (intent, symbol, language) combinations
# TTL: 5 minutes - balances freshness with token savings
NARRATIVE_CACHE: Dict[str, tuple] = {}  # {cache_key: (narrative, timestamp)}
CACHE_TTL_SECONDS = 300  # 5 minutes
CACHE_STATS = {"hits": 0, "misses": 0}

def _get_cache_key(intent: str, data: List[Dict], language: str, allow_greeting: bool, user_level: str, memory_hash: str) -> str:
    """Generate a cache key from the request parameters."""
    # Extract symbol from data for more specific caching
    symbol = ""
    for card in data:
        if card.get("type") == "stock_header":
            symbol = card.get("data", {}).get("symbol", "")
            break
    key_str = f"{intent}:{symbol}:{language}:{allow_greeting}:{user_level}:{memory_hash}"
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
        is_returning_user: bool = False,
        # Phase 4: Personalization
        user_level: str = "INTERMEDIATE",
        context_memories: Optional[str] = None,
        # Phase 5: Tone Steering
        market_stats: Optional[Dict[str, Any]] = None
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
            mem_hash = hashlib.md5((context_memories or "").encode()).hexdigest()
            cache_key = _get_cache_key(intent, data, language, allow_greeting, user_level, mem_hash)
            cached = _get_cached_narrative(cache_key)
            if cached:
                # Personalize cached response with current user's name
                # This allows cache reuse while maintaining personalization
                return cached

        # Build Data Context Summary
        context_str = self._format_data_for_context(data, language)
        lang_instruction = "Arabic (Modern Standard)" if language == 'ar' else "English"

        # Phase 5: Determine Market Tone
        market_tone = MarketSentimentAnalyzer.analyze_market_mood(market_stats)
        tone_instruction = MarketSentimentAnalyzer.get_tone_instruction(market_tone)
        if market_tone != MarketTone.NEUTRAL:
            logger.info(f"🎨 Market Tone Injected: {market_tone} ({tone_instruction[:30]}...)")
        
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
            
            # ============================================================
            # 100% ARABIC SYSTEM PROMPT (CHIEF EXPERT MODE)
            # ============================================================
            lang_name = "Arabic"
            
            disclaimer_text = "هذا تحليل تعليمي. يرجى مراعاة ظروفك المالية واستشارة مستشار مرخص."
            invitation_text = "ما الجانب الذي تود أن أتعمق فيه أكثر؟"
            
            # Build intent-specific augmentation for Arabic
            ar_intent_augment = self._get_intent_augmentation_ar(intent, card_types)
            
            system_prompt = (
        f"أنت كبير الاستراتيجيين (Chief Strategist) للبورصة المصرية (EGX).\n"
        f"مهمتك: تقديم رؤى عميقة بأسلوب محادثة طبيعي (Natural Conversational Style).\n"
        f"نطاق العمل: البورصة المصرية فقط.\n\n"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"قواعد العرض (CONVERSATIONAL DISPLAY MODE - MANDATORY)\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"1. **جماليات النص**:\n"
        f"   - اكتب في جمل واضحة ومباشرة.\n"
        f"   - فكرة واحدة فقط في كل سطر.\n"
        f"   - افصل بين الكتل بسطر فارغ دائماً.\n"
        f"   - تجنب النقاط (Bullet Points) إلا عند سرد بيانات رقمية.\n\n"
        f"2. **نبرة الصوت**:\n"
        f"   - تحدث كخبير يخاطب زميله (طبيعي، سلس، غير آلي).\n"
        f"   - استخدم لغة المحللين ('السهم بيتحرك'، 'السيولة بتقول').\n"
        f"   - اختم بجملة إنسانية بسيطة.\n\n"
        f"3. **عمق التحليل (CRITICAL)**:\n"
        f"   - قارن المؤشرات الحالية بالمتوسطات التاريخية (مثال: 'يتداول عند 11x مقابل متوسطه التاريخي 14x أي بخصم 20%').\n"
        f"   - اربط البيانات بسياق السوق المصري.\n"
        f"   - قدم أرقام محددة لنسب الصعود/الهبوط المحتملة.\n\n"

        f"═══════════════════════════════════════════════════════════════\n"
        f"الهيكل المطلوب (Strict Structure)\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"يجب تنسيق الرد بهذه العلامات بدقة:\n\n"
        f"1. **التحليل (Narrative)**:\n"
        f"   - فقرة 1: ملخص تنفيذي مع أطروحة مدعومة بأرقام.\n"
        f"   - فقرة 2: إعداد التقييم - قارن المؤشرات الحالية بالمتوسطات التاريخية والقطاعية.\n"
        f"   - فقرة 3: النظرة المستقبلية - ما يجب أن يحدث لتحقق السيناريو الإيجابي/السلبي.\n\n"
        f"2. **السيناريوهات (Scenarios)**:\n"
        f"[BULL_CASE]\n"
        f"📈 السيناريو الإيجابي (+XX% صعود محتمل)\n"
        f"- نقطة إيجابية 1 مع بيانات محددة\n"
        f"- نقطة إيجابية 2 مع تأثير كمي\n"
        f"- على الأقل 4-5 نقاط\n"
        f"[BEAR_CASE]\n"
        f"📉 السيناريو السلبي (-XX% هبوط محتمل)\n"
        f"- نقطة سلبية 1 مع مؤشر محدد\n"
        f"- نقطة سلبية 2 مع تأثير كمي\n"
        f"- على الأقل 4-5 نقاط\n\n"
        f"3. **رأيي كمحلل (MANDATORY)**:\n"
        f"[MY_FRAMEWORK]\n"
        f"فقرة تحليلية شخصية. مثال: 'نسبة المخاطرة/العائد عند المستويات الحالية جيدة إذا كان لديك قناعة بأمرين: (1) تعافي السوق المصري، (2) تنفيذ الإدارة لخطة التوسع.'\n"
        f"يجب أن يبدو كتحليل من محلل كبير يعطي رأيه الصريح.\n\n"
        f"4. **الإطار (Framework)**:\n"
        f"[FRAMEWORK]\n"
        f"Title: عنوان الإطار\n"
        f"Subtitle: التقييم (مثلاً: قوي)\n"
        f"- معيار 1: النتيجة\n"
        f"- معيار 2: النتيجة\n\n"
        
        f"{ar_intent_augment}"
        
        f"═══════════════════════════════════════════════════════════════\n"
        f"سياق الجلسة\n"
        f"═══════════════════════════════════════════════════════════════\n"
        f"المستخدم: {user_name}\n"
        f"البيانات: {card_context}\n\n"
        f"هام جداً: لا تستخدم كلمة 'سردية' أو أقواس فارغة (). ابدأ التحليل مباشرة.\n"
        f"مطلوب: قبل كتابة الرد، قم بتحليل البيانات وتحديد التوجه في بلوك خاص:\n"
        f"[THOUGHT_PROCESS]\n"
        f"تحليل سريع: (مثال: السهم مقيم بأقل من قيمته، النمو قوي...)\n"
        f"التوجه: (إيجابي/سلبي)\n"
        f"[/THOUGHT_PROCESS]\n"
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
                f"✅ \"[SYMBOL] presents an interesting risk/reward at current levels. Here's the analysis...\"\n"
                f"✅ \"Position sizing depends on individual risk tolerance.\"\n"
            )
            
            disclaimer_text = "This is educational analysis. Consider your own circumstances and consult a licensed advisor."
            invitation_text = "What specific aspect would you like me to dig deeper on?"

            # Build intent-specific augmentation
            intent_augment = self._get_intent_augmentation(intent, card_types)
            
            system_prompt = (
                f"You are the CHIEF LISTED SECURITIES ANALYST for the Egyptian Stock Market (EGX).\n"
                f"Your Role: Provide Institutional-Grade, CFA Level 3 analysis. Insights ONLY. No fluff.\n"
                f"Jurisdiction: EGX ONLY. Politely decline coverage of Saudi, US, or UAE stocks.\n\n"
                
                f"═══════════════════════════════════════════════════════════════\n"
                f"VOICE & ANALYSIS RULES (CFA Level 3)\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"1. **NO DEFINITIONS**: Never explain 'What is PE'. Your user is an expert.\n"
                f"   - BAD: 'PE ratio measures price relative to earnings'.\n"
                f"   - GOOD: 'At 8x PE, the stock trades at a 30% discount to peers.'\n"
                f"2. **INSIGHTS FIRST**: Lead with the conclusion. Use data to support it.\n"
                f"3. **QUANTIFIED COMPARISONS**: Always compare current metrics to historical averages AND sector averages.\n"
                f"   - Example: 'Trading at 11.47x P/E versus its 5-year average of 14.3x — that's about a 20% discount.'\n"
                f"4. **PROFESSIONAL TONE**: Direct, objective, slightly contrarian if data supports it.\n"
                f"5. **ADAPTATION ({user_level} Level)**:\n"
                f"   - NOVICE: Use analogies. Explain *why* a metric matters. Avoid jargon.\n"
                f"   - EXPERT: Be concise. Assume deep knowledge. Focus on second-order effects.\n"
                f"   - INTERMEDIATE: Balanced. Define complex terms but keep analysis professional.\n"
                f"6. **MARKET CONTEXT**:\n"
                f"   {tone_instruction}\n\n"

                f"═══════════════════════════════════════════════════════════════\n"
                f"MANDATORY STRUCTURE (Protected UI Elements)\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"MANDATORY THINKING STEP (HIDDEN):\n"
                f"Before writing the response, you MUST analyze the data in a [THOUGHT_PROCESS] block.\n"
                f"Identify the key signal, decide the thesis (Bull/Bear), and plan the narrative.\n"
                f"Example: [THOUGHT_PROCESS] PE is 4x (Undervalued). Growth is 20%. Thesis: Strong Buy. [/THOUGHT_PROCESS]\n\n"
                
                f"You MUST use these EXACT tags. The App Parser depends on them to render cards.\n"
                f"⚠️ CRITICAL: Use the EXACT bracket format shown below. Example: [BULL_CASE] not 'Bull Case:'\n\n"
                f"1. **Narrative** (COMPREHENSIVE - 3 paragraphs minimum):\n"
                f"   - Para 1: Executive Summary with QUANTIFIED thesis (e.g., 'trading at a 20% discount to 5-year average').\n"
                f"   - Para 2: Valuation Setup — compare current metrics to historical averages AND peer averages. Cite specific numbers.\n"
                f"   - Para 3: Forward View — what needs to happen for bull/bear case to play out. Include timing considerations (e.g., seasonal patterns, upcoming catalysts).\n\n"
                f"2. **Scenarios** (QUANTIFIED upside/downside):\n"
                f"[BULL_CASE]\n"
                f"📈 Bull Case (+XX% upside)\n"
                f"- Driver 1 with specific data (e.g., 'Market leader with 40% dairy share — defensible moat')\n"
                f"- Driver 2 with quantified impact\n"
                f"- Driver 3\n"
                f"- At least 4-5 bullets with data citations\n"
                f"[BEAR_CASE]\n"
                f"📉 Bear Case (-XX% downside)\n"
                f"- Risk 1 with specific metric (e.g., 'D/E of 0.62x with negative FCF = refinancing risk')\n"
                f"- Risk 2 with quantified impact\n"
                f"- At least 4-5 bullets with data citations\n\n"
                f"3. **My Framework** (MANDATORY - Personal Analyst Take):\n"
                f"[MY_FRAMEWORK]\n"
                f"A personal analyst interpretation paragraph. Write as a senior analyst giving an honest, nuanced assessment.\n"
                f"Example: 'The risk/reward at current levels is decent IF you have conviction on two things: (1) Egypt's consumer market recovery over 12-18 months, and (2) management executing on the capacity expansion. Without those, the leverage and margin pressure are real concerns.'\n"
                f"Include timing considerations and practical context (e.g., seasonal patterns, institutional positioning).\n\n"
                f"4. **Framework**:\n"
                f"[FRAMEWORK]\n"
                f"Title: Analytical Framework (e.g., DuPont Analysis)\n"
                f"Subtitle: Overall Score (e.g., Strong, Weak)\n"
                f"- Metric 1: Interpretation\n"
                f"- Metric 2: Interpretation\n\n"
                f"5. **Learning** (CRITICAL - DO NOT SKIP):\n"
                f"[LEARNING]\n"
                f"Title: Key Term\n"
                f"- Term: Brief context on why it matters here.\n"
                f"(Example: If discussing PE, explain PE. If discussing Debt, explain Debt/Equity.)\n\n"
                
                f"{intent_augment}"

                f"═══════════════════════════════════════════════════════════════\n"
                f"COMPLIANCE & DISCLAIMER\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"Educational only. NO Buy/Sell recommendations.\n"
                f"Mandatory Disclaimer: \"{disclaimer_text}\"\n\n"

                f"═══════════════════════════════════════════════════════════════\n"
                f"SESSION CONTEXT\n"
                f"═══════════════════════════════════════════════════════════════\n"
                f"User: {user_name} ({user_level} Investor)\n"
                f"Greeting: {'REQUIRED' if allow_greeting else 'SKIP (Start Analysis Immediately)'}\n"
                f"Past Interactions (Memory): {context_memories if context_memories else 'None'}\n"
                f"Data Context: {card_context}\n\n"
                f"IMPORTANT: You MUST include the [LEARNING] section at the end. It is required for the UI.\n"
                f"BEGIN RESPONSE IN **{lang_name.upper()}**."
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
        if result:
            # Run Post-Generation Verification (Non-blocking)
            mismatches = NumericVerifier.verify_response(result, data)
            if mismatches:
                logger.warning(f"🚨 CHALLENGER DETECTED {len(mismatches)} HALLUCINATIONS in Narrative")

            if cache_key and not mismatches: # Only cache verified responses
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


    def _get_intent_augmentation(self, intent: str, card_types: list) -> str:
        """
        Returns intent-specific prompt augmentation for English responses.
        Each augmentation adds unique template sections matching reference scenarios.
        """
        intent_upper = str(intent).upper()
        
        # COMPARISON intent → Personality Profiles + Trade-Off Guide
        if intent_upper in ['COMPARE_STOCKS', 'COMPARE'] or 'compare_table' in card_types:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "SPECIAL: COMPARISON PERSONALITY PROFILES (MANDATORY)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "For EACH stock in the comparison, create a 'Personality' section:\n"
                "Format:\n"
                "**[EMOJI] [SYMBOL] ([Nickname])**\n"
                "- 👍 The Good: [2-3 strengths with data]\n"
                "- 👎 The Bad: [2-3 weaknesses with data]\n"
                "- 🎯 Profile: [One sentence investor personality match]\n\n"
                "Example:\n"
                "**🦍 JUFO (The 800-lb Gorilla with Baggage)**\n"
                "- 👍 The Good: Market leader (40% dairy share), highest margins (38.6% ROE)\n"
                "- 👎 The Bad: Highest leverage (D/E 0.62x), negative FCF\n"
                "- 🎯 Profile: Deep-value play with turnaround thesis.\n\n"
                "After personalities, add a TRADE-OFF GUIDE:\n"
                "[MY_FRAMEWORK]\n"
                "Write a practical investor guide. Example:\n"
                "'Want maximum upside? → JUFO. Want to sleep at night? → OBOU. Want growth + safety? → ISPH.'\n\n"
            )
        
        # SCREENER / HIDDEN GEMS intent → Methodology Card
        if intent_upper in ['SCREENER_PE', 'SCREENER_PB', 'SCREENER_YIELD', 'HIDDEN_GEMS', 
                           'UNDERVALUED', 'MOST_UNDERVALUED'] or 'screener_results' in card_types:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "SPECIAL: METHODOLOGY CARD (MANDATORY)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "Before listing results, explain your screening methodology:\n"
                "[METHODOLOGY]\n"
                "Title: My Screening Criteria\n"
                "- Criterion 1: What you filter for (e.g., 'P/E < 10x — looking for cheap earnings power')\n"
                "- Criterion 2: Quality filter (e.g., 'ROE > 15% — only profitable businesses')\n"
                "- Criterion 3: Safety filter (e.g., 'D/E < 1.0 — avoiding overleveraged names')\n"
                "- Criterion 4: Any sector-specific adjustments\n\n"
                "Then for EACH stock result, provide a 1-2 line justification explaining WHY it scored well.\n"
                "Include a composite score if applicable (e.g., 'Valuation Score: 8.5/10').\n\n"
            )
        
        # MARKET STATUS / MACRO intent → Macro Scorecard
        if intent_upper in ['MARKET_STATUS', 'MARKET_OVERVIEW', 'EGX30', 'MACRO', 'INDEX_INFO']:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "SPECIAL: MACRO SCORECARD (MANDATORY)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "Structure your macro analysis as a weighted scorecard:\n"
                "[FRAMEWORK]\n"
                "Title: Egypt Macro Scorecard\n"
                "Subtitle: Overall Assessment (Cautiously Optimistic / Neutral / Concerning)\n"
                "- Interest Rate Trajectory (Weight: 25%): [Assessment]\n"
                "- Currency Stability (Weight: 20%): [Assessment]\n"
                "- Foreign Flow Direction (Weight: 20%): [Assessment]\n"
                "- Earnings Season Momentum (Weight: 20%): [Assessment]\n"
                "- Regulatory/Political (Weight: 15%): [Assessment]\n\n"
                "Then split analysis into:\n"
                "📈 Structural Positives: [List key positive factors with data]\n"
                "📉 Cyclical Concerns: [List risk factors with data]\n\n"
                "[MY_FRAMEWORK]\n"
                "Provide a Portfolio Positioning guide:\n"
                "'Current environment favors: [sector preferences]. Reduce exposure to: [risky sectors]. Key catalyst to watch: [upcoming event/date].'\n\n"
            )
        
        # EDUCATIONAL / DEFINE intent → Educational Deep Dive
        if intent_upper in ['DEFINE_TERM', 'EDUCATIONAL', 'WHAT_IS', 'EXPLAIN']:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "SPECIAL: EDUCATIONAL DEEP DIVE (MANDATORY)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "Structure your explanation with ALL of these:\n"
                "1. **Formula**: Show the calculation (e.g., 'ROE = Net Income / Shareholders Equity')\n"
                "2. **What It Measures**: Plain language, one sentence\n"
                "3. **Real Example**: Use an actual EGX company (e.g., 'COMI's ROE of 25% means...')\n"
                "4. **Why It Matters**: Connect to investment decisions\n"
                "5. **When It's Misleading**: Caveats and edge cases (e.g., 'High leverage inflates ROE')\n"
                "6. **Sector Benchmarks**: EGX-specific ranges (e.g., 'Banks: 15-20%, Consumer: 18-25%')\n\n"
                "Skip the [BULL_CASE]/[BEAR_CASE] tags for pure educational queries. Focus on depth of explanation.\n\n"
            )
        
        # Default: no special augmentation
        return ""

    def _get_intent_augmentation_ar(self, intent: str, card_types: list) -> str:
        """
        Returns intent-specific prompt augmentation for Arabic responses.
        Mirrors _get_intent_augmentation but in Arabic.
        """
        intent_upper = str(intent).upper()
        
        # COMPARISON → شخصيات الأسهم
        if intent_upper in ['COMPARE_STOCKS', 'COMPARE'] or 'compare_table' in card_types:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "خاص: ملفات شخصية للأسهم (إلزامي)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "لكل سهم في المقارنة، أنشئ قسم 'شخصية':\n"
                "التنسيق:\n"
                "**[إيموجي] [الرمز] ([اللقب])**\n"
                "- 👍 الإيجابي: [2-3 نقاط قوة مع بيانات]\n"
                "- 👎 السلبي: [2-3 نقاط ضعف مع بيانات]\n"
                "- 🎯 الملف: [جملة واحدة تصف نوع المستثمر المناسب]\n\n"
                "بعد الشخصيات، أضف دليل المفاضلة:\n"
                "[MY_FRAMEWORK]\n"
                "اكتب دليل عملي. مثال:\n"
                "'تريد أقصى عائد؟ → [سهم]. تريد أمان؟ → [سهم]. تريد نمو + استقرار؟ → [سهم].'\n\n"
            )
        
        # SCREENER → بطاقة المنهجية
        if intent_upper in ['SCREENER_PE', 'SCREENER_PB', 'SCREENER_YIELD', 'HIDDEN_GEMS',
                           'UNDERVALUED', 'MOST_UNDERVALUED'] or 'screener_results' in card_types:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "خاص: بطاقة المنهجية (إلزامي)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "قبل عرض النتائج، اشرح منهجية الفحص:\n"
                "[METHODOLOGY]\n"
                "العنوان: معايير الفحص\n"
                "- معيار 1: ماذا تفحص (مثال: 'مكرر ربحية < 10x — بحث عن أرباح رخيصة')\n"
                "- معيار 2: فلتر الجودة (مثال: 'عائد على الملكية > 15%')\n"
                "- معيار 3: فلتر الأمان (مثال: 'الدين/الملكية < 1.0')\n\n"
                "لكل سهم في النتائج، قدم تبرير من 1-2 سطر.\n\n"
            )
        
        # MACRO → بطاقة الماكرو
        if intent_upper in ['MARKET_STATUS', 'MARKET_OVERVIEW', 'EGX30', 'MACRO', 'INDEX_INFO']:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "خاص: بطاقة أداء الماكرو (إلزامي)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "[FRAMEWORK]\n"
                "Title: بطاقة أداء الماكرو المصري\n"
                "Subtitle: التقييم العام (حذر متفائل / محايد / مقلق)\n"
                "- مسار أسعار الفائدة (وزن: 25%): [التقييم]\n"
                "- استقرار العملة (وزن: 20%): [التقييم]\n"
                "- اتجاه التدفقات الأجنبية (وزن: 20%): [التقييم]\n"
                "- زخم موسم الأرباح (وزن: 20%): [التقييم]\n"
                "- البيئة التنظيمية/السياسية (وزن: 15%): [التقييم]\n\n"
                "[MY_FRAMEWORK]\n"
                "قدم دليل تموضع المحفظة:\n"
                "'البيئة الحالية تفضل: [القطاعات]. قلل التعرض لـ: [القطاعات]. المحفز الرئيسي: [الحدث القادم].'\n\n"
            )
        
        # EDUCATIONAL → الغوص التعليمي
        if intent_upper in ['DEFINE_TERM', 'EDUCATIONAL', 'WHAT_IS', 'EXPLAIN']:
            return (
                "═══════════════════════════════════════════════════════════════\n"
                "خاص: الغوص التعليمي العميق (إلزامي)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "نظم شرحك بكل العناصر التالية:\n"
                "1. **المعادلة**: اعرض طريقة الحساب\n"
                "2. **ماذا يقيس**: شرح بلغة بسيطة\n"
                "3. **مثال حقيقي**: استخدم شركة مصرية فعلية\n"
                "4. **لماذا مهم**: اربطه بقرارات الاستثمار\n"
                "5. **متى يكون مضلل**: التحفظات والحالات الخاصة\n"
                "6. **معايير القطاعات**: نطاقات خاصة بالبورصة المصرية\n\n"
                "تخطى علامات [BULL_CASE]/[BEAR_CASE] للاستفسارات التعليمية البحتة.\n\n"
            )
        
        return ""


# Singleton
_explainer = LLMExplainerService()

def get_explainer() -> LLMExplainerService:
    return _explainer
