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
                "- 'What happened with Bitcoin?' -> 'Refusal: Bitcoin news'\n\n"
                f"Query: {message}\n"
                "Output (Command ONLY, include TICKER):"
            )
            
            # Tiered Model Fallback
            MODELS_TO_TRY = [MODEL_NAME, "llama-3.1-8b-instant", "llama3-8b-8192"]
            
            for model in MODELS_TO_TRY:
                try:
                    chat_completion = await self.client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=model,
                        max_tokens=25,
                        temperature=0.0, # Zero variance for routing
                        timeout=2.0 
                    )
                    
                    result = chat_completion.choices[0].message.content.strip()
                    if result:
                        if model != MODEL_NAME:
                            logger.info(f"✅ Paraphraser fallback to {model} successful")
                        logger.info(f"Paraphrased: '{message}' -> '{result}'")
                        return result
                except Exception as model_err:
                    logger.warning(f"Paraphraser failed for {model}: {model_err}")
                    continue
            
            return None
            
        except Exception as e:
            logger.warning(f"Paraphraser total failure: {e}")
            return None

# Singleton
_paraphraser = SlangParaphraser()

def get_paraphraser() -> SlangParaphraser:
    return _paraphraser
