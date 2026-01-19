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
    handle_dividend_leaders, handle_screener_pe, handle_deep_screener
)
from .handlers.system_handler import (
    handle_help, handle_clarify_symbol, handle_unknown, handle_blocked
)
from .handlers.financials_handler import handle_financials, handle_revenue_trend, handle_financial_metric, handle_ratio_analysis
from .handlers.dividends_handler import handle_dividends
from .handlers.compare_handler import handle_compare_stocks
from .handlers.compare_handler import handle_compare_stocks
from .handlers.market_handler import handle_market_summary, handle_most_active
from .handlers.statistics_handler import handle_stock_statistics
from .handlers.analysis_handler import (
    handle_technical_indicators, handle_ownership, 
    handle_fair_value, handle_financial_health
)
from .handlers.news_handler import handle_news
from .handlers.deep_dive_handler import (
    handle_deep_safety, handle_deep_valuation, handle_deep_efficiency, handle_deep_growth
)
from .middleware.paraphraser import get_paraphraser # New Middleware
from .llm_explainer import get_explainer


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
        market: Optional[str] = None,
        history: list = None,
        user_id: Optional[str] = None  # Added user_id
    ) -> ChatResponse:
        """
        Process a chat message and return a response.
        """
        start_time = time.time()
        
        # ... (rest of method unchanged until analytics logging) ...
        
        # Generate session ID if not provided
        if not session_id:
            session_id = self.context_store.generate_session_id()
        
        # Get context
        context = self.context_store.get(session_id)
        
        # FORCE MARKET CONTEXT if provided
        last_market = market if market else (context.last_market if context else None)
        
        context_dict = {
            'last_symbol': context.last_symbol if context else None,
            'last_intent': context.last_intent if context else None,
            'last_range': context.last_range if context else None,
            'last_market': last_market # Explicitly pass market context
        }
        
        print(f"DEBUG: Process Message - Market Arg: {market}, Context Last Market: {context.last_market if context else 'None'}, Resolved: {last_market}")
        
        # 1. Paraphrase Slang (The "Universal Translator")
        # ------------------------------------------------------------------
        # If the input is slang/ambiguous, we map it to a clear intent first.
        paraphraser = get_paraphraser()
        paraphrased_intent_query = await paraphraser.paraphrase(message)
        
        # Use paraphrased text for routing, but keep original for conversational context
        routing_text = paraphrased_intent_query if paraphrased_intent_query else message
        if paraphrased_intent_query:
            print(f"👻 Slang Detected! Routing using: '{routing_text}' (Original: {message})")
        # ------------------------------------------------------------------

        # 2. Normalize text (Using routing_text)
        try:
            normalized = normalize_text(routing_text)
            language = normalized.language if normalized.language != 'mixed' else 'en'
            
            # 3. Check compliance
            is_blocked, violation_type, block_message = check_compliance(routing_text)
            if is_blocked:
                result = handle_blocked(violation_type, block_message, language)
                return self._build_response(result, Intent.BLOCKED, 1.0, {}, start_time, language)
            
            # 4. Route intent (Using routing_text)
            intent_result = self.router.route(routing_text, context_dict)
            intent = intent_result.intent
            entities = intent_result.entities
            
            # Force market code in entities if provided explicitly
            if market:
                entities['market_code'] = market
            
            # Common stopwords...
            STOPWORDS = {
                'now', 'price', 'stock', 'what', 'please', 'show', 'tell', 
                'today', 'current', 'latest', 'about', 'the', 'for', 'how', 'much',
                'market', 'value', 'info', 'quote', 'buy', 'sell', 'hold', 
                'chart', 'history', 'financial', 'financials', 'dividend', 'sector', 'compare',
                'rsi', 'macd', 'sma', 'ema', 'adx', 'atr', 'cci', 'obv', 'roc',
                'stochastic', 'bollinger', 'williams', 'momentum', 'volume',
                'overvalued', 'undervalued', 'fair', 'check', 'analysis',
                'peg', 'ebitda', 'ratio', 'ratios', 'margin', 'margins',
                'income', 'balance', 'cash', 'flow', 'statement', 'sheet',
                'annual', 'quarterly', 'ttm', 'growth', 'trend',
                'debt', 'equity', 'metric', 'metrics', 'analysis', 'valuation',
                'cap', 'snapshot', 'summary', 'report', 'view', 'see', 'check', 'active', 'gainers', 'losers',
            }
            
            # 5. Resolve symbol
            symbol = entities.get('symbol')
            potential_symbols = extract_potential_symbols(routing_text)
            
            # Candidate selection logic: Prefer extraction (better alias/stopword support)
            candidate = potential_symbols[0] if potential_symbols else symbol
            
            # Resolve if candidate exists
            resolved_symbol = None
            resolver_method = "none"
            
            if candidate:
                resolved_symbol = await self.resolver.resolve(candidate, entities.get('market_code'))
                resolver_method = "extraction"
                
            # Try last symbol from context if still unresolved and intent needs it
            if not resolved_symbol and context_dict.get('last_symbol') and intent not in [Intent.UNKNOWN, Intent.HELP]:
                resolved_symbol = await self.resolver.resolve(context_dict['last_symbol'], entities.get('market_code'))
                resolver_method = "context"
                
            # If resolved, update entities and context
            actual_symbol = None
            if resolved_symbol:
                actual_symbol = resolved_symbol.symbol
                entities['symbol'] = actual_symbol
                entities['market_code'] = resolved_symbol.market_code
                
            # 6. Execute Handler
            handler_name = intent.value
            result = await self._dispatch_handler(intent, entities, language, routing_text)
            
            # -------------------------------------------------------------
            # PHASE 2: HYBRID CONVERSATIONAL LAYER (The "Starta" Voice)
            # -------------------------------------------------------------
            explainer = get_explainer()
            conversational_text = None
            fact_explanations = None
            
            # Trigger Narrative for most intents except system ones
            NO_NARRATIVE_INTENTS = [Intent.UNKNOWN, Intent.BLOCKED, Intent.HELP, Intent.GREETING]
            
            # Important: ensure result is a dict and has success
            result_data = result if isinstance(result, dict) else {}
            
            if intent not in NO_NARRATIVE_INTENTS and result_data.get('success', True):
                try:
                    # 1. Generate Narrative (Conversational Text)
                    conversational_text = await explainer.generate_narrative(
                        query=message, # Give LLM the ORIGINAL user voice for context
                        intent=intent.value,
                        data=result_data.get('cards', []),
                        language=language
                    )
                    
                    # 2. Extract Fact Explanations (Definitions)
                    fact_explanations = explainer.extract_fact_explanations(
                         data=result_data.get('cards', []),
                         language=language
                    )

                except Exception as ex:
                    print(f"LLM Hybrid Layer Error (Non-Fatal): {ex}")
            # -------------------------------------------------------------
            
            # 7. Update context
            self.context_store.set(session_id, 
                last_symbol=actual_symbol,
                last_intent=intent,
                last_market=entities.get('market_code', last_market)
            )
            
            # 8. Build response
            if isinstance(result, ChatResponse):
                return result
                
            response = self._build_response(
                result_data, intent, intent_result.confidence, entities, start_time, language,
                conversational_text, fact_explanations
            )
            
            # 9. Log analytics
            await self._log_analytics(
                session_id=session_id,
                user_id=user_id,
                raw_text=message,
                normalized_text=normalized.normalized,
                language=language,
                intent=intent,
                confidence=intent_result.confidence,
                entities=entities,
                symbol=actual_symbol,
                resolver_method=resolver_method,
                handler_name=handler_name,
                response_success=result_data.get('success', False),
                cards_count=len(result_data.get('cards', [])),
                fallback_triggered=result_data.get('fallback', False),
                error_code=result_data.get('error_code'),
                latency_ms=int((time.time() - start_time) * 1000),
                actions=result_data.get('actions', [])
            )
            
            return response
        except Exception as global_ex:
            # -------------------------------------------------------------
            # GLOBAL ERROR BOUNDARY (THE SAFETY NET)
            # -------------------------------------------------------------
            print(f"CRITICAL: Uncaught Exception in ChatService: {global_ex}")
            import traceback
            traceback.print_exc()
            
            # Fallback Card
            try:
                # Attempt to determine language even if crash happened
                lang = 'en'
                if message and any('\u0600' <= c <= '\u06FF' for c in message):
                    lang = 'ar'
                
                err_msg = "Our AI Analyst is currently upgrading its neural pathways. Please try again in a moment." if lang == 'en' else "نظام التحليل الذكي يقوم بتحديث مساراته العصبية حالياً. يرجى المحاولة بعد قليل."
                
                fallback_card = Card(
                    type=CardType.MARKDOWN,
                    title="System Maintenance" if lang == 'en' else "صيانة النظام",
                    data={'content': f"### ⚠️ {err_msg}"}
                )
                
                return ChatResponse(
                    message_text=err_msg,
                    language=lang,
                    cards=[fallback_card],
                    chart=None,
                    actions=[],
                    disclaimer="System Error Recovery Mode",
                    meta=ResponseMeta(
                        intent="SYSTEM_ERROR",
                        confidence=0.0,
                        entities={},
                        latency_ms=int((time.time() - start_time) * 1000),
                        cached=False,
                        as_of=datetime.utcnow()
                    )
                )
            except Exception as super_fatal:
                # If even the fallback fails, return a barebones object (Should never happen)
                print(f"SUPER FATAL: {super_fatal}")
                return ChatResponse(
                    message_text="System Error. Please try again.",
                    language="en",
                    cards=[],
                    chart=None,
                    actions=[],
                    disclaimer=None,
                    meta=ResponseMeta(intent="FATAL", confidence=0, entities={}, latency_ms=0, cached=False, as_of=datetime.utcnow())
                )
    
    async def _log_analytics(
        self,
        session_id: str,
        user_id: Optional[str],
        raw_text: str,
        normalized_text: str,
        language: str,
        intent: Intent,
        confidence: float,
        entities: Dict[str, Any],
        symbol: Optional[str],
        resolver_method: Optional[str],
        handler_name: str,
        response_success: bool,
        cards_count: int,
        fallback_triggered: bool,
        error_code: Optional[str],
        latency_ms: int,
        actions: list
    ):
        """
        Log interaction to chat_interactions table for analytics dashboard.
        Non-blocking, fire-and-forget pattern - errors don't affect user experience.
        """
        import json
        
        try:
            # Resolve user_id to integer if it's an email
            resolved_user_id = None
            if user_id and '@' in str(user_id):
                try:
                    resolved_user_id = await self.conn.fetchval("SELECT id FROM users WHERE email = $1", str(user_id))
                except:
                    resolved_user_id = None
            elif user_id:
                try:
                    resolved_user_id = int(str(user_id))
                except:
                    resolved_user_id = None

            # Insert into chat_interactions with integer id
            await self.conn.execute("""
                INSERT INTO chat_interactions (
                    session_id, user_id, language_detected, raw_text, normalized_text,
                    detected_intent, confidence, entities_json, resolved_symbol,
                    resolver_method, handler_name, response_has_data, cards_count,
                    fallback_triggered, error_code, latency_total_ms, actions_shown,
                    created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
                )
            """,
                session_id,
                resolved_user_id,
                language,
                raw_text[:1000],  # Limit text size
                normalized_text[:1000] if normalized_text else None,
                intent.value,
                confidence,
                json.dumps(entities) if entities else None,
                symbol,
                resolver_method,
                handler_name,
                response_success,
                cards_count,
                fallback_triggered,
                error_code,
                latency_ms,
                json.dumps([{'label': a.get('label', '')} for a in actions[:10]]) if actions else None
            )
            
            # Update/Insert session summary
            await self.conn.execute("""
                INSERT INTO chat_session_summary (session_id, start_at, messages_count, success_count, failure_count, last_intent, last_symbol, primary_language)
                VALUES ($1, NOW(), 1, CASE WHEN $2 THEN 1 ELSE 0 END, CASE WHEN $2 THEN 0 ELSE 1 END, $3, $4, $5)
                ON CONFLICT (session_id) DO UPDATE SET
                    end_at = NOW(),
                    messages_count = chat_session_summary.messages_count + 1,
                    success_count = chat_session_summary.success_count + CASE WHEN $2 THEN 1 ELSE 0 END,
                    failure_count = chat_session_summary.failure_count + CASE WHEN $2 THEN 0 ELSE 1 END,
                    last_intent = $3,
                    last_symbol = COALESCE($4, chat_session_summary.last_symbol)
            """,
                session_id,
                response_success,
                intent.value,
                symbol,
                language
            )
            
            # If this was a failure, log to unresolved_queries
            if not response_success or fallback_triggered or error_code:
                failure_reason = error_code or ('LOW_CONFIDENCE' if confidence < 0.5 else 'NO_DB_DATA')
                await self.conn.execute("""
                    INSERT INTO unresolved_queries (raw_text, language, detected_intent, confidence, failure_reason, created_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                """,
                    raw_text[:500],
                    language,
                    intent.value,
                    confidence,
                    failure_reason
                )
                
        except Exception as e:
            # Silent fail - analytics should never break the chatbot
            print(f"[Analytics] Logging error (non-fatal): {e}")
    
    async def _dispatch_handler(
        self,
        intent: Intent,
        entities: Dict[str, Any],
        language: str,
        message: str
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

        elif intent == Intent.STOCK_MARKET_CAP:
             if not symbol:
                return handle_clarify_symbol(language=language)
             # Reuse snapshot which contains market cap
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
            return await handle_stock_statistics(self.conn, symbol, language)  # Uses stock_statistics table
        

            
        # ===== ULTRA PREMIUM DEEP HANDLERS (PHASE 7) =====
        elif intent == Intent.DEEP_SAFETY:
             if not symbol:
                 return await handle_deep_screener(self.conn, metric='altman_z_score', direction='desc', limit=10, market_code=market_code, language=language)
             return await handle_deep_safety(self.conn, symbol, market=market_code, lang=language)

        elif intent == Intent.DEEP_VALUATION:
             if not symbol:
                 # Default to PE Ratio for generic "undervalued" queries as it's safer
                 try:
                     return await handle_deep_screener(self.conn, metric='pe_ratio', direction='asc', limit=10, market_code=market_code, language=language)
                 except Exception:
                     # Fallback to simple PE Screener if Deep Screener fails
                     return await handle_screener_pe(self.conn, threshold=15.0, market_code=market_code, limit=10, language=language)
             return await handle_deep_valuation(self.conn, symbol, market=market_code, lang=language)

        elif intent == Intent.DEEP_EFFICIENCY:
             if not symbol:
                 return await handle_deep_screener(self.conn, metric='roce', direction='desc', limit=10, market_code=market_code, language=language)
             return await handle_deep_efficiency(self.conn, symbol, market=market_code, lang=language)

        elif intent == Intent.DEEP_GROWTH:
             if not symbol:
                 return await handle_deep_screener(self.conn, metric='revenue_growth', direction='desc', limit=10, market_code=market_code, language=language)
             return await handle_deep_growth(self.conn, symbol, market=market_code, lang=language)
        
        elif intent == Intent.TOP_GAINERS:
            return await handle_top_gainers(self.conn, market_code, 10, language)
        
        elif intent == Intent.TOP_LOSERS:
            return await handle_top_losers(self.conn, market_code, 10, language)
        
        elif intent == Intent.SECTOR_STOCKS:
            sector = entities.get('sector')
            if not sector:
                # No specific sector requested - show top sectors by performance
                # Default to Financial Services (most requested)
                sector = 'Financial Services'
            return await handle_sector_stocks(self.conn, sector, 20, language, market_code)
        
        elif intent == Intent.MARKET_DIVIDEND_YIELD_LEADERS or intent == Intent.DIVIDEND_LEADERS:
            return await handle_dividend_leaders(self.conn, market_code, 10, language)
        
        elif intent == Intent.MARKET_MOST_ACTIVE:
            return await handle_most_active(self.conn, market_code or 'EGX', language)
        
        elif intent == Intent.SCREENER_PE:
            threshold = entities.get('threshold', 15.0) # Default PE 15
            return await handle_screener_pe(self.conn, threshold, market_code, limit=20, language=language)
        
        elif intent == Intent.SCREENER_DEEP:
            metric = entities.get('metric')
            direction = entities.get('direction', 'desc')
            if not metric:
                msg = "Please specify a metric (e.g., Highest ROE, Best Margins, Lowest Debt)." if language == 'en' else "الرجاء تحديد المعيار (مثال: أعلى عائد، أفضل هامش، أقل ديون)."
                return {'success': True, 'message': msg, 'cards': []}
            return await handle_deep_screener(self.conn, metric, direction, limit=10, market_code=market_code, language=language)
            
        elif intent == Intent.MARKET_SUMMARY:
            return await handle_market_summary(self.conn, market_code or 'EGX', language)
        
        # Financial data intents
        elif intent == Intent.FINANCIALS or intent == Intent.FINANCIALS_ANNUAL:
            if not symbol:
                return handle_clarify_symbol(language=language)
            statement_type = entities.get('statement_type', 'income')
            # If INTENT is specifically ANNUAL, force annual period
            period = 'annual'
            return await handle_financials(self.conn, symbol, statement_type, period, 10, language)
        
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
            
            # Resolve symbols through symbol resolver (handles aliases like CIB→COMI)
            resolver = SymbolResolver(self.conn)
            resolved_symbols = []
            for sym in compare_symbols[:2]:
                resolved = await resolver.resolve(sym, market_code)
                if resolved:
                    resolved_symbols.append(resolved.symbol)
                else:
                    resolved_symbols.append(sym.upper())  # Fallback to uppercase
            
            return await handle_compare_stocks(self.conn, resolved_symbols, language)
        
        # Company profile - use snapshot for now
        elif intent == Intent.COMPANY_PROFILE:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_stock_snapshot(self.conn, symbol, language)
        
        elif intent == Intent.TECHNICAL_INDICATORS:
            if not symbol: return handle_clarify_symbol(language=language)
            return await handle_technical_indicators(self.conn, symbol, language)

        elif intent == Intent.OWNERSHIP:
            if not symbol: return handle_clarify_symbol(language=language)
            return await handle_ownership(self.conn, symbol, language)

        elif intent == Intent.NEWS:
            if not symbol: return handle_clarify_symbol(language=language)
            return await handle_news(self.conn, symbol, 10, language)

        elif intent == Intent.FAIR_VALUE:
            if not symbol: return handle_clarify_symbol(language=language)
            return await handle_fair_value(self.conn, symbol, language)

        elif intent == Intent.FINANCIAL_HEALTH:
            if not symbol: return handle_clarify_symbol(language=language)
            return await handle_financial_health(self.conn, symbol, language)

        # Fund intents (NEW)

        # Deep Financials (New Phase 14)
        elif intent in [Intent.FIN_MARGINS, Intent.FIN_DEBT, Intent.FIN_CASH, Intent.FIN_GROWTH, Intent.FIN_EPS]:
            if not symbol: return handle_clarify_symbol(language=language)
            return await handle_financial_metric(self.conn, symbol, intent, language)
            
        elif intent in [Intent.RATIO_VALUATION, Intent.RATIO_EFFICIENCY, Intent.RATIO_LIQUIDITY]:
            if not symbol: return handle_clarify_symbol(language=language)
            return await handle_ratio_analysis(self.conn, symbol, intent, language)
            
        # Deep Funds (New Phase 14)

        # Small Talk & Education
        elif intent in [Intent.GREETING, Intent.IDENTITY, Intent.CAPABILITIES, Intent.MOOD, Intent.GRATITUDE, Intent.GOODBYE]:
            from app.chat.handlers.chitchat_handler import handle_chitchat
            return await handle_chitchat(intent, language)
            
        elif intent == Intent.DEFINE_TERM:
            from app.chat.handlers.chitchat_handler import handle_definition
            term = entities.get("term") or message  # Fallback to message if no term entity
            return await handle_definition(term, language)

        elif intent == Intent.HELP:
            return handle_help(language)
        
        elif intent == Intent.CLARIFY_SYMBOL:
            suggestions = await self.resolver.get_suggestions(entities.get('query', ''))
            return handle_clarify_symbol([s.dict() for s in suggestions], language)
        
        # ===== PHASE 6: SCREENER & DISCOVERY =====
        
        elif intent == Intent.SCREENER_GROWTH:
             # Route to Deep Screener with Revenue Growth
             return await handle_deep_screener(self.conn, metric='revenue_growth', direction='desc', limit=10, market_code=market_code, language=language)
             
        elif intent == Intent.SCREENER_SAFETY:
             # Route to Deep Screener with Z-Score
             return await handle_deep_screener(self.conn, metric='altman_z_score', direction='desc', limit=10, market_code=market_code, language=language)
             
        elif intent == Intent.SCREENER_VALUE:
             # Route to Deep Screener with PE Ratio (Cheapest first)
             try:
                 return await handle_deep_screener(self.conn, metric='pe_ratio', direction='asc', limit=10, market_code=market_code, language=language)
             except Exception:
                 return await handle_screener_pe(self.conn, threshold=15.0, market_code=market_code, limit=10, language=language)
             
        elif intent == Intent.SCREENER_INCOME:
             # Route to Dividend Leaders
             return await handle_dividend_leaders(self.conn, market_code, 10, language)

        # ===== PHASE 6: TECH & TRENDS =====
        
        elif intent in [Intent.TECH_TREND, Intent.TECH_LEVELS, Intent.TECH_MOMENTUM]:
             # Map all advanced tech queries to standard Technical Indicators handler for now
             if not symbol: return handle_clarify_symbol(language=language)
             return await handle_technical_indicators(self.conn, symbol, language)

        # ===== PHASE 6: CORPORATE & EVENTS =====
        
        elif intent == Intent.CALENDAR_EARNINGS:
             # Fallback to News/Events handler or generic profile
             if not symbol: return handle_clarify_symbol(language=language)
             return await handle_stock_snapshot(self.conn, symbol, language) # Placeholder until Event Handler exists
             
        elif intent == Intent.MARKET_STATUS:
             # Route to Market Summary
             return await handle_market_summary(self.conn, market_code or 'EGX', language)

        else:
            return handle_unknown(language)
    
    def _build_response(
        self,
        result: Dict[str, Any],
        intent: Intent,
        confidence: float,
        entities: Dict[str, Any],
        start_time: float,
        language: str,
        conversational_text: Optional[str] = None, # New
        fact_explanations: Optional[Dict[str, str]] = None # New
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
            conversational_text=conversational_text, # Add new field
            fact_explanations=fact_explanations, # Add new field
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
                as_of=datetime.utcnow(),
                backend_version="3.9-HYBRID-CHAT" # DEPLOYMENT VERIFICATION
            )
        )


async def process_message(
    conn: asyncpg.Connection,
    message: str,
    session_id: Optional[str] = None,
    market: Optional[str] = None,
    history: list = None,
    user_id: Optional[str] = None
) -> ChatResponse:
    """Convenience function to process a message."""
    service = ChatService(conn)
    return await service.process_message(message, session_id, market, history, user_id)
