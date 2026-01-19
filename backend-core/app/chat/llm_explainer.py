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
        is_first_message: bool = False,
        is_returning_user: bool = False
    ) -> Optional[str]:
        """
        Generates the 'Conversational Voice' (Narrative) layer.
        This is the "Human Analyst" upgrade that provides empathy, coaching, and summaries.
        """
        if not self.client:
            return None

        # Build Data Context Summary
        context_str = self._format_data_for_context(data)
        lang_instruction = "Arabic (Modern Standard)" if language == 'ar' else "English"
        
        # AGGRESSIVE GREETING CONTROL
        # Logic: If it's NOT the first message of a fresh session, we BANNED greetings entirely.
        
        if is_first_message:
            greeting_section = (
                "GREETING STRATEGY (CHOOSE ONE):\n"
                "1. If New User: 'Welcome [Name] 👋 I’m Starta. I’ll help you understand Egyptian stocks.'\n"
                "2. If Returning: 'Welcome back [Name] 👋 Ready to analyze?'\n"
            )
        else:
            greeting_section = (
                "STRICT RULES - NO GREETINGS ALLOWED:\n"
                " - You are in mid-conversation.\n"
                " - DO NOT say 'Welcome', 'Hello', 'Hi', 'Welcome back', or 'Greetings'.\n"
                " - DO NOT use the user's name again.\n"
                " - START DIRECTLY with the answer.\n"
                " - VIOLATION: Saying 'Welcome back' is a critical error.\n"
            )

        # Core Persona & Instruction (CHIEF EXPERT UPGRADE)
        system_prompt = (
            f"You are Starta (ستارتا), an expert Financial Analyst. You are speaking to {user_name}.\n"
            f"Your tone is professional, extremely direct, and data-focused.\n\n"

            f"{greeting_section}\n"

            "STRICT OUTPUT GUIDELINES:\n"
            f"1. Respond ONLY in {lang_instruction}.\n"
            "2. LENGTH: 20-40 words MAXIMUM. Be extremely concise.\n"
            "3. STYLE: Real conversational reply, like ChatGPT/Gemini but shorter.\n"
            "4. NO buy/sell advice.\n"
            "5. NO fluff. NO 'I hope this helps'. NO 'Let me know if you need more'.\n"
            "6. DATA: Interpret the data immediately. If data is missing, say so clearly.\n\n"

            f"Current Context: is_first_message={is_first_message}, is_returning_user={is_returning_user}."
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

        # Priority 2: Fallback to common metrics if we have data cards but few definitions
        if data and len(explanations) < 2:
            defaults = ["pe_ratio", "market_cap"] if language == 'en' else ["pe_ratio", "market_cap"]
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


# Singleton
_explainer = LLMExplainerService()

def get_explainer() -> LLMExplainerService:
    return _explainer
