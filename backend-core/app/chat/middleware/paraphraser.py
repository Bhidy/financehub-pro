"""
Middleware for paraphrasing and explaining slang queries using LLM.
Acts as a "Universal Translator" before the strict Intent Router.

OPTIMIZATION: Smart bypass logic to skip LLM calls for clear English queries.
This saves ~250 tokens per skipped call without affecting response quality.
"""
import os
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ============================================================
# PHASE 1: SMART PARAPHRASER BYPASS (Token Optimization)
# ============================================================
# These patterns represent clear English financial commands that
# don't need LLM translation. The router can handle them directly.

CLEAR_ENGLISH_PATTERNS = [
    # Price/snapshot queries
    r'^(price|show|get|what|tell|give)\s+(me\s+)?(the\s+)?(price|chart|snapshot|financials|dividends|summary)',
    r'^(what\s+is|whats|what\'s)\s+(the\s+)?(price|value|stock)',
    # Market queries
    r'^(top|best|highest|lowest|show)\s+(gainers|losers|dividend|active)',
    r'^(market|show)\s+(summary|overview|gainers|losers)',
    # Comparison queries
    r'^compare\s+\w+\s+(and|vs|with|to)\s+\w+',
    # Ticker + action (e.g., "TMGH price", "CIB chart")
    r'^[A-Z]{2,6}\s+(price|chart|financials|dividends|snapshot|summary|analysis)',
    # Action + ticker (e.g., "price of TMGH")
    r'^(price|chart|snapshot|financials|dividends|summary|analysis)\s+(of|for)\s+\w+',
    # Help/system queries
    r'^(help|what can you|how do|explain)',
    # Sector queries
    r'^(stocks?\s+in|show\s+me)\s+(the\s+)?\w+\s+sector',
    # Technical queries
    r'^(technicals?|rsi|macd|indicators?)\s+(for|of)?\s*\w*',
]

# Financial keywords that indicate a clear intent
FINANCIAL_KEYWORDS = {
    'price', 'chart', 'snapshot', 'financials', 'dividends', 'compare',
    'gainers', 'losers', 'summary', 'analysis', 'valuation', 'sector',
    'technical', 'rsi', 'macd', 'pe', 'ratio', 'market', 'stock',
    'cap', 'yield', 'earnings', 'revenue', 'profit', 'growth',
}


def _should_skip_paraphrase(message: str) -> bool:
    """
    Determines if the message is clear enough to skip LLM paraphrasing.
    Returns True if the query is:
    - Short ASCII English
    - Matches known clear financial command patterns
    - Contains no Arabic/non-ASCII characters
    
    Returns False for:
    - Arabic text or transliterated Arabic slang
    - Ambiguous queries that need interpretation
    """
    msg_lower = message.lower().strip()
    words = msg_lower.split()
    
    # 1. Very short ASCII queries - already clear
    if len(words) < 3 and message.isascii():
        return True
    
    # 2. Contains Arabic/non-ASCII characters - NEEDS translation
    if not message.isascii():
        return False
    
    # 3. Check against clear English patterns
    for pattern in CLEAR_ENGLISH_PATTERNS:
        if re.match(pattern, msg_lower):
            logger.debug(f"[Paraphraser] Skipping LLM - pattern match: '{message[:30]}...'")
            return True
    
    # 4. Simple queries with financial keywords (max 6 words)
    if len(words) <= 6:
        keyword_count = sum(1 for w in words if w in FINANCIAL_KEYWORDS)
        if keyword_count >= 1:
            logger.debug(f"[Paraphraser] Skipping LLM - financial keywords: '{message[:30]}...'")
            return True
    
    # 5. Looks like a stock ticker pattern (2-6 uppercase letters)
    if re.search(r'\b[A-Z]{2,6}\b', message):
        # Has ticker + simple action words
        action_words = {'price', 'chart', 'show', 'get', 'what', 'is', 'the', 'of', 'for'}
        if any(w in action_words for w in words):
            logger.debug(f"[Paraphraser] Skipping LLM - ticker pattern: '{message[:30]}...'")
            return True
    
    # 6. Default: Needs LLM paraphrasing (slang, complex, ambiguous)
    return False


class SlangParaphraser:
    """
    Paraphrases user queries (especially Arabic Slang) into formal financial intents.
    Example: "Eih el donia fel CIB?" -> "Stock price and summary for CIB"
    
    Uses Multi-Provider LLM for resilience against rate limits.
    
    OPTIMIZATION: Uses smart bypass to avoid LLM calls for clear English queries.
    """
    
    def __init__(self):
        # Multi-provider client is lazy-loaded to avoid circular imports
        self._multi_llm = None
        self._bypass_count = 0  # Track optimization stats
        self._llm_count = 0
        
    def _get_llm(self):
        if self._multi_llm is None:
            from ..llm_clients import get_multi_llm
            self._multi_llm = get_multi_llm()
        return self._multi_llm
        
    async def paraphrase(self, message: str) -> Optional[str]:
        """
        Returns a cleaned, formal version of the query if slang is detected.
        Returns None if the query seems standard/simple to save latency.
        
        OPTIMIZATION: Smart bypass skips LLM for clear English queries.
        """
        # PHASE 1 OPTIMIZATION: Smart bypass for clear English
        if _should_skip_paraphrase(message):
            self._bypass_count += 1
            logger.info(f"[Paraphraser] ⚡ BYPASS (saved ~250 tokens) | Stats: {self._bypass_count} bypassed, {self._llm_count} LLM calls")
            return None
        
        # Needs LLM translation (Arabic slang, ambiguous query)
        try:
            # PHASE 2 OPTIMIZATION: Compact prompt (same examples, fewer tokens)
            # The examples are essential for Arabic slang, but we use concise format
            self._llm_count += 1
            prompt = (
                "Arabic/Slang to Financial Command Translator. "
                "Preserve TICKER. Output command only.\n"
                "Ex: 'Eih el donia fel CIB?'->'Summary for CIB' | "
                "'سعر التجاري كام'->'Price of CIB' | "
                "'3ayez a3raf el ksbaneen'->'Show top gainers' | "
                "'TMGH kwaysa?'->'Analysis for TMGH'\n"
                f"Query: {message}\nCommand:"
            )
            
            # Use Multi-Provider LLM (with smaller model for routing)
            multi_llm = self._get_llm()
            
            result = await multi_llm.complete(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=25,
                temperature=0.0,  # Zero variance for routing
                purpose="paraphrase",
                model_override="llama-3.1-8b-instant"  # Use smaller/cheaper model
            )
            
            if result:
                logger.info(f"[Paraphraser] 🔄 LLM: '{message[:30]}...' -> '{result}' | Stats: {self._bypass_count} bypassed, {self._llm_count} LLM")
                return result
            
            return None
            
        except Exception as e:
            logger.warning(f"Paraphraser total failure: {e}")
            return None

# Singleton
_paraphraser = SlangParaphraser()

def get_paraphraser() -> SlangParaphraser:
    return _paraphraser

