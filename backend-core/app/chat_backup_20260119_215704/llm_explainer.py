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
    
    async def generate_explanation(
        self, 
        query: str, 
        intent: str,
        data: List[Dict[str, Any]], # Receives list of cards
        language: str = "en"
    ) -> Optional[str]:
        """
        Generate a conversational explanation for the provided data.
        
        Args:
            query: Original user query
            intent: Detected intent
            data: List of Card objects (dicts) returned by the handler
            language: 'en' or 'ar'
            
        Returns:
            String explanation or None if failure/timeout
        """
        if not self.client:
            return None
            
        # Skip explanation if no data
        if not data:
            return None

        # Build Context String (minimize tokens)
        context_str = self._format_data_for_context(data)
        
        # Determine constraints based on language
        lang_instruction = "Arabic (Modern Standard with financial terms)" if language == 'ar' else "English"
        
        # System Prompt - The "Expert Voice"
        system_prompt = (
            "You are Starta (ستارتا), a senior financial analyst assistant. "
            "Your goal is to explain the provided financial data clearly and professionally.\n\n"
            
            "RULES:\n"
            "1. **Analysis Only**: You MUST only describe the data given in the CONTEXT below. Do NOT invent numbers.\n"
            "2. **Definitions**: If a technical term appears (e.g., P/E, RSI, Beta, Yield), briefly define it in simple terms for a beginner.\n"
            "3. **Tone**: Professional, encouraging, and data-driven.\n"
            "4. **Formatting**: Use Markdown bolding (**text**) for key numbers and entities.\n"
            f"5. **Language**: Respond STRICTLY in {lang_instruction}.\n\n"
            
            "STRUCTURE:\n"
            "- Start with a direct summary of the key data point.\n"
            "- Add a 'What this means' or 'Insight' sentence.\n"
            "- If relevant, define 1 key term from the data.\n"
            "- Keep the total response under 4 sentences."
        )

        try:
            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user", 
                        "content": f"User Query: {query}\nIntent: {intent}\n\nDATA CONTEXT:\n{context_str}"
                    }
                ],
                model=MODEL_NAME,
                max_tokens=MAX_TOKENS,
                temperature=0.3, # Low temperature for factual consistency
                timeout=TIMEOUT
            )
            
            result = chat_completion.choices[0].message.content
            return result
            
        except Exception as e:
            logger.warning(f"LLM Explainer failed to generate: {e}")
            return None

    def _format_data_for_context(self, cards: List[Dict[str, Any]]) -> str:
        """Format the structured cards into a compact string for LLM."""
        try:
            summary_lines = []
            
            for card in cards:
                c_type = card.get("type")
                c_data = card.get("data", {})
                
                if c_type == "stock_header":
                    summary_lines.append(
                        f"[STOCK] {c_data.get('symbol')} ({c_data.get('name')})\n"
                        f"Price: {c_data.get('price')} {c_data.get('currency')} "
                        f"(Change: {c_data.get('change')} | {c_data.get('change_percent')}%)"
                    )
                    
                elif c_type == "stock_snapshot":
                    # Flattens specific snapshot fields
                    summary_lines.append("[SNAPSHOT]")
                    if 'market_cap' in c_data: summary_lines.append(f"Market Cap: {c_data['market_cap']}")
                    if 'pe_ratio' in c_data: summary_lines.append(f"P/E Ratio: {c_data['pe_ratio']}")
                    if 'yield' in c_data: summary_lines.append(f"Div Yield: {c_data['yield']}")
                    if 'sector' in c_data: summary_lines.append(f"Sector: {c_data['sector']}")
                    
                elif c_type == "ratios":
                    summary_lines.append("[FINANCIAL RATIOS]")
                    for k, v in c_data.items():
                        if isinstance(v, (str, int, float)) and v:
                            summary_lines.append(f"{k}: {v}")
                            
                elif c_type == "technicals":
                    summary_lines.append("[TECHNICAL INDICATORS]")
                    for k, v in c_data.items():
                        summary_lines.append(f"{k}: {v}")
                        
                elif c_type == "financials_table":
                    summary_lines.append("[FINANCIALS] (Table data provided to user elsewhere)")
                    
                elif c_type == "news_list":
                     summary_lines.append("[NEWS] List of recent news articles provided.")
                     
                else:
                    # Generic dump for other types, truncated
                    summary_lines.append(f"[{c_type.upper()}] Data: {str(c_data)[:300]}...")

            return "\n".join(summary_lines)
            
        except Exception as e:
            logger.error(f"Error formatting context: {e}")
            return "Data available in UI cards."

# Singleton
_explainer = LLMExplainerService()

def get_explainer() -> LLMExplainerService:
    return _explainer
