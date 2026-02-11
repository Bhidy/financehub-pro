"""
Semantic Router - LLM-Based Intent & Parameter Extraction.
==========================================================
The "Brain" of the Enterprise Chatbot.
Uses Groq/Llama3-70B to "understand" natural language and extract structured parameters.

Replaces rigid regex with intelligent parsing:
"Cheap industrial stocks with high growth" ->
{
    "intent": "SCREENER",
    "filters": [
        {"metric": "pe_ratio", "operator": "lt", "value": 15},
        {"metric": "revenue_growth", "operator": "gt", "value": 20}
    ],
    "sector": "Industrial Goods"
}
"""

import json
import logging
from typing import Optional, Dict, Any, List
from .schemas import Intent, IntentResult
from .llm_clients import get_multi_llm

logger = logging.getLogger(__name__)

# Intent Definition for the LLM
ROUTER_SYSTEM_PROMPT = """
You are the Semantic Router for a Financial Chatbot.
Your job is to classify user queries into INTENTS and extract PARAMETERS.

### AVAILABLE INTENTS:
1. TOP_GAINERS: "best stocks", "top movers", "who is up?"
2. TOP_LOSERS: "worst stocks", "losers", "who is down?"
3. SECTOR_STOCKS: "chemical stocks", "list banks", "real estate companies"
4. SCREENER_PE: "cheap stocks", "undervalued", "low PE"
5. SCREENER_GROWTH: "high growth", "fastest growing"
6. SCREENER_DEEP: (Universal) Any complex query with filters (e.g. "Cheap industrial stocks with high yield").
7. FINANCIALS: "show me income statement", "balance sheet for COMI"
8. NEWS: "news about TMGH", "what happened to CIB"
9. COMPARE_STOCKS: "Compare X and Y", "Which is better X or Y"
10. MARKET_STATUS: "is market open", "market summary"

### PARAMETER EXTRACTION RULES:
- **Sector**: Map loosely to: Banks, Basic Resources, Healthcare, Real Estate, Telecom, Food, Industrial, etc.
- **Metric Mapping**:
  - "Cheap", "Undervalued" -> `pe_ratio` (Low is good)
  - "Growth" -> `revenue_growth`
  - "Safe", "Strong" -> `solvency` or `z_score`
  - "Yield", "Income" -> `dividend_yield`
- **Thresholds**: "PE below 10" -> `{"metric": "pe_ratio", "operator": "lt", "value": 10}`

### OUTPUT FORMAT (JSON ONLY):
{
  "intent": "INTENT_NAME",
  "confidence": 0.0-1.0,
  "parameters": {
    "sector": "Mapped Standard Sector Name" (or null),
    "symbol": "extracted ticker" (or null),
    "filters": [
       {"metric": "db_column", "operator": "gt/lt", "value": 123}
    ],
    "sort_by": "metric_name",
    "limit": 10
  }
}

### EXAMPLES:
User: "Show me the best chemical stocks"
JSON: {"intent": "TOP_GAINERS", "parameters": {"sector": "Basic Resources"}}

User: "Cheap banks with high yield"
JSON: {"intent": "SCREENER_DEEP", "parameters": {"sector": "Banks", "filters": [{"metric": "pe_ratio", "operator": "lt", "value": 15}, {"metric": "dividend_yield", "operator": "gt", "value": 0}], "sort_by": "dividend_yield"}}

User: "Compare COMI and HRHO"
JSON: {"intent": "COMPARE_STOCKS", "parameters": {"symbols": ["COMI", "HRHO"]}}
"""

class SemanticRouter:
    """
    LLM-powered intent router.
    """
    
    def __init__(self):
        self.llm = get_multi_llm()
        self.enabled = True

    async def route(self, message: str) -> Optional[IntentResult]:
        """
        Route message using LLM classification.
        Returns IntentResult or None if LLM fails/unsure.
        """
        if not self.enabled or not self.llm:
            return None

        # Fast path check: If message is too simple, skip LLM to save latency?
        # Actually, for "Best stocks", regex is fine. This router is for what Regex missed.
        
        try:
            response = await self.llm.complete(
                messages=[
                    {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
                    {"role": "user", "content": message}
                ],
                max_tokens=200,
                temperature=0.0, # Deterministic
                purpose="routing",
                model_override="llama-3.1-8b-instant" # Use fast model for routing
            )
            
            if not response:
                return None
                
            # Parse JSON
            # LLMs sometimes wrap in ```json ... ```
            cleaned = response.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            
            intent_str = data.get("intent")
            confidence = data.get("confidence", 0.0)
            params = data.get("parameters", {})
            
            if not intent_str or confidence < 0.6:
                return None
                
            # Map parameters to entities structure used by IntentRouter
            entities = {}
            if params.get("sector"):
                entities["sector"] = params["sector"]
            if params.get("symbol"):
                entities["symbol"] = params["symbol"]
            if params.get("symbols"):
                entities["compare_symbols"] = params["symbols"]
            
            # Special Deep Screener Params
            if intent_str == "SCREENER_DEEP":
                entities["screener_filters"] = params.get("filters", [])
                entities["sort_by"] = params.get("sort_by")
            
            # Map string to Intent Enum
            try:
                intent_enum = Intent(intent_str)
            except ValueError:
                logger.warning(f"Semantic Router predicted unknown intent: {intent_str}")
                return None
                
            return IntentResult(
                intent=intent_enum,
                confidence=confidence,
                entities=entities,
                missing_fields=[]
            )

        except Exception as e:
            logger.error(f"Semantic Router Error: {e}")
            return None

# Singleton
_semantic_router = SemanticRouter()

def get_semantic_router():
    return _semantic_router
