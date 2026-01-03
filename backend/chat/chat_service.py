"""
Chat Service - Main Orchestrator.

Entry point for /api/chat endpoint.
Routes messages through the deterministic pipeline:
1. Normalize text
2. Check compliance  
3. Route intent
4. Resolve symbol
5. Execute handler
6. Render response
7. Update context
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime
import asyncpg

from .schemas import ChatRequest, ChatResponse, Intent, Card, Action, ResponseMeta, CardType
from .text_normalizer import normalize_text, extract_potential_symbols
from .intent_router import IntentRouter, create_router
from .symbol_resolver import SymbolResolver
from .compliance import check_compliance, get_disclaimer
from .context_store import get_context_store, ContextStore

# Handlers
from .handlers.price_handler import handle_stock_price, handle_stock_snapshot
from .handlers.chart_handler import handle_stock_chart
from .handlers.screener_handler import (
    handle_top_gainers, handle_top_losers, handle_sector_stocks,
    handle_dividend_leaders, handle_screener_pe
)
from .handlers.system_handler import (
    handle_help, handle_clarify_symbol, handle_unknown, handle_blocked
)
from .handlers.financials_handler import handle_financials, handle_revenue_trend
from .handlers.dividends_handler import handle_dividends
from .handlers.compare_handler import handle_compare_stocks


class ChatService:
    """Main chat orchestrator."""
    
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self.router = create_router()
        self.resolver = SymbolResolver(conn)
        self.context_store = get_context_store()
    
    async def process_message(
        self,
        message: str,
        session_id: Optional[str] = None,
        history: list = None
    ) -> ChatResponse:
        """
        Process a chat message and return a response.
        
        Args:
            message: User message
            session_id: Session ID for context
            history: Conversation history
        
        Returns:
            ChatResponse
        """
        start_time = time.time()
        
        # Generate session ID if not provided
        if not session_id:
            session_id = self.context_store.generate_session_id()
        
        # Get context
        context = self.context_store.get(session_id)
        context_dict = {
            'last_symbol': context.last_symbol if context else None,
            'last_intent': context.last_intent if context else None,
            'last_range': context.last_range if context else None,
        }
        
        # 1. Normalize text
        normalized = normalize_text(message)
        language = normalized.language if normalized.language != 'mixed' else 'en'
        
        # 2. Check compliance
        is_blocked, violation_type, block_message = check_compliance(message)
        if is_blocked:
            result = handle_blocked(violation_type, block_message, language)
            return self._build_response(result, Intent.BLOCKED, 1.0, {}, start_time, language)
        
        # 3. Route intent
        intent_result = self.router.route(message, context_dict)
        intent = intent_result.intent
        entities = intent_result.entities
        
        # 4. Resolve symbol if needed
        symbol = None
        potential_symbols = extract_potential_symbols(message)
        
        if potential_symbols:
            # Try to resolve first potential symbol
            resolved = await self.resolver.resolve(potential_symbols[0])
            if resolved:
                symbol = resolved.symbol
                entities['symbol'] = symbol
                entities['market_code'] = resolved.market_code
        
        # Check for symbol in entities from router
        if not symbol and 'symbol' not in entities:
            # Try to find symbol mention in message
            for word in normalized.normalized.split():
                if len(word) >= 3:
                    resolved = await self.resolver.resolve(word)
                    if resolved:
                        symbol = resolved.symbol
                        entities['symbol'] = symbol
                        entities['market_code'] = resolved.market_code
                        break
        
        # Use context symbol if still not found
        if not symbol and context_dict.get('last_symbol'):
            symbol = context_dict['last_symbol']
            entities['symbol'] = symbol
        
        # 5. Execute handler
        result = await self._dispatch_handler(intent, entities, language)
        
        # 6. Update context
        if symbol:
            self.context_store.set(
                session_id,
                last_symbol=symbol,
                last_intent=intent.value,
                last_range=entities.get('range'),
                last_market=entities.get('market_code')
            )
        
        # 7. Build response
        response = self._build_response(
            result, intent, intent_result.confidence, entities, start_time, language
        )
        
        return response
    
    async def _dispatch_handler(
        self,
        intent: Intent,
        entities: Dict[str, Any],
        language: str
    ) -> Dict[str, Any]:
        """Dispatch to the appropriate handler based on intent."""
        
        symbol = entities.get('symbol')
        market_code = entities.get('market_code')
        
        # Stock-specific intents - need symbol
        if intent == Intent.STOCK_PRICE:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_stock_price(self.conn, symbol, language)
        
        elif intent == Intent.STOCK_SNAPSHOT:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_stock_snapshot(self.conn, symbol, language)
        
        elif intent == Intent.STOCK_CHART:
            if not symbol:
                return handle_clarify_symbol(language=language)
            range_code = entities.get('range', '1M')
            chart_type = 'line' if 'trend' in str(entities).lower() else 'candlestick'
            return await handle_stock_chart(self.conn, symbol, range_code, chart_type, language)
        
        elif intent == Intent.STOCK_STAT:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_stock_snapshot(self.conn, symbol, language)  # Uses snapshot for stats
        
        # Market screener intents
        elif intent == Intent.TOP_GAINERS:
            return await handle_top_gainers(self.conn, market_code, 10, language)
        
        elif intent == Intent.TOP_LOSERS:
            return await handle_top_losers(self.conn, market_code, 10, language)
        
        elif intent == Intent.SECTOR_STOCKS:
            sector = entities.get('sector', 'Banks')
            return await handle_sector_stocks(self.conn, sector, 20, language)
        
        elif intent == Intent.DIVIDEND_LEADERS:
            return await handle_dividend_leaders(self.conn, market_code, 10, language)
        
        elif intent == Intent.SCREENER_PE:
            threshold = entities.get('threshold', 10)
            return await handle_screener_pe(self.conn, threshold, market_code, 20, language)
        
        # Financial data intents
        elif intent == Intent.FINANCIALS:
            if not symbol:
                return handle_clarify_symbol(language=language)
            statement_type = entities.get('statement_type', 'income')
            return await handle_financials(self.conn, symbol, statement_type, 'annual', 4, language)
        
        elif intent == Intent.REVENUE_TREND:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_revenue_trend(self.conn, symbol, language)
        
        elif intent == Intent.DIVIDENDS:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_dividends(self.conn, symbol, 10, language)
        
        elif intent == Intent.COMPARE_STOCKS:
            compare_symbols = entities.get('compare_symbols', [])
            if not compare_symbols or len(compare_symbols) < 2:
                return {
                    'success': False,
                    'message': "Please specify two stocks to compare (e.g., 'Compare COMI vs SWDY')" if language == 'en' else "يرجى تحديد سهمين للمقارنة (مثال: قارن بين COMI و SWDY)",
                    'cards': []
                }
            return await handle_compare_stocks(self.conn, compare_symbols, language)
        
        # Company profile - use snapshot for now
        elif intent == Intent.COMPANY_PROFILE:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_stock_snapshot(self.conn, symbol, language)
        
        # System intents
        elif intent == Intent.HELP:
            return handle_help(language)
        
        elif intent == Intent.CLARIFY_SYMBOL:
            suggestions = await self.resolver.get_suggestions(entities.get('query', ''))
            return handle_clarify_symbol([s.dict() for s in suggestions], language)
        
        else:
            return handle_unknown(language)
    
    def _build_response(
        self,
        result: Dict[str, Any],
        intent: Intent,
        confidence: float,
        entities: Dict[str, Any],
        start_time: float,
        language: str
    ) -> ChatResponse:
        """Build the final ChatResponse."""
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Convert cards to Card objects
        cards = []
        for c in result.get('cards', []):
            try:
                card_type = CardType(c.get('type', 'error'))
            except ValueError:
                card_type = CardType.ERROR
            
            cards.append(Card(
                type=card_type,
                title=c.get('title'),
                data=c.get('data', {})
            ))
        
        # Convert actions to Action objects
        actions = []
        for a in result.get('actions', []):
            actions.append(Action(
                label=a.get('label', ''),
                label_ar=a.get('label_ar'),
                action_type=a.get('action_type', 'query'),
                payload=a.get('payload', '')
            ))
        
        # Build chart payload if present
        chart = None
        if result.get('chart'):
            from .schemas import ChartPayload, ChartType
            chart_data = result['chart']
            try:
                chart_type = ChartType(chart_data.get('type', 'candlestick'))
            except ValueError:
                chart_type = ChartType.CANDLESTICK
            
            chart = ChartPayload(
                type=chart_type,
                symbol=chart_data.get('symbol', ''),
                title=chart_data.get('title', ''),
                data=chart_data.get('data', []),
                range=chart_data.get('range', '1M')
            )
        
        # Get disclaimer if needed
        disclaimer = get_disclaimer(intent.value, language)
        
        return ChatResponse(
            message_text=result.get('message', ''),
            language=language,
            cards=cards,
            chart=chart,
            actions=actions,
            disclaimer=disclaimer,
            meta=ResponseMeta(
                intent=intent.value,
                confidence=confidence,
                entities=entities,
                latency_ms=latency_ms,
                cached=False,
                as_of=datetime.utcnow()
            )
        )


async def process_message(
    conn: asyncpg.Connection,
    message: str,
    session_id: Optional[str] = None,
    history: list = None
) -> ChatResponse:
    """Convenience function to process a message."""
    service = ChatService(conn)
    return await service.process_message(message, session_id, history)
