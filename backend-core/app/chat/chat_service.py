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
    StructuredNarrative
)
from .text_normalizer import normalize_text, extract_potential_symbols
from .intent_router import IntentRouter, create_router
from .symbol_resolver import SymbolResolver
from .compliance import check_compliance, get_disclaimer, COMPLIANCE_RESPONSE_AR
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

        # Deduplicate and return limit
        return list(dict.fromkeys(peers))[:limit]

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
                import re
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
                import re
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
            
            # --- LANGUAGE ENFORCEMENT ---
            # Highest priority: Arabic user input should always receive Arabic response.
            language = self._resolve_language(
                message=message,
                forced_language=forced_language,
                normalized_language=normalized.language,
            )
            if forced_language in ['en', 'ar']:
                print(f"[ChatService] 🌍 Language Resolution: Detected '{normalized.language}' | Header '{forced_language}' -> Using '{language}'")
            # -----------------------------
            
            # 3. Check compliance
            # IMPORTANT: Run compliance on the ORIGINAL user message first.
            # Paraphrasing can translate Arabic -> English, causing Arabic users to see English blocked copy.
            is_blocked, violation_type, block_message = check_compliance(message)
            if (not is_blocked) and routing_text and routing_text != message:
                is_blocked, violation_type, block_message = check_compliance(routing_text)
            if is_blocked:
                if language == "ar":
                    block_message = COMPLIANCE_RESPONSE_AR
                result = handle_blocked(violation_type, block_message, language)
                response = self._build_response(result, Intent.BLOCKED, 1.0, {}, start_time, language)
                return self._enforce_response_language(response, language)
            
            # 4. Route intent - CLAUDE-FIRST ARCHITECTURE (World-Class 2.0)
            # ------------------------------------------------------------------
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
                
                # Merge potential symbols into compare_symbols (avoiding duplicates)
                current_upper = [str(x).upper() for x in existing_compare]
                for s in potential_symbols:
                    s_upper = str(s).upper()
                    if s_upper not in current_upper:
                        existing_compare.append(s_upper)
                        current_upper.append(s_upper)
                
                entities['compare_symbols'] = existing_compare
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
            should_use_context = intent in CONTEXT_AWARE_INTENTS
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
            NO_NARRATIVE_INTENTS = [Intent.UNKNOWN, Intent.BLOCKED, Intent.HELP]
            
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
            
            # Fetch real user name for personalization (Moved up for global scope)
            real_user_name = await self._get_user_name(user_id)

            if result_data.get('success', True) and intent not in NO_NARRATIVE_INTENTS:
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

                    # ENTERPRISE RULE: NEVER show greeting in ongoing conversation unless forced
                    final_allow_greeting = False
                    force_human_opening = False
                    
                    if is_new_session:
                        # First message of session - ALWAYS show greeting unless deep dive
                        final_allow_greeting = not is_deep_dive
                        if is_deep_dive: print(f"[ChatService] 🚫 Suppressing greeting for Deep Dive")
                        else: print(f"[ChatService] 👋 Allowing greeting: New session")
                    else:
                        # Returning user - force human opening ONLY if NOT deep dive
                        force_human_opening = not is_deep_dive
                        if not is_deep_dive: print(f"[ChatService] 💬 Force human opening: Returning user")
                    
                    # DYNAMIC TOKEN LIMIT: Increase for deep dives
                    explainer.MAX_TOKENS = 1000 if is_deep_dive else 400
                    if is_extended_intent and handler_conversational_text:
                        conversational_text = handler_conversational_text
                    else:
                        conversational_text = await explainer.generate_narrative(
                            query=message,
                            intent=intent.value,
                            data=result_data.get('cards', []),
                            language=language,
                            user_name=real_user_name,
                            allow_greeting=False, # CHANGED: Delegated to ResponseComposer for consistent 8-layer structure
                            is_returning_user=is_returning_user
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
                        import re
                        clean_text = conversational_text
                        
                        # Definition of Robust Patterns (Handle bold, caps, spacing)
                        patterns = {
                            'bull': r"(?:\[BULL_CASE\]|\*\*\[BULL_CASE\]\*\*|\[BULL CASE\]|BULL CASE[:\n])",
                            'bear': r"(?:\[BEAR_CASE\]|\*\*\[BEAR_CASE\]\*\*|\[BEAR CASE\]|BEAR CASE[:\n])",
                            'framework': r"(?:\[FRAMEWORK\]|\*\*\[FRAMEWORK\]\*\*|FRAMEWORK[:\n])",
                            'learning': r"(?:\[LEARNING\]|\*\*\[LEARNING\]\*\*|LEARNING[:\n])",
                            'drivers': r"(?:\[QUANTIFIED_DRIVERS\]|QUANTIFIED DRIVERS[:\n])"
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

                        # 1. Extract BULL CASE (Stop at Bear, Framework, Learning or End)
                        bull_points, clean_text = extract_section(
                            clean_text, 
                            patterns['bull'], 
                            [patterns['bear'], patterns['framework'], patterns['learning']]
                        )

                        # 2. Extract BEAR CASE (Stop at Framework, Learning or End)
                        bear_points, clean_text = extract_section(
                            clean_text, 
                            patterns['bear'], 
                            [patterns['framework'], patterns['learning'], patterns['drivers']]
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

                        # 4. Final Text Cleanliness Check
                        # Remove any lingering empty tags or artifacts
                        clean_text = re.sub(r"\[BULL_CASE\]|\[BEAR_CASE\]", "", clean_text).strip()
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
                    if (not final_allow_greeting) and conversational_text:
                        import re
                        # Patterns to strip: "Welcome back [Name] .", "Welcome [Name] .", "Hello .", "Hi ."
                        # Updated to handle Markdown bolding/italics and whitespace
                        # Added patterns for secondary filler sentences ("I'm Starta", "I'll help", "Ready to")
                        patterns = [
                            r"^[\s\W]*(Welcome back|Welcome|Hello|Hi|Greetings).*?[\.\!\?]",
                            r"^[\s\W]*(I am|I'm|I’m)\s+(Starta|here|ready|happy).*?[\.\!\?]",
                            r"^[\s\W]*(I will|I’ll|I'll)\s+(help|guide|assist).*?[\.\!\?]",
                            r"^[\s\W]*(Ready to|Let's|Let’s)\s+(continue|explore|analyze|start).*?[\.\!\?]"
                        ]
                        
                        original_text = conversational_text
                        prev_text = None
                        # Loop until no more changes (to strip consecutive repetitive sentences)
                        while prev_text != conversational_text:
                            prev_text = conversational_text
                            for pattern in patterns:
                                conversational_text = re.sub(pattern, "", conversational_text, flags=re.IGNORECASE | re.MULTILINE).strip()
                            
                        if original_text != conversational_text:
                            print(f"[ChatService] ☢️ NUCLEAR: Stripped greeting from '{original_text[:20]}...' -> '{conversational_text[:20]}...'")

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
                    # We need 'force_human_opening' from above block. If undefined, default to False.
                    # But for errors, we might WANT to force opening like "Got it, Mohamed..."
                    safe_force_opening = locals().get('force_human_opening', False)
                    # If failure, force opening to acknowledge the user
                    if is_failure:
                        safe_force_opening = True  # "Got it, Mohamed. I couldn't find..."
                    
                    composer = get_response_composer()
                    full_response, _, opening_category = composer.compose_premium_response(
                        core_narrative=conversational_text,
                        language=language,
                        intent=intent,
                        user_name=real_user_name,
                        last_opening_used=last_opening,
                        shown_card_types=card_types,
                        include_opening=safe_force_opening if should_wrap else False,
                        include_guidance=True if should_wrap else False, 
                        force_opening=safe_force_opening if should_wrap else False
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
                import re
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
            
            # NEW: Key Insight (8-Layer Completeness)
            handler_key_insight = result_data.get('key_insight')
            if not handler_key_insight and intent in [
                Intent.STOCK_SNAPSHOT, Intent.FINANCIALS, Intent.DIVIDENDS,
                Intent.DEEP_VALUATION, Intent.DEEP_SAFETY, Intent.FAIR_VALUE,
                Intent.FINANCIAL_HEALTH, Intent.COMPARE_STOCKS, Intent.STOCK_PRICE
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
                
                # 4. Compose Full Response
                full_text, structured, _ = ResponseComposer.compose_premium_response(
                    core_narrative=conversational_text,
                    language=language,
                    intent=intent,
                    user_name=real_user_name,
                    is_follow_up=(is_returning_user and not is_new_session) or intent == Intent.FOLLOW_UP,
                    follow_up_type='continuation', # Default
                    active_symbol=actual_symbol,
                    sentiment=sentiment,
                    include_risk_warning=include_risk,
                    risk_type=risk_type,
                    shown_card_types=[str(c.get('type')) for c in result_data.get('cards', [])]
                )
                
                # Inject Follow-up Prompt into Structured Narrative
                if structured and follow_up_prompt:
                    structured.follow_up_prompt = follow_up_prompt
                
                convo_logger = logging.getLogger("ChatService")
                convo_logger.info(f"✅ 8-Layer Assembly Complete. Length: {len(full_text)}")
                conversational_text = full_text
                
            except Exception as composer_err:
                print(f"[ChatService] ⚠️ ResponseComposer Error: {composer_err}")
                # Fallback to raw text if composer fails
                pass
            
            # ------------------------------------------------------------------
            
            response = self._build_response(
                result_data, intent, confidence, entities, start_time, language,
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
                
                # Extract pending suggestions from follow-up prompt for next turn
                pending_suggestions = []
                if follow_up_prompt:
                    # Parse follow-up for suggested actions
                    if "compare" in follow_up_prompt.lower() or "قارن" in follow_up_prompt:
                        pending_suggestions.append("compare")
                    if "financials" in follow_up_prompt.lower() or "مالية" in follow_up_prompt:
                        pending_suggestions.append("financials")
                    if "dividend" in follow_up_prompt.lower() or "توزيعات" in follow_up_prompt:
                        pending_suggestions.append("dividends")
                    if "chart" in follow_up_prompt.lower() or "رسم" in follow_up_prompt:
                        pending_suggestions.append("chart")
                
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
                    type=CardType.ERROR,
                    title="System Maintenance" if lang == 'en' else "صيانة النظام",
                    data={'content': f"### ⚠️ {err_msg}"}
                )
                
                return ChatResponse(
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
        
        elif intent == Intent.SCREENER_PE:
            threshold = entities.get('threshold', 15.0) # Default PE 15
            return await handle_screener_pe(self.conn, threshold, market_code, limit=20, language=language)
        
        elif intent == Intent.SCREENER_DEEP or intent == Intent.SCREENER_VALUE or intent == Intent.SCREENER_SAFETY or intent == Intent.SCREENER_GROWTH:
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
            compare_symbols = [str(s).upper() for s in compare_symbols if str(s).strip()]

            # If compare query references one stock + peers, infer peers automatically.
            if symbol and symbol not in compare_symbols:
                compare_symbols = [symbol] + compare_symbols

            if len(compare_symbols) < 2 and symbol:
                inferred_peers = await self._infer_peer_symbols(
                    primary_symbol=symbol,
                    market_code=market_code,
                    limit=2
                )
                for peer in inferred_peers:
                    if peer not in compare_symbols and peer != symbol:
                        compare_symbols.append(peer)
                    if len(compare_symbols) >= 2:
                        break

            if len(compare_symbols) < 2:
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
             
        elif intent == Intent.SCREENER_VALUE:
             from .handlers.extended_scenarios import handle_undervalued_stocks
             sector = entities.get('sector')
             try:
                 return await handle_undervalued_stocks(
                     self.conn,
                     language=language,
                     sector=sector,
                     limit=5
                 )
             except Exception:
                 # Fallback if extended screener fails
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
                
        # If we have a chart but no text
        if not conversational_text and not final_message_text and chart:
            final_message_text = (
                f"Here is the chart for {chart.symbol}."
                if language == 'en' else
                f"إليك الرسم البياني لـ {chart.symbol}."
            )

        return ChatResponse(
            message_text=final_message_text,
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
                backend_version="6.0.0-PREMIUM-WORLD-CLASS"  # PHASE 2 DEPLOYMENT
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
