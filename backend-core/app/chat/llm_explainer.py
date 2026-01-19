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
        language: str = "en"
    ) -> Optional[str]:
        """
        Generates the 'Conversational Voice' (Narrative) layer.
        This is ADDITIVE to the data cards.
        """
        if not self.client or not data:
            return None

        # Build Context
        context_str = self._format_data_for_context(data)
        lang_instruction = "Arabic (Modern Standard + Friendly)" if language == 'ar' else "English"
        
        # System Prompt - The "Expert Hybrid Voice"
        system_prompt = (
            "You are Starta (ستارتا), a senior financial analyst.\n"
            "Your goal is to provide a BRIEF, engaging summary that introduces the data shown below.\n\n"
            
            "RULES:\n"
            "1. **Additive Nature**: The user sees the charts/tables below. Do NOT repeat every number. Just highlight the ONE most key insight.\n"
            "2. **Tone**: Conversational, confident, and direct. (Like a text from a smart friend).\n"
            "3. **Length**: STRICTLY under 40 words. 2 sentences MAX.\n"
            "4. **Formatting**: Use **bold** for the single most important number.\n"
            f"5. **Language**: Respond STRICTLY in {lang_instruction}.\n\n"
            
            "EXAMPLES:\n"
            "- 'CIB is trading strong today at **82.5 EGP**, bucking the market trend.'\n"
            "- 'I found 5 stocks matching your criteria. **Fawry** looks interesting with its high ROE.'\n"
            "- 'Here is the income statement. Notice the **20% revenue jump**—that's the key takeaway.'"
        )

        try:
            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Query: {query}\nIntent: {intent}\n\nDATA:\n{context_str}"}
                ],
                model=MODEL_NAME,
                max_tokens=100, # Strict limit for speed
                temperature=0.4,
                timeout=3.0 # Fast timeout
            )
            return chat_completion.choices[0].message.content.strip()
            
        except Exception as e:
            logger.warning(f"Narrative generation failed: {e}")
            return None

    def extract_fact_explanations(self, data: List[Dict[str, Any]], language: str = 'en') -> Dict[str, str]:
        """
        Scans response data for technical terms and providing definitions.
        Uses local dictionary for zero-latency.
        """
        explanations = {}
        
        # Flatten data to string for searching
        data_str = str(data).lower()
        
        for key, (title, definition) in self.FACT_DEFINITIONS.items():
            # Check if term key or title exists in data
            if key in data_str or title.lower() in data_str:
                # Localize if needed (Simple static mapping for now, can expand later)
                if language == 'ar':
                    # Basic Arabic placeholders - ideal would be a full bilingual dict
                    pass 
                
                explanations[title] = definition
                
                # Limit to 3 definitions to avoid clutter
                if len(explanations) >= 3:
                    break
                    
        return explanations

    def _format_data_for_context(self, cards: List[Dict[str, Any]]) -> str:
        """Format the structured cards into a compact string for LLM."""
        try:
            summary_lines = []
            for card in cards:
                c_type = card.get("type")
                c_data = card.get("data", {})
                
                if c_type == "stock_header":
                    summary_lines.append(f"Stock: {c_data.get('symbol')} @ {c_data.get('price')} (Change: {c_data.get('change_percent')}%)")
                elif c_type == "snapshot":
                    summary_lines.append(f"Snapshot: PE={c_data.get('pe_ratio')}, Cap={c_data.get('market_cap')}, Yield={c_data.get('yield')}")
                elif c_type == "screener_results":
                     # Summarize first 3 results
                     items = c_data.get('items', [])[:3]
                     names = [i.get('symbol') for i in items]
                     summary_lines.append(f"Screener Results: Found {len(c_data.get('items', []))} stocks. Top: {', '.join(names)}")
                else:
                    summary_lines.append(f"[{c_type}] Data available.")
            
            return "\n".join(summary_lines)
        except Exception:
            return "Data available."

# Singleton
_explainer = LLMExplainerService()

def get_explainer() -> LLMExplainerService:
    return _explainer
