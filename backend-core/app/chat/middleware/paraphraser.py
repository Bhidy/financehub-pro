"""
Middleware for paraphrasing and explaining slang queries using LLM.
Acts as a "Universal Translator" before the strict Intent Router.
"""
import os
import logging
from typing import Optional, Tuple
from groq import AsyncGroq

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"

class SlangParaphraser:
    """
    Paraphrases user queries (especially Arabic Slang) into formal financial intents.
    Example: "Eih el donia fel CIB?" -> "Stock price and summary for CIB"
    """
    
    def __init__(self):
        self.client = None
        if GROQ_API_KEY:
            try:
                self.client = AsyncGroq(api_key=GROQ_API_KEY)
            except Exception as e:
                logger.error(f"Failed to init Groq Paraphraser: {e}")
        
    async def paraphrase(self, message: str) -> Optional[str]:
        """
        Returns a cleaned, formal version of the query if slang is detected.
        Returns None if the query seems standard/simple to save latency.
        """
        if not self.client:
            return None
            
        # Heuristic: Skip short queries or known simple english
        if len(message.split()) < 3 and message.isascii():
            return None
            
        try:
            # Fast, low-temp call to standardized INTENT
            prompt = (
                "You are a Financial Intent Translator. "
                "Convert the following (possibly Arabic Slang or ambiguous) query "
                "into a PRECISE, SHORT English financial command.\n"
                "Examples:\n"
                "- 'Eih el donia fel CIB?' -> 'Summary for CIB'\n"
                "- '3ayez a3raf men el ksbaneen enharda' -> 'Show top gainers'\n"
                "- 'Sahm hadid ezz' -> 'Price of EZZ Steel'\n"
                "- 'Compare between CIB and Talat Mostafa' -> 'Compare COMI vs TMGH'\n\n"
                f"Query: {message}\n"
                "Output (Command ONLY):"
            )
            
            chat_completion = await self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=MODEL_NAME,
                max_tokens=20,
                temperature=0.1,
                timeout=2.0 
            )
            
            result = chat_completion.choices[0].message.content.strip()
            logger.info(f"Paraphrased: '{message}' -> '{result}'")
            return result
            
        except Exception as e:
            logger.warning(f"Paraphraser failed: {e}")
            return None

# Singleton
_paraphraser = SlangParaphraser()

def get_paraphraser() -> SlangParaphraser:
    return _paraphraser
