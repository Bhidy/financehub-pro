"""
LLM Explainer Service
=====================
Acts as the "Stylist & Explainer" layer for the Chatbot.
Takes raw data (decided by the Brain) and generates natural language explanations.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from groq import AsyncGroq

# Logger
logger = logging.getLogger(__name__)

# Constants
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
MODEL_NAME = "llama3-70b-8192" # Fast, high quality
MAX_TOKENS = 300
TIMEOUT = 3.0 # Strict timeout to prevent lag

class LLMExplainerService:
    """Service to generate natural language explanations for data."""
    
    def __init__(self):
        self.client = None
        if GROQ_API_KEY:
            try:
                self.client = AsyncGroq(api_key=GROQ_API_KEY)
            except Exception as e:
                logger.error(f"Failed to init Groq client: {e}")
    
    async def generate_explanation(
        self, 
        query: str, 
        intent: str,
        data: Dict[str, Any], 
        language: str = "en"
    ) -> Optional[str]:
        """
        Generate a conversational explanation for the provided data.
        
        Args:
            query: Original user query
            intent: Detected intent
            data: Structured data returned by the handler
            language: 'en' or 'ar'
            
        Returns:
            String explanation or None if failure/timeout
        """
        if not self.client:
            return None
            
        # Skip explanation for simple errors or missing data
        if not data.get("success", True) or not data.get("cards"):
            return None

        # Build Context String (minimize tokens)
        context_str = self._format_data_for_context(data)
        
        # System Prompt
        system_prompt = (
            "You are Starta, a financial assistant. "
            "You MUST only describe the data given in the CONTEXT below. "
            "Do NOT invent any numbers or external facts. "
            "Do NOT give financial advice. "
            f"Respond in {'Arabic' if language == 'ar' else 'English'}. "
            "Tone: Friendly, professional, concise. "
            "If the data is good, mention it. If bad, mention it gently. "
            "Keep it under 3 sentences."
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
                        "content": f"Query: {query}\nIntent: {intent}\nContext: {context_str}"
                    }
                ],
                model=MODEL_NAME,
                max_tokens=MAX_TOKENS,
                temperature=0.5, # Low temperature for factual accuracy
                timeout=TIMEOUT
            )
            
            return chat_completion.choices[0].message.content
            
        except Exception as e:
            logger.warning(f"LLM Explainer failed: {e}")
            return None

    def _format_data_for_context(self, data: Dict[str, Any]) -> str:
        """Format the structured data into a compact string for LLM."""
        try:
            # Extract relevant bits from cards
            cards_summary = []
            for card in data.get("cards", []):
                card_type = card.get("type")
                card_data = card.get("data", {})
                
                if card_type == "stock_header":
                    cards_summary.append(
                        f"Stock: {card_data.get('symbol')} ({card_data.get('name')}), "
                        f"Price: {card_data.get('price')} {card_data.get('currency')}, "
                        f"Change: {card_data.get('change')} ({card_data.get('change_percent')}%)"
                    )
                elif card_type == "stock_snapshot":
                    cards_summary.append(json.dumps(card_data, default=str)) # Snapshot has good key-value pairs
                
                elif card_type == "financials_table":
                    # Only take top row or summary
                    cards_summary.append("Financial data provided in table.")
                
                else:
                    # Generic fallback
                    cards_summary.append(json.dumps(card_data, default=str)[:500]) # Truncate

            return "\n".join(cards_summary)
            
        except Exception:
            return "Data available in cards."

# Singleton
_explainer = LLMExplainerService()

def get_explainer() -> LLMExplainerService:
    return _explainer
