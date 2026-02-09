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
from .llm_clients import get_llm_client, MultiProviderLLM
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
    "HIDDEN_GEMS": "Undervalued/undiscovered stocks",
    "MACRO_SCORE": "Macroeconomic market conditions score",
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
    CLASSIFICATION_PROMPT = """You are an intent classifier for a financial chatbot serving Egyptian and MENA stock markets.

Given the user's message and conversation context, classify the intent and extract entities.

IMPORTANT RULES:
1. Return ONLY valid JSON, no other text
2. If message is a follow-up ("yes", "ok", "أيوه"), inherit entities from context
3. Detect language from the message (en/ar)
4. Extract stock symbols in UPPERCASE (e.g., COMI, TMGH, CIB)
5. For Arabic stock names, try to identify the likely symbol

VALID INTENTS:
{intent_list}

CONTEXT (from previous conversation):
{context}

USER MESSAGE: {message}

Return JSON format:
{{
    "intent": "INTENT_NAME",
    "entities": {{
        "symbol": "SYMBOL or null",
        "sector": "sector name or null",
        "metric": "specific metric or null",
        "compare_with": ["symbols to compare"] or null
    }},
    "language": "en or ar",
    "confidence": 0.0 to 1.0,
    "reasoning": "brief explanation"
}}"""

    def __init__(self, llm_client: Optional[MultiProviderLLM] = None):
        self.llm_client = llm_client or get_llm_client()
        self.context_assembler = get_context_assembler()
    
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
            pending = context.get("pending_suggestions", [])
            if pending:
                return self._handle_confirmation(pending[0], inherited_entities, context)
        
        # Build intent list for prompt
        intent_list = "\n".join([
            f"- {intent}: {INTENT_DESCRIPTIONS.get(intent, 'Various queries')}"
            for intent in VALID_INTENTS[:40]  # Limit for token efficiency
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
            # Call Claude for classification
            response = await self.llm_client.complete(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.1  # Low temp for consistent classification
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
            
            # Normalize symbol to uppercase
            if entities.get("symbol"):
                entities["symbol"] = entities["symbol"].upper()
            
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
        
        return OrchestratorResult(
            intent=intent,
            entities=inherited_entities,
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
