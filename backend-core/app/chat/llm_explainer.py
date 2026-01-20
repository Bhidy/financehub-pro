"""
LLM Explainer Service
=====================
Acts as the "Stylist & Expert Voice" layer for the Chatbot.
Takes raw data (decided by the Brain) and generates natural language explanations.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from groq import AsyncGroq

# Logger
logger = logging.getLogger(__name__)

# Constants
# Use a default key if env var is missing to avoid crash during init, but fail gracefully later 
GROQ_API_KEY = os.environ.get("GROQ_API_KEY") 
MODEL_NAME = "llama-3.3-70b-versatile" # Fast, high quality
MAX_TOKENS = 400
TIMEOUT = 4.0 # Slightly increased for better analysis

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
        user_name: str = "Trader",
        allow_greeting: bool = False, # CHANGED FROM is_first_message
        is_returning_user: bool = False
    ) -> Optional[str]:
        """
        Generates the 'Conversational Voice' (Narrative) layer.
        Uses Split-Prompt Architecture to enforce strictly no greetings in ongoing chats.
        """
        if not self.client:
            return None

        # Build Data Context Summary
        context_str = self._format_data_for_context(data)
        lang_instruction = "Arabic (Modern Standard)" if language == 'ar' else "English"
        
        # WORLD-CLASS CONVERSATIONAL FRAMEWORK
        # =====================================
        # Layer ② - Data-Aware Commentary (Core - this is what LLM generates)
        # The LLM produces the core narrative; Layers ① and ③ are added by ResponseComposer
        
        # Build card type context for the LLM
        card_types = [c.get('type', 'data') for c in data] if data else []
        card_context = self._describe_cards(card_types)
        
        if allow_greeting:
            # --- PROMPT A: NEW SESSION (Conversational Intent) ---
            # When user says "hello" or first message is conversational
            system_prompt = (
                f"You are Starta (ستارتا), a friendly and expert Financial Analyst.\n\n"
                
                "GREETING ALLOWED - This is a new conversation.\n"
                f"You MAY welcome the user naturally. Examples:\n"
                f"- 'Hey {user_name}! Ready to dive into the market?'\n"
                f"- 'Hello! What would you like to explore today?'\n"
                "But keep it brief - one short line maximum.\n\n"
                
                "GUIDELINES:\n"
                f"1. LANGUAGE: Respond ONLY in {lang_instruction}.\n"
                "2. LENGTH: 20-40 words MAXIMUM.\n"
                "3. STYLE: Natural, conversational, like talking to a smart friend.\n"
                "4. NO marketing language, NO emojis beyond greeting.\n"
            )
        else:
            # --- PROMPT B: ONGOING CONVERSATION (Data-Focused) ---
            # This is the core narrative prompt - produces Layer ②
            system_prompt = (
                f"You are Starta, an expert Financial Analyst providing data commentary.\n\n"
                
                "⛔ CRITICAL: This is an ONGOING conversation.\n"
                "DO NOT greet. DO NOT say welcome. DO NOT use the user's name.\n"
                "START DIRECTLY with your analysis.\n\n"
                
                "YOUR TASK (Layer ② - Data-Aware Commentary):\n"
                f"The user is being shown: {card_context}\n"
                "Your job is to EXPLAIN and CONTEXTUALIZE, not repeat raw numbers.\n\n"
                
                "GOOD RESPONSE PATTERNS:\n"
                "- 'Based on the latest numbers, here's how this stock is positioned.'\n"
                "- 'Looking at today's valuation metrics, this gives us a clearer picture.'\n"
                "- 'When we combine price movement with valuation, this is what stands out.'\n"
                "- 'The current metrics suggest the market is pricing in growth expectations.'\n"
                "- 'From a valuation perspective, this stock is in an interesting range.'\n\n"
                
                "BAD RESPONSES (NEVER DO THIS):\n"
                "- 'Welcome back!' ← FORBIDDEN\n"
                "- 'The price is 45.5 EGP' ← Already on card, don't repeat\n"
                "- 'P/E ratio is 12.5' ← Already on card\n"
                "- 'Hello Mohamed!' ← FORBIDDEN\n\n"
                
                "VARIATION REQUIREMENT:\n"
                "Each response must be UNIQUE. Never use the same phrasing twice.\n"
                "Be creative in how you describe the data context.\n\n"
                
                "GUIDELINES:\n"
                f"1. LANGUAGE: Respond ONLY in {lang_instruction}.\n"
                "2. LENGTH: 20-40 words MAXIMUM. Be concise.\n"
                "3. CONNECT the data type to meaning, don't recite numbers.\n"
                "4. TONE: Calm, supportive, confident, professional.\n"
                "5. NO fluff phrases like 'I hope this helps' or 'Let me know'.\n"
            )

        try:
            # If no data exists (e.g., small talk or unknown), we still want a conversational response
            user_content = f"Query: {query}\nIntent: {intent}\n\nDATA:\n{context_str}"
            if not data:
                user_content = f"Query: {query}\nIntent: {intent}\n(No specific stock data found. Provide a helpful guide on what you can analyze.)"

            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                model=MODEL_NAME,
                max_tokens=250, 
                temperature=0.5, # Lower temperature for stricter adherence
                timeout=4.5
            )
            return chat_completion.choices[0].message.content.strip()
            
        except Exception as e:
            logger.warning(f"Narrative generation failed: {e}")
            return None

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
                "en": ("P/E Ratio", "Price-to-Earnings Ratio. It shows how much investors pay for $1 of profit."),
                "ar": ("مضاعف الربحية", "يقيس السعر الذي يدفعه المستثمر مقابل كل جنيه من أرباح الشركة.")
            },
            "market_cap": {
                "en": ("Market Cap", "Total market value of the company's shares."),
                "ar": ("القيمة السوقية", "إجمالي قيمة أسهم الشركة في السوق.")
            },
            "dividend_yield": {
                "en": ("Dividend Yield", "Annual dividend payment divided by the stock price."),
                "ar": ("عائد التوزيعات", "الربح النقدي السنوي الموزع مقارنة بسعر السهم.")
            },
            "z_score": {
                "en": ("Z-Score", "A measure of financial health. Above 3.0 is safe, below 1.8 is risky."),
                "ar": ("مؤشر ألتمان", "مقياس للصحة المالية. فوق 3.0 آمن، وتحت 1.8 يعبر عن وجود مخاطر.")
            },
            "eps": {
                "en": ("EPS", "Earnings Per Share. The portion of a company's profit allocated to each outstanding share of common stock."),
                "ar": ("ربحية السهم", "نصيب السهم الواحد من صافي أرباح الشركة.")
            },
            "roe": {
                "en": ("ROE", "Return on Equity. Measures a corporation's profitability in relation to stockholders' equity."),
                "ar": ("العائد على حقوق الملكية", "يقيس ربحية الشركة بالنسبة لحقوق المساهمين.")
            },
            "pb_ratio": {
                "en": ("P/B Ratio", "Price-to-Book Ratio. Compares market value to book value. Lower P/B could mean the stock is undervalued."),
                "ar": ("مضاعف القيمة الدفترية", "يقارن القيمة السوقية بالقيمة الدفترية. انخفاضه قد يعني أن السهم مقيم بأقل من قيمته.")
            },
            "ebitda": {
                "en": ("EBITDA", "Earnings Before Interest, Taxes, Depreciation, and Amortization."),
                "ar": ("الأرباح قبل الفوائد والضرائب", "مقياس لأداء الشركة المالي العام.")
            },
            "current_ratio": {
                "en": ("Current Ratio", "Ability to pay short-term obligations."),
                "ar": ("النسبة الحالية", "قدرة الشركة على سداد التزاماتها قصيرة الأجل.")
            },
            "operating_margin": {
                "en": ("Operating Margin", "Profit on a dollar of sales after variable costs."),
                "ar": ("هامش التشغيل", "الربح من كل دولار مبيعات بعد تغطية تكاليف الإنتاج.")
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
        """Format the structured cards into a compact string for LLM."""
        try:
            summary_lines = []
            for card in cards:
                c_type = card.get("type")
                c_data = card.get("data", {})
                
                if c_type == "stock_header":
                    summary_lines.append(f"Stock: {c_data.get('symbol')} ({c_data.get('name')})")
                elif c_type == "snapshot":
                    summary_lines.append(f"Price: {c_data.get('last_price')} (Change: {c_data.get('change_percent')}%)")
                    summary_lines.append(f"Metrics: PE={c_data.get('pe_ratio')}, PB={c_data.get('pb_ratio')}, Cap={c_data.get('market_cap_formatted')}")
                elif c_type == "financial_trend":
                    items = c_data.get('items', [])
                    if items:
                        last = items[-1]
                        summary_lines.append(f"Growth: {last.get('label')} Revenue={last.get('revenue')} ({last.get('growth')}%)")
                elif c_type == "dividends":
                    items = c_data.get('items', [])
                    if items:
                        summary_lines.append(f"Dividends: Yield={c_data.get('yield')}%, History={len(items)} records")
                elif c_type == 'screener_results':
                    stocks = c_data.get('stocks', [])
                    metric = c_data.get('metric', 'value')
                    summary = f"Screener Results ({len(stocks)} stocks): "
                    stock_strings = []
                    for s in stocks[:5]:  # Top 5 for context brevity
                        val = s.get('value', s.get(metric, 'N/A'))
                        stock_strings.append(f"{s['name']} ({s['symbol']}): {val}")
                    summary_lines.append(summary + ", ".join(stock_strings))
                    
                elif c_type == 'movers_table':
                    movers = c_data.get('movers', [])
                    direction = c_data.get('direction', 'up')
                    label = "Top Gainers" if direction == 'up' else "Top Losers"
                    stock_strings = [f"{s['name']} ({s['symbol']}): {s['change_percent']}%" for s in movers[:5]]
                    summary_lines.append(f"{label}: " + ", ".join(stock_strings))
                    
                elif c_type == 'sector_list':
                    stocks = c_data.get('stocks', [])
                    sector = c_data.get('sector', 'Unknown Sector')
                    stock_strings = [f"{s['name']} ({s['symbol']}): {s['price']}" for s in stocks[:5]]
                    summary_lines.append(f"Sector {sector}: " + ", ".join(stock_strings))
                elif "screener" in c_type:
                    summary_lines.append(f"Search Results: Found {len(c_data.get('items', []))} stocks.")
            
            return "\n".join(summary_lines) or "No specific metrics found."
        except Exception as e:
            return f"Data extraction error: {e}"

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
            "financial_explorer": "comprehensive financial data",
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
