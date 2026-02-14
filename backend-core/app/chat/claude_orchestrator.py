"""
Claude Orchestrator - LLM-Based Intent Classification & Understanding
======================================================================
World-Class Conversational AI Component.

Replaces keyword-based routing with Claude AI intelligence for:
1. Intent classification from natural language
2. Entity extraction (symbol, sector, metric)
3. Language detection and response language selection
4. Follow-up understanding with context inheritance

Design Philosophy: Let Claude do ALL the understanding.
"""

import json
import logging
import re
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum

from .schemas import Intent
from .llm_clients import get_multi_llm, MultiProviderLLM
from .context_assembler import (
    get_context_assembler, 
    ContextAssembler,
    FollowUpType
)


logger = logging.getLogger(__name__)


# All valid intents that Claude can classify
VALID_INTENTS = [intent.value for intent in Intent]

# Intent descriptions for Claude (helps with accurate classification)
INTENT_DESCRIPTIONS = {
    "STOCK_PRICE": "Get current stock price",
    "STOCK_SNAPSHOT": "Full overview of a stock (price, PE, market cap, etc.)",
    "STOCK_CHART": "Show chart/graph for a stock",
    "FINANCIALS": "Company financials (income statement, balance sheet)",
    "DIVIDENDS": "Dividend history and yield",
    "COMPARE_STOCKS": "Compare two or more stocks",
    "TOP_GAINERS": "Stocks with biggest gains today",
    "TOP_LOSERS": "Stocks with biggest losses today",
    "SECTOR_STOCKS": "List stocks in a sector",
    "TECHNICAL_INDICATORS": "RSI, MACD, moving averages, etc.",
    "FAIR_VALUE": "Valuation analysis (DCF, intrinsic value)",
    "FINANCIAL_HEALTH": "Z-score, liquidity, debt ratios",
    "DEEP_VALUATION": "Deep valuation metrics (EV/EBITDA, P/OCF)",
    "DEEP_SAFETY": "Safety scores (Altman Z, Piotroski F)",
    "DEEP_GROWTH": "Growth metrics (CAGR, revenue growth)",
    "DEEP_EFFICIENCY": "Efficiency ratios (ROCE, asset turnover)",
    "MARKET_SUMMARY": "Overall market/index status",
    "MARKET_STATUS": "Market status and summary",
    "MARKET_TIMING": "Is this a good time to buy in general",
    "MACRO_VIEW": "Comprehensive top-down macro market view",
    "INDEX_COMPOSITION": "Current EGX 30 constituents and weights",
    "HIDDEN_GEMS": "Undervalued/undiscovered stocks",
    "MACRO_SCORE": "Macroeconomic market conditions score",
    "SCREENER_VALUE": "Most undervalued stocks in market or sector",
    "SCREENER_DEEP": "Screen stocks by specific deep metric",
    "SCREENER_GROWTH": "Find highest growth stocks",
    "SCREENER_SAFETY": "Find safest stocks by risk metrics",
    "SCREENER_INCOME": "Find highest dividend or income stocks",
    "FIN_MARGINS": "Analyze why margins are changing or declining",
    "GREETING": "User saying hello/hi",
    "GOODBYE": "User saying bye/goodbye",
    "GRATITUDE": "User saying thanks",
    "IDENTITY": "Asking who/what the assistant is",
    "CAPABILITIES": "Asking what the assistant can do",
    "DEFINE_TERM": "Explain a financial term (PE ratio, ROE, etc.)",
    "HELP": "Need help or guidance",
    "NEWS": "Stock or market news",
    "COMPANY_PROFILE": "Company background and description",
}


@dataclass
class OrchestratorResult:
    """Result from Claude orchestrator."""
    intent: Intent
    entities: Dict[str, Any]
    language: str
    confidence: float
    is_follow_up: bool
    follow_up_type: str
    inherited_entities: Dict[str, Any]
    raw_response: Optional[str] = None


class ClaudeOrchestrator:
    """
    Uses Claude AI to understand user intent and extract entities.
    
    This replaces keyword-based routing with intelligent LLM understanding.
    """
    
    # System prompt for intent classification
    CLASSIFICATION_PROMPT = """You are the Semantic Router for a financial chatbot.
Your role is to classify user intent and extract structured parameters for database queries.

### AVAILABLE INTENTS:
{intent_list}

### PARAMETER EXTRACTION RULES:
1. **Symbol**: Extract stock ticker (e.g., COMI, TMGH). Map Arabic names to symbols if possible.
2. **Sector**: Map to standard sectors (Banks, Basic Resources, Healthcare, Real Estate, etc.).
3. **Screener Arguments**:
   - **Metric**: The database column to filter/sort by (e.g., pe_ratio, dividend_yield, revenue_growth, profit_margin).
   - **Operator**: 'gt' (greater than), 'lt' (less than), 'eq' (equal).
   - **Value**: The numerical threshold.
   - **Direction**: 'desc' (High/Best) or 'asc' (Low/Cheapest).

### EXAMPLES:
User: "Show me the best chemical stocks"
JSON: {{"intent": "TOP_GAINERS", "entities": {{"sector": "Basic Resources"}}, "confidence": 0.95}}

User: "Cheap banks with high yield"
JSON: {{"intent": "SCREENER_DEEP", "entities": {{"sector": "Banks", "filters": [{{"metric": "pe_ratio", "operator": "lt", "value": 15}}, {{"metric": "dividend_yield", "operator": "gt", "value": 0}}], "sort_by": "dividend_yield"}}, "confidence": 0.9}}

User: "Compare COMI and HRHO"
JSON: {{"intent": "COMPARE_STOCKS", "entities": {{"compare_symbols": ["COMI", "HRHO"]}}, "confidence": 0.95}}

### CONTEXT:
{context}

### USER MESSAGE:
{message}

Return JSON format:
{{
    "intent": "INTENT_NAME",
    "entities": {{
        "symbol": "SYMBOL or null",
        "sector": "Sector Name or null",
        "market_code": "EGX",
        "filters": [
           {{"metric": "metric_name", "operator": "gt/lt", "value": 123}}
        ],
        "sort_by": "metric_name",
        "limit": 10,
        "compare_symbols": ["SYM1", "SYM2"]
    }},
    "language": "en or ar",
    "confidence": 0.0-1.0,
    "reasoning": "Limit to 10 words"
}}"""

    def __init__(self, llm_client: Optional[MultiProviderLLM] = None):
        self.llm_client = llm_client or get_multi_llm()
        self.context_assembler = get_context_assembler()

    @staticmethod
    def _canonical_symbol(symbol: str) -> str:
        """Normalize symbol for duplicate detection (COMI == COMI.CA)."""
        if not symbol:
            return ""
        return str(symbol).strip().upper().split(".")[0]

    def _dedupe_compare_symbols(self, symbols: List[str]) -> List[str]:
        """Deduplicate comparison symbols while preserving order."""
        deduped: List[str] = []
        seen: set[str] = set()
        for sym in symbols or []:
            if not sym:
                continue
            raw = str(sym).strip().upper()
            if not raw:
                continue
            canonical = self._canonical_symbol(raw)
            if canonical in seen:
                continue
            seen.add(canonical)
            deduped.append(raw)
        return deduped
    
    async def classify(
        self,
        message: str,
        session_id: str,
        user_name: str = "Analyst",
        user_id: Optional[str] = None
    ) -> OrchestratorResult:
        """
        Classify user intent using Claude AI.
        
        Args:
            message: User's message
            session_id: Session identifier
            user_name: User's display name
            user_id: User's ID for profile
            
        Returns:
            OrchestratorResult with intent, entities, language
        """
        # Build context from conversation memory
        context = self.context_assembler.build_context_for_claude(
            session_id=session_id,
            current_message=message,
            include_history=True
        )
        
        # Detect follow-up before LLM call (optimization)
        follow_up_type = context["follow_up"]["type"]
        is_follow_up = context["follow_up"]["is_follow_up"]
        inherited_entities = context["follow_up"].get("metadata", {}).get("inherited_entities", {})
        
        # Handle simple confirmations without LLM call
        if follow_up_type == FollowUpType.CONFIRMATION.value:
            # User said "yes"/"ok" - execute pending suggestion
            pending = [
                str(p).strip().lower()
                for p in (context.get("pending_suggestions", []) or [])
                if str(p).strip()
            ]
            pending = list(dict.fromkeys(pending))
            if len(pending) == 1:
                return self._handle_confirmation(pending[0], inherited_entities, context)
            if len(pending) > 1:
                # "Yes" to multiple offered options is ambiguous.
                return self._handle_ambiguous_confirmation(
                    pending_actions=pending,
                    inherited_entities=inherited_entities,
                    context=context
                )

            # If no pending action exists, continue with inherited symbol context if possible.
            if inherited_entities.get("symbol"):
                return OrchestratorResult(
                    intent=Intent.STOCK_SNAPSHOT,
                    entities={"symbol": inherited_entities.get("symbol")},
                    language=context.get("preferred_language", "en"),
                    confidence=0.7,
                    is_follow_up=True,
                    follow_up_type="confirmation",
                    inherited_entities=inherited_entities
                )
        
        # Build intent list for prompt
        intent_list = "\n".join([
            f"- {intent}: {INTENT_DESCRIPTIONS.get(intent, 'Various queries')}"
            for intent in VALID_INTENTS
        ])
        
        # Format context for LLM
        context_str = self._format_context(context)
        
        # Build prompt
        prompt = self.CLASSIFICATION_PROMPT.format(
            intent_list=intent_list,
            context=context_str,
            message=message
        )
        
        try:
            # Call Claude (now Groq Llama 3) for classification
            response = await self.llm_client.complete(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.1,  # Low temp for consistent classification
                model_override="llama-3.3-70b-versatile" # Force Groq Llama 3 70B
            )
            
            # Parse response
            result = self._parse_response(response, message, context)
            result.is_follow_up = is_follow_up
            result.follow_up_type = follow_up_type
            result.inherited_entities = inherited_entities
            
            # Merge inherited entities if follow-up
            if is_follow_up and not result.entities.get("symbol"):
                if inherited_entities.get("symbol"):
                    result.entities["symbol"] = inherited_entities["symbol"]
                    logger.info(f"[ClaudeOrchestrator] Inherited symbol: {result.entities['symbol']}")
            
            logger.info(f"[ClaudeOrchestrator] Classified: {result.intent.value} | Entities: {result.entities} | Lang: {result.language}")
            
            return result
            
        except Exception as e:
            logger.error(f"[ClaudeOrchestrator] Classification error: {e}")
            # Fallback to basic classification
            return self._fallback_classification(message, context)
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context for LLM prompt."""
        parts = []
        
        if context.get("is_first_message"):
            parts.append("First message in session.")
        else:
            parts.append(f"Turn {context.get('turn_count', 1)} of conversation.")
        
        if context.get("active_entities"):
            entities = context["active_entities"]
            if entities.get("symbol"):
                parts.append(f"Current stock: {entities['symbol']}")
            if entities.get("sector"):
                parts.append(f"Current sector: {entities['sector']}")
            if entities.get("last_intent"):
                parts.append(f"Last Intent: {entities['last_intent']}")
            if entities.get("filters"):
                parts.append(f"Current Filters: {entities['filters']}")
            if entities.get("sort_by"):
                parts.append(f"Current Sort: {entities['sort_by']}")
        
        if context.get("conversation_history"):
            parts.append(f"\nRecent conversation:\n{context['conversation_history']}")
        
        if context.get("pending_suggestions"):
            parts.append(f"Pending suggestions: {', '.join(context['pending_suggestions'])}")
        
        return "\n".join(parts) if parts else "No prior context."
    
    def _parse_response(
        self,
        response: str,
        original_message: str,
        context: Dict[str, Any]
    ) -> OrchestratorResult:
        """Parse LLM response into structured result."""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if not json_match:
                raise ValueError("No JSON found in response")
            
            data = json.loads(json_match.group())
            
            # Validate intent
            intent_str = data.get("intent", "UNKNOWN")
            if intent_str not in VALID_INTENTS:
                intent_str = "UNKNOWN"
            
            intent = Intent(intent_str)
            
            # Extract entities
            entities = data.get("entities", {})
            if entities is None:
                entities = {}
            
            # Clean up entities
            entities = {k: v for k, v in entities.items() if v is not None}

            # Backward compatibility with older key name from some models
            if entities.get("compare_with") and not entities.get("compare_symbols"):
                entities["compare_symbols"] = entities.get("compare_with")
            entities.pop("compare_with", None)

            # Normalize compare symbols into uppercase list
            if entities.get("compare_symbols"):
                compare_symbols = entities["compare_symbols"]
                if isinstance(compare_symbols, str):
                    compare_symbols = [compare_symbols]
                if isinstance(compare_symbols, list):
                    entities["compare_symbols"] = self._dedupe_compare_symbols([
                        str(sym).upper() for sym in compare_symbols if str(sym).strip()
                    ])
                else:
                    entities.pop("compare_symbols", None)

            # Normalize symbol to uppercase
            if entities.get("symbol"):
                entities["symbol"] = entities["symbol"].upper()

            # Guarantee compare set cannot contain the same base symbol twice.
            if entities.get("compare_symbols"):
                entities["compare_symbols"] = self._dedupe_compare_symbols(entities["compare_symbols"])
            
            return OrchestratorResult(
                intent=intent,
                entities=entities,
                language=data.get("language", "en"),
                confidence=float(data.get("confidence", 0.7)),
                is_follow_up=False,
                follow_up_type="none",
                inherited_entities={},
                raw_response=response
            )
            
        except Exception as e:
            logger.warning(f"[ClaudeOrchestrator] Parse error: {e}")
            return self._fallback_classification(original_message, context)
    
    def _handle_confirmation(
        self,
        pending_action: str,
        inherited_entities: Dict[str, Any],
        context: Dict[str, Any]
    ) -> OrchestratorResult:
        """Handle confirmation follow-ups ("yes", "ok")."""
        # Map pending suggestions to intents
        action_to_intent = {
            "compare": Intent.COMPARE_STOCKS,
            "financials": Intent.FINANCIALS,
            "dividends": Intent.DIVIDENDS,
            "chart": Intent.STOCK_CHART,
            "deep_dive": Intent.STOCK_SNAPSHOT,
            "technicals": Intent.TECHNICAL_INDICATORS,
            "valuation": Intent.DEEP_VALUATION,
            "health": Intent.FINANCIAL_HEALTH,
        }
        
        intent = action_to_intent.get(pending_action.lower(), Intent.STOCK_SNAPSHOT)
        entities = dict(inherited_entities or {})

        symbol_required_intents = {
            Intent.STOCK_SNAPSHOT,
            Intent.STOCK_CHART,
            Intent.FINANCIALS,
            Intent.DIVIDENDS,
            Intent.TECHNICAL_INDICATORS,
            Intent.DEEP_VALUATION,
            Intent.FINANCIAL_HEALTH,
        }
        # If user confirmed an action that needs a stock but no symbol is in context,
        # ask for the symbol instead of producing an irrelevant generic response.
        if intent in symbol_required_intents and not entities.get("symbol"):
            intent = Intent.CLARIFY_SYMBOL
            entities = {}
        
        return OrchestratorResult(
            intent=intent,
            entities=entities,
            language=context.get("preferred_language", "en"),
            confidence=0.9,
            is_follow_up=True,
            follow_up_type="confirmation",
            inherited_entities=inherited_entities
        )

    def _handle_ambiguous_confirmation(
        self,
        pending_actions: List[str],
        inherited_entities: Dict[str, Any],
        context: Dict[str, Any]
    ) -> OrchestratorResult:
        """
        Handle ambiguous confirmations when assistant offered multiple next steps
        and the user only replied with "yes".
        """
        entities: Dict[str, Any] = {
            "clarify_follow_up": True,
            "follow_up_options": pending_actions,
        }
        if inherited_entities.get("symbol"):
            entities["symbol"] = inherited_entities.get("symbol")

        return OrchestratorResult(
            intent=Intent.FOLLOW_UP,
            entities=entities,
            language=context.get("preferred_language", "en"),
            confidence=0.9,
            is_follow_up=True,
            follow_up_type="confirmation",
            inherited_entities=inherited_entities
        )
    
    def _fallback_classification(
        self,
        message: str,
        context: Dict[str, Any]
    ) -> OrchestratorResult:
        """Fallback classification when LLM fails."""
        # Detect language
        is_arabic = any('\u0600' <= c <= '\u06FF' for c in message)
        language = "ar" if is_arabic else "en"
        
        # Basic keyword matching
        msg_lower = message.lower()
        
        intent = Intent.UNKNOWN
        entities = {}
        
        # Simple pattern matching
        if any(w in msg_lower for w in ["price", "سعر", "كام"]):
            intent = Intent.STOCK_PRICE
        elif any(w in msg_lower for w in ["chart", "graph", "رسم"]):
            intent = Intent.STOCK_CHART
        elif any(w in msg_lower for w in ["financials", "مالية", "قوائم"]):
            intent = Intent.FINANCIALS
        elif any(w in msg_lower for w in ["dividend", "توزيعات"]):
            intent = Intent.DIVIDENDS
        elif any(w in msg_lower for w in ["compare", "مقارنة", "قارن"]):
            intent = Intent.COMPARE_STOCKS
        elif any(w in msg_lower for w in ["gainers", "رابحين"]):
            intent = Intent.TOP_GAINERS
        elif any(w in msg_lower for w in ["losers", "خاسرين"]):
            intent = Intent.TOP_LOSERS
        elif any(w in msg_lower for w in ["hello", "hi", "مرحبا", "اهلا"]):
            intent = Intent.GREETING
        
        # Inherit from context if follow-up
        if context.get("follow_up", {}).get("is_follow_up"):
            inherited = context["follow_up"].get("metadata", {}).get("inherited_entities", {})
            if inherited.get("symbol"):
                entities["symbol"] = inherited["symbol"]
        
        return OrchestratorResult(
            intent=intent,
            entities=entities,
            language=language,
            confidence=0.5,  # Lower confidence for fallback
            is_follow_up=context.get("follow_up", {}).get("is_follow_up", False),
            follow_up_type=context.get("follow_up", {}).get("type", "none"),
            inherited_entities={}
        )


# Singleton instance
_orchestrator: Optional[ClaudeOrchestrator] = None


def get_claude_orchestrator() -> ClaudeOrchestrator:
    """Get or create the global Claude orchestrator."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ClaudeOrchestrator()
    return _orchestrator
