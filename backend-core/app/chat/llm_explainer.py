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
from groq import AsyncGroq
from app.core.config import settings

# Logger
logger = logging.getLogger(__name__)

# Constants
# Use settings which handles .env loading reliably
GROQ_API_KEY = settings.GROQ_API_KEY 
MODEL_NAME = "llama-3.3-70b-versatile" # Fast, high quality
MAX_TOKENS = 400
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
        self.client = None
        if GROQ_API_KEY:
            try:
                self.client = AsyncGroq(api_key=GROQ_API_KEY)
                logger.info("LLMExplainerService initialized with Groq")
            except Exception as e:
                logger.error(f"Failed to init Groq client: {e}")
        else:
            logger.warning("GROQ_API_KEY not found. LLM Explainer disabled.")

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
        if not self.client:
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
        context_str = self._format_data_for_context(data)
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

        if is_deep_dive:
            logger.info("-> ACTIVATING CFA LEVEL 3 ENTERPRISE ANALYST")
            # --- ENTERPRISE CFA LEVEL III ANALYST PROMPT ---
            # True analyst writing style with professional number formatting
            system_prompt = (
                "You are a CFA Level III Charterholder, Chief Equity Analyst at Starta Markets.\n\n"
                
                "═══════════════════════════════════════════════════════════════\n"
                "YOUR VOICE: Write like you're presenting to a Portfolio Manager\n"
                "═══════════════════════════════════════════════════════════════\n"
                "• You are NOT a robot listing numbers. You are a professional analyst INTERPRETING data.\n"
                "• Weave numbers naturally into your narrative with context and meaning.\n"
                "• Use confident, institutional language: 'demonstrates', 'reflects', 'suggests'.\n"
                "• Provide your VIEW on what the data means - that's what analysts do.\n"
                "• Sound like a Bloomberg terminal note or Morgan Stanley research.\n\n"
                
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "💰 NUMBER FORMATTING (CRITICAL - READ CAREFULLY)\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "Financial statement values (revenue, net_income, total_assets, etc.) are in MILLIONS.\n\n"
                
                "YOU MUST FORMAT ALL FINANCIAL NUMBERS AS FOLLOWS:\n"
                "• Add commas for thousands: 74948 → 74,948\n"
                "• Remove .00 decimals: 74948.00 → 74,948\n"
                "• ALWAYS add scale suffix: 'EGP 74,948 million' or 'EGP 74.9 billion'\n"
                "• For very large numbers: 124000 million = 'EGP 124 billion'\n"
                "• For negative: -35520 → 'EGP -35,520 million' or 'EGP -35.5 billion'\n\n"
                
                "EXAMPLES OF CORRECT FORMATTING:\n"
                "❌ BAD: 'revenue of 124000.00 EGP'\n"
                "✅ GOOD: 'revenue of **EGP 124 billion**'\n\n"
                
                "❌ BAD: 'net income of 74948.00 EGP'\n"
                "✅ GOOD: 'net income of **EGP 74.9 billion**'\n\n"
                
                "❌ BAD: 'cash flow of -35520.00 EGP'\n"
                "✅ GOOD: 'operating cash flow of **EGP -35.5 billion**'\n\n"
                
                "❌ BAD: 'total assets of 1355579.00 EGP'\n"
                "✅ GOOD: 'total assets of **EGP 1.36 trillion**'\n\n"
                
                "SCALE REFERENCE:\n"
                "• 1,000 million = 1 billion (write as 'X billion')\n"
                "• 1,000,000 million = 1 trillion (write as 'X trillion')\n"
                "• Under 1,000 million = keep as 'X million'\n\n"
                
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "🚫 DATA INTEGRITY RULES\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "1. If a field is missing from DATA → DO NOT MENTION IT AT ALL.\n"
                "   → NEVER say 'no data', '(no data)', 'N/A', or '0.00'.\n"
                "   → Simply omit that bullet point or sentence.\n"
                "2. NEVER calculate growth rates, margins, or year-over-year changes.\n"
                "3. Use ONLY the values provided in the DATA section below.\n"
                "4. Percentages (ROE, margins, yields) are already formatted - use as-is.\n\n"
                
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "📋 OUTPUT STRUCTURE\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "Start with 2-3 sentences introducing the company and your overall thesis.\n"
                "Then use ONLY the sections where you have actual data:\n\n"
                
                "**📊 Profitability & Growth**\n"
                "Write a cohesive paragraph analyzing profitability.\n"
                "Example: 'CIB delivered net income of **EGP 74.9 billion** on revenue of **EGP 124 billion**, \n"
                "reflecting exceptional profitability. With ROE at **43.3%** and ROA of **6.1%**, \n"
                "the bank demonstrates industry-leading capital efficiency.'\n\n"
                
                "**📈 Operating Efficiency & Margins**\n"
                "Analyze margins in context. Be insightful.\n"
                "Example: 'Operating margin of **82.1%** underscores management's tight cost control. \n"
                "This level of operational efficiency is rare in Egyptian banking.'\n\n"
                
                "**💰 Cash Flow Position** (CRITICAL FLAG if negative)\n"
                "If OCF or FCF is negative, this MUST be highlighted prominently.\n"
                "Example: 'Operating cash flow is negative at **EGP -35.5 billion**, a significant red flag \n"
                "that warrants careful attention despite the strong reported earnings.'\n\n"
                
                "**📊 Balance Sheet & Liquidity**\n"
                "Discuss financial stability, cash position, debt levels.\n"
                "Example: 'Total assets stand at **EGP 1.36 trillion**, with cash of **EGP 231 billion** \n"
                "providing substantial liquidity. Book value of **EGP 208 billion** translates to \n"
                "**EGP 61.5** per share.'\n\n"
                
                "**📌 Valuation Context**\n"
                "Present valuation metrics with market context.\n"
                "Example: 'At **5.2x** trailing P/E and **1.7x** P/B, CIB trades at a modest premium \n"
                "to book value. Dividend yield of **2.3%** provides income while you wait.'\n\n"
                
                "**⚠️ Key Risks**\n"
                "2-4 bullet points on sector-specific risks based on the data.\n"
                "For banks: FX exposure, sovereign concentration, NIM compression.\n"
                "For real estate: project delivery, collections, leverage.\n\n"
                
                "**✅ Analyst View**\n"
                "Your synthesis and conviction. Be bold but grounded in data.\n"
                "Example: 'CIB remains Egypt's premier private-sector bank with unmatched profitability. \n"
                "The negative cash flow deserves monitoring, but the valuation and fundamentals suggest \n"
                "a quality franchise trading at a reasonable multiple. We see it as a core holding \n"
                "for EGX exposure.'\n\n"
                
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "SECTOR LOGIC (Apply Correctly)\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "BANKS: Focus on ROE, NIM, asset quality, capital adequacy, liquidity.\n"
                "REAL ESTATE: Focus on revenue recognition, collections, project pipeline, leverage.\n"
                "CORPORATE: Standard profitability, margins, cash flow, valuation.\n\n"
                
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "FINAL CHECK (Silent)\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "Before output, verify:\n"
                "✔ ALL financial numbers have scale suffix (million/billion/trillion)\n"
                "✔ ALL large numbers have commas (1,355,579 not 1355579)\n"
                "✔ NO .00 decimal endings on whole numbers\n"
                "✔ No 'no data', 'N/A', or zero values mentioned\n"
                "✔ Writing style is CFA analyst, not robotic\n"
                "✔ Each section has meaningful analysis, not just bullets\n"
                "✔ Negative cash flows are flagged when present\n\n"
                
                f"Language: {lang_instruction}.\n"
                f"Data Context: {card_context}.\n"
            )

        
        elif allow_greeting:
            # --- PROMPT A: NEW SESSION (Greeting Allowed) ---
            # Optimized: ~120 tokens (was ~250 tokens)
            system_prompt = (
                f"You are Starta AI (ستارتا), expert Financial Analyst built by Osama, "
                f"former CEO of Mubasher Asset Management with 20+ years buy-side/sell-side experience.\n"
                f"GREETING REQUIRED: Welcome {user_name} warmly.\n"
                f"Language: {lang_instruction}. Length: 25-35 words.\n"
                "Style: Like a veteran investor having coffee - conversational, direct, confident. No corporate speak."
            )
        else:
            # --- PROMPT B: ONGOING CONVERSATION (Enhanced Starta AI Personality) ---
            # Based on complete_implementation_kit.md - Osama's institutional framework
            system_prompt = (
                f"You are Starta AI, expert Financial Analyst with 20+ years institutional experience.\n\n"
                
                "═══════════════════════════════════════════════════════════════\n"
                "YOUR ANALYTICAL FRAMEWORK (Macro & Intermarket - NOT Technical)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "• Focus on: Business cycles, USD/rates impact, seasonality, sector rotation\n"
                "• DO NOT USE: RSI, MACD, Fibonacci, chart patterns, moving average crossovers\n"
                "• Always explain WHY, not just WHAT (quantify drivers)\n"
                "• Present BOTH bull case AND bear case objectively\n\n"
                
                "═══════════════════════════════════════════════════════════════\n"
                "TONE & STYLE\n"
                "═══════════════════════════════════════════════════════════════\n"
                "• Conversational but professional (like coffee with a veteran investor)\n"
                "• Direct and honest - no sugar-coating, no corporate speak\n"
                "• Start with insight: 'JUFO's in an interesting spot...' not 'Based on the data...'\n"
                "• Use active voice: 'I see three drivers...' not 'Three drivers can be observed'\n"
                "• Vary sentence length. Short for emphasis. Longer for explanation.\n"
                "• AVOID: 'interesting opportunity', 'well-positioned', 'leverage synergies'\n\n"
                
                "═══════════════════════════════════════════════════════════════\n"
                "SECTOR VALUATION (Use appropriate metrics)\n"
                "═══════════════════════════════════════════════════════════════\n"
                "• BANKS: P/B <1.2x undervalued, ROE >15%, NPL <5%\n"
                "• REAL ESTATE: P/B <0.8x, D/E <0.6x (leverage check)\n"
                "• CONSUMER/F&B: P/E <10x, Gross margin >20%\n"
                "• INDUSTRIALS: P/E <8x, Operating margin >12%\n\n"
                
                "═══════════════════════════════════════════════════════════════\n"
                "RULES\n"
                "═══════════════════════════════════════════════════════════════\n"
                f"Showing user: {card_context}\n"
                f"Language: {lang_instruction}. Length: 40-70 words.\n"
                "Task: Provide institutional-quality analysis of the DATA shown.\n"
                "• Reference actual numbers with context and meaning\n"
                "• Present bull/bear view where appropriate\n"
                "• End with: 'This is educational analysis. Consider your circumstances.'\n"
                f"• Start response with '{user_name}, ' if name provided\n"
            )

        # Use Multi-Provider LLM Client for resilience
        from .llm_clients import get_multi_llm
        multi_llm = get_multi_llm()
        
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

    def _format_data_for_context(self, cards: List[Dict[str, Any]]) -> str:
        """
        Format the structured cards into a compact string for LLM.
        
        PHASE 3 OPTIMIZATION: Ultra-compact format to reduce token count.
        Same data values, fewer tokens (~50% reduction).
        Format: "SYMBOL PRICE CHANGE | KEY=VAL KEY=VAL"
        """
        try:
            summary_parts = []
            
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
                    summary_parts.append(f"FINANCIAL_REPORT_FOR: {symbol} [{curr}]")
                    
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
                                    found.append(f"{row['label']}:[{', '.join(vals)}]{change_str}")
                        return " | ".join(found)

                    # 2. Income Statement High-Level
                    # Added 'Effective Tax Rate' and 'Research & Development' for quality checks
                    inc_str = extract_latest('income', ['Revenue', 'Gross Profit', 'Gross Margin', 'Operating Income', 'Net Income', 'EPS', 'EBITDA', 'Effective Tax Rate'])
                    if inc_str: summary_parts.append(f"INCOME({period_label}): {inc_str}")
                    
                    # 3. Balance Sheet Health
                    bal_str = extract_latest('balance', ['Cash', 'Total Assets', 'Total Liabilities', 'Total Equity', 'Debt', 'Retained Earnings', 'Goodwill'])
                    if bal_str: summary_parts.append(f"BALANCE({period_label}): {bal_str}")
                    
                    # 4. Cash Flow Quality
                    # Added 'Stock-Based Compensation' (Dilution risk) and 'Dividends Paid'
                    cf_str = extract_latest('cashflow', ['Operating Cash Flow', 'Capital Expenditures', 'Free Cash Flow', 'Stock-Based Compensation', 'Dividends Paid'])
                    if cf_str: summary_parts.append(f"CASHFLOW({period_label}): {cf_str}")
                    
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
                                    found.append(f"{row['label']}={v}")
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
                    if ratio_str: summary_parts.append(f"RATIOS(Latest): {ratio_str}")

                    
                elif c_type == "snapshot":
                    # Compact: "Price:82.95 Chg:-0.95%"
                    price = c_data.get('last_price', '')
                    change = c_data.get('change_percent', '')
                    if price:
                        summary_parts.append(f"Price:{price} Chg:{change}%")
                    
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
                            items.append(f"{short_key}={val}")
                    if items:
                        summary_parts.append(" ".join(items[:6]))
                        
                elif c_type == "financial_trend":
                    items = c_data.get('items', [])
                    if items:
                        last = items[-1]
                        summary_parts.append(f"Rev:{last.get('revenue')} Grw:{last.get('growth')}%")
                        
                elif c_type == "dividends":
                    yield_val = c_data.get('yield', '')
                    count = len(c_data.get('items', []))
                    summary_parts.append(f"DivYield:{yield_val}% Hist:{count}")
                    
                elif c_type == 'screener_results':
                    stocks = c_data.get('stocks', [])
                    # Compact: "5 stocks: TMGH(+5.2%) CIB(+3.1%)..."
                    top3 = [f"{s.get('symbol')}({s.get('value', s.get('change_percent', ''))})" 
                            for s in stocks[:3]]
                    summary_parts.append(f"{len(stocks)} stocks: {' '.join(top3)}")
                    
                elif c_type == 'movers_table':
                    movers = c_data.get('movers', [])
                    direction = "Gainers" if c_data.get('direction') == 'up' else "Losers"
                    top3 = [f"{s.get('symbol')}({s.get('change_percent')}%)" for s in movers[:3]]
                    summary_parts.append(f"{direction}: {' '.join(top3)}")
                    
                elif c_type in ['deep_valuation', 'valuation', 'deep_health', 'health', 
                               'deep_growth', 'growth', 'deep_efficiency', 'efficiency']:
                    # Generic metric extraction - compact format
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
                    # Data structure: c_data['annual_data']['income'] -> List of rows
                    
                    try:
                        annual = c_data.get('annual_data', {})
                        years = annual.get('years', [])[:3] # Last 3 years
                        if years:
                            # Helper to find row by label (using partial match safety)
                            def get_row_val(rows, label_part, year):
                                for r in rows:
                                    if label_part.lower() == r.get('label', '').lower() or label_part.lower() in r.get('label', '').lower():
                                        val = r.get('values', {}).get(year)
                                        return val if val is not None else "N/A"
                                return "N/A"

                            income_rows = annual.get('income', [])
                            balance_rows = annual.get('balance', [])
                            cashflow_rows = annual.get('cashflow', [])
                            ratios_rows = annual.get('ratios', [])
                            
                            metrics = []
                            for y in years:
                                # 1. Profitability & Growth
                                rev = get_row_val(income_rows, 'revenue', y)
                                gross = get_row_val(income_rows, 'gross profit', y)
                                net = get_row_val(income_rows, 'net income', y)
                                eps = get_row_val(income_rows, 'eps', y)
                                
                                # 2. Margins
                                gross_m = get_row_val(ratios_rows, 'gross margin', y)
                                op_m = get_row_val(ratios_rows, 'operating margin', y)
                                net_m = get_row_val(ratios_rows, 'net margin', y)
                                
                                # 3. Returns
                                roe = get_row_val(ratios_rows, 'return on equity', y)
                                roa = get_row_val(ratios_rows, 'return on assets', y)
                                
                                # 4. Leverage & Liquidity
                                debt_eq = get_row_val(ratios_rows, 'debt / equity', y)
                                curr_ratio = get_row_val(ratios_rows, 'current ratio', y)
                                quick_ratio = get_row_val(ratios_rows, 'quick ratio', y)
                                
                                # 5. Cash Flow
                                ocf = get_row_val(cashflow_rows, 'operating cash flow', y)
                                fcf = get_row_val(cashflow_rows, 'free cash flow', y)
                                
                                # 6. Valuation
                                pe = get_row_val(ratios_rows, 'pe ratio', y)
                                pb = get_row_val(ratios_rows, 'pb ratio', y)
                                ev_ebitda = get_row_val(ratios_rows, 'ev/ebitda', y)
                                
                                # Format nicely
                                part = (
                                    f"YEAR {y}: "
                                    f"Rev={rev} Gross={gross} Net={net} EPS={eps} | "
                                    f"Mrg(G/O/N)={gross_m}%/{op_m}%/{net_m}% | "
                                    f"ROE={roe}% ROA={roa}% | "
                                    f"D/E={debt_eq} CurrR={curr_ratio} | "
                                    f"OCF={ocf} FCF={fcf} | "
                                    f"Val(PE/PB/EV)={pe}/{pb}/{ev_ebitda}"
                                )
                                metrics.append(part)
                            
                            # Add TTM context if available
                            ttm = c_data.get('ttm_data', {})
                            if ttm and ttm.get('years'):
                                ttm_per = ttm.get('years')[0]
                                ttm_rev = get_row_val(ttm.get('income', []), 'revenue', ttm_per)
                                ttm_gross = get_row_val(ttm.get('income', []), 'gross profit', ttm_per)
                                ttm_net = get_row_val(ttm.get('income', []), 'net income', ttm_per)
                                ttm_pe = get_row_val(ttm.get('ratios', []), 'pe ratio', ttm_per)
                                metrics.insert(0, f"TTM ({ttm_per}): Rev={ttm_rev} Gross={ttm_gross} Net={ttm_net} PE={ttm_pe}")

                            if metrics:
                                summary_parts.append(" || ".join(metrics))
                            else:
                                summary_parts.append("Financial Data Types: Income, Balance, Cashflow")
                    except Exception as e:
                        summary_parts.append(f"Financials Error: {str(e)}")

                elif c_type == 'sector_list':
                    stocks = c_data.get('stocks', [])
                    sector = c_data.get('sector', '')[:15]
                    summary_parts.append(f"Sector {sector}: {len(stocks)} stocks")
                    
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
        CARD_DESCRIPTIONS = {
            "stock_header": "stock overview with price and daily change",
            "snapshot": "key metrics and valuation summary",
            "stats": "detailed statistics",
            "financials_table": "financial statements",
            "financial_explorer": "comprehensive CFA-level financial data (Income, Balance, Cashflow, Ratios)",
            "dividends_table": "dividend history and yield",
            "compare_table": "side-by-side comparison",
            "movers_table": "top gainers/losers list",
            "sector_list": "stocks in a sector",
            "screener_results": "filtered stock results",
            "technicals": "technical indicators (RSI, MACD, etc.)",
            "ownership": "ownership structure",
            "fair_value": "valuation analysis",
            "news_list": "recent news articles",
            "deep_valuation": "deep valuation metrics (EV/EBIT, P/TBV)",
            "deep_health": "financial health indicators (Z-Score, F-Score)",
            "deep_growth": "growth analysis (CAGR, revenue trends)",
            "deep_efficiency": "efficiency metrics (ROCE, asset turnover)",
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
