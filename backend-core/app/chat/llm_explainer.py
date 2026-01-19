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
             "f_score": ("Piotroski F-Score", "Score of 0-9 assessing financial strength. 9 is perfect, 0-2 is weak.")
        }

    async def generate_narrative(
        self, 
        query: str, 
        intent: str,
        data: List[Dict[str, Any]], 
        language: str = "en",
        user_name: str = "Bhidy"
    ) -> Optional[str]:
        """
        Generates the 'Conversational Voice' (Narrative) layer.
        This is the "Human Analyst" upgrade that provides empathy, coaching, and summaries.
        """
        if not self.client:
            return None

        # Build Data Context Summary
        context_str = self._format_data_for_context(data)
        lang_instruction = "Arabic (Modern Standard with friendly Egyptian warmth)" if language == 'ar' else "English"
        
        # System Prompt - The "Expert Human Analyst" Voice (Starta)
        system_prompt = (
            f"You are Starta (ستارتا), a senior financial analyst and empathetic coach for {user_name}.\n"
            f"Starta is a senior financial analyst and empathetic coach. She provides professional, \n"
            f"accurate, and insightful market commentary. She ALWAYS starts with a warm, natural \n"
            f"greeting using the user name provided. She prioritizes the DATA found in the \n"
            f"[CONTEXT DATA] block above all else. If data is present in that block, she MUST \n"
            f"discuss it and never claim it's missing. She uses a storytelling approach to \n"
            f"explain market trends, value, and risks.\n"
            f"\n"
            f"RULES:\n"
            f"1. **Personalization**: Use the name '{user_name}' naturally (not every time, but periodically).\n"
            f"2. **Empathy & Coaching**: Start with empathy or a coaching comment if appropriate. "
            f"Examples: 'I understand why you're checking this...', 'That's a smart question, let's look...', 'Checking this first is a very wise move.'\n"
            f"3. **Value-Add**: Do NOT just list numbers. Synthesize the data into a 'Narrative Story'. "
            f"Briefly explain the 'So What?' (e.g., 'The high margins suggest strong pricing power').\n"
            f"4. **Educational Linking**: If the user asks for a definition, explain it simply, THEN use the provided stock data to give a real example.\n"
            f"5. **Constraints**: STRICTLY under 60 words. No market advice (no 'Buy/Sell'). EGX stocks only.\n"
            f"6. **Formatting**: Use **bold** for key metrics and stock names.\n"
            f"7. **Language**: Respond STRICTLY in {lang_instruction}.\n\n"
            
            f"TONE EXAMPLES:\n"
            f"- 'Bhidy, you're thinking smart by checking **CIB** first. It's solid at **82.5 EGP**, showing real resilience today.'\n"
            f"- 'I understand your point—valuation is key. **TMGH** is trading at a P/E of **12**, which is lower than the sector average.'\n"
            f"- 'Here's a clear breakdown to help you understand it easily. Notice the **15% growth** in cash flow—that's the real hero here.'"
        )

        try:
            # If no data exists (e.g., small talk or unknown), we still want a conversational response
            user_content = f"Query: {query}\nIntent: {intent}\n\nDATA:\n{context_str}"
            if not data:
                user_content = f"Query: {query}\nIntent: {intent}\n(No data found. Provide a polite help/guidance response for {user_name}.)"

            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                model=MODEL_NAME,
                max_tokens=150, # Slightly more for storytelling
                temperature=0.6, # A bit more creative for "human" feel
                timeout=4.0
            )
            return chat_completion.choices[0].message.content.strip()
            
        except Exception as e:
            logger.warning(f"Narrative generation failed: {e}")
            return None

    def extract_fact_explanations(self, data: List[Dict[str, Any]], language: str = 'en') -> Dict[str, str]:
        """
        Scans response data for technical terms and providing definitions.
        """
        explanations = {}
        data_str = str(data).lower()
        
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
            }
        }
        
        for key, lang_data in FACTS.items():
            title, definition = lang_data.get(language, lang_data['en'])
            if key in data_str:
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
