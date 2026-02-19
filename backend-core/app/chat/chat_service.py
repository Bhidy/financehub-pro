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

⚠️ ============================================================================
⚠️ PROTECTED CODE - DO NOT MODIFY WITHOUT EXPLICIT USER REQUEST
⚠️ ============================================================================
⚠️
⚠️ The 4-Layer Response Structure is PRODUCTION-CRITICAL:
⚠️   Layer 1: Greeting/Opening (personalized with user's name)
⚠️   Layer 2: Data Cards (stock data, charts, metrics)
⚠️   Layer 3: Learning Section (📊 educational bullet points)
⚠️   Layer 4: Follow-up Prompt (💡 suggested next action)
⚠️
⚠️ AI Agents: DO NOT remove, change, or make conditional ANY of these layers.
⚠️ If unsure, ask the user before making changes to response structure.
⚠️
⚠️ See GEMINI.md section "🔒 PROTECTED: 4-Layer Chatbot Response Structure"
⚠️ ============================================================================
"""

import time
import re
import logging
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import asyncpg

# Configure Logger
logger = logging.getLogger(__name__)

from .schemas import (
    ChatRequest, ChatResponse, Intent, Card, Action, ResponseMeta, CardType,
    # NEW: Structured Response Components
    InsightCard, InsightCardVariant, DataCard, StockListItem,
    MacroScoreCard, MacroFactor, ComparisonTable, ComparisonRow,
    EducationalCard, DisclaimerCard,
    # NEW: Premium World-Class Components (Phase 2)
    FrameworkCard, CharacterCard, QuantifiedDriver, QuantifiedDriversCard, IndexCompositionCard,
    # NEW: 7-Layer Structure
    StructuredNarrative,
    ResolvedSymbol,
)
from .text_normalizer import normalize_text, extract_potential_symbols
from .intent_router import IntentRouter, create_router
from .symbol_resolver import SymbolResolver
from .compliance import check_compliance, get_disclaimer, COMPLIANCE_RESPONSE_AR # --- PHASE 4: PERSONALIZATION ENGINE ---
from .sophistication_analyzer import SophisticationAnalyzer # NEW: Phase 4
from .memory_manager import MemoryManager # NEW: Phase 4

def _extract_market_stats(cards: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Helper to extract market summary (EGX30) from response cards if available.
    Used for Market Sentiment Tone Steering.
    """
    if not cards:
        return None
        
    for card in cards:
        # Check 1: Explicit Market Summary Card
        if card.get('type') == 'market_summary':
            return card.get('data')
            
        # Check 2: Stock Header for EGX30
        if card.get('type') == 'stock_header':
            data = card.get('data', {})
            raw_sym = str(data.get('symbol', '')).strip().upper()
            if raw_sym in ['EGX30', '^EGX30', 'EGX 30']:
                return {
                    'change_percent': data.get('change_percent'),
                    'last_price': data.get('price')
                }
                
    return None # NEW: Phase 4
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
from .handlers.financials_handler import handle_financials, handle_revenue_trend, handle_financial_metric, handle_ratio_analysis
from .handlers.dividends_handler import handle_dividends
from .handlers.compare_handler import handle_compare_stocks
from .handlers.compare_handler import handle_compare_stocks
from .handlers.market_handler import handle_market_summary, handle_most_active
from .handlers.statistics_handler import handle_stock_statistics
from .handlers.analysis_handler import (
    handle_technical_indicators, handle_ownership, 
    handle_fair_value, handle_financial_health, handle_company_profile
)
from .handlers.news_handler import handle_news
from .handlers.deep_dive_handler import (
    handle_deep_safety, handle_deep_valuation, handle_deep_efficiency, handle_deep_growth
)
from .handlers.deep_dive_handler import (
    handle_deep_safety, handle_deep_valuation, handle_deep_efficiency, handle_deep_growth
)
from .handlers.universal_screener import handle_universal_screener
# Phase 2 & 3: World-Class Conversational Framework
from .greeting_controller import get_greeting_controller, GreetingController
from .response_composer import (
    get_response_composer, ResponseComposer, 
    is_follow_up_question, get_follow_up_response
)
from .learning_section_generator import generate_learning_section
from .follow_up_generator import generate_follow_up
# Phase 4: Claude-Native Architecture (World-Class AI)
from .context_assembler import get_context_assembler as get_conversation_memory
from .claude_orchestrator import get_claude_orchestrator, ClaudeOrchestrator
from .middleware.paraphraser import get_paraphraser
from .llm_explainer import get_explainer

ARABIC_CHAR_RE = re.compile(r"[\u0600-\u06FF]")
LATIN_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9/\-\.]*")
ARABIC_KEEP_TOKENS = {
    "EGX", "EGP", "USD", "SAR", "ROE", "ROA", "EPS", "EBITDA", "RSI", "MACD",
    "PE", "PB", "P/E", "P/B", "EV", "TTM", "YTD", "Q1", "Q2", "Q3", "Q4",
}
ARABIC_TEXT_REPLACEMENTS = {
    "N/A": "غير متاح",
    "n/a": "غير متاح",
    "No Data": "لا توجد بيانات",
    "No data": "لا توجد بيانات",
    "Data Unavailable": "البيانات غير متاحة",
    "System Error": "خطأ في النظام",
    "Educational Analysis": "تحليل تعليمي",
    "BULL CASE ANALYSIS": "تحليل السيناريو الإيجابي",
    "BEAR CASE RISKS": "مخاطر السيناريو السلبي",
    "Current Position": "المركز الحالي",
    "CURRENT POSITION": "المركز الحالي",
    "Volume:": "الحجم:",
    "shares": "سهم",
    "Weight": "الوزن",
    "weight": "الوزن",
    "EGP": "جنيه",
    "USD": "دولار",
    "SAR": "ريال",
    "Revenue": "الإيرادات",
    "Net Income": "صافي الربح",
    "Market Heatmap": "خريطة حرارة السوق",
    "EGX": "البورصة المصرية",
    "Loss": "خسارة",
    "Neutral": "محايد",
    "Gain": "مكسب",
    "Score": "النتيجة",
    "Metric": "مؤشر",
    "Constructive": "إيجابي",
    "Mixed": "مختلط",
    "Caution": "حذر",
    "Risk-Off": "مخاطر مرتفعة",
    # Sector translations (to prevent English leakage in Arabic mode)
    "Banks": "البنوك",
    "Real Estate": "العقارات",
    "Financial Services": "الخدمات المالية",
    "Industrial Goods & Services": "السلع والخدمات الصناعية",
    "Basic Resources": "الموارد الأساسية",
    "Food & Beverage": "الأغذية والمشروبات",
    "Telecommunications": "الاتصالات",
    "Healthcare & Pharmaceuticals": "الرعاية الصحية والأدوية",
    "Construction & Materials": "التشييد ومواد البناء",
    "Travel & Leisure": "السياحة والترفيه",
    "Listed equity": "سهم مدرج في السوق",
    "Stocks": "الأسهم",
    "Stock": "سهم",
    "Price": "السعر",
    "Change": "التغير",
    "Volume": "الحجم",
    "Market Cap": "القيمة السوقية",
    "P/E": "مضاعف الربحية",
    "P/B": "مضاعف القيمة الدفترية",
    "PE": "مضاعف الربحية",
    "PB": "مضاعف القيمة الدفترية",
    "ROE": "العائد على حقوق الملكية",
    "ROA": "العائد على الأصول",
    "EPS": "ربحية السهم",
    "D/E": "نسبة الدين إلى حقوق الملكية",
    "PEG": "مكرر الربحية إلى النمو",
    "EV/EBITDA": "قيمة المنشأة إلى الأرباح التشغيلية",
    "EV/Sales": "قيمة المنشأة إلى المبيعات",
    "Dividend Yield": "عائد التوزيعات",
    "Yield": "العائد",
    "Gross Margin": "هامش مجمل الربح",
    "Operating Margin": "هامش التشغيل",
    "Net Profit Margin": "هامش صافي الربح",
    "Revenue": "الإيرادات",
    "Sales": "المبيعات",
    "Gross Profit": "مجمل الربح",
    "Operating Income": "الدخل التشغيلي",
    "EBITDA": "الأرباح قبل الفوائد والضرائب",
    "Net Income": "صافي الربح",
    "Cash Flow": "التدفق النقدي",
    "Free Cash Flow": "التدفق النقدي الحر",
    "Operating Cash Flow": "التدفق النقدي التشغيلي",
    "Total Assets": "إجمالي الأصول",
    "Total Liabilities": "إجمالي الالتزامات",
    "Total Equity": "إجمالي حقوق الملكية",
    "Debt": "الديون",
    "Cash": "النقدية",
    "Working Capital": "رأس المال العامل",
    "Capex": "النفقات الرأسمالية",
    "Capital Expenditures": "النفقات الرأسمالية",
    "Sector": "القطاع",
    "Industry": "الصناعة",
    "Overview": "نظرة عامة",
    "Profile": "الملف التعريفي",
    "Financials": "القوائم المالية",
    "Balance Sheet": "المركز المالي",
    "Income Statement": "قائمة الدخل",
    "Cash Flow Statement": "قائمة التدفقات النقدية",
    "Valuation": "التقييم",
    "Growth": "النمو",
    "Profitability": "الربحية",
    "Liquidity": "السيولة",
    "Solvency": "الملاءة المالية",
    "Efficiency": "الكفاءة",
    "Technicals": "التحليل الفني",
    "Moving Averages": "المتوسطات المتحركة",
    "Oscillators": "المؤشرات المتذبذبة",
    "Pivot Points": "نقاط الارتكاز",
    "Support": "الدعم",
    "Resistance": "المقاومة",
    "Consensus": "إجماع المحللين",
    "Target Price": "السعر المستهدف",
    "Strong Buy": "شراء قوي",
    "Buy": "شراء",
    "Hold": "احتفاظ",
    "Sell": "بيع",
    "Strong Sell": "بيع قوي",
    "Underperform": "أداء ضعيف",
    "Outperform": "أداء قوي",
    "Neutral": "محايد",
    "Positive": "إيجابي",
    "Negative": "سلبي",
    "Bullish": "صعودي",
    "Bearish": "هبوطي",
    "High": "الأعلى",
    "Low": "الأدنى",
    "Open": "الافتتاح",
    "Close": "الإغلاق",
    "Previous Close": "الإغلاق السابق",
    "52 Week High": "أعلى 52 أسبوع",
    "52 Week Low": "أدنى 52 أسبوع",
    "YTD Return": "العائد منذ بداية العام",
    "1Y Return": "عائد سنة",
    "3Y Return": "عائد 3 سنوات",
    "5Y Return": "عائد 5 سنوات",
    "Beta": "بيتا",
    "Sharpe Ratio": "نسبة شارب",
    "Sortino Ratio": "نسبة سورتينو",
    "Volatility": "التقلب",
    "Correlation": "الارتباط",
    "Description": "الوصف",
    "About": "عن الشركة",
    "Website": "الموقع الإلكتروني",
    "Headquarters": "المقر الرئيسي",
    "Employees": "الموظفين",
    "Founded": "سنة التأسيس",
    "CEO": "الرئيس التنفيذي",
    "Peers": "المنافسين",
    "Competitors": "المنافسين",
    "Shareholders": "المساهمين",
    "Ownership": "هيكل الملكية",
    "Institutional": "مؤسسات",
    "Insider": "داخلي",
    "Retail": "أفراد",
    "Float": "أسهم حرة",
    "Shares Outstanding": "الأسهم القائمة",
    "Implied": "ضمني",
    "Historical": "تاريخي",
    "Forecast": "توقعات",
    "Analysis": "تحليل",
    "Rating": "تصنيف",
    "Risk": "مخاطرة",
    "Reward": "عائد",
    "Opportunity": "فرصة",
    "Threat": "تهديد",
    "Strength": "نقطة قوة",
    "Weakness": "نقطة ضعف",
    "Conclusion": "الخلاصة",
    "Summary": "الملخص",
    "Key Stats": "إحصائيات رئيسية",
    "More Info": "مزيد من المعلومات",
    "Source": "المصدر",
    "Last Updated": "آخر تحديث",
    "Currency": "العملة",
    "Exchange": "البورصة",
    "Country": "الدولة",
    "EV": "قيمة المنشأة",
    "YTD": "منذ بداية العام",
    "FY": "السنة المالية",
    "Q1": "الربع الأول",
    "Q2": "الربع الثاني",
    "Q3": "الربع الثالث",
    "Q4": "الربع الرابع",
    "Top Pick": "الأفضل",
    "Head-to-Head Comparison": "مقارنة مباشرة",
    "Comparison Snapshot": "خلاصة المقارنة",
    "Framework": "إطار التحليل",
    "Metric": "المؤشر",
    "Metrics": "المؤشرات",
    "Factor": "العامل",
    "Factors": "العوامل",
}
ARABIC_CARD_TITLE_FALLBACK = {
    "stock_header": "بيانات السهم",
    "snapshot": "ملخص التداول",
    "stats": "الإحصائيات",
    "financials_table": "القوائم المالية",
    "financial_explorer": "المستكشف المالي",
    "dividends_table": "سجل التوزيعات",
    "compare_table": "مقارنة",
    "movers_table": "تحركات السوق",
    "sector_list": "القطاعات",
    "screener_results": "نتائج الفحص",
    "technicals": "المؤشرات الفنية",
    "ownership": "هيكل الملكية",
    "fair_value": "القيمة العادلة",
    "news_list": "الأخبار",
    "error": "تنبيه",
    "bull_case": "السيناريو الإيجابي",
    "bear_case": "السيناريو السلبي",
    "disclaimer_card": "تحليل تعليمي",
}
ARABIC_STRUCTURAL_KEYS = {
    "logo_url", "payload", "symbol", "market_code", "session_id",
    "action_type", "intent", "backend_version", "as_of", "query",
    "type", "id", "timestamp",
    # Preserve non-display enum/control values to avoid breaking UI logic.
    "status", "variant", "direction", "format", "trend", "signal",
}


class ChatService:
    """Main chat orchestrator."""
    
    # WORLD-CLASS MODE: Claude AI is the PRIMARY routing engine
    USE_CLAUDE_ROUTING = True  # Toggle for A/B testing
    CLAUDE_ROUTING_THRESHOLD = 0.6  # Minimum confidence to use Claude result
    CLAUDE_FIRST = True  # NEW: Use Claude first, keyword as fallback
    
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self.router = create_router()
        self.resolver = SymbolResolver(conn)
        self.context_store = get_context_store()
        # World-Class AI Components
        self.conversation_memory = get_conversation_memory()
        self.claude_orchestrator = get_claude_orchestrator() if self.USE_CLAUDE_ROUTING else None

    @staticmethod
    def _contains_arabic_text(text: Optional[str]) -> bool:
        return bool(text and ARABIC_CHAR_RE.search(text))

    @staticmethod
    def _canonical_symbol(symbol: Optional[str]) -> str:
        """Normalize symbol for duplicate detection (COMI == COMI.CA)."""
        if not symbol:
            return ""
        return str(symbol).strip().upper().split(".")[0]

    def _dedupe_symbols(self, symbols: Optional[List[str]]) -> List[str]:
        """Deduplicate symbols by canonical form while preserving order."""
        out: List[str] = []
        seen: set[str] = set()
        for raw in symbols or []:
            sym = str(raw).strip().upper()
            if not sym:
                continue
            canonical = self._canonical_symbol(sym)
            if canonical in seen:
                continue
            seen.add(canonical)
            out.append(sym)
        return out

    def _extract_pending_suggestions_from_prompt(self, prompt: Optional[str]) -> List[str]:
        """
        Extract actionable follow-up options from prompt text.
        Returns normalized action keys used by Claude confirmation handling.
        """
        if not prompt:
            return []

        text = str(prompt).lower()
        action_rules = [
            ("compare", [
                r"\bcompare\b", r"\bvs\b", r"versus", r"comparison", r"peer", r"competitor",
                r"قارن", r"مقارنة", r"منافس", r"نظير", r"أقار", r"اقار"
            ]),
            ("deep_dive", [
                r"specific stock", r"single stock", r"this stock", r"that stock",
                r"calculate", r"compute", r"apply (this|that) metric",
                r"for a stock", r"run it on", r"drill down on",
                r"سهم معين", r"سهم محدد", r"لسهم معين", r"على سهم",
                r"احسب", r"حساب", r"طبّق", r"طبق", r"تطبيق هذا المؤشر"
            ]),
            ("financials", [
                r"financial", r"financials", r"income statement", r"balance sheet", r"cash flow",
                r"القوائم", r"مالية", r"الميزانية", r"التدفقات", r"الأرباح"
            ]),
            ("dividends", [
                r"dividend", r"yield", r"payout",
                r"توزيعات", r"توزيع", r"عائد التوزيع", r"عائد التوزيعات"
            ]),
            ("chart", [
                r"\bchart\b", r"technical", r"technicals", r"rsi", r"macd",
                r"رسم", r"فني", r"المؤشرات الفنية"
            ]),
        ]

        actions: List[str] = []
        for action, patterns in action_rules:
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    actions.append(action)
                    break

        return list(dict.fromkeys(actions))

    @staticmethod
    def _coerce_meta_dict(raw_meta: Any) -> Dict[str, Any]:
        """Safely coerce DB meta payloads into a dictionary."""
        if isinstance(raw_meta, dict):
            return raw_meta
        if isinstance(raw_meta, str):
            try:
                parsed = json.loads(raw_meta)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return {}
        return {}

    @staticmethod
    def _is_confirmation_reply(message: Optional[str]) -> bool:
        """Fast check for short confirmation replies like yes/ok/نعم."""
        if not message:
            return False
        normalized = re.sub(r"[^\w\s\u0600-\u06FF]", "", str(message).strip().lower())
        confirmations = {
            "yes", "yeah", "yep", "ok", "okay", "sure", "alright", "right",
            "نعم", "ايوه", "أيوه", "اه", "آه", "تمام", "ماشي", "اوك", "اوكي", "موافق",
        }
        return normalized in confirmations

    @staticmethod
    def _is_context_dependent_followup(message: Optional[str]) -> bool:
        """
        Heuristic for short context-dependent turns that need prior memory.
        Keeps explicit/new standalone questions from inheriting stale context.
        """
        if not message:
            return False

        text = str(message).strip()
        if not text:
            return False
        lower = text.lower()
        token_count = len(lower.split())

        pronoun_terms = [
            "it", "this", "that", "this one", "that one", "what about", "how about",
            "and?", "and", "then", "same",
            "هو", "هي", "ده", "دي", "هذا", "هذه", "إيه", "ايه", "طيب", "طب", "وبعدين", "وايه",
        ]
        expansion_terms = [
            "more", "details", "explain", "clarify", "go on", "continue",
            "اكتر", "أكثر", "وضح", "اشرح", "كمل", "كَمِّل", "فصّل", "فصل",
        ]

        has_context_term = any(term in lower for term in (pronoun_terms + expansion_terms))
        # Conservative: only short turns qualify to avoid leaking prior context
        return token_count <= 8 and has_context_term

    async def _hydrate_conversation_memory(
        self,
        session_id: str,
        current_message: str,
        history: Optional[List[Dict[str, Any]]],
        context: Optional[Any],
        language: str
    ) -> None:
        """
        Rehydrate conversation memory when request hits a cold worker.
        This keeps follow-up confirmations deterministic across processes.
        """
        memory = self.conversation_memory.get_or_create_session(session_id)
        confirmation_reply = self._is_confirmation_reply(current_message)
        followup_like = self._is_context_dependent_followup(current_message)

        # Critical guard: avoid importing stale session context for explicit standalone questions.
        if not confirmation_reply and not followup_like:
            return

        needs_turns = len(memory.turns) == 0 and (confirmation_reply or followup_like)
        needs_symbol = not memory.active_entities.symbol and (confirmation_reply or followup_like)
        needs_suggestions = not memory.pending_suggestions and confirmation_reply

        if not (needs_turns or needs_symbol or needs_suggestions):
            return

        # 1) Recover from in-process context store if available.
        context_pending: List[str] = []
        if context:
            if isinstance(getattr(context, "active_entities", None), dict):
                ae = context.active_entities
                memory.active_entities.update(
                    symbol=ae.get("symbol"),
                    sector=ae.get("sector"),
                    market=ae.get("market"),
                    metric=ae.get("metric"),
                    last_intent=ae.get("last_intent"),
                )
            memory.active_entities.update(
                symbol=getattr(context, "last_symbol", None),
                market=getattr(context, "last_market", None),
                last_intent=getattr(context, "last_intent", None),
            )
            raw_pending = getattr(context, "pending_suggestions", None) or []
            context_pending = [
                str(p).strip().lower()
                for p in raw_pending
                if str(p).strip()
            ]
            if context_pending and not memory.pending_suggestions:
                memory.pending_suggestions = list(dict.fromkeys(context_pending))

        # 2) Recover recent turns from request history if memory is cold.
        if needs_turns and history:
            for item in history[-8:]:
                if not isinstance(item, dict):
                    continue
                role = str(item.get("role", "")).strip().lower()
                if role == "ai":
                    role = "assistant"
                if role not in {"user", "assistant"}:
                    continue
                content = str(item.get("content") or "").strip()
                if not content:
                    continue
                memory.add_turn(
                    role=role,
                    content=content[:500],
                    language=language or "en"
                )

        # 3) DB fallback for multi-worker continuity (messages + follow-up prompt).
        latest_assistant_content = ""
        latest_assistant_meta: Dict[str, Any] = {}
        try:
            if needs_turns and not memory.turns:
                rows = await self.conn.fetch(
                    """
                    SELECT role, content
                    FROM chat_messages
                    WHERE session_id = $1
                    ORDER BY created_at DESC
                    LIMIT 8
                    """,
                    session_id
                )
                for row in reversed(rows):
                    role = str(row.get("role") or "").strip().lower()
                    if role not in {"user", "assistant"}:
                        continue
                    content = str(row.get("content") or "").strip()
                    if not content:
                        continue
                    memory.add_turn(
                        role=role,
                        content=content[:500],
                        language=language or "en"
                    )

            if needs_symbol or needs_suggestions:
                latest_row = await self.conn.fetchrow(
                    """
                    SELECT content, meta
                    FROM chat_messages
                    WHERE session_id = $1 AND role = 'assistant'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    session_id
                )
                if latest_row:
                    latest_assistant_content = str(latest_row.get("content") or "")
                    latest_assistant_meta = self._coerce_meta_dict(latest_row.get("meta"))
        except Exception as err:
            logger.warning(f"[ChatService] Context hydration DB fallback failed: {err}")

        # Confirmation detection in ContextAssembler requires at least one prior turn.
        # If memory is still empty, seed it with the latest assistant text/prompt.
        if needs_turns and not memory.turns:
            seed_prompt = (
                str(latest_assistant_meta.get("follow_up_prompt") or "").strip()
                if latest_assistant_meta else ""
            )
            seed_text = seed_prompt or latest_assistant_content
            if seed_text:
                memory.add_turn(
                    role="assistant",
                    content=seed_text[:500],
                    language=language or "en"
                )

        if needs_symbol:
            meta_entities = latest_assistant_meta.get("entities")
            if isinstance(meta_entities, dict):
                memory.active_entities.update(
                    symbol=meta_entities.get("symbol"),
                    sector=meta_entities.get("sector"),
                    market=meta_entities.get("market") or meta_entities.get("market_code"),
                    metric=meta_entities.get("metric"),
                    last_intent=meta_entities.get("last_intent"),
                )

            if not memory.active_entities.symbol:
                try:
                    summary = await self.conn.fetchrow(
                        """
                        SELECT last_symbol, last_intent
                        FROM chat_session_summary
                        WHERE session_id = $1
                        LIMIT 1
                        """,
                        session_id
                    )
                    if summary:
                        memory.active_entities.update(
                            symbol=summary.get("last_symbol"),
                            last_intent=summary.get("last_intent"),
                        )
                except Exception as err:
                    logger.warning(f"[ChatService] Session-summary fallback failed: {err}")

        if needs_suggestions and not memory.pending_suggestions:
            suggestion_texts: List[str] = []
            follow_up_prompt = latest_assistant_meta.get("follow_up_prompt")
            if follow_up_prompt:
                suggestion_texts.append(str(follow_up_prompt))

            actions = latest_assistant_meta.get("actions")
            if isinstance(actions, list):
                for action in actions:
                    if isinstance(action, dict):
                        payload = action.get("payload") or action.get("label") or ""
                        if payload:
                            suggestion_texts.append(str(payload))

            if not suggestion_texts and latest_assistant_content:
                suggestion_texts.append(latest_assistant_content)

            parsed: List[str] = []
            for text in suggestion_texts:
                parsed.extend(self._extract_pending_suggestions_from_prompt(text))

            if not parsed:
                intent_hint = str(memory.active_entities.last_intent or "").upper()
                fallback_by_intent = {
                    "STOCK_PRICE": ["financials", "chart"],
                    "STOCK_SNAPSHOT": ["financials", "chart"],
                    "DEFINE_TERM": ["deep_dive", "compare"],
                    "FINANCIALS": ["chart", "compare"],
                }
                parsed = fallback_by_intent.get(intent_hint, [])

            if parsed:
                memory.pending_suggestions = list(dict.fromkeys([
                    str(p).strip().lower() for p in parsed if str(p).strip()
                ]))

    def _build_follow_up_clarification_response(
        self,
        options: List[str],
        language: str,
        symbol: Optional[str] = None
    ) -> Dict[str, Any]:
        """Ask user to clarify which follow-up action they confirmed."""
        option_map_en = {
            "compare": "Compare with peers",
            "deep_dive": "Analyze this stock",
            "financials": "Deep financials",
            "dividends": "Dividend analysis",
            "chart": "Technical chart",
        }
        option_map_ar = {
            "compare": "مقارنة مع المنافسين",
            "deep_dive": "تحليل هذا السهم",
            "financials": "تحليل القوائم المالية",
            "dividends": "تحليل التوزيعات",
            "chart": "الرسم والتحليل الفني",
        }
        option_map = option_map_ar if language == "ar" else option_map_en

        normalized_options = [
            str(o).strip().lower() for o in (options or [])
            if str(o).strip().lower() in option_map
        ]
        normalized_options = list(dict.fromkeys(normalized_options))

        if not normalized_options:
            if language == "ar":
                message = (
                    f"ممتاز. إذا كنت تقصد {symbol}، اكتب الطلب مباشرة (مثال: حلّل {symbol})"
                    if symbol else
                    "ممتاز. للتكملة بشكل صحيح، اكتب الطلب الذي تريده أو اكتب رمز السهم أولاً (مثال: COMI)."
                )
                actions = [
                    {"label": "تحليل سهم", "label_ar": "تحليل سهم", "action_type": "query", "payload": "حلّل COMI"},
                    {"label": "مقارنة أسهم", "label_ar": "مقارنة أسهم", "action_type": "query", "payload": "قارن COMI مع SWDY"},
                ]
            else:
                message = (
                    f"Great. If you mean {symbol}, type the exact step (for example: Analyze {symbol})."
                    if symbol else
                    "Great. To continue accurately, type the exact step you want or provide a stock symbol first (for example: COMI)."
                )
                actions = [
                    {"label": "Analyze Stock", "label_ar": "تحليل سهم", "action_type": "query", "payload": "Analyze COMI"},
                    {"label": "Compare Stocks", "label_ar": "مقارنة أسهم", "action_type": "query", "payload": "Compare COMI vs SWDY"},
                ]

            return {
                "success": True,
                "clarification_type": "follow_up",
                "message": message,
                "cards": [],
                "actions": actions,
            }

        if language == "ar":
            if symbol:
                message = f"تأكيدك ممتاز. تقصد أي خطوة بالضبط لسهم {symbol}؟ اختر واحدة:"
            else:
                message = "تأكيدك ممتاز. تقصد أي خطوة بالضبط؟ اختر واحدة:"
        else:
            if symbol:
                message = f"Got it. Which step should I run for {symbol}? Please choose one:"
            else:
                message = "Got it. Which step should I run next? Please choose one:"

        actions: List[Dict[str, Any]] = []
        for action_key in normalized_options[:4]:
            label_en = option_map_en[action_key]
            label_ar = option_map_ar[action_key]
            if action_key == "compare":
                payload = f"Compare {symbol} with peers" if symbol else "Compare this stock with peers"
            elif action_key == "deep_dive":
                payload = f"Analyze {symbol}" if symbol else "Analyze this stock"
            elif action_key == "financials":
                payload = f"Show financials for {symbol}" if symbol else "Show financials"
            elif action_key == "dividends":
                payload = f"Show dividends for {symbol}" if symbol else "Show dividend analysis"
            else:
                payload = f"Show chart for {symbol}" if symbol else "Show technical chart"
            actions.append({
                "label": label_en,
                "label_ar": label_ar,
                "action_type": "query",
                "payload": payload
            })

        return {
            "success": True,
            "message": message,
            "cards": [],
            "actions": actions
        }

    def _build_compare_clarification_response(
        self,
        primary_symbol: Optional[str],
        peer_candidates: List[str],
        language: str
    ) -> Dict[str, Any]:
        """Ask user for a second distinct stock when comparison target is ambiguous."""
        symbol = (primary_symbol or "").upper().strip() or "the selected stock"
        unique_peers = self._dedupe_symbols(peer_candidates)[:4]

        if language == "ar":
            message = (
                f"لا أستطيع مقارنة {symbol} بنفسه. اكتب سهمًا آخر مختلفًا، "
                "أو اختر من المقترحات التالية."
            )
        else:
            message = (
                f"I can't compare {symbol} against itself. "
                "Please provide a different second stock, or pick one suggestion below."
            )

        actions: List[Dict[str, Any]] = []
        for peer in unique_peers:
            actions.append({
                "label": f"Compare {symbol} vs {peer}",
                "label_ar": f"قارن {symbol} مع {peer}",
                "action_type": "query",
                "payload": f"Compare {symbol} vs {peer}"
            })

        return {
            "success": True,
            "message": message,
            "cards": [],
            "actions": actions
        }

    def _derive_compare_pair(
        self,
        entities: Dict[str, Any],
        comparison_table: Optional[Dict[str, Any]],
        result_data: Dict[str, Any]
    ) -> List[str]:
        """
        Derive the final distinct comparison pair from response artifacts.
        Priority: structured comparison table headers -> cards payload -> entities.
        """
        candidates: List[str] = []

        if isinstance(comparison_table, dict):
            headers = comparison_table.get("headers")
            if isinstance(headers, list):
                for value in headers[1:]:
                    token = str(value).strip().upper()
                    if token:
                        candidates.append(token)

        if not candidates:
            for card in (result_data.get("cards") or []):
                if not isinstance(card, dict):
                    continue
                if str(card.get("type") or "").lower() not in {"compare_table", "comparison_table"}:
                    continue
                data = card.get("data") or {}
                stocks = data.get("stocks") if isinstance(data, dict) else None
                if isinstance(stocks, list):
                    for stock in stocks:
                        if isinstance(stock, dict):
                            sym = str(stock.get("symbol") or "").strip().upper()
                            if sym:
                                candidates.append(sym)
                break

        if not candidates:
            raw_compare = entities.get("compare_symbols") or []
            if isinstance(raw_compare, str):
                raw_compare = [raw_compare]
            candidates.extend([
                str(s).strip().upper()
                for s in raw_compare
                if str(s).strip()
            ])

        deduped = self._dedupe_symbols(candidates)
        return deduped[:2]

    @staticmethod
    def _build_compare_key_insight(compare_pair: List[str], language: str) -> Optional[str]:
        """Generate a deterministic key insight for peer comparisons."""
        if not compare_pair or len(compare_pair) < 2:
            return None
        first, second = compare_pair[0], compare_pair[1]
        if language == "ar":
            return (
                f"مقارنة {first} مع {second} تكون أدق عند الجمع بين التقييم والربحية "
                "والنمو والمخاطر، وليس الاعتماد على مؤشر واحد."
            )
        return (
            f"{first} vs {second}: evaluate valuation, profitability, growth, and risk together "
            "instead of relying on a single metric."
        )

    @staticmethod
    def _is_arabic_letter(ch: str) -> bool:
        if not ch:
            return False
        cp = ord(ch)
        return (
            0x0600 <= cp <= 0x06FF or
            0x0750 <= cp <= 0x077F or
            0x08A0 <= cp <= 0x08FF or
            0xFB50 <= cp <= 0xFDFF or
            0xFE70 <= cp <= 0xFEFF
        )

    @staticmethod
    def _is_symbol_like_token(token: str) -> bool:
        clean = re.sub(r"[^A-Za-z0-9]", "", token or "")
        if not clean:
            return False
        if clean.upper() in ARABIC_KEEP_TOKENS:
            return True
        # Allow common ticker-like tokens only (A-Z, digits, short).
        return clean.isalnum() and clean.isupper() and 1 <= len(clean) <= 6

    def _has_english_leak(self, text: Optional[str]) -> bool:
        if not text:
            return False
        for token in LATIN_TOKEN_RE.findall(text):
            if self._is_symbol_like_token(token):
                continue
            return True
        return False

    def _sanitize_arabic_string(
        self,
        text: Optional[str],
        fallback: Optional[str] = None
    ) -> Optional[str]:
        if text is None:
            return None
        if not isinstance(text, str):
            return text
        if text.startswith("http://") or text.startswith("https://"):
            return text

        out = text
        for en_txt, ar_txt in ARABIC_TEXT_REPLACEMENTS.items():
            out = out.replace(en_txt, ar_txt)

        # Remove non-symbol English tokens while preserving tickers/standard acronyms.
        def _replace_token(match: re.Match[str]) -> str:
            token = match.group(0)
            return token if self._is_symbol_like_token(token) else ""

        out = LATIN_TOKEN_RE.sub(_replace_token, out)
        # Strict Arabic mode: remove any non-Arabic alphabetic glyphs.
        # We keep ALL-CAPS ticker-like tokens (e.g., COMI, EGX30, ROE) for finance UI fidelity.
        out = "".join(
            ch for ch in out
            if (not ch.isalpha()) or self._is_arabic_letter(ch) or ("A" <= ch <= "Z")
        )
        out = re.sub(r"\s{2,}", " ", out).strip()
        out = re.sub(r"\s+([،,.!?:؛])", r"\1", out)

        if not out and fallback is not None:
            # IMPORTANT: sanitize fallback too. Otherwise Arabic mode can leak English
            # when callers pass ticker/symbol into the fallback text.
            sanitized_fallback = self._sanitize_arabic_string(fallback, fallback=None)
            return sanitized_fallback if sanitized_fallback else fallback
        return out

    def _sanitize_arabic_payload(self, value: Any, field_key: Optional[str] = None) -> Any:
        # Support Pydantic objects (v1/v2) so top-level structured fields
        # are sanitized as well, not just plain dict payloads.
        if hasattr(value, "model_dump") or hasattr(value, "dict"):
            try:
                raw = value.model_dump() if hasattr(value, "model_dump") else value.dict()
            except Exception:
                raw = None
            if isinstance(raw, dict):
                sanitized_raw = self._sanitize_arabic_payload(raw, field_key)
                try:
                    return value.__class__(**sanitized_raw)
                except Exception:
                    return sanitized_raw

        if isinstance(value, dict):
            sanitized = {}
            for k, v in value.items():
                # TRANSLATE KEY IF IT'S A KNOWN DISPLAY LABEL
                new_k = ARABIC_TEXT_REPLACEMENTS.get(k, k)
                
                sanitized[new_k] = self._sanitize_arabic_payload(v, k)
            return sanitized
        if isinstance(value, list):
            return [self._sanitize_arabic_payload(v, field_key) for v in value]
        if isinstance(value, str):
            if field_key in ARABIC_STRUCTURAL_KEYS:
                return value
            return self._sanitize_arabic_string(value, fallback="غير متاح")
        return value

    def _build_arabic_fallback_message(self, symbol: Optional[str] = None) -> str:
        if symbol:
            return f"إليك تحليل {symbol} بناءً على أحدث البيانات المتاحة حالياً."
        return "إليك التحليل بناءً على أحدث البيانات المتاحة حالياً."

    def _apply_intent_overrides(
        self,
        message: str,
        intent: Intent,
        entities: Dict[str, Any]
    ) -> Tuple[Intent, Dict[str, Any]]:
        """
        Deterministic overrides for enterprise scenario coverage.
        Ensures the 10 predefined scenario prompts always route to the intended intent.
        """
        msg = (message or "").strip()
        msg_lower = msg.lower()
        updated = dict(entities or {})

        has_real_estate = (
            bool(re.search(r"\b(real[\s-]?estate|property)\b", msg_lower))
            or any(tok in msg for tok in ["عقار", "عقاري", "العقارات", "الإسكان", "الاسكان"])
        )
        if has_real_estate and not updated.get("sector"):
            updated["sector"] = "Real Estate"

        is_hidden_gems = (
            bool(re.search(r"\bhidden\s+gems?\b", msg_lower))
            or any(tok in msg for tok in ["الجواهر الخفية", "فرص خفية", "الفرص الخفية"])
        )
        if is_hidden_gems:
            return Intent.HIDDEN_GEMS, updated

        is_macro_view = (
            bool(re.search(r"\b(macro\s+(market\s+)?view|top[-\s]?down\s+view|market\s+environment)\b", msg_lower))
            or any(tok in msg for tok in ["نظرة شمولية", "نظرة شاملة", "ماكرو", "الرؤية الكلية", "بيئة السوق"])
        )
        if is_macro_view:
            return Intent.MACRO_VIEW, updated

        is_index_composition = (
            bool(re.search(r"\begx\s*30\b.*\b(constituents|composition|stocks|members)\b", msg_lower))
            or bool(re.search(r"\b(constituents|composition)\b.*\begx\s*30\b", msg_lower))
            or any(tok in msg for tok in ["مكونات مؤشر egx 30", "مكونات egx30", "مكونات egx 30", "مؤشر egx 30"])
        )
        if is_index_composition:
            return Intent.INDEX_COMPOSITION, updated

        is_good_time = (
            bool(re.search(r"\b(good\s+time\s+to\s+buy|is\s+this\s+a\s+good\s+time\s+to\s+buy|market\s+timing)\b", msg_lower))
            or any(tok in msg for tok in ["وقت جيد للشراء", "توقيت السوق", "هل الوقت مناسب للشراء", "هل هذا وقت جيد للشراء"])
        )
        if is_good_time and not updated.get("symbol"):
            return Intent.MARKET_TIMING, updated

        is_compare_peers = (
            bool(re.search(r"\bcompare\b.*\b(peer|peers|competitors?)\b", msg_lower))
            or any(tok in msg for tok in ["قارن", "منافس", "منافسيه", "نظرائه", "نظائره"])
        )
        if is_compare_peers:
            return Intent.COMPARE_STOCKS, updated

        is_roe_definition = (
            ("roe" in msg_lower and bool(re.search(r"\b(what\s+does|what\s+is|meaning\s+of|mean)\b", msg_lower)))
            or ("العائد على حقوق الملكية" in msg)
            or ("ماذا يعني" in msg and "ROE" in msg.upper())
        )
        if is_roe_definition:
            updated["term"] = "ROE"
            return Intent.DEFINE_TERM, updated

        is_margins_decline = (
            bool(re.search(r"\bwhy\b.*\bmargins?\b.*\b(declin|fall|drop)\w*", msg_lower))
            or bool(re.search(r"\bdeclining\s+margins?\b", msg_lower))
            or any(tok in msg for tok in ["لماذا تنخفض الهوامش", "لماذا الهوامش", "تراجع الهوامش", "انخفاض الهوامش"])
        )
        if is_margins_decline:
            return Intent.FIN_MARGINS, updated

        is_most_undervalued = (
            bool(re.search(r"\b(most\s+undervalued|undervalued\s+stocks|undervalued\s+real[\s-]?estate|cheap\s+stocks|value\s+stocks)\b", msg_lower))
            or any(tok in msg for tok in ["الأكثر تقييماً بأقل", "أقل من قيمتها", "الأسهم المقيمة بأقل", "أسهم رخيصة"])
        )
        if is_most_undervalued and not updated.get("symbol"):
            return Intent.SCREENER_VALUE, updated

        is_should_buy = (
            bool(re.search(r"\bshould\s+i\s+(buy|invest)\b", msg_lower))
            or any(tok in msg for tok in ["هل يجب أن أشتري", "هل اشتري", "هل أشتري", "هل هذا السهم جيد للشراء"])
        )
        if is_should_buy:
            if updated.get("symbol"):
                return Intent.STOCK_SNAPSHOT, updated
            return Intent.MARKET_TIMING, updated

        return intent, updated

    async def _infer_peer_symbols(
        self,
        primary_symbol: str,
        market_code: Optional[str] = None,
        limit: int = 2
    ) -> List[str]:
        """
        Infer peer symbols using SMART SECTOR LOGIC (Enterprise Grade).
        Prioritizes:
        1. Same Sector + EGX Only
        2. Sorted by Market Cap (Leaders)
        3. Fallback: EGX30 Constituents (if sector undefined)
        """
        if not primary_symbol:
            return []

        # FORCE EGX
        market = "EGX"
        
        # Get Sector and Market Cap
        row = await self.conn.fetchrow(
            "SELECT sector_name, market_cap FROM market_tickers WHERE symbol = $1",
            primary_symbol
        )
        
        if not row:
            return []
            
        sector = row['sector_name']
        primary_mcap = row['market_cap'] or 0

        peers: List[str] = []
        try:
            # STRATEGY 1: Same Sector, Market Cap Neighbors
            # We want peers that are similar in size OR larger leaders
            if sector:
                # Get top peers in sector by Market Cap
                rows = await self.conn.fetch(
                    """
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                      AND sector_name = $2::text
                    ORDER BY market_cap DESC NULLS LAST
                    LIMIT $3
                    """,
                    primary_symbol,
                    sector,
                    limit + 2  # Fetch extra to filter
                )
                peers = [r["symbol"] for r in rows if r.get("symbol")]

            # STRATEGY 2: Fallback to EGX30 (Market Leaders) if no sector peers
            if len(peers) < 1:
                # Fallback to top EGX stocks by Market Cap (Proxy for EGX30)
                rows = await self.conn.fetch(
                    """
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                    ORDER BY market_cap DESC NULLS LAST
                    LIMIT $2
                    """,
                    primary_symbol,
                    limit
                )
                peers = [r["symbol"] for r in rows]

        except Exception as e:
            print(f"[ChatService] ⚠️ Failed to infer peers for {primary_symbol}: {e}")
            return []

        # Deduplicate by canonical symbol and exclude self aliases (e.g., COMI vs COMI.CA).
        primary_canonical = self._canonical_symbol(primary_symbol)
        filtered: List[str] = []
        seen: set[str] = set()
        for sym in peers:
            canonical = self._canonical_symbol(sym)
            if not canonical or canonical == primary_canonical:
                continue
            if canonical in seen:
                continue
            seen.add(canonical)
            filtered.append(str(sym).upper())
        return filtered[:limit]

    def _resolve_language(
        self,
        message: str,
        forced_language: Optional[str],
        normalized_language: Optional[str],
        claude_language: Optional[str] = None
    ) -> str:
        # Explicit Arabic from UI always wins.
        if forced_language == 'ar':
            return 'ar'
        # User Arabic text must produce Arabic response even if UI toggle is English.
        if self._contains_arabic_text(message):
            return 'ar'
        # If explicit English and message has no Arabic, keep English.
        if forced_language == 'en':
            return 'en'
        # Otherwise defer to orchestration results, then normalizer.
        if claude_language in ('ar', 'en'):
            return claude_language
        if normalized_language in ('ar', 'en'):
            return normalized_language
        return 'en'

    def _intent_allows_symbol_entity(self, intent: Intent) -> bool:
        """Return True when symbol context is valid for the given intent."""
        return intent in {
            Intent.STOCK_PRICE,
            Intent.STOCK_SNAPSHOT,
            Intent.STOCK_CHART,
            Intent.STOCK_STAT,
            Intent.FINANCIALS,
            Intent.FINANCIALS_ANNUAL,
            Intent.DIVIDENDS,
            Intent.TECHNICAL_INDICATORS,
            Intent.NEWS,
            Intent.FAIR_VALUE,
            Intent.FINANCIAL_HEALTH,
            Intent.COMPANY_PROFILE,
            Intent.OWNERSHIP,
            Intent.REVENUE_TREND,
            Intent.FIN_MARGINS,
            Intent.FIN_DEBT,
            Intent.FIN_CASH,
            Intent.FIN_GROWTH,
            Intent.FIN_EPS,
            Intent.RATIO_VALUATION,
            Intent.RATIO_EFFICIENCY,
            Intent.RATIO_LIQUIDITY,
            Intent.DEEP_VALUATION,
            Intent.DEEP_SAFETY,
            Intent.DEEP_GROWTH,
            Intent.DEEP_EFFICIENCY,
            Intent.COMPARE_STOCKS,
            Intent.FOLLOW_UP,
            Intent.MARKET_TIMING,
            Intent.CALENDAR_EARNINGS,
        }

    def _message_mentions_symbol(self, message: Optional[str], symbol: Optional[str]) -> bool:
        """Check if user message explicitly mentions the symbol token."""
        if not message or not symbol:
            return False
        canonical = self._canonical_symbol(symbol)
        if not canonical:
            return False
        pattern = rf"(?<![A-Z0-9]){re.escape(canonical)}(?:\\.[A-Z0-9]+)?(?![A-Z0-9])"
        return bool(re.search(pattern, str(message).upper()))

    @staticmethod
    def _is_buy_decision_query(message: Optional[str]) -> bool:
        """Detect buy/invest decision questions (stock-specific or generic)."""
        if not message:
            return False
        msg = str(message).strip()
        lower = msg.lower()
        if re.search(r"\bshould\s+i\s+(buy|invest)\b", lower):
            return True
        if re.search(r"\b(is\s+it\s+a\s+buy|worth\s+buying|buy\s+or\s+sell)\b", lower):
            return True
        arabic_buy_markers = [
            "هل اشتري", "هل أشتري", "اشتري", "أشتري", "شراء", "هل استثمر", "استثمر",
        ]
        return any(marker in msg for marker in arabic_buy_markers)

    @staticmethod
    def _is_market_wide_buy_query(message: Optional[str]) -> bool:
        """Detect broad market timing questions (not a specific stock decision)."""
        if not message:
            return False
        msg = str(message).strip()
        lower = msg.lower()
        en_markers = [
            "good time to buy", "market timing", "buy now", "market now",
            "is now a good time", "market condition", "should i buy now",
        ]
        if any(marker in lower for marker in en_markers):
            return True
        ar_markers = [
            "توقيت السوق", "الوقت مناسب", "هل الآن مناسب", "هل الان مناسب",
            "السوق", "المؤشر", "حالة السوق", "هل أشتري الآن", "هل اشتري الآن",
        ]
        return any(marker in msg for marker in ar_markers)

    async def _resolve_symbol_from_user_message(
        self,
        message: Optional[str],
        market_code: Optional[str]
    ) -> Optional[ResolvedSymbol]:
        """
        Resolve symbol from the ORIGINAL user message (not paraphrased text).
        This prevents paraphraser/LLM hallucinated tickers from overriding user intent.
        """
        if not message:
            return None

        raw = str(message).strip()
        if not raw:
            return None

        candidates: List[str] = []
        extracted = extract_potential_symbols(raw)
        generic_noise = {
            "الان", "الآن", "السوق", "شراء", "اشترى", "اشتري", "أشتري", "استثمر",
            "buy", "now", "market", "timing",
        }
        for item in extracted:
            token = str(item).strip()
            if not token:
                continue
            token_norm = normalize_text(token).normalized
            if not token_norm:
                continue
            if token_norm in generic_noise:
                continue
            if self._is_buy_decision_query(token_norm) or self._is_market_wide_buy_query(token_norm):
                continue
            candidates.append(token)

        seen: set[str] = set()
        for cand in candidates[:6]:
            key = cand.lower()
            if key in seen:
                continue
            seen.add(key)
            try:
                resolved = await self.resolver.resolve(cand, market_code)
            except Exception:
                resolved = None
            if resolved:
                return resolved
        return None

    @staticmethod
    def _is_low_quality_text(text: Optional[str]) -> bool:
        """Detect unusable narrative fragments such as punctuation-only outputs."""
        if not text:
            return True
        raw = str(text).strip()
        if not raw:
            return True
        # Keep latin/ar numbers/letters, drop punctuation/whitespace.
        compact = re.sub(r"[^A-Za-z0-9\u0600-\u06FF]+", "", raw)
        return len(compact) < 6

    def _enforce_response_language(
        self,
        response: ChatResponse,
        language: str,
        symbol: Optional[str] = None
    ) -> ChatResponse:
        response.language = language

        if language != 'ar':
            return response

        fallback_msg = self._build_arabic_fallback_message(symbol)

        response.message_text = self._sanitize_arabic_string(
            response.message_text,
            fallback=fallback_msg
        ) or fallback_msg

        response.conversational_text = self._sanitize_arabic_string(
            response.conversational_text,
            fallback=fallback_msg
        ) if response.conversational_text else fallback_msg

        if self._has_english_leak(response.conversational_text):
            response.conversational_text = fallback_msg

        response.framework_text = self._sanitize_arabic_string(response.framework_text) if response.framework_text else None
        response.follow_up_prompt = self._sanitize_arabic_string(
            response.follow_up_prompt,
            fallback="ما الجانب الذي ترغب أن أتعمق فيه بعد ذلك؟"
        ) if response.follow_up_prompt else "ما الجانب الذي ترغب أن أتعمق فيه بعد ذلك؟"
        response.disclaimer = self._sanitize_arabic_string(
            response.disclaimer,
            fallback="هذا تحليل تعليمي وليس توصية استثمارية."
        ) if response.disclaimer else "هذا تحليل تعليمي وليس توصية استثمارية."
        response.key_insight = self._sanitize_arabic_string(response.key_insight) if response.key_insight else None
        response.message_text_ar = response.message_text

        if response.fact_explanations:
            response.fact_explanations = self._sanitize_arabic_payload(response.fact_explanations)

        if response.learning_section:
            title = response.learning_section.get("title")
            items = response.learning_section.get("items", [])
            response.learning_section["title"] = self._sanitize_arabic_string(
                title,
                fallback="📘 ماذا تعني هذه الأرقام"
            ) or "📘 ماذا تعني هذه الأرقام"
            response.learning_section["items"] = [
                self._sanitize_arabic_string(i, fallback="تفصيل تعليمي متاح") or "تفصيل تعليمي متاح"
                for i in items
            ]

        if response.cards:
            for card in response.cards:
                card_type = str(getattr(card, "type", "")).lower()
                if card.title:
                    sanitized_title = self._sanitize_arabic_string(card.title)
                    if not sanitized_title or self._has_english_leak(sanitized_title):
                        sanitized_title = ARABIC_CARD_TITLE_FALLBACK.get(card_type, "تفاصيل التحليل")
                    card.title = sanitized_title
                elif card_type in ARABIC_CARD_TITLE_FALLBACK:
                    card.title = ARABIC_CARD_TITLE_FALLBACK[card_type]
                card.data = self._sanitize_arabic_payload(card.data)

        if response.actions:
            for action in response.actions:
                label = action.label_ar or action.label
                safe_label = self._sanitize_arabic_string(label, fallback="تنفيذ") or "تنفيذ"
                action.label = safe_label
                action.label_ar = safe_label

        if response.chart:
            response.chart.title = self._sanitize_arabic_string(
                response.chart.title,
                fallback=f"الرسم البياني لـ {response.chart.symbol}"
            ) or f"الرسم البياني لـ {response.chart.symbol}"
            response.chart.data = self._sanitize_arabic_payload(response.chart.data)
            response.chart.range = self._sanitize_arabic_string(response.chart.range) or response.chart.range

        # Structured top-level payloads used by premium renderer.
        for attr_name in [
            "data_card", "bull_case", "bear_case", "insight_cards", "stock_list",
            "macro_score", "comparison_table", "educational_cards", "disclaimer_card",
            "framework_card", "character_cards", "quantified_drivers", "index_composition",
        ]:
            attr_val = getattr(response, attr_name, None)
            if attr_val is not None:
                setattr(response, attr_name, self._sanitize_arabic_payload(attr_val))

        return response
    
    async def _get_user_name(self, user_id: Optional[str]) -> str:
        """Fetch the first name or smart-extract it from email."""
        if not user_id:
            return "Analyst"
            
        try:
            # Handle both string (email) and int (numeric ID) user_ids
            user_id_str = str(user_id).strip()
            
            # Helper to clean/format name
            def clean_name(name_potential):
                if not name_potential: return "Analyst"
                # Remove emojis/special chars
                # Remove emojis/special chars
                cleaned = re.sub(r'[^\w\s\u0600-\u06FF]', '', name_potential)
                if not cleaned: return "Analyst"
                # Capitalize first letter
                return cleaned.capitalize()

            # 1. Try DB Full Name
            full_name = None
            is_email = "@" in user_id_str
            
            if is_email:
                full_name = await self.conn.fetchval("SELECT full_name FROM users WHERE email = $1", user_id_str)
            elif user_id_str.isdigit():
                 full_name = await self.conn.fetchval("SELECT full_name FROM users WHERE id = $1", int(user_id_str))
                 
            if full_name:
                first_name = full_name.split(' ')[0]
                return clean_name(first_name)
            
            # 2. Smart Fallback: Extract name from email
            if is_email:
                # Extract "mohamed" from "mohamed@test.com" or "mohamed.ali@..."
                local_part = user_id_str.split('@')[0]
                # If "mohamed.ali", take "mohamed"
                name_part = local_part.split('.')[0]
                # Remove numbers from end (e.g. mohamed123 -> mohamed)
                # Remove numbers from end (e.g. mohamed123 -> mohamed)
                name_part = re.sub(r'\d+$', '', name_part)
                return clean_name(name_part)
                
            return "Analyst"

        except Exception as e:
            print(f"[ChatService] Name extraction error: {e}")
            # Final fallback if crash, try to salvage email user part
            if user_id and "@" in str(user_id):
                 return str(user_id).split('@')[0].capitalize()
            
        return "Analyst"

    async def process_message(
        self,
        message: str,
        session_id: Optional[str] = None,
        market: Optional[str] = None,
        history: list = None,
        user_id: Optional[str] = None,  # Added user_id
        language: Optional[str] = None  # Added explicit language (from Header)
    ) -> ChatResponse:
        """
        Process a chat message and return a response.
        """
        # ========================================================================
        # DIAGNOSTIC LOGGING - PHASE 1
        # ========================================================================
        print(f"\n🔬 [DIAG-START] process_message called")
        print(f"   message: {message[:100] if message else 'None'}...")
        print(f"   session_id: {session_id}")
        print(f"   user_id: {user_id}")
        print(f"   language: {language}")
        # ========================================================================
        
        start_time = time.time()
        forced_language = language # Store initial passed language
        
        # ... (rest of method unchanged until analytics logging) ...
        
        # Generate session ID if not provided
        if not session_id:
            session_id = self.context_store.generate_session_id()
        
        # Get context
        context = self.context_store.get(session_id)
        
        # TRUTH SOURCE FIX: If history is empty but we have a valid session_id, 
        # try to verify if this is actually a returning session from the DB.
        # This prevents "First Message" greetings if the frontend fails to send history.
        if (history is None or len(history) == 0) and session_id:
             try:
                 # Check if we have prior messages in DB for this session
                 prior_count = await self.conn.fetchval("SELECT COUNT(*) FROM chat_messages WHERE session_id = $1", session_id)
                 if prior_count and prior_count > 0:
                     # Fabricate a history item so is_first_message logic works correctly
                     history = [{'role': 'system', 'content': 'Previous session context exists.'}]
                     print(f"[ChatService] 🔄 Restored session context from DB (Messages: {prior_count})")
             except Exception as e:
                 print(f"[ChatService] ⚠️ Failed to check DB history: {e}")

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
        print(f"🔬 [DIAG-STEP-1] Starting Paraphrasing...")
        try:
            paraphraser = get_paraphraser()
            paraphrased_intent_query = await paraphraser.paraphrase(message)
            
            # Use paraphrased text for routing, but keep original for conversational context
            routing_text = paraphrased_intent_query if paraphrased_intent_query else message
            if paraphrased_intent_query:
                print(f"👻 Slang Detected! Routing using: '{routing_text}' (Original: {message})")
            print(f"✅ [DIAG-STEP-1] Paraphrasing COMPLETE")
            # ------------------------------------------------------------------
    
            # 2. Normalize text (Using routing_text)
            print(f"🔬 [DIAG-STEP-2] Starting Normalization...")
            normalized = normalize_text(routing_text)
            print(f"✅ [DIAG-STEP-2] Normalization COMPLETE - lang: {normalized.language}")
            
            # --- LANGUAGE ENFORCEMENT ---
            # Highest priority: Arabic user input should always receive Arabic response.
            print(f"🔬 [DIAG-STEP-3] Resolving Language...")
            language = self._resolve_language(
                message=message,
                forced_language=forced_language,
                normalized_language=normalized.language,
            )
            if forced_language in ['en', 'ar']:
                print(f"[ChatService] 🌍 Language Resolution: Detected '{normalized.language}' | Header '{forced_language}' -> Using '{language}'")
            print(f"✅ [DIAG-STEP-3] Language resolved to: {language}")
            # -----------------------------

            # Cold-worker continuity fix:
            # Rehydrate follow-up memory before intent classification.
            await self._hydrate_conversation_memory(
                session_id=session_id,
                current_message=message,
                history=history,
                context=context,
                language=language
            )
            
            # 3. Check compliance
            print(f"🔬 [DIAG-STEP-4] Checking Compliance...")
            # IMPORTANT: Run compliance on the ORIGINAL user message first.
            # Paraphrasing can translate Arabic -> English, causing Arabic users to see English blocked copy.
            is_blocked, violation_type, block_message = check_compliance(message)
            if (not is_blocked) and routing_text and routing_text != message:
                is_blocked, violation_type, block_message = check_compliance(routing_text)
            if is_blocked:
                print(f"🚫 [DIAG-STEP-4] Content BLOCKED - {violation_type}")
                if language == "ar":
                    block_message = COMPLIANCE_RESPONSE_AR
                result = handle_blocked(violation_type, block_message, language)
                response = self._build_response(result, Intent.BLOCKED, 1.0, {}, start_time, language, context=None)
                return self._enforce_response_language(response, language)
            print(f"✅ [DIAG-STEP-4] Compliance check PASSED")
            
            # 4. Route intent - CLAUDE-FIRST ARCHITECTURE (World-Class 2.0)
            # ------------------------------------------------------------------
            print(f"🔬 [DIAG-STEP-5] Starting Intent Routing...")
            # Strategy: Use Claude AI as PRIMARY for intent understanding.
            # Fall back to keyword routing only if Claude fails or is disabled.
            # This ensures TRUE conversational AI understanding.
            # ------------------------------------------------------------------
            intent = Intent.UNKNOWN
            entities = {}
            confidence = 0.0
            
            if self.USE_CLAUDE_ROUTING and self.CLAUDE_FIRST and self.claude_orchestrator:
                try:
                    # CLAUDE-FIRST: Call Claude AI for intelligent routing
                    real_user_name = await self._get_user_name(user_id) if user_id else "Analyst"
                    
                    claude_result = await self.claude_orchestrator.classify(
                        message=message,  # Original message (not paraphrased)
                        session_id=session_id,
                        user_name=real_user_name,
                        user_id=user_id
                    )
                    
                    if claude_result.confidence >= self.CLAUDE_ROUTING_THRESHOLD:
                        intent = claude_result.intent
                        entities = claude_result.entities or {}
                        language = self._resolve_language(
                            message=message,
                            forced_language=forced_language,
                            normalized_language=normalized.language,
                            claude_language=claude_result.language
                        )
                        confidence = claude_result.confidence
                        
                        # Track follow-up context
                        if claude_result.is_follow_up:
                            # Merge inherited entities
                            for key, val in claude_result.inherited_entities.items():
                                if val and key not in entities:
                                    entities[key] = val
                        
                        print(f"🧠 Claude AI (PRIMARY): {intent.value} | Entities: {entities} | Confidence: {confidence:.2f}")
                    else:
                        # Claude confidence too low, fall back to keyword
                        print(f"⚠️ Claude low confidence ({claude_result.confidence:.2f}), using keyword fallback")
                        intent_result = self.router.route(routing_text, context_dict)
                        intent = intent_result.intent
                        entities = intent_result.entities
                        confidence = intent_result.confidence if hasattr(intent_result, 'confidence') else 0.8
                        
                except Exception as claude_err:
                    print(f"⚠️ Claude routing error: {claude_err}, using keyword fallback")
                    intent_result = self.router.route(routing_text, context_dict)
                    intent = intent_result.intent
                    entities = intent_result.entities
                    confidence = intent_result.confidence if hasattr(intent_result, 'confidence') else 0.8
            else:
                # Fallback: Keyword-based routing (legacy mode)
                intent_result = self.router.route(routing_text, context_dict)
                intent = intent_result.intent
                entities = intent_result.entities
                confidence = intent_result.confidence if hasattr(intent_result, 'confidence') else 0.8

            # Deterministic scenario coverage overrides (10-scenario enterprise set)
            overridden_intent, overridden_entities = self._apply_intent_overrides(
                message=message,
                intent=intent,
                entities=entities
            )
            if overridden_intent != intent:
                print(f"[ChatService] 🎯 Intent override: {intent.value} -> {overridden_intent.value}")
                intent = overridden_intent
            entities = overridden_entities

            # Guardrail: prevent stale or hallucinated symbol carryover on non-symbol intents.
            candidate_symbol = entities.get('symbol')
            if candidate_symbol:
                explicit_symbol_in_query = self._message_mentions_symbol(message, candidate_symbol)
                if not self._intent_allows_symbol_entity(intent) and not explicit_symbol_in_query:
                    entities.pop('symbol', None)
                    entities.pop('market_code', None)
                    candidate_symbol = None

                # Extra guard: market-wide intents should not carry a hidden/hallucinated symbol.
                market_wide_intents = {
                    Intent.MARKET_TIMING,
                    Intent.MARKET_SUMMARY,
                    Intent.MARKET_STATUS,
                    Intent.MACRO_VIEW,
                }
                if (
                    candidate_symbol
                    and intent in market_wide_intents
                    and not explicit_symbol_in_query
                ):
                    entities.pop('symbol', None)
                    candidate_symbol = None

            # Keep compare_symbols only for compare workflows.
            if intent != Intent.COMPARE_STOCKS and entities.get('compare_symbols'):
                entities.pop('compare_symbols', None)
            
            # Force market code in entities if provided explicitly
            if market:
                entities['market_code'] = market
            
            print(f"✅ [DIAG-STEP-5] Intent Routing COMPLETE - intent: {intent.value}, conf: {confidence}, entities: {list(entities.keys())}")
            
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
            intent_uses_symbol_routing = (
                self._intent_allows_symbol_entity(intent)
                or intent == Intent.COMPARE_STOCKS
            )
            symbol = entities.get('symbol') if intent_uses_symbol_routing else None
            potential_symbols = extract_potential_symbols(routing_text) if intent_uses_symbol_routing else []
            potential_symbols_original = extract_potential_symbols(message) if intent_uses_symbol_routing else []
            candidate = None
            resolved_from_user_text = None

            # Resolve from the original user message first whenever symbol confidence is weak.
            # This prevents paraphraser/LLM hallucinated tickers from hijacking intent.
            if intent_uses_symbol_routing and (
                self._contains_arabic_text(message)
                or not symbol
                or not self._message_mentions_symbol(message, symbol)
            ):
                resolved_from_user_text = await self._resolve_symbol_from_user_message(
                    message=message,
                    market_code=entities.get('market_code')
                )
                if resolved_from_user_text and (
                    not symbol
                    or not self._message_mentions_symbol(message, symbol)
                ):
                    entities['symbol'] = resolved_from_user_text.symbol
                    entities['market_code'] = resolved_from_user_text.market_code
                    symbol = resolved_from_user_text.symbol
                    print(f"[ChatService] 🧭 Original-message resolution override: '{symbol}'")
            
            # CRITICAL FIX: Prefer Claude's entity symbol over regex extraction.
            # The paraphraser introduces false positives (e.g. "Hal el 3a3ra fel COMI?" ->
            # regex extracts HAL, FEL, COMI — but HAL/FEL are paraphraser artifacts, not stocks).
            # Claude's classification is the authoritative symbol source.
            if intent_uses_symbol_routing:
                if symbol and len(symbol) >= 3:
                    candidate = symbol  # Trust Claude's classification as primary
                    print(f"[ChatService] 🎯 Using Claude's entity symbol: '{candidate}' (from entities)")
                elif potential_symbols_original:
                    candidate = potential_symbols_original[0]  # Prefer original user text extraction
                    print(f"[ChatService] 🔍 Using original-text candidate: '{candidate}' (from {potential_symbols_original})")
                elif potential_symbols:
                    candidate = potential_symbols[0]  # Fallback to regex extraction
                    print(f"[ChatService] 🔍 Using regex-extracted symbol: '{candidate}' (from {potential_symbols})")
                else:
                    # FALLBACK: "Hail Mary" Regex for English Tickers (3-5 Uppercase Letters)
                    # This catches "COMI" in "What about COMI" if entity extraction missed it.
                    fallback_match = re.search(r'\b[A-Z]{3,5}\b', routing_text)
                    if fallback_match:
                        candidate = fallback_match.group(0)
                        print(f"[ChatService] 🛡️ Fallback Regex caught symbol: '{candidate}'")
                    else:
                        candidate = None
                        print(f"[ChatService] ⚠️ No symbol candidate found")
            
            # --- CRITICAL FIX FOR COMPARISON BUG ---
            # If intent is COMPARE_STOCKS, we must grab ALL potential symbols, not just the first one.
            # This prevents fallback to Context (last_symbol) when multiple valid symbols exist
            # but Claude extraction might have missed them or returned low confidence.
            if intent == Intent.COMPARE_STOCKS and potential_symbols:
                existing_compare = entities.get('compare_symbols', [])
                if isinstance(existing_compare, str):
                    existing_compare = [existing_compare]
                elif existing_compare is None:
                    existing_compare = []
                
                merged_compare = [
                    str(x).upper() for x in existing_compare if str(x).strip()
                ] + [
                    str(s).upper() for s in potential_symbols if str(s).strip()
                ]
                entities['compare_symbols'] = self._dedupe_symbols(merged_compare)
                print(f"[ChatService] 🔍 Enhanced Compare Symbols from Regex: {entities['compare_symbols']}")
            # ---------------------------------------
            
            if not candidate and entities.get('compare_symbols'):
                compare_symbols = entities.get('compare_symbols')
                if isinstance(compare_symbols, list) and compare_symbols:
                    candidate = compare_symbols[0]
                elif isinstance(compare_symbols, str):
                    candidate = compare_symbols
            
            # Resolve if candidate exists
            resolved_symbol = None
            resolver_method = "none"
            
            if candidate:
                resolved_symbol = await self.resolver.resolve(candidate, entities.get('market_code'))
                resolver_method = "extraction"
            if not resolved_symbol and resolved_from_user_text:
                resolved_symbol = resolved_from_user_text
                resolver_method = "user_message"
                
            # --- CONTEXT RELEVANCE FIX (The "JUFO" Killer) ---
            # Only certain intents should inherit the last symbol from context.
            # This prevents "JUFO" (or any previous stock) from leaking into unrelated queries.
            # e.g., "Hello" or "Market Status" should NEVER pick up a stock context.
            CONTEXT_AWARE_INTENTS = [
                Intent.STOCK_PRICE, Intent.STOCK_SNAPSHOT, Intent.STOCK_CHART, 
                Intent.STOCK_STAT, Intent.FINANCIALS, Intent.FINANCIALS_ANNUAL, 
                Intent.DIVIDENDS, Intent.TECHNICAL_INDICATORS, Intent.NEWS,
                Intent.FAIR_VALUE, Intent.FINANCIAL_HEALTH, Intent.COMPANY_PROFILE,
                Intent.OWNERSHIP, Intent.REVENUE_TREND, Intent.FIN_MARGINS,
                Intent.DEEP_VALUATION, Intent.DEEP_SAFETY, Intent.DEEP_GROWTH, 
                Intent.DEEP_EFFICIENCY, Intent.FOLLOW_UP,
                # Extended Scenarios needing symbol
                Intent.MARKET_TIMING # "Is now a good time to buy [Context]?"
            ]

            # Try last symbol from context ONLY if intent allows it
            should_use_context = intent_uses_symbol_routing and intent in CONTEXT_AWARE_INTENTS
            if not resolved_symbol and context_dict.get('last_symbol') and should_use_context:
                resolved_symbol = await self.resolver.resolve(context_dict['last_symbol'], entities.get('market_code'))
                resolver_method = "context"
                print(f"[ChatService] 🔗 Context Fallback: Using '{context_dict['last_symbol']}' for {intent}")
            elif not resolved_symbol and context_dict.get('last_symbol') and not should_use_context:
                print(f"[ChatService] 🛑 Context Blocked: Ignored '{context_dict['last_symbol']}' for {intent} (Not Context-Aware)")
                
            # If resolved, update entities and context
            actual_symbol = None
            if resolved_symbol:
                actual_symbol = resolved_symbol.symbol
                entities['symbol'] = actual_symbol
                entities['market_code'] = resolved_symbol.market_code

            # Intent correction: buy-decision queries with a resolved stock should be
            # answered as stock analysis, not broad market timing.
            if intent == Intent.MARKET_TIMING and self._is_buy_decision_query(message):
                if actual_symbol:
                    print(f"[ChatService] 🎯 Buy decision mapped to STOCK_SNAPSHOT for {actual_symbol}")
                    intent = Intent.STOCK_SNAPSHOT
                elif not self._is_market_wide_buy_query(message):
                    print("[ChatService] 🎯 Buy decision lacks clear symbol -> CLARIFY_SYMBOL")
                    intent = Intent.CLARIFY_SYMBOL
                    entities.pop('symbol', None)
                
            # 6. Execute Handler
            handler_name = intent.value
            result = await self._dispatch_handler(intent, entities, language, routing_text)
            
            # --- NORMALIZATION FIX (Ensure Pipeline Processing) ---
            # If handler returns a ChatResponse object (e.g. Deep Dive), convert to dict
            # so it flows through the World-Class Conversational Framework (LLM + Layers).
            if isinstance(result, ChatResponse):
                print(f"[ChatService] 🔄 Converting ChatResponse for {intent} to pipeline dict")
                # Use .dict() for Pydantic v1 compatibility (or .model_dump() for v2)
                # We try .dict() first as it's safer for mixed envs
                def to_dict(obj):
                    return obj.dict() if hasattr(obj, 'dict') else obj.model_dump()

                result = {
                    'cards': [to_dict(c) for c in (result.cards or [])],
                    'chart': to_dict(result.chart) if result.chart else None,
                    'actions': [to_dict(a) for a in (result.actions or [])],
                    'data': {},
                    'success': True
                }
            
            # CRITICAL CHECK: Force Data Card if missing for data intents
            result_data = result if isinstance(result, dict) else {}
            DATA_INTENTS = [
                Intent.STOCK_PRICE, Intent.STOCK_SNAPSHOT, Intent.FINANCIALS, 
                Intent.DIVIDENDS, Intent.TECHNICAL_INDICATORS, Intent.NEWS
            ]
            
            if intent in DATA_INTENTS and result_data.get('success', True) and not result_data.get('cards'):
                print(f"⚠️ NO DATA DETECTED for {intent}. Injecting Fallback Card.")
                msg_title = "Data Unavailable" if language == 'en' else "البيانات غير متاحة"
                msg_body = "We could not retrieve the latest data for this specific request. Please try another stock." if language == 'en' else "تعذر الحصول على أحدث البيانات لهذا الطلب. يرجى تجربة سهم آخر."
                
                result_data['cards'] = [{
                    'type': 'error',
                    'title': msg_title,
                    'data': {'content': f"### ⚠️ {msg_body}"}
                }]
                result = result_data # Ensure it propagates
            
            # -------------------------------------------------------------
            # PHASE 2: HYBRID CONVERSATIONAL LAYER (The "Starta" Voice)
            # -------------------------------------------------------------
            explainer = get_explainer()
            conversational_text = None
            fact_explanations = None
            
            # Trigger Narrative for most intents except system ones
            NO_NARRATIVE_INTENTS = [
                Intent.UNKNOWN,
                Intent.BLOCKED,
                Intent.HELP,
                Intent.GREETING,
                Intent.IDENTITY,
                Intent.CAPABILITIES,
                Intent.MOOD,
                Intent.GRATITUDE,
                Intent.GOODBYE,
                Intent.CLARIFY_SYMBOL,
                Intent.DEFINE_TERM,
            ]
            skip_narrative_for_clarification = (
                (intent == Intent.FOLLOW_UP and bool(entities.get("clarify_follow_up")))
                or (intent == Intent.CLARIFY_SYMBOL)
                or bool(result_data.get("clarification_type") == "symbol")
            )
            
            # Important: ensure result is a dict and has success
            result_data = result if isinstance(result, dict) else {}

            # Extended scenarios ship their own narrative and learning sections that must not
            # be overwritten by the generic LLM narrator (keeps UI consistent with the rules).
            EXTENDED_INTENTS = {
                Intent.HIDDEN_GEMS,
                Intent.MACRO_SCORE,
                Intent.MARKET_TIMING,
                Intent.MACRO_VIEW,
                Intent.INDEX_COMPOSITION,
                Intent.SCREENER_VALUE,
            }
            is_extended_intent = intent in EXTENDED_INTENTS
            handler_conversational_text = result_data.get('conversational_text')
            handler_learning_section = result_data.get('learning_section')
            
            # --- INITIALIZE PREMIUM LAYERS ---
            # Pre-declare to avoid UnboundLocalError in catastrophic failure paths
            conversational_text = None
            fact_explanations = None
            learning_section = None
            follow_up_prompt = None
            thought_points = None
            
            # Fetch real user name for personalization (Moved up for global scope)
            real_user_name = await self._get_user_name(user_id)
            
            # --- PHASE 4: PERSONALIZATION ENGINE ---
            # 1. Update Sophistication Score based on Intent
            user_sophistication = 0.0
            if user_id:
                try:
                    user_sophistication = await SophisticationAnalyzer.update_user_sophistication(
                        self.conn, user_id, intent
                    )
                except Exception as e:
                    logger.error(f"Failed to analyze sophistication: {e}")
            
            # 2. Determine User Level (for NLU/NLG adaptation)
            user_level = SophisticationAnalyzer.get_level(user_sophistication)

            # 3. Retrieve Long-Term Memories (Vector Search)
            context_memories = None
            # Skip for small talk to save latency
            if user_id and intent not in [Intent.GREETING, Intent.IDENTITY, Intent.MOOD, Intent.GRATITUDE]:
                 try:
                     # Use the user's latest query for retrieval
                     retrieval_query = message
                     if conversational_text: # If we have a rephrased query or similar
                         pass # Use raw message for now
                     
                     raw_mems = await MemoryManager.retrieve_relevant_memories(
                         self.conn, user_id, retrieval_query
                     )
                     context_memories = MemoryManager.format_memories_for_prompt(raw_mems)
                     if context_memories:
                         logger.info(f"🧠 Context injected for User {user_id}: {len(raw_mems)} memories")
                 except Exception as e:
                     logger.error(f"Failed to retrieve memories: {e}")

            # 4. Phase 5: Get Market Stats for Tone Steering
            market_stats = None
            try:
                # Quick fetch of EGX30 for sentiment analysis
                # Ideally we ask MarketHandler, but for speed we can do a lightweight query
                # or reuse if we already fetched market summary?
                # For MVP: We will implement a quick helper or just assume neutral if fails
                pass 
                # (We will rely on existing handlers to populate this if possible, 
                # otherwise we might need a dedicated fetch.
                # For now, let's look if 'cards' contain market data? 
                # See below where we extract it)
            except Exception:
                pass

            if (
                result_data.get('success', True)
                and intent not in NO_NARRATIVE_INTENTS
                and not skip_narrative_for_clarification
            ):
                try:
                    # Fetch real user name - MOVED UP
                    # real_user_name = await self._get_user_name(user_id)
                    
                    # DETERMINISTIC STATE CONTROL (The "Starta" Fix)
                    # 1. Check DB for EXACT message count for this session
                    msg_count = 0
                    if session_id:
                        msg_count = await self.conn.fetchval("SELECT count(*) FROM chat_messages WHERE session_id = $1 AND role = 'user'", session_id)
                    
                    # 2. Strict Boolean Flag (Double Safety: DB + History Array)
                    # If history has items, it is NOT a new session, regardless of DB lag.
                    # ENTERPRISE FIX: Filter out system welcome messages from history count
                    # Only count real user/assistant exchanges
                    real_history_count = 0
                    if history:
                        for h in history:
                            # Skip system messages and initial welcome
                            if h.get('role') == 'system':
                                continue
                            if h.get('role') == 'assistant' and 'initialized' in str(h.get('content', '')).lower():
                                continue
                            real_history_count += 1
                    
                    has_history = real_history_count > 0
                    
                    # is_returning_user: True if DB shows messages OR request has history array
                    is_returning_user = (msg_count is not None and msg_count > 0) or has_history
                    
                    # is_new_session: True ONLY if strictly no prior messages in DB AND history
                    is_new_session = (msg_count == 0) and not has_history
                    
                    # 3. Log the decision for debugging (DETAILED)
                    print(f"[ChatService] 🔍 Session '{session_id}' | DB: {msg_count} | Hist: {real_history_count} | New? {is_new_session} | Returning? {is_returning_user}")

                    # 4. Generate Narrative
                    # Check for Deep Dive Mode (CFA Level 3) - mirrors logic in llm_explainer
                    card_types_str = [str(c.get('type', 'data')).lower() for c in result_data.get('cards', [])]
                    is_deep_dive = (
                        'financial_explorer' in card_types_str or 
                        'financials_table' in card_types_str or
                        intent.value in [
                            'FINANCIALS', 'FINANCIALS_ANNUAL', 'REVENUE_TREND', 
                            'FIN_MARGINS', 'FIN_DEBT', 'FIN_CASH', 'FIN_GROWTH', 'FIN_EPS', 
                            'RATIO_VALUATION', 'RATIO_EFFICIENCY', 'RATIO_LIQUIDITY', 
                            'DEEP_VALUATION', 'DEEP_SAFETY', 'DEEP_EFFICIENCY', 'DEEP_GROWTH', 
                            'FAIR_VALUE', 'COMPANY_PROFILE'
                        ] or 
                        'financial' in str(intent.value).lower()
                    )

                    # ENTERPRISE GREETING LOGIC (Chief Expert Standard)
                    # 1. New Session: ALWAYS greet (Human Opening), regardless of intent.
                    # 2. Ongoing: NEVER greet (Keep flow).
                    
                    final_allow_greeting = False
                    force_human_opening = False
                    
                    if is_new_session:
                        final_allow_greeting = True
                        logger.info(f"[ChatService] 👋 Allowing greeting: New session")
                    else:
                        force_human_opening = False
                        logger.info(f"[ChatService] 💬 Suppressing greeting: Returning user")
                    
                    # DYNAMIC TOKEN LIMIT: Increase for deep dives
                    explainer.MAX_TOKENS = 1000 if is_deep_dive else 400
                    if is_extended_intent and handler_conversational_text:
                        conversational_text = handler_conversational_text
                    else:
                        # Define cards and should_greet for the generate_narrative call
                        cards = result_data.get('cards', [])
                        should_greet = final_allow_greeting # Use the determined greeting flag
                        conversational_text = await explainer.generate_narrative(
                            query=message,
                            intent=intent,
                            data=cards,
                            language=language,
                            user_name=real_user_name,
                            allow_greeting=should_greet,
                            is_returning_user=is_returning_user,
                            # Phase 4: Personalization
                            user_level=user_level,
                            context_memories=context_memories,
                            # Phase 5: Tone Steering
                            # We need to pass the market stats. 
                            # If the user asked for MARKET_SUMMARY, 'cards' has it.
                            # If not, we might not have it.
                            # Strategy: We'll extract from 'cards' if present, or let Explainer default to NEUTRAL.
                            # IMPROVEMENT: We should ideally fetch EGX30 globally.
                            # For MVP: We will scan 'cards' for 'stock_header' of EGX30 or 'market_summary' type.
                            market_stats=_extract_market_stats(cards)
                        )

                    # DEBUG LOGGER (TEMPORARY - FOR DIAGNOSIS)
                    # DEBUG LOGGER (TEMPORARY - FOR DIAGNOSIS)
                    if conversational_text and not is_extended_intent:
                        print("DEBUG: WRITING TO /tmp/debug_chat.log")
                        with open("/tmp/debug_chat.log", "a") as f:
                            f.write(f"\n\n--- [SESSION {session_id}] ---\n")
                            f.write(conversational_text)
                            f.write("\n------------------------------\n")

                    # ------------------------------------------------------------------
                    # ROBUST "FUZZY" INSIGHTS PARSER (ENTERPRISE GRADE)
                    # ------------------------------------------------------------------
                    if conversational_text:
                        # import re - REMOVED
                        clean_text = conversational_text
                        
                        # Definition of Robust Patterns (Handle bold, caps, spacing)
                        patterns = {
                            'bull': r"(?:\[BULL[_ ]CASE\]|\*\*\[?BULL[_ ]CASE\]?\*\*|📈\s*Bull\s*Case|Bull\s*Case\s*\([^)]*\)|BULL[_ ]CASE\s*[:\n])",
                            'bear': r"(?:\[BEAR[_ ]CASE\]|\*\*\[?BEAR[_ ]CASE\]?\*\*|📉\s*Bear\s*Case|Bear\s*Case\s*\([^)]*\)|BEAR[_ ]CASE\s*[:\n])",
                            'framework': r"(?:\[FRAMEWORK\]|\*\*\[?FRAMEWORK\]?\*\*|FRAMEWORK\s*[:\n])",
                            'my_framework': r"(?:\[MY[_ ]FRAMEWORK\]|\*\*\[?MY[_ ]FRAMEWORK\]?\*\*|My\s*Framework\s*[:\n]|MY[_ ]FRAMEWORK\s*[:\n])",
                            'methodology': r"(?:\[METHODOLOGY\]|\*\*\[?METHODOLOGY\]?\*\*|Methodology\s*[:\n]|METHODOLOGY\s*[:\n])",
                            'learning': r"(?:\[LEARNING\]|\*\*\[?LEARNING\]?\*\*|LEARNING\s*[:\n])",
                            'drivers': r"(?:\[QUANTIFIED[_ ]DRIVERS\]|QUANTIFIED\s*DRIVERS\s*[:\n])",
                            'thought': r"(?:\[THOUGHT[_ ]PROCESS\]|\*\*\[?THOUGHT[_ ]PROCESS\]?\*\*|THOUGHT\s*PROCESS\s*[:\n])"
                        }

                        # Function to extract and clean
                        def extract_section(text, start_pattern, end_pattern_list):
                            # Find start
                            match = re.search(start_pattern, text, re.IGNORECASE)
                            if not match:
                                return None, text
                            
                            start_idx = match.end()
                            content_start = text[start_idx:]
                            
                            # Find nearest end
                            nearest_end = len(content_start)
                            for end_pat in end_pattern_list:
                                end_match = re.search(end_pat, content_start, re.IGNORECASE)
                                if end_match and end_match.start() < nearest_end:
                                    nearest_end = end_match.start()
                            
                            # Extract raw content
                            raw_content = content_start[:nearest_end]
                            
                            # Clean Bullet Points
                            points = []
                            for line in raw_content.split('\n'):
                                line = line.strip()
                                # Clean leading bullets (*, -, •, 1.)
                                if line:
                                    cleaned = re.sub(r"^[\-\*•\d\.]+\s*", "", line).strip()
                                    if cleaned and len(cleaned) > 5: # Filter empty/short junk
                                        points.append(cleaned)
                            
                            # Remove from original text (including header)
                            # We use split/join to remove the exact section locally found
                            full_section_str = text[match.start():start_idx + nearest_end]
                            new_text = text.replace(full_section_str, "").strip()
                            
                            return points, new_text

                        # 0. Extract THOUGHT PROCESS (Hidden Reasoning)
                        # We extract this first to remove it from the narrative
                        thought_points, clean_text = extract_section(
                            clean_text,
                            patterns['thought'],
                            [patterns['bull'], patterns['bear'], patterns['framework'], patterns['my_framework'], patterns['methodology'], patterns['learning']]
                        )
                        if thought_points:
                             # Just log it for now (Shadow Mode)
                             logger.info(f"[CoT] 🧠 Hidden Reasoning: {thought_points}")
                             # We could store this in the DB later for debugging

                        # 1. Extract BULL CASE (Stop at Bear, Framework, My Framework, Methodology, Learning or End)
                        bull_points, clean_text = extract_section(
                            clean_text, 
                            patterns['bull'], 
                            [patterns['bear'], patterns['framework'], patterns['my_framework'], patterns['methodology'], patterns['learning']]
                        )

                        # 2. Extract BEAR CASE (Stop at Framework, My Framework, Methodology, Learning or End)
                        bear_points, clean_text = extract_section(
                            clean_text, 
                            patterns['bear'], 
                            [patterns['framework'], patterns['my_framework'], patterns['methodology'], patterns['learning'], patterns['drivers']]
                        )

                        # 2.5 Extract MY_FRAMEWORK (Personal Analyst Interpretation)
                        my_framework_points, clean_text = extract_section(
                            clean_text,
                            patterns['my_framework'],
                            [patterns['methodology'], patterns['learning'], patterns['framework'], patterns['drivers']]
                        )

                        # 2.6 Extract METHODOLOGY (Screening Criteria)
                        methodology_points, clean_text = extract_section(
                            clean_text,
                            patterns['methodology'],
                            [patterns['my_framework'], patterns['learning'], patterns['framework'], patterns['drivers']]
                        )

                        # 3. Validation & Injection
                        if bull_points:
                            logger.info(f"[ChatService] 📈 Extracted {len(bull_points)} BULL points (Robust)")
                            # Prepend to ensure visibility, or Append? 
                            # User wants: Chart -> Analysis -> Bull/Bear. So Append is correct.
                            result_data.setdefault('cards', []).append({
                                "type": "bull_case",
                                "title": "BULL CASE ANALYSIS" if language == 'en' else "تحليل السيناريو الإيجابي",
                                # NOTE: Structured InsightCard.variant is strict enum ('success'|'warning'|'info'|'neutral').
                                # Use allowed values to avoid schema validation errors.
                                "data": { "points": bull_points, "variant": "success" }
                            })
                            
                        if bear_points:
                            logger.info(f"[ChatService] 📉 Extracted {len(bear_points)} BEAR points (Robust)")
                            result_data.setdefault('cards', []).append({
                                "type": "bear_case",
                                "title": "BEAR CASE RISKS" if language == 'en' else "مخاطر السيناريو السلبي",
                                "data": { "points": bear_points, "variant": "warning" }
                            })

                        # 3.5 Inject MY_FRAMEWORK as a card
                        if my_framework_points:
                            logger.info(f"[ChatService] 🎯 Extracted {len(my_framework_points)} MY_FRAMEWORK points")
                            result_data.setdefault('cards', []).append({
                                "type": "my_framework",
                                "title": "🎯 My Take" if language == 'en' else "🎯 رأيي",
                                "data": { "points": my_framework_points, "variant": "info" }
                            })
                            
                        # 3.6 Inject METHODOLOGY as a card
                        if methodology_points:
                            logger.info(f"[ChatService] 📋 Extracted {len(methodology_points)} METHODOLOGY points")
                            result_data.setdefault('cards', []).append({
                                "type": "methodology",
                                "title": "📋 Screening Methodology" if language == 'en' else "📋 منهجية الفحص",
                                "data": { "points": methodology_points, "variant": "neutral" }
                            })

                        # 4. Final Text Cleanliness Check
                        # Remove any lingering empty tags or artifacts
                        clean_text = re.sub(r"\[BULL_CASE\]|\[BEAR_CASE\]|\[MY_FRAMEWORK\]|\[METHODOLOGY\]", "", clean_text).strip()
                        conversational_text = clean_text

                    # ... (Safety Fallback Logic) ...
                    if not conversational_text:
                        # ... existing fallback code ...
                        if intent in [Intent.STOCK_PRICE, Intent.STOCK_SNAPSHOT]:
                            conversational_text = f"I've pulled the latest data for {actual_symbol or 'the requested stock'} for you." if language == 'en' else f"لقد قمت بسحب أحدث البيانات لـ {actual_symbol or 'السهم المطلوب'} من أجلك."
                        else:
                            conversational_text = "Here's the data analysis you requested." if language == 'en' else "إليك تحليل البيانات الذي طلبته."
                        print(f"[ChatService] ⚠️ LLM Narrative failed. Using safety fallback: '{conversational_text}'")

                    # -------------------------------------------------------------
                    # PHASE 3: MOVED BELOW TO COVER ALL PATHS
                    # -------------------------------------------------------------

                    # -------------------------------------------------------------
                    # PHASE 4: THE "NUCLEAR" REGEX FILTER (FAIL-SAFE)
                    # -------------------------------------------------------------
                    # Even if the LLM hallucinates a greeting, we physically rip it out.
                    # Run this if we explicitly disallowed greetings.
                    # 4. (DISABLED) NUCLEAR REGEX FILTER
                    # We disabled strict stripping to ensure "Welcome" messages (Layer 1) are preserved
                    # for new sessions.
                    pass

                    # 2. Learning Section (Educational bullet points) - DISABLED PER USER REQUEST
                    # learning_section = handler_learning_section if isinstance(handler_learning_section, dict) else None
                    # card_types = [c.get('type', '') for c in result_data.get('cards', [])]
                    # if (not learning_section) and result_data.get('cards'):
                    #     learning_section = generate_learning_section(
                    #         card_types=card_types,
                    #         card_data=result_data.get('cards', []),
                    #         language=language
                    #     )
                    
                    # FALLBACK: If no learning section generated but we have cards, force one
                    # if not learning_section and result_data.get('cards'):
                    #     learning_section = {
                    #         "title": "📘 What These Numbers Mean" if language == 'en' else "📘 ماذا تعني هذه الأرقام",
                    #         "items": [
                    #             "**P/E Ratio**: Shows how much investors pay for each unit of profit." if language == 'en' else "**مضاعف الربحية**: يقيس كم يدفع المستثمرون مقابل كل وحدة ربح.",
                    #             "**Market Cap**: The total value of all shares - indicates company size." if language == 'en' else "**القيمة السوقية**: إجمالي قيمة الأسهم - تشير لحجم الشركة."
                    #         ]
                    #     }
                    
                    # 3. Soft Follow-Up Prompt (Intent-based suggestion) - ALWAYS REQUIRED
                    follow_up_prompt = generate_follow_up(
                        intent=intent,
                        language=language,
                        symbol=actual_symbol
                    )
                    
                    # Legacy fact_explanations (kept for backwards compatibility)
                    fact_explanations = None

                except Exception as ex:
                    print(f"LLM Hybrid Layer Error (Non-Fatal): {ex}")
            # -------------------------------------------------------------

            # If a handler provides a narrative (especially scenario handlers), do not drop it.
            if not conversational_text and handler_conversational_text:
                conversational_text = handler_conversational_text

            # CRITICAL FIX: If handler returns error message but no conversational_text, 
            # promote the message so ResponseComposer can wrap it nicely (e.g. "Sorry, I couldn't find...")
            if not conversational_text and result_data.get('message') and not result_data.get('success', True):
                conversational_text = result_data.get('message')

            # -------------------------------------------------------------
            # PHASE 3: 3-LAYER RESPONSE COMPOSER (World-Class Framework)
            # -------------------------------------------------------------
            # MOVED HERE: Apply to ALL responses (Success OR Failure) to ensure Voice Consistency
            if conversational_text and intent != Intent.BLOCKED:
                try:
                    # Get the context for tracking
                    ctx = self.context_store.get(session_id)
                    last_opening = ctx.last_opening_used if ctx else None
                    
                    # Get card types for context
                    card_types = [c.get('type', '') for c in result_data.get('cards', [])]
                    
                    # Compose full 3-layer response
                    # IF DEEP DIVE: Disable all wrappers (Opening + Guidance) to keep strictly professional
                    # NEW EXCEPTION: If failure (success=False), allows allow greeting to soften the blow.
                    is_failure = not result_data.get('success', True)
                    # "is_deep_dive" variable from above scope (lines 1136) might not be set if we skipped the block
                    # Re-calculate small logic for "should_wrap"
                    # Default to wrapping unless we know it's a deep dive and successful
                    
                    # Logic needs access to 'is_deep_dive'. Let's redefine it safely here or assume wrap for failures.
                    safe_is_deep_dive = False
                    if result_data.get('success', True):
                         # Re-check types string
                         ct_str = [str(c).lower() for c in card_types]
                         safe_is_deep_dive = (
                            'financial_explorer' in ct_str or 
                            'financials_table' in ct_str or
                            intent.value in [
                                'FINANCIALS', 'FINANCIALS_ANNUAL', 'REVENUE_TREND', 
                                'FIN_MARGINS', 'FIN_DEBT', 'FIN_CASH', 'FIN_GROWTH', 
                                'DEEP_VALUATION', 'DEEP_SAFETY', 'DEEP_EFFICIENCY', 'DEEP_GROWTH', 
                                'FAIR_VALUE', 'COMPANY_PROFILE'
                            ]
                        )
                    
                    # We wrap if it's NOT a deep dive, OR if it failed (errors need love too)
                    should_wrap = (not safe_is_deep_dive) or is_failure
                    
                    # Force opening logic
                    # 4. Compose Full Response
                    full_text, structured, opening_category = ResponseComposer.compose_premium_response(
                        core_narrative=conversational_text,
                        language=language,
                        intent=intent,
                        user_name=real_user_name,
                        # CRITICAL FIX: Only treat as follow-up if INTENT is explicitly follow-up.
                        # Do NOT force "follow-up mode" just because user is returning.
                        # This enables Rich Openings (Layer 3) for new topics (e.g. "Analyze COMI").
                        is_follow_up=(intent == Intent.FOLLOW_UP),
                        follow_up_type='continuation', # Default
                        active_symbol=actual_symbol,
                        sentiment=sentiment,
                        include_risk_warning=include_risk,
                        risk_type=risk_type,
                        shown_card_types=[str(c.get('type')) for c in result_data.get('cards', [])],
                        detected_insight=thought_points[0] if thought_points else None,
                        user_level=user_level # Phase 4
                    )
                    
                    # Update the conversational text with composed response
                    conversational_text = full_response
                    
                    # Track what we used for next time
                    if opening_category:
                        self.context_store.set(
                            session_id,
                            last_opening_used=opening_category,
                            last_cards_shown=card_types
                        )
                    
                    print(f"[ChatService] ✨ Response composed (Global) with opening='{opening_category}'")
                except Exception as e:
                    print(f"[ChatService] ⚠️ Response Composer Failed: {e}")

            # Keep handler-provided learning sections (extended scenarios ship curated content).
            # DISABLED PER USER REQUEST
            # if not learning_section and isinstance(handler_learning_section, dict):
            #    learning_section = handler_learning_section
            
            # 7. Update context
            # CRITICAL FIX: Mark history has content to prevent future "First Message" flags in this session
            if history is None:
                 history = []
            history.append({'role': 'assistant', 'content': '...'})
            
            self.context_store.set(session_id, 
                last_symbol=actual_symbol,
                last_intent=intent,
                last_market=entities.get('market_code', last_market)
            )
            
            # 8. Build response
            # GLOBAL STRUCTURE GUARANTEE: Ensure all 4 layers are ALWAYS present
            # ====================================================================
            # Layer 1: Greeting/Opening (handled above)
            # Layer 2: Cards (from handler)
            # Layer 3: Learning Section (DISABLED)
            # Layer 4: Follow-up Prompt (MUST be present)
            
            # GUARANTEE Layer 3: Learning Section - DISABLED
            # if not learning_section:
            #     learning_section = {
            #         "title": "📘 What These Numbers Mean" if language == 'en' else "📘 ماذا تعني هذه الأرقام",
            #         "items": [
            #             "**P/E Ratio**: Shows how much investors pay for each unit of profit. Lower can mean undervalued." if language == 'en' else "**مضاعف الربحية**: يقيس كم يدفع المستثمرون مقابل كل وحدة ربح. الانخفاض قد يعني فرصة.",
            #             "**Market Cap**: The total value of all shares - indicates company size." if language == 'en' else "**القيمة السوقية**: إجمالي قيمة الأسهم - تشير لحجم الشركة."
            #         ]
            #     }
            #     print(f"[ChatService] 📘 Injected fallback learning_section")
            
            # GUARANTEE Layer 4: Follow-up Prompt
            if not follow_up_prompt:
                follow_up_prompt = "What would you like to explore next?" if language == 'en' else "ماذا تريد استكشافه بعد ذلك؟"
                print(f"[ChatService] 💡 Injected fallback follow_up_prompt")
            
            if isinstance(result, ChatResponse):
                # ENTERPRISE FIX: Even if handler returns a ChatResponse, we MUST inject our layers
                # to ensure universal structure (greeting + data + learning + follow up)
                if conversational_text and not result.conversational_text:
                    result.conversational_text = conversational_text
                if not result.learning_section:
                    result.learning_section = learning_section
                if not result.follow_up_prompt:
                    result.follow_up_prompt = follow_up_prompt
                
                result = self._enforce_response_language(result, language, actual_symbol)
                return result
                
            # CRITICAL FIX: Extract structured response components from handler result
            # These are generated by price_handler.py and other handlers for premium UI
            handler_bull_case = result_data.get('bull_case')
            handler_bear_case = result_data.get('bear_case')
            handler_data_card = result_data.get('data_card')
            handler_disclaimer_card = result_data.get('disclaimer_card')
            handler_follow_up = result_data.get('follow_up_prompt') or follow_up_prompt
            handler_insight_cards = result_data.get('insight_cards')
            handler_stock_list = result_data.get('stock_list')
            handler_macro_score = result_data.get('macro_score')
            handler_comparison_table = result_data.get('comparison_table')
            handler_educational_cards = result_data.get('educational_cards')
            # NEW: Premium World-Class Components (Phase 2)
            handler_framework_card = result_data.get('framework_card')
            handler_character_cards = result_data.get('character_cards')
            handler_quantified_drivers = result_data.get('quantified_drivers')
            
            # Initialize potentially missing specific handler outputs to None
            handler_index_composition = result_data.get('index_composition')
            handler_key_insight = result_data.get('key_insight')
            # NEW: Parse Dynamic Layers from LLM Text (if not provided by handler)
            # NEW: Parse Dynamic Layers from LLM Text (if not provided by handler)
            # Handle both object (ChatResponse) and dict return types
            llm_text = conversational_text or getattr(result, 'conversational_text', None) or result_data.get('conversational_text')

            if llm_text:
                # import re - REMOVED
                logger.info(f"[ChatService] Parsing Dynamic Layers (Text Len: {len(llm_text)}). Start: {llm_text[:100]}...")
                
                # Parse FRAMEWORK
                if not handler_framework_card:
                    handler_framework_card = self._parse_framework(llm_text)
                    if handler_framework_card:
                        # Strip from text (Case Insensitive)
                        llm_text = re.sub(r"\[FRAMEWORK\]\s*(.*?)(?=\[|$)", "", llm_text, flags=re.DOTALL | re.IGNORECASE).strip()
                        logger.info(f"[ChatService] 📊 Extracted FRAMEWORK from narrative")
                
                # Parse QUANTIFIED DRIVERS
                if not handler_quantified_drivers:
                    handler_quantified_drivers = self._parse_drivers(llm_text)
                    if handler_quantified_drivers:
                         # Strip from text (Case Insensitive)
                        llm_text = re.sub(r"\[QUANTIFIED_DRIVERS\]\s*(.*?)(?=\[|$)", "", llm_text, flags=re.DOTALL | re.IGNORECASE).strip()
                        logger.info(f"[ChatService] 🚗 Extracted DRIVERS from narrative")
                
                # Parse LEARNING
                # (Note: handler_educational_cards might be populated by handler, but we prioritize LLM if handler didn't provide specific ones? 
                # Actually, handler usually provides data cards, not learning. So LLM is primary.)
                # Parse LEARNING - DISABLED PER USER REQUEST (Phase 9)
                # if not handler_educational_cards:
                #     learning = self._parse_learning(llm_text)
                #     if learning:
                #         handler_educational_cards = [
                #             {"variant": "definition", "title": item['term'], "content": item['definition']}
                #             for item in learning['items']
                #         ]
                #          # Strip from text (Case Insensitive)
                #         llm_text = re.sub(r"\[LEARNING\]\s*(.*?)(?=\[|$)", "", llm_text, flags=re.DOTALL | re.IGNORECASE).strip()
                #         logger.info(f"[ChatService] 🎓 Extracted LEARNING from narrative")
                #     else:
                #         # FALLBACK: Generate programmatically if LLM failed (Guarantees UI Layer 3)
                #         try:
                #             cards = result_data.get('cards', [])
                #             if cards:
                #                 fallback_defs = explainer.extract_fact_explanations(cards, language)
                #                 if fallback_defs:
                #                     handler_educational_cards = [
                #                         {"variant": "definition", "title": term, "content": definition}
                #                         for term, definition in fallback_defs.items()
                #                     ]
                #                     logger.info(f"[ChatService] 📘 Injected Programmatic Fallback for LEARNING ({len(handler_educational_cards)} items)")
                #         except Exception as fb_ex:
                #             logger.error(f"[ChatService] Fallback Learning Generation Failed: {fb_ex}")

                # Parse KEY INSIGHT (if tagged with [KEY_INSIGHT])
                match_insight = re.search(r"\[KEY_INSIGHT\]\s*(.*?)(?=\[|$)", llm_text, re.DOTALL | re.IGNORECASE)
                if match_insight:
                     # Use this as the handler_key_insight
                     handler_key_insight = match_insight.group(1).strip()
                     llm_text = re.sub(r"\[KEY_INSIGHT\]\s*(.*?)(?=\[|$)", "", llm_text, flags=re.DOTALL | re.IGNORECASE).strip()
                
                # Update conversational_text with stripped version
                conversational_text = llm_text

            def _coerce_educational_cards(raw: Any) -> Optional[List[Dict[str, Any]]]:
                """
                Normalize educational payloads into ChatResponse.educational_cards schema:
                [{variant: 'definition'|'formula'|'example'|'when_misleading', title: str, content: str}, ...]

                Handlers historically returned richer objects (definition/formula/example/sections).
                We keep those in legacy cards, but the structured field must match schemas.py.
                """
                if not raw:
                    return None

                def _mk(variant: str, title: str, content: Any) -> Optional[Dict[str, Any]]:
                    if content is None:
                        return None
                    text = str(content).strip()
                    if not text:
                        return None
                    return {"variant": variant, "title": str(title).strip() or ("Educational" if language == "en" else "تعريف"), "content": text}

                # Already-structured list
                if isinstance(raw, list):
                    out: List[Dict[str, Any]] = []
                    for item in raw:
                        coerced = _coerce_educational_cards(item)
                        if coerced:
                            out.extend(coerced)
                    return out or None

                # Single educational card (dict)
                if isinstance(raw, dict):
                    # Shape A: already matches schema
                    if raw.get("variant") and raw.get("title") and raw.get("content") is not None:
                        d = _mk(str(raw.get("variant")), str(raw.get("title")), raw.get("content"))
                        return [d] if d else None

                    title_root = raw.get("title") or raw.get("term") or ("Educational Note" if language == "en" else "ملاحظة تعليمية")
                    out: List[Dict[str, Any]] = []

                    # Shape B: rich object from educational_content.py
                    if raw.get("definition"):
                        out.append(_mk("definition", f"{title_root}", raw.get("definition")))
                    if raw.get("formula"):
                        out.append(_mk("formula", ("Formula" if language == "en" else "المعادلة"), raw.get("formula")))
                    if raw.get("example"):
                        out.append(_mk("example", ("Example" if language == "en" else "مثال"), raw.get("example")))

                    # Shape C: section-based payload (legacy educational card)
                    sections = raw.get("sections") if isinstance(raw.get("sections"), list) else []
                    for sec in sections:
                        if not isinstance(sec, dict):
                            continue
                        sec_type = str(sec.get("type") or "").lower()
                        sec_title = sec.get("title") or title_root
                        sec_content = sec.get("content")
                        sec_items = sec.get("items") if isinstance(sec.get("items"), list) else []

                        if sec_type in ("definition", "formula", "example"):
                            out.append(_mk(sec_type, sec_title, sec_content))
                            continue

                        if sec_type in ("caveats", "when_misleading", "misleading"):
                            text = sec_content
                            if not text and sec_items:
                                text = "\n".join([f"- {x}" for x in sec_items if str(x).strip()])
                            out.append(_mk("when_misleading", sec_title, text))
                            continue

                        if sec_type in ("application", "how_i_use_it", "practical", "practical_application"):
                            text = sec_content
                            if not text and sec_items:
                                text = "\n".join([f"- {x}" for x in sec_items if str(x).strip()])
                            # Map to 'example' for schema compatibility.
                            out.append(_mk("example", sec_title, text))
                            continue

                    out = [x for x in out if x]
                    return out or None

                # Unknown type
                return None

            handler_educational_cards = _coerce_educational_cards(handler_educational_cards) or None

            # Normalize and backfill structured components from legacy cards when needed.
            cards_payload = result_data.get('cards') or []
            for card in cards_payload:
                card_type = str(card.get('type', '')).lower()
                card_data = card.get('data') or {}

                if card_type == 'data_card' and not handler_data_card:
                    handler_data_card = card_data

                if card_type == 'bull_case' and not handler_bull_case:
                    points = card_data.get('items') or card_data.get('points') or []
                    handler_bull_case = {
                        'variant': card_data.get('variant', 'success'),
                        'title': card.get('title') or card_data.get('title') or ('Bull Case' if language == 'en' else 'السيناريو الإيجابي'),
                        'items': points
                    }

                if card_type == 'bear_case' and not handler_bear_case:
                    points = card_data.get('items') or card_data.get('points') or []
                    handler_bear_case = {
                        'variant': card_data.get('variant', 'warning'),
                        'title': card.get('title') or card_data.get('title') or ('Bear Case' if language == 'en' else 'السيناريو السلبي'),
                        'items': points
                    }

                if card_type in ('insight', 'insights') and card_data:
                    handler_insight_cards = (handler_insight_cards or []) + [card_data]

                if card_type in ('hidden_gems', 'stock_list', 'discovery_list') and not handler_stock_list:
                    handler_stock_list = card_data.get('stocks') if isinstance(card_data, dict) else None

                if card_type in ('macro_score', 'market_timing') and not handler_macro_score:
                    handler_macro_score = card_data

                if card_type in ('methodology', 'framework_card', 'screening_criteria') and not handler_framework_card:
                    if isinstance(card_data, dict):
                        framework_items = card_data.get('items')
                        if not framework_items and isinstance(card_data.get('criteria'), list):
                            framework_items = [
                                f"{c.get('label', '')}: {c.get('value', '')}".strip(": ")
                                for c in card_data.get('criteria', [])
                                if isinstance(c, dict)
                            ]
                        handler_framework_card = {
                            'icon': card_data.get('icon', '📊'),
                            'title': card_data.get('title') or ('Framework' if language == 'en' else 'إطار التحليل'),
                            'subtitle': card_data.get('subtitle') or card_data.get('description'),
                            'items': framework_items or [],
                            'border_color': card_data.get('border_color', 'blue')
                        }

                if card_type in ('disclaimer_card', 'disclaimer') and not handler_disclaimer_card:
                    handler_disclaimer_card = card_data

                if card_type == 'index_composition' and not handler_index_composition:
                    handler_index_composition = card_data

                if card_type in ('educational', 'definition', 'define_term') and not handler_educational_cards:
                    # Coerce legacy educational card payload into structured educational_cards schema.
                    handler_educational_cards = _coerce_educational_cards(card_data) or handler_educational_cards

                if card_type in ('compare_table', 'comparison_table') and not handler_comparison_table:
                    if card_data.get('headers') and card_data.get('rows'):
                        handler_comparison_table = card_data
                    elif card_data.get('stocks') and card_data.get('metrics'):
                        stocks = card_data.get('stocks', [])
                        metrics = card_data.get('metrics', [])

                        def _format_cmp_value(raw_value: Any, fmt: Optional[str]) -> str:
                            if raw_value is None:
                                return "N/A" if language == 'en' else "غير متاح"
                            try:
                                num = float(raw_value)
                            except Exception:
                                return str(raw_value)

                            if fmt == 'pct':
                                return f"{num:.2f}%"
                            if fmt == 'compact':
                                if abs(num) >= 1_000_000_000:
                                    return f"{num/1_000_000_000:.2f}B"
                                if abs(num) >= 1_000_000:
                                    return f"{num/1_000_000:.2f}M"
                                if abs(num) >= 1_000:
                                    return f"{num/1_000:.2f}K"
                            return f"{num:.2f}"

                        headers = ['Metric'] + [s.get('symbol', '') for s in stocks]
                        rows = []
                        for metric in metrics:
                            key = metric.get('key')
                            if not key:
                                continue
                            rows.append({
                                'metric': metric.get('label', key),
                                'values': [
                                    _format_cmp_value(stock.get(key), metric.get('format'))
                                    for stock in stocks
                                ],
                                'winner_symbol': metric.get('winner_symbol')
                            })

                        handler_comparison_table = {
                            'title': card.get('title') or ('Peer Comparison' if language == 'en' else 'مقارنة الأقران'),
                            'headers': headers,
                            'rows': rows
                        }
            
            compare_pair = self._derive_compare_pair(
                entities=entities,
                comparison_table=handler_comparison_table,
                result_data=result_data
            ) if intent == Intent.COMPARE_STOCKS else []
            deterministic_compare_insight = self._build_compare_key_insight(compare_pair, language)

            # NEW: Key Insight (8-Layer Completeness)
            handler_key_insight = result_data.get('key_insight')
            if deterministic_compare_insight:
                handler_key_insight = deterministic_compare_insight
            if not handler_key_insight and intent in [
                Intent.STOCK_SNAPSHOT, Intent.FINANCIALS, Intent.DIVIDENDS,
                Intent.DEEP_VALUATION, Intent.DEEP_SAFETY, Intent.FAIR_VALUE,
                Intent.FINANCIAL_HEALTH, Intent.COMPARE_STOCKS, Intent.STOCK_PRICE,
                # Expanded List for 100% Coverage (Phase 8 Fix)
                Intent.SCREENER_PE, Intent.SCREENER_DEEP, Intent.SCREENER_GROWTH, 
                Intent.SCREENER_VALUE, Intent.SCREENER_SAFETY, Intent.SCREENER_INCOME,
                Intent.MARKET_STATUS, Intent.MARKET_SUMMARY, Intent.MARKET_MOST_ACTIVE,
                Intent.HIDDEN_GEMS, Intent.INDEX_COMPOSITION, Intent.TOP_GAINERS, Intent.TOP_LOSERS,
                Intent.STOCK_STAT, Intent.TECHNICAL_INDICATORS, Intent.MACRO_SCORE
            ]:
                # Generate key insight based on sentiment
                from .response_composer import ResponseComposer
                handler_key_insight = ResponseComposer.get_key_insight(language=language, sentiment='neutral')
            
            # ------------------------------------------------------------------
            # 8-LAYER ASSEMBLY (Phase 7: Deep Analysis & Transformation)
            # ------------------------------------------------------------------
            # We now wrap the LLM-generated "Core Narrative" with the 8-layer
            # premium structure (Greeting, Context Bridge, Risk, etc.)
            try:
                from .response_composer import ResponseComposer
                
                # 1. Detect Sentiment
                sentiment = 'neutral'
                if handler_bull_case and not handler_bear_case: sentiment = 'bullish'
                elif handler_bear_case and not handler_bull_case: sentiment = 'bearish'
                
                # 2. Determine Risk Warning
                include_risk = False
                risk_type = 'general'
                if intent in [Intent.DEEP_SAFETY, Intent.FINANCIAL_HEALTH, Intent.DEEP_VALUATION]:
                    include_risk = True
                    risk_type = 'valuation'
                
                # 3. Handle Greetings/Openings (Deterministic)
                # If final_allow_greeting was set (New Session), we force an opening
                # If force_human_opening (Returning User), we force an opening
                # Otherwise, we let ResponseComposer decide (random or pure context)
                detected_insight_input = thought_points[0] if thought_points else None
                if deterministic_compare_insight:
                    detected_insight_input = deterministic_compare_insight
                
                # 4. Compose Full Response
                full_text, structured, _ = ResponseComposer.compose_premium_response(
                    core_narrative=conversational_text,
                    language=language,
                    intent=intent,
                    user_name=real_user_name,
                    is_follow_up=(intent == Intent.FOLLOW_UP),
                    follow_up_type='continuation', # Default
                    active_symbol=actual_symbol,
                    sentiment=sentiment,
                    include_risk_warning=include_risk,
                    risk_type=risk_type,
                    shown_card_types=[str(c.get('type')) for c in result_data.get('cards', [])],
                    detected_insight=detected_insight_input,
                    user_level=user_level # Phase 4
                )
                
                # Inject Follow-up Prompt into Structured Narrative
                # PRIORITY FIX: Use handler's prompt (specific) if available, else generic
                if structured:
                    structured.follow_up_prompt = handler_follow_up or follow_up_prompt
                
                convo_logger = logging.getLogger("ChatService")
                convo_logger.info(f"✅ 8-Layer Assembly Complete. Length: {len(full_text)}")
                conversational_text = full_text
                
            except Exception as composer_err:
                print(f"[ChatService] ⚠️ ResponseComposer Error: {composer_err}")
                # Fallback to raw text if composer fails
                pass
            
            # ------------------------------------------------------------------
            
            # CRITICAL FIX: Ensure 7-Layer Key Insight overrides default/regex if present
            if 'structured' in locals() and structured and structured.key_insight:
                handler_key_insight = structured.key_insight
                print(f"[ChatService] 🎯 Using 7-Layer Key Insight: {handler_key_insight[:50]}...")
            if deterministic_compare_insight:
                handler_key_insight = deterministic_compare_insight
                if 'structured' in locals() and structured:
                    structured.key_insight = deterministic_compare_insight

            response = self._build_response(
                result_data, intent, confidence, entities, start_time, language,
                context, # Pass context
                conversational_text, fact_explanations, learning_section, handler_follow_up,
                # NEW: Pass structured response components from handler
                data_card=handler_data_card,
                bull_case=handler_bull_case,
                bear_case=handler_bear_case,
                insight_cards=handler_insight_cards,
                stock_list=handler_stock_list,
                macro_score=handler_macro_score,
                comparison_table=handler_comparison_table,
                educational_cards=handler_educational_cards,
                disclaimer_card=handler_disclaimer_card,
                # NEW: Premium World-Class Components (Phase 2)
                framework_card=handler_framework_card,
                character_cards=handler_character_cards,
                quantified_drivers=handler_quantified_drivers,
                index_composition=handler_index_composition,
                # NEW: Key Insight (8-Layer)
                key_insight=handler_key_insight,
                # NEW: Structured Narrative
                structured_narrative=structured if 'structured' in locals() else None
            )
            response = self._enforce_response_language(response, language, actual_symbol)
            
            # 9. Log analytics
            await self._log_analytics(
                session_id=session_id,
                user_id=user_id,
                raw_text=message,
                normalized_text=normalized.normalized,
                language=language,
                intent=intent,
                confidence=confidence,
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
            
            # ═══════════════════════════════════════════════════════════════
            # 10. UPDATE CONVERSATION CONTEXT (World-Class Memory)
            # ═══════════════════════════════════════════════════════════════
            # Store this turn for follow-up understanding
            try:
                from .context_assembler import get_context_assembler
                context_assembler = get_context_assembler()
                
                # Extract pending suggestions from the actual prompt shown to user.
                effective_follow_up_prompt = handler_follow_up or follow_up_prompt
                pending_suggestions = self._extract_pending_suggestions_from_prompt(
                    effective_follow_up_prompt
                )
                
                # Update context assembler with this turn
                context_assembler.update_after_response(
                    session_id=session_id,
                    user_message=message,
                    assistant_response=conversational_text or "",
                    intent=intent.value,
                    entities={"symbol": actual_symbol, "sector": entities.get("sector"), "market": last_market},
                    language=language,
                    suggestions=pending_suggestions
                )
                print(f"[ChatService] 🧠 Updated conversation memory for session {session_id[:8]}...")
            except Exception as ctx_err:
                print(f"[ChatService] ⚠️ Context update error (non-fatal): {ctx_err}")
            
            # ═══════════════════════════════════════════════════════════════
            # 11. GENERATE DYNAMIC FOLLOW-UPS WITH AI
            # ═══════════════════════════════════════════════════════════════
            try:
                from .followup_engine import FollowUpEngine
                convo_logger = logging.getLogger("ChatService")
                convo_logger.info("Generating dynamic follow-ups...")
                followup_engine = FollowUpEngine()
                
                # Pass intent value as dict since FollowUpEngine expects dict
                intent_info = {"intent": intent.value} if intent else {}
                
                dynamic_followups = await followup_engine.generate(
                    ai_response=response.message_text,
                    conversation_history=history or [],
                    intent=intent_info,
                    symbol=actual_symbol
                )
                
                if dynamic_followups:
                    response.followups = dynamic_followups
                    convo_logger.info(f"✅ Generated {len(dynamic_followups)} dynamic follow-ups.")
            except Exception as e:
                convo_logger = logging.getLogger("ChatService")
                convo_logger.error(f"Failed to generate dynamic follow-ups: {e}")
            
            return response
        except Exception as global_ex:
            # -------------------------------------------------------------
            # GLOBAL ERROR BOUNDARY (THE SAFETY NET)
            # -------------------------------------------------------------
            print(f"💥💥💥 [DIAG-FATAL] CRITICAL: Uncaught Exception in ChatService")
            print(f"   Exception Type: {type(global_ex).__name__}")
            print(f"   Exception Message: {str(global_ex)}")
            import traceback
            traceback.print_exc()
            print(f"💥💥💥 [DIAG-FATAL] END OF EXCEPTION DETAILS")
            
            # Fallback Card
            try:
                # Attempt to determine language even if crash happened
                lang = 'en'
                if message and any('\u0600' <= c <= '\u06FF' for c in message):
                    lang = 'ar'
                
                err_msg = "Our AI Analyst is currently upgrading its neural pathways. Please try again in a moment." if lang == 'en' else "نظام التحليل الذكي يقوم بتحديث مساراته العصبية حالياً. يرجى المحاولة بعد قليل."
                
                fallback_card = Card(
                    type=CardType.ERROR,
                    title="System Maintenance" if lang == 'en' else "صيانة النظام",
                    data={'content': f"### ⚠️ {err_msg}"}
                )
                
                return ChatResponse(
                    success=False, # Explicitly mark as failure
                    message=err_msg, # Explicitly set message for frontend/QA
                    message_text=err_msg,
                    language=lang,
                    cards=[fallback_card],
                    chart=None,
                    actions=[],
                    disclaimer=(
                        "System Error Recovery Mode"
                        if lang == "en" else
                        "وضع التعافي من خطأ النظام"
                    ),
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
                fatal_lang = 'ar' if self._contains_arabic_text(message) else 'en'
                return ChatResponse(
                    message_text="System Error. Please try again." if fatal_lang == 'en' else "خطأ في النظام. يرجى المحاولة مرة أخرى.",
                    language=fatal_lang,
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
            resolved_user_id = None
            
            # Resolve user_id to integer if it's an email
            if user_id and '@' in str(user_id):
                try:
                    resolved_user_id = await self.conn.fetchval("SELECT id FROM users WHERE email = $1", str(user_id))
                except:
                    pass
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

        elif intent == Intent.FOLLOW_UP:
            # Ambiguous "yes" after multi-option follow-up prompt.
            if entities.get("clarify_follow_up"):
                options = entities.get("follow_up_options", [])
                if isinstance(options, str):
                    options = [options]
                return self._build_follow_up_clarification_response(
                    options=options,
                    language=language,
                    symbol=symbol
                )

            # Generic follow-up: if we have symbol context, continue with snapshot.
            if symbol:
                return await handle_stock_snapshot(self.conn, symbol, language)

            # Otherwise offer a neutral follow-up prompt.
            return {
                "success": True,
                "message": get_follow_up_response(language),
                "cards": [],
                "actions": []
            }

        # ===== ULTRA PREMIUM DEEP HANDLERS (PHASE 7) =====
        elif intent == Intent.DEEP_SAFETY:
             if not symbol:
                 return await handle_universal_screener(self.conn, Intent.SCREENER_DEEP, {'filters': [{'metric': 'z_score', 'operator': 'gt', 'value': 2.99}], 'sort_by': 'z_score', 'direction': 'desc', 'limit': 10}, language)
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
                 return await handle_universal_screener(self.conn, Intent.SCREENER_DEEP, {'filters': [], 'sort_by': 'roce', 'direction': 'desc', 'limit': 10}, language)
             return await handle_deep_efficiency(self.conn, symbol, market=market_code, lang=language)

        elif intent == Intent.DEEP_GROWTH:
             if not symbol:
                 return await handle_universal_screener(self.conn, Intent.SCREENER_DEEP, {'filters': [], 'sort_by': 'revenue_growth', 'direction': 'desc', 'limit': 10}, language)
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
        
        elif intent == Intent.SCREENER_PE or intent == Intent.SCREENER_VALUE:
            from .handlers.extended_scenarios import handle_undervalued_stocks
            sector = entities.get('sector')
            try:
                return await handle_undervalued_stocks(self.conn, language=language, sector=sector, limit=5)
            except Exception:
                # Fallback to simple PE Screener
                threshold = entities.get('threshold', 15.0)
                return await handle_screener_pe(self.conn, threshold, market_code, limit=20, language=language)
        
        elif intent == Intent.SCREENER_DEEP or intent == Intent.SCREENER_SAFETY or intent == Intent.SCREENER_GROWTH:
            # Universal Handler for all complex screenings
            # It handles filters, sort_by, and sector extracted by ClaudeOrchestrator
            return await handle_universal_screener(self.conn, intent, entities, language)
            
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
        
        elif intent == Intent.COMPANY_PROFILE:
            if not symbol:
                return handle_clarify_symbol(language=language)
            return await handle_company_profile(self.conn, symbol, language)

        elif intent == Intent.COMPARE_STOCKS:
            compare_symbols = entities.get('compare_symbols', [])
            if isinstance(compare_symbols, str):
                compare_symbols = [compare_symbols]
            compare_symbols = self._dedupe_symbols([
                str(s).upper() for s in compare_symbols if str(s).strip()
            ])

            # Always anchor comparison on current symbol if available.
            if symbol:
                symbol_up = str(symbol).upper()
                symbol_canon = self._canonical_symbol(symbol_up)
                existing_canon = {self._canonical_symbol(s) for s in compare_symbols}
                if symbol_canon and symbol_canon not in existing_canon:
                    compare_symbols = [symbol_up] + compare_symbols

            inferred_peers: List[str] = []
            if len(compare_symbols) < 2 and symbol:
                inferred_peers = await self._infer_peer_symbols(
                    primary_symbol=str(symbol).upper(),
                    market_code=market_code,
                    limit=6
                )
                compare_symbols = self._dedupe_symbols(compare_symbols + inferred_peers)

            # Resolve aliases (e.g. CIB -> COMI) then deduplicate canonically again.
            resolver = SymbolResolver(self.conn)
            resolved_symbols: List[str] = []
            for sym in compare_symbols[:8]:
                resolved = await resolver.resolve(sym, market_code)
                resolved_sym = resolved.symbol if resolved else str(sym).upper()
                candidate_list = self._dedupe_symbols(resolved_symbols + [resolved_sym])
                if len(candidate_list) > len(resolved_symbols):
                    resolved_symbols = candidate_list
                if len(resolved_symbols) >= 2:
                    break

            # One more inference pass after resolution in case aliases collapsed to one symbol.
            if len(resolved_symbols) < 2:
                base_symbol = str(symbol).upper() if symbol else (resolved_symbols[0] if resolved_symbols else None)
                if base_symbol:
                    extra_peers = await self._infer_peer_symbols(
                        primary_symbol=base_symbol,
                        market_code=market_code,
                        limit=6
                    )
                    for peer in extra_peers:
                        peer_resolved = await resolver.resolve(peer, market_code)
                        peer_sym = peer_resolved.symbol if peer_resolved else peer
                        candidate_list = self._dedupe_symbols(resolved_symbols + [peer_sym])
                        if len(candidate_list) > len(resolved_symbols):
                            resolved_symbols = candidate_list
                        if len(resolved_symbols) >= 2:
                            break

            if len(resolved_symbols) < 2:
                primary_for_prompt = (
                    str(symbol).upper() if symbol else
                    (resolved_symbols[0] if resolved_symbols else (compare_symbols[0] if compare_symbols else None))
                )
                peer_candidates = inferred_peers or compare_symbols[1:]
                return self._build_compare_clarification_response(
                    primary_symbol=primary_for_prompt,
                    peer_candidates=peer_candidates,
                    language=language
                )

            resolved_pair = self._dedupe_symbols(resolved_symbols[:2])
            # Propagate final distinct pair back into shared entities for clean metadata and narrative.
            entities['compare_symbols'] = resolved_pair
            if resolved_pair:
                entities['symbol'] = resolved_pair[0]
            if market_code:
                entities['market_code'] = market_code

            return await handle_compare_stocks(self.conn, resolved_pair, language)
        
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
            if intent == Intent.FIN_MARGINS and not symbol:
                from .handlers.extended_scenarios import handle_margin_decline_analysis
                return await handle_margin_decline_analysis(self.conn, language)
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

        # ===== PHASE 7: EXTENDED SCENARIOS (Enterprise) =====
        
        elif intent == Intent.HIDDEN_GEMS:
             from .handlers.extended_scenarios import handle_hidden_gems
             return await handle_hidden_gems(self.conn, language)
        
        elif intent == Intent.MACRO_SCORE or intent == Intent.MARKET_TIMING:
             from .handlers.extended_scenarios import handle_macro_score
             return await handle_macro_score(self.conn, language)
        
        elif intent == Intent.INDEX_COMPOSITION:
             from .handlers.extended_scenarios import handle_index_composition
             return await handle_index_composition(self.conn, language)
        
        elif intent == Intent.MACRO_VIEW:
             from .handlers.extended_scenarios import handle_macro_view
             return await handle_macro_view(self.conn, language)

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
        context: Optional[Any] = None, # Added Context
        conversational_text: Optional[str] = None,
        fact_explanations: Optional[Dict[str, str]] = None,
        learning_section: Optional[Dict[str, Any]] = None,
        follow_up_prompt: Optional[str] = None,
        # NEW: Structured Components (HTML Mockup Match)
        data_card: Optional['DataCard'] = None,
        bull_case: Optional['InsightCard'] = None,
        bear_case: Optional['InsightCard'] = None,
        insight_cards: Optional[List['InsightCard']] = None,
        stock_list: Optional[List['StockListItem']] = None,
        macro_score: Optional['MacroScoreCard'] = None,
        comparison_table: Optional['ComparisonTable'] = None,
        educational_cards: Optional[List['EducationalCard']] = None,
        disclaimer_card: Optional['DisclaimerCard'] = None,
        framework_text: Optional[str] = None,
        # NEW: Premium World-Class Components (Phase 2)
        framework_card: Optional['FrameworkCard'] = None,
        character_cards: Optional[List['CharacterCard']] = None,
        quantified_drivers: Optional['QuantifiedDriversCard'] = None,
        index_composition: Optional['IndexCompositionCard'] = None,
        # NEW: Key Insight (8-Layer)
        key_insight: Optional[str] = None,
        # NEW: 7-Layer Structured Narrative
        structured_narrative: Optional[Any] = None
    ) -> ChatResponse:
        """Build the final ChatResponse with structured components."""
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # DEFENSIVE: Initialize ALL variables at the top to prevent NameError crashes
        is_follow_up = False
        full_response_text = conversational_text or ''
        structured_narrative = None
        used_opening = None
        
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
        
        # Extract conversational_text from result
        conversational_text = result.get('conversational_text', conversational_text or '')
        
        # Fallback mechanism: If LLM fails (no conversational_text) and no system message,
        # generate a generic message based on content to prevent empty bubbles.
        # Prefer explicit handler message, then conversational text, then fallback.
        final_message_text = (
            result.get('message')
            or result.get('message_text')
            or result.get('conversational_text')
            or ''
        )
        if not final_message_text:
            final_message_text = (
                "Here is the analysis based on the latest available data."
                if language == 'en' else
                "إليك التحليل بناءً على أحدث البيانات المتاحة حالياً."
            )
        if not conversational_text and not final_message_text and cards:
            # Generate simple fallback based on intent or first card
            card_titles = [c.get('title', 'Data') for c in result.get('cards', [])]
            if card_titles:
                final_message_text = (
                    f"Here is the {card_titles[0]}."
                    if language == 'en' else
                    f"إليك {card_titles[0]}."
                )
            else:
                final_message_text = (
                    "Here is the requested data."
                    if language == 'en' else
                    "إليك البيانات المطلوبة."
                )
                
        # Prepare shown_card_types for deduplication logic
        shown_card_types = [c.type.value for c in cards]
        
        # Extract symbol from entities
        symbol = entities.get('symbol')
        
        # Determine if this is a follow-up query based on intent
        is_follow_up = (intent == Intent.FOLLOW_UP)
        force_direct_follow_up_message = (
            intent == Intent.FOLLOW_UP and bool(entities.get("clarify_follow_up"))
        )
        force_direct_symbol_clarification = (
            intent == Intent.CLARIFY_SYMBOL
            or bool(result.get("clarification_type") == "symbol")
        )
        direct_intents = {
            Intent.GREETING,
            Intent.IDENTITY,
            Intent.CAPABILITIES,
            Intent.MOOD,
            Intent.GRATITUDE,
            Intent.GOODBYE,
            Intent.HELP,
            Intent.CLARIFY_SYMBOL,
            Intent.DEFINE_TERM,
            Intent.UNKNOWN,
            Intent.BLOCKED,
        }
        force_direct_message = (
            force_direct_follow_up_message
            or force_direct_symbol_clarification
            or intent in direct_intents
        )

        # Generate Premier Response Layer (DEFENSIVE: wrapped in try/except)
        if force_direct_message:
            full_response_text = final_message_text
            structured_narrative = None
            used_opening = None
        else:
            try:
                full_response_text, structured_narrative, used_opening = ResponseComposer.compose_premium_response(
                    core_narrative=conversational_text,
                    language=language,
                    intent=intent,
                    user_name=context.user_name if context else "Analyst",
                    is_follow_up=is_follow_up,
                    follow_up_type=context.last_followup_type if context else "none",
                    active_symbol=symbol,
                    sentiment=context.last_response_sentiment if context else "neutral",
                    include_risk_warning=False,
                    last_opening_used=context.last_opening_used if context else None,
                    shown_card_types=shown_card_types,
                    include_opening=True,
                    force_opening=True, # enforcing 4-Layer structure rule
                    detected_insight=key_insight
                )
            except Exception as comp_err:
                print(f"⚠️ ResponseComposer failed (using raw narrative): {comp_err}")
                full_response_text = conversational_text or (
                    "Here is the analysis based on the latest available data."
                    if language == 'en' else
                    "إليك التحليل بناءً على أحدث البيانات المتاحة."
                )
                structured_narrative = None
                used_opening = None

        # Final quality gate: avoid shipping punctuation-only or ultra-short fragments
        # that can degrade UX and occasionally break downstream presentation assumptions.
        if self._is_low_quality_text(full_response_text):
            if not self._is_low_quality_text(final_message_text):
                full_response_text = final_message_text
            else:
                full_response_text = (
                    "Here is the analysis based on the latest available data."
                    if language == 'en'
                    else "إليك التحليل بناءً على أحدث البيانات المتاحة حالياً."
                )

        # Schema-level safety: always return a string.
        full_response_text = str(full_response_text or "")
        
        # Ensure structured_narrative is NEVER None to fulfill World-Class UI layer guarantees
        if structured_narrative is None:
            from .schemas import StructuredNarrative
            structured_narrative = StructuredNarrative(
                personal_greeting=None,
                context_bridge=None,
                human_opening=None,
                core_narrative=full_response_text,
                key_insight=key_insight,
                risk_warning=None,
                follow_up_prompt=follow_up_prompt
            )

        return ChatResponse(
            message_text=full_response_text, # Use the composed text
            conversational_text=conversational_text,
            framework_text=framework_text,
            fact_explanations=fact_explanations,
            # NEW: Structured Components
            data_card=data_card,
            bull_case=bull_case,
            bear_case=bear_case,
            insight_cards=insight_cards or [],
            stock_list=stock_list or [],
            macro_score=macro_score,
            comparison_table=comparison_table,
            educational_cards=educational_cards or [],
            disclaimer_card=disclaimer_card,
            # NEW: Premium World-Class Components (Phase 2)
            framework_card=framework_card,
            character_cards=character_cards or [],
            quantified_drivers=quantified_drivers,
            index_composition=index_composition,
            # Existing
            learning_section=learning_section,
            follow_up_prompt=follow_up_prompt,
            key_insight=key_insight,  # 🎯 NEW: Key Insight (8-Layer)
            structured_narrative=structured_narrative, # 🏗️ NEW: 7-Layer Structure
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
                backend_version="6.1.0-STABLE-Fix"  # STABILIZED RELEASE
            )
        )


    def _parse_framework(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse [FRAMEWORK] section."""
        match = re.search(r'\[FRAMEWORK\]\s*(.*?)(?=\[|$)', text, re.DOTALL | re.IGNORECASE)
        if not match:
            return None
            
        content = match.group(1).strip()
        lines = content.split('\n')
        
        framework = {"items": []}
        for line in lines:
            line = line.strip()
            if line.lower().startswith('title:'):
                framework['title'] = line.split(':', 1)[1].strip()
            elif line.lower().startswith('subtitle:'):
                framework['subtitle'] = line.split(':', 1)[1].strip()
            elif line.startswith('-'):
                framework['items'].append(line[1:].strip())
        
        return framework if framework['items'] else None

    def _parse_drivers(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse [QUANTIFIED_DRIVERS] section."""
        match = re.search(r'\[QUANTIFIED_DRIVERS\]\s*(.*?)(?=\[|$)', text, re.DOTALL | re.IGNORECASE)
        if not match:
            return None
            
        content = match.group(1).strip()
        drivers = []
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('-'):
                # Format: - Name: Impact - Explanation
                parts = line[1:].split(':', 1)
                if len(parts) >= 2:
                    driver = {"name": parts[0].strip()}
                    rest = parts[1].strip()
                    # Try to separate impact and explanation
                    if '-' in rest:
                        impact_parts = rest.split('-', 1)
                        driver['impact'] = impact_parts[0].strip()
                        driver['explanation'] = impact_parts[1].strip()
                    else:
                        driver['impact'] = ""
                        driver['explanation'] = rest
                    drivers.append(driver)
        
        return {"drivers": drivers} if drivers else None

    def _parse_learning(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse [LEARNING] section."""
        match = re.search(r'\[LEARNING\]\s*(.*?)(?=\[|$)', text, re.DOTALL | re.IGNORECASE)
        if not match:
            return None
            
        content = match.group(1).strip()
        items = []
        title = "Key Concepts"
        
        for line in content.split('\n'):
            line = line.strip()
            if line.lower().startswith('title:'):
                title = line.split(':', 1)[1].strip()
            elif line.startswith('-'):
                # Format: - Concept: Definition
                parts = line[1:].split(':', 1)
                if len(parts) >= 2:
                    items.append({
                        "term": parts[0].strip(),
                        "definition": parts[1].strip()
                    })
        
        return {"title": title, "items": items} if items else None

async def process_message(
    conn: asyncpg.Connection,
    message: str,
    session_id: Optional[str] = None,
    market: Optional[str] = None,
    history: list = None,
    user_id: Optional[str] = None,
    language: Optional[str] = None
) -> ChatResponse:
    """Convenience function to process a message."""
    service = ChatService(conn)
    return await service.process_message(message, session_id, market, history, user_id, language)
