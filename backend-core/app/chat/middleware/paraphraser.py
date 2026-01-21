"""
Middleware for paraphrasing and explaining slang queries using LLM.
Acts as a "Universal Translator" before the strict Intent Router.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SlangParaphraser:
    """
    Paraphrases user queries (especially Arabic Slang) into formal financial intents.
    Example: "Eih el donia fel CIB?" -> "Stock price and summary for CIB"
    
    Uses Multi-Provider LLM for resilience against rate limits.
    """
    
    def __init__(self):
        # Multi-provider client is lazy-loaded to avoid circular imports
        self._multi_llm = None
        
    def _get_llm(self):
        if self._multi_llm is None:
            from ..llm_clients import get_multi_llm
            self._multi_llm = get_multi_llm()
        return self._multi_llm
        
    async def paraphrase(self, message: str) -> Optional[str]:
        """
        Returns a cleaned, formal version of the query if slang is detected.
        Returns None if the query seems standard/simple to save latency.
        """
        # Heuristic: Skip short queries or known simple english
        if len(message.split()) < 3 and message.isascii():
            return None
            
        try:
            # Fast, low-temp call to standardized INTENT
            prompt = (
                "You are Starta's Arabic-to-Financial Intent Translator. "
                "Convert the following (Egyptian Slang or informal) query "
                "into a PRECISE English financial command.\n"
                "STRICT RULE: ALWAYS preserve the STOCK TICKER or COMPANY NAME (e.g., TMGH, CIB, SWDY) in the output. NEVER drop it.\n"
                "Examples:\n"
                "- 'Eih el donia fel CIB?' -> 'Summary for CIB'\n"
                "- '3ayez a3raf men el ksbaneen enharda' -> 'Show top gainers'\n"
                "- 'el sahm da kwayes?' -> 'Follow-up: Is current stock good?'\n"
                "- 'سعر التجاري كام' -> 'Price of CIB'\n"
                "- 'يعني اية مكرر الربحية' -> 'Define PE Ratio'\n"
                "- 'What does market cap mean?' -> 'Define market cap'\n"
                "- 'TMGH kwaysa?' -> 'Summary and analysis for TMGH'\n"
                "- 'What happened with Bitcoin?' -> 'Refusal: Bitcoin news'\n"
                "- 'And SWDY?' -> 'Price of SWDY'\n"
                "- 'What about CIB?' -> 'Summary for CIB'\n\n"
                f"Query: {message}\n"
                "Output (Command ONLY, include TICKER):"
            )
            
            # Use Multi-Provider LLM
            multi_llm = self._get_llm()
            
            result = await multi_llm.complete(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=25,
                temperature=0.0,  # Zero variance for routing
                purpose="paraphrase"
            )
            
            if result:
                logger.info(f"Paraphrased: '{message}' -> '{result}'")
                return result
            
            return None
            
        except Exception as e:
            logger.warning(f"Paraphraser total failure: {e}")
            return None

# Singleton
_paraphraser = SlangParaphraser()

def get_paraphraser() -> SlangParaphraser:
    return _paraphraser

