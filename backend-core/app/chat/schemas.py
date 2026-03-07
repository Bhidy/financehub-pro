"""
Pydantic schemas for chat request/response.
Defines the strict contract between backend and frontend.
"""

from pydantic import BaseModel, Field, root_validator
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime
from enum import Enum


class Intent(str, Enum):
    """Supported chat intents."""
    MARKET_SUMMARY = "MARKET_SUMMARY"  # EGX30, index, market overview
    MARKET_MOST_ACTIVE = "MARKET_MOST_ACTIVE"
    MARKET_DIVIDEND_YIELD_LEADERS = "MARKET_DIVIDEND_YIELD_LEADERS"
    
    # Stock Specific
    STOCK_PRICE = "STOCK_PRICE"
    STOCK_SNAPSHOT = "STOCK_SNAPSHOT"
    STOCK_CHART = "STOCK_CHART"
    STOCK_STAT = "STOCK_STAT"
    STOCK_MARKET_CAP = "STOCK_MARKET_CAP"
    COMPANY_PROFILE = "COMPANY_PROFILE"
    FINANCIALS = "FINANCIALS"
    FINANCIALS_ANNUAL = "FINANCIALS_ANNUAL"
    REVENUE_TREND = "REVENUE_TREND"
    DIVIDENDS = "DIVIDENDS"
    COMPARE_STOCKS = "COMPARE_STOCKS"
    TOP_GAINERS = "TOP_GAINERS"
    TOP_LOSERS = "TOP_LOSERS"
    SECTOR_STOCKS = "SECTOR_STOCKS"
    DIVIDEND_LEADERS = "DIVIDEND_LEADERS" # legacy
    SCREENER_PE = "SCREENER_PE"
    SCREENER_DEEP = "SCREENER_DEEP" # New Deep Screener (ROE, EV, Margins)
    TECHNICAL_INDICATORS = "TECHNICAL_INDICATORS"
    OWNERSHIP = "OWNERSHIP"
    NEWS = "NEWS"  # Stock-specific news
    FAIR_VALUE = "FAIR_VALUE"
    FINANCIAL_HEALTH = "FINANCIAL_HEALTH"
    # Fund Intents
    FUND_NAV = "FUND_NAV"
    FUND_SEARCH = "FUND_SEARCH"
    FUND_MOVERS = "FUND_MOVERS"
    # Small Talk & Education (NEW)
    GREETING = "GREETING"
    IDENTITY = "IDENTITY"
    CAPABILITIES = "CAPABILITIES"  # Help/What can you do
    MOOD = "MOOD"     # How are you
    GRATITUDE = "GRATITUDE"
    GOODBYE = "GOODBYE"
    DEFINE_TERM = "DEFINE_TERM"
    # Deep Financials
    FIN_MARGINS = "FIN_MARGINS"
    FIN_DEBT = "FIN_DEBT"
    FIN_CASH = "FIN_CASH"
    FIN_GROWTH = "FIN_GROWTH"
    FIN_EPS = "FIN_EPS"
    
    # Deep Ratios
    RATIO_VALUATION = "RATIO_VALUATION"
    RATIO_EFFICIENCY = "RATIO_EFFICIENCY"
    RATIO_LIQUIDITY = "RATIO_LIQUIDITY"
    
    # Deep Funds
    FUND_RISK = "FUND_RISK"
    FUND_FEES = "FUND_FEES"
    FUND_MANAGER = "FUND_MANAGER"
    FUND_INFO = "FUND_INFO"
    
    # Ultra Premium Deep Intents (Phase 7)
    DEEP_GROWTH = "DEEP_GROWTH"        # CAGR, Rev Growth, EPS Growth
    DEEP_EFFICIENCY = "DEEP_EFFICIENCY" # ROCE, Asset Turnover
    DEEP_VALUATION = "DEEP_VALUATION"   # EV/EBIT, P/TBV, P/OCF
    DEEP_SAFETY = "DEEP_SAFETY"         # Z-Score, F-Score, Solvency
    
    # ===== SECTOR A: DIRECT MARKET DATA =====
    MARKET_STATUS = "MARKET_STATUS"    # Open/Closed/Halted
    MARKET_VOLATILITY = "MARKET_VOLATILITY" # VIX, volatility
    
    # ===== SECTOR B: DEEP FUNDAMENTALS =====
    # (Existing: DEEP_VALUATION, DEEP_HEALTH, etc.)
    FIN_DUPONT = "FIN_DUPONT"          # DuPont Analysis
    FIN_ZSCORE = "FIN_ZSCORE"          # Specific Z-Score query
    FIN_FSCORE = "FIN_FSCORE"          # Specific F-Score query
    
    # ===== SECTOR C: TECHNICAL STRATEGY =====
    TECH_TREND = "TECH_TREND"          # Trend identification
    TECH_MOMENTUM = "TECH_MOMENTUM"    # Momentum specific
    TECH_LEVELS = "TECH_LEVELS"        # Support/Resistance levels
    
    # ===== SECTOR D: CORPORATE INTELLIGENCE =====
    CORP_BOARD = "CORP_BOARD"          # Board members / CEO
    CALENDAR_EARNINGS = "CALENDAR_EARNINGS" 
    CALENDAR_AGM = "CALENDAR_AGM"      # General Assembly
    
    # ===== SECTOR F: DISCOVERY & SCREENER =====
    SCREENER_GROWTH = "SCREENER_GROWTH"
    SCREENER_SAFETY = "SCREENER_SAFETY"
    SCREENER_VALUE = "SCREENER_VALUE"  # Distinct from SCREENER_PE
    SCREENER_INCOME = "SCREENER_INCOME" # High Yield
    
    # ===== SECTOR G: EXTENDED SCENARIOS (Enterprise Phase) =====
    HIDDEN_GEMS = "HIDDEN_GEMS"          # Discovery - undiscovered stocks
    MACRO_SCORE = "MACRO_SCORE"          # Market timing score (0-100)
    MACRO_VIEW = "MACRO_VIEW"            # Full macro analysis
    INDEX_COMPOSITION = "INDEX_COMPOSITION" # EGX 30 constituents
    MARKET_TIMING = "MARKET_TIMING"      # Is now a good time to buy?
    SCORE_BREAKDOWN = "SCORE_BREAKDOWN"  # Show inside the Starta score for a specific stock
    
    # System
    HELP = "HELP"
    CLARIFY_SYMBOL = "CLARIFY_SYMBOL"
    FOLLOW_UP = "FOLLOW_UP"
    UNKNOWN = "UNKNOWN"
    BLOCKED = "BLOCKED"

    # ===== FINANCIAL-SERVICES-PLUGINS ADDITIONS (equity-research patterns) =====
    EARNINGS_ANALYSIS = "EARNINGS_ANALYSIS"       # Quarterly results, beat/miss analysis
    MORNING_BRIEF = "MORNING_BRIEF"               # Daily market recap/pre-session brief
    CATALYST_CALENDAR = "CATALYST_CALENDAR"       # Upcoming events, dividends, results dates

    # ===== EXPANSION: Financial Explorer Intents (Phase 1) =====
    INCOME_EXPLORE = "INCOME_EXPLORE"             # Revenue breakdown, cost structure, EBITDA
    INCOME_TREND = "INCOME_TREND"                 # Revenue/EPS/margins growth trends
    BALANCE_EXPLORE = "BALANCE_EXPLORE"           # Debt structure, assets, working capital
    BALANCE_TREND = "BALANCE_TREND"               # Balance sheet metric trends
    CASHFLOW_EXPLORE = "CASHFLOW_EXPLORE"         # Cash flow waterfall, capex, financing
    CASHFLOW_TREND = "CASHFLOW_TREND"             # FCF/OCF/capex trends
    RATIO_TREND = "RATIO_TREND"                   # Historical ratio charts (5yr)
    ADVANCED_STATS = "ADVANCED_STATS"             # Yields, turnover, BV, intrinsic data
    OWNERSHIP_DETAIL = "OWNERSHIP_DETAIL"         # Insider vs institutional vs float
    EV_ANALYSIS = "EV_ANALYSIS"                   # Enterprise value decomposition
    SCORE_DETAIL = "SCORE_DETAIL"                 # Z-Score/F-Score explained
    UNIVERSAL_FINANCIAL = "UNIVERSAL_FINANCIAL"   # Dynamic catch-all for any financial Q


class CardType(str, Enum):
    """Types of UI cards."""
    STOCK_HEADER = "stock_header"
    SNAPSHOT = "snapshot"
    STATS = "stats"
    FINANCIALS_TABLE = "financials_table"
    FINANCIAL_STATEMENT_TABLE = "financial_statement_table"  # Legacy
    FINANCIAL_EXPLORER = "financial_explorer"  # New ultra-premium
    DIVIDENDS_TABLE = "dividends_table"
    COMPARE_TABLE = "compare_table"
    COMPARISON_TABLE = "comparison_table" # Legacy mapping alias
    MOVERS_TABLE = "movers_table"
    SECTOR_LIST = "sector_list"
    SCREENER_RESULTS = "screener_results"
    RATIOS = "ratios"
    OWNERSHIP = "ownership"
    FAIR_VALUE = "fair_value"
    TECHNICALS = "technicals"
    HELP = "help"
    ERROR = "error"
    SUGGESTIONS = "suggestions"
    # New Conversational Cards
    FACT_EXPLANATIONS = "fact_explanations"
    # News card type
    NEWS_LIST = "news_list"
    # Fund card types
    FUND_NAV = "fund_nav"
    FUND_LIST = "fund_list"
    FUND_MOVERS = "fund_movers"
    # Ultra Premium Deep Cards (Phase 7)
    DEEP_VALUATION = "deep_valuation"
    DEEP_EFFICIENCY = "deep_efficiency"
    DEEP_HEALTH = "deep_health"
    DEEP_GROWTH = "deep_growth"
    
    # Extended Scenario Card Types (Enterprise Phase)
    MACRO_SCORE = "macro_score"
    VALUATION_SCORE = "valuation_score"
    MACRO_CONTEXT = "macro_context"
    EDUCATIONAL = "educational"
    METHODOLOGY = "methodology"
    HIDDEN_GEMS = "hidden_gems"
    INDEX_COMPOSITION = "index_composition"
    DISCLAIMER = "disclaimer"
    DISCLAIMER_CARD = "disclaimer_card"
    
    # Bull/Bear Analysis Cards (CRITICAL - without these cards fail!)
    BULL_CASE = "bull_case"
    BEAR_CASE = "bear_case"
    INSIGHT = "insight"
    MY_FRAMEWORK = "my_framework"
    
    # Additional Card Types (Frontend expects these)
    DISCOVERY_LIST = "discovery_list"
    GEM_LIST = "gem_list"
    STOCK_LIST = "stock_list"
    SCREENING_CRITERIA = "screening_criteria"
    MARKET_TIMING = "market_timing"
    INDEX_VIEW = "index_view"
    METRIC = "metric"
    DEFINE_TERM = "define_term"
    DEFINITION = "definition"
    STATISTICS = "statistics"
    FINANCIALS = "financials"
    MOVERS = "movers"
    COMPARE = "compare"

    # ===== EXPANSION: New Explorer Card Types (Phase 1) =====
    REVENUE_BREAKDOWN = "revenue_breakdown"       # Stacked bar: revenue components
    COST_BREAKDOWN = "cost_breakdown"             # Pie/donut: cost structure
    EBITDA_BREAKDOWN = "ebitda_breakdown"         # EBITDA vs EBIT with D&A
    EARNINGS_QUALITY_CARD = "earnings_quality"    # FCF vs Net Income quality check
    GROWTH_TREND = "growth_trend"                 # Multi-year line chart
    DEBT_STRUCTURE = "debt_structure"             # Short vs long-term debt bars
    ASSETS_BREAKDOWN = "assets_breakdown"         # Asset composition treemap/pie
    EQUITY_BREAKDOWN = "equity_breakdown"         # Equity waterfall
    PPE_BREAKDOWN = "ppe_breakdown"               # PP&E component bars
    WORKING_CAPITAL_CARD = "working_capital_card" # Current assets vs liabilities
    CASHFLOW_WATERFALL = "cashflow_waterfall"     # OCF → ICF → FCF waterfall
    DEBT_ACTIVITY = "debt_activity"               # Debt issuance vs repayment
    FCF_VS_INCOME = "fcf_vs_income"               # Dual-line FCF vs NI
    RATIO_HISTORY_CHART = "ratio_history_chart"   # Multi-line historical ratios
    ADVANCED_STATS_CARD = "advanced_stats"        # Grouped advanced metrics
    OWNERSHIP_STRUCTURE = "ownership_structure"   # Pie: insider/institutional/float
    SCORE_DETAIL_CARD = "score_detail"            # Z-Score/F-Score explanation
    DYNAMIC_DATA_CARD = "dynamic_data_card"       # Auto-generated data table
    SCORE_BREAKDOWN_CARD = "score_breakdown"      # Starta 5-pillar score breakdown


class ChartType(str, Enum):
    """Types of charts."""
    CANDLESTICK = "candlestick"
    LINE = "line"
    BAR = "bar"
    # Ultra Premium Charts (Phase 7)
    PIE = "pie"
    DONUT = "donut"
    COLUMN = "column"
    RADAR = "radar"
    AREA = "area"
    FINANCIAL_GROWTH = "financial_growth"


# ============================================================================
# NEW: Structured Response Components (HTML Mockup Match)
# ============================================================================

class FrameworkCard(BaseModel):
    """Criteria/Methodology card with colored border (e.g., 'HIDDEN GEM CRITERIA').
    
    Visual: Colored left border, icon + uppercase title, bullet list.
    Used for: Screener criteria, valuation frameworks, methodology explanations.
    """
    icon: str = "📊"  # Emoji icon
    title: str  # e.g. "HIDDEN GEM CRITERIA"
    subtitle: Optional[str] = None  # e.g. "Sector-Specific Framework"
    items: List[str]  # Bullet points
    border_color: Literal["blue", "green", "amber", "teal"] = "blue"


class CharacterCard(BaseModel):
    """Stock personality profile card (e.g., 'The 800-lb Gorilla').
    
    Visual: Emoji header, nickname, stock ticker, good/bad lists.
    Used for: Comparison analyses, giving stocks memorable identities.
    """
    emoji: str  # 🏋️ 👋 💎 🌱
    nickname: str  # "The 800-lb Gorilla"
    ticker: str  # JUFO
    company_name: Optional[str] = None
    profile: str  # Brief personality description
    good: List[str]  # What's good about this stock
    bad: List[str]  # What's the concern


class QuantifiedDriver(BaseModel):
    """Single quantified driver with impact percentage."""
    name: str  # e.g. "Raw Material Inflation"
    impact: str  # e.g. "-3.0%"
    detail: Optional[str] = None  # Additional context


class QuantifiedDriversCard(BaseModel):
    """Driver breakdown card with numbered, quantified impacts.
    
    Visual: Numbered list with percentages, color-coded impacts.
    Used for: Margin analysis, performance attribution, risk decomposition.
    """
    title: str = "Here's what's actually driving it (quantified)"
    icon: str = "📊"
    drivers: List[QuantifiedDriver]
    total_impact: Optional[str] = None  # e.g. "-5.3%"


class IndexCompositionCard(BaseModel):
    """Index composition breakdown (e.g., 'EGX 30 INDEX COMPOSITION').
    
    Visual: Sector breakdown with weights and constituent names.
    """
    index_name: str  # "EGX 30"
    icon: str = "📊"
    sectors: List[Dict[str, Any]]  # [{name: "Financials", weight: "40%", constituents: [...]}]
    recent_changes: Optional[Dict[str, List[str]]] = None  # {added: [...], removed: [...]}
    top_by_weight: Optional[List[Dict[str, str]]] = None  # [{ticker, weight}]
    characteristics: Optional[str] = None  # Free-form text about index characteristics


class InsightCardVariant(str, Enum):
    """Insight card visual variants."""
    SUCCESS = "success"   # Green border - Bull Case
    WARNING = "warning"   # Red border - Bear Case
    INFO = "info"         # Blue border - Educational
    NEUTRAL = "neutral"   # Gray border - General insight


class InsightCard(BaseModel):
    """Bull/Bear case insight card with icon and bullets."""
    variant: InsightCardVariant
    title: str  # e.g. "📈 Bull Case (+45% upside)"
    items: List[str]  # Bullet points


class DataCard(BaseModel):
    """Current position data card (price, change, volume)."""
    label: str = "CURRENT POSITION"
    icon: str = "📊"
    price: str  # e.g. "EGP 12.45"
    change: str  # e.g. "+0.78 (6.67%)"
    change_positive: bool
    volume_context: Optional[str] = None  # e.g. "2.3M shares (28% above 3-month avg)"


class StockListItem(BaseModel):
    """Stock item in a screener list with score."""
    ticker: str
    company_name: str
    score: float  # 0-100 undervaluation score (supports decimal tie-break precision)
    metrics: Dict[str, str]  # e.g. {"P/B": "0.9x", "P/E": "5.5x", "ROE": "18.2%"}
    description: Optional[str] = None
    badge: Optional[str] = None
    highlighted: bool = False


class MacroFactor(BaseModel):
    """Single macro scoring factor."""
    name: str  # e.g. "GDP Growth"
    points: int  # Points achieved
    max_points: int  # Max possible
    status: Literal["positive", "neutral", "negative"]
    status: Literal["positive", "neutral", "negative"]


class ScoreComponent(BaseModel):
    """Individual component for a score breakdown."""
    label: str  # e.g., "Valuation"
    note: str   # e.g., "P/B 0.9x vs 5yr avg 1.4x"
    score: int
    max_score: int
    icon: str   # e.g., "💰"

class ScoreBreakdownCard(BaseModel):
    """Detailed score breakdown with 5 components."""
    title: str  # e.g., "COMI — Score Breakdown: 76/100"
    grade: str  # e.g., "Grade B"
    score: int
    max_score: int = 100
    components: List[ScoreComponent]


class GemMiniBar(BaseModel):
    """Mini bar for GemListCard."""
    label: str  # e.g., "Val", "Prof"
    percentage: int  # 0-100 defining bar width

class GemItem(BaseModel):
    """Individual hidden gem item."""
    ticker: str
    company_name: str
    sector: str
    score: int
    grade: str
    mini_bars: List[GemMiniBar]
    why: str  # Narrative explanation
    strength: str  # Key strength
    watch: str  # Key risk/watch item

class GemListCard(BaseModel):
    """List of hidden gems with mini bars and details."""
    title: Optional[str] = "Hidden Gems"
    gems: List[GemItem]


class TopUndervaluedItem(BaseModel):
    """Row in the overall top 5 undervalued list."""
    ticker: str
    company_name: str
    sector: str
    score: int
    grade: str

class SectorWinner(BaseModel):
    """Winner for a specific sector."""
    sector_name: str
    ticker: str
    score: int

class UndervaluedScreenCard(BaseModel):
    """Screening results showing top overall and best by sector."""
    overall_top: List[TopUndervaluedItem]
    sector_winners: List[SectorWinner]
    insight: str  # The key takeaway from the screen


class MacroScoreCard(BaseModel):
    """Macro environment score card (0-100)."""
    score: int  # 0-100
    max_score: int = 100
    assessment: str  # e.g. "Cautiously Constructive"
    factors: List[MacroFactor]


class ComparisonRow(BaseModel):
    """Single row in peer comparison table."""
    metric: str
    values: List[str]  # One per stock being compared


class ComparisonTable(BaseModel):
    """Peer comparison table."""
    headers: List[str]  # Stock tickers/names
    rows: List[ComparisonRow]
    personality_profiles: Optional[Dict[str, str]] = None  # {ticker: "The quality name..."}


class EducationalCard(BaseModel):
    """Educational definition/example card."""
    variant: Literal["definition", "example", "formula", "when_misleading"]
    title: str
    content: str


class DisclaimerCard(BaseModel):
    """Disclaimer warning card."""
    icon: str = "⚠️"
    title: str = "Educational Analysis"
    text: str = ""


# Extended ChatRequest to add market context


class ChatRequest(BaseModel):
    """Incoming chat request."""
    message: str = Field(..., min_length=1, max_length=500)
    session_id: Optional[str] = None
    history: List[Dict[str, str]] = Field(default_factory=list)


class Card(BaseModel):
    """UI card in response."""
    type: CardType
    title: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class ChartPayload(BaseModel):
    """Chart data payload."""
    type: ChartType
    symbol: str
    title: str
    data: List[Dict[str, Any]]  # [{time, open, high, low, close, volume}]
    range: str = "1M"


class Action(BaseModel):
    """Suggested action/button."""
    label: str
    label_ar: Optional[str] = None
    action_type: Literal["query", "navigate", "filter"]
    payload: str  # Query text or URL


class StructuredNarrative(BaseModel):
    """
    The 7-Layer Structured Response for World-Class UI.
    Splits the monolithic text into distinct semantic components.
    """
    personal_greeting: Optional[str] = Field(None, description="Layer 1: Hello, Mohamed")
    context_bridge: Optional[str] = Field(None, description="Layer 2: Continuing with [Symbol]...")
    human_opening: Optional[str] = Field(None, description="Layer 3: Natural conversational opening")
    core_narrative: Optional[str] = Field(None, description="Layer 4: The main analysis text")
    key_insight: Optional[str] = Field(None, description="Layer 5: The 'One Thing' takeaway (Green/Red Card)")
    risk_warning: Optional[str] = Field(None, description="Layer 6: Compliance or volatility warning (Amber Banner)")
    follow_up_prompt: Optional[str] = Field(None, description="Layer 7: Suggested next question")


class AnswerGrounding(BaseModel):
    """Grounding and provenance metadata for response transparency."""
    grounded: bool = False
    as_of: Optional[str] = None
    period: Optional[str] = None
    source_tables: List[str] = Field(default_factory=list)
    missing_requirements: List[str] = Field(default_factory=list)
    analysis_confidence: float = 0.0


class FollowUpChip(BaseModel):
    """Deterministic follow-up chip contract."""
    text: str
    payload: str
    type: str
    anchor_symbol: Optional[str] = None
    anchor_symbols: List[str] = Field(default_factory=list)


class ResponseMeta(BaseModel):
    """Metadata for the chat response."""
    intent: str
    confidence: float
    entities: Dict[str, Any] = Field(default_factory=dict)
    latency_ms: int = 0
    error: Optional[str] = None
    authenticated: bool = False
    auth_debug: Optional[Dict[str, Any]] = None
    backend_version: Optional[str] = None # Added for QA/Debugging
    answer_grounding: Optional[AnswerGrounding] = None


class ChatResponse(BaseModel):
    """Full chat response with structured components for premium UI."""
    # Status fields (Added for Error Handling & QA)
    success: bool = True
    response_status: Literal["pass", "fail"] = "pass"
    message: Optional[str] = None # Detailed error message if success=False

    # Core text layers
    message_text: str  # The "Robotic" fallback or title
    conversational_text: Optional[str] = None  # The "Human" voice (Starta)
    framework_text: Optional[str] = None  # NEW: Analytical framework section
    
    # Legacy compatibility
    fact_explanations: Optional[Dict[str, str]] = None
    
    # NEW: Structured Response Components (HTML Mockup Match)
    structured_narrative: Optional[StructuredNarrative] = None  # NEW: 7-Layer Structure
    data_card: Optional[DataCard] = None  # Current position card
    bull_case: Optional[InsightCard] = None  # Green bull case card
    bear_case: Optional[InsightCard] = None  # Red bear case card
    insight_cards: List[InsightCard] = Field(default_factory=list)  # Additional insights
    stock_list: List[StockListItem] = Field(default_factory=list)  # Screener results
    macro_score: Optional[MacroScoreCard] = None  # Macro environment score
    comparison_table: Optional[ComparisonTable] = None  # Peer comparison
    educational_cards: List[EducationalCard] = Field(default_factory=list)  # Definitions/examples
    disclaimer_card: Optional[DisclaimerCard] = None  # Educational disclaimer
    
    # NEW: Premium World-Class Components (Phase 2)
    framework_card: Optional['FrameworkCard'] = None  # Criteria/methodology box
    character_cards: List['CharacterCard'] = Field(default_factory=list)  # Stock personality profiles
    quantified_drivers: Optional['QuantifiedDriversCard'] = None  # Numbered driver breakdown
    index_composition: Optional['IndexCompositionCard'] = None  # Index breakdown
    score_breakdown: Optional[ScoreBreakdownCard] = Field(None, description="Detailed score breakdown card showing 5 factors")
    gem_list: Optional[GemListCard] = Field(None, description="Hidden gems list with detailed metrics and mini bars")
    undervalued_screen: Optional[UndervaluedScreenCard] = Field(None, description="Screening results showing top 5 overall and best by sector")
    
    # NEW: Radar chart for stock comparison (3-stock visual comparison)
    compare_radar: Optional[Dict[str, Any]] = Field(None, description="Radar chart data for multi-stock comparison")
    
    
    # Existing structured components
    learning_section: Optional[Dict[str, Any]] = None  # {"title": "...", "items": ["..."]}
    follow_up_prompt: Optional[str] = None  # Soft follow-up suggestion
    followups: List[FollowUpChip] = Field(default_factory=list)  # Dynamic follow-up chips
    key_insight: Optional[str] = None  # 🎯 Key takeaway insight for the stock
    
    # UI elements
    message_text_ar: Optional[str] = None
    language: Literal["ar", "en", "mixed"] = "en"
    cards: List[Card] = Field(default_factory=list)  # Legacy card system
    chart: Optional[ChartPayload] = None
    actions: List[Action] = Field(default_factory=list)
    disclaimer: Optional[str] = None  # Legacy text disclaimer
    meta: ResponseMeta

    @root_validator(pre=True)
    def _default_response_status(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        raw_status = values.get("response_status")
        if raw_status in {"pass", "fail"}:
            return values
        success = values.get("success", True)
        values["response_status"] = "pass" if bool(success) else "fail"
        return values



class ResolvedSymbol(BaseModel):
    """Result of symbol resolution."""
    symbol: str
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    market_code: Optional[str] = None  # Make optional to handle None values
    confidence: float
    match_type: Literal["exact", "alias", "name", "fuzzy", "nickname", "similarity", "phrase_similarity"]
    entity_type: Literal["stock", "fund"] = "stock"


class IntentResult(BaseModel):
    """Result of intent classification."""
    intent: Intent
    confidence: float
    entities: Dict[str, Any] = Field(default_factory=dict)
    missing_fields: List[str] = Field(default_factory=list)


class ConversationContext(BaseModel):
    """Enhanced conversation context for world-class conversational AI."""
    session_id: str
    last_symbol: Optional[str] = None
    last_market: Optional[str] = None
    last_intent: Optional[str] = None
    last_range: Optional[str] = None
    compare_symbols: Optional[List[str]] = None
    expires_at: datetime
    
    # Phase 1: Enhanced Session State
    turn_count: int = 0  # Message count in this session
    greeting_shown: bool = False  # Track if greeting was shown
    last_greeting_category: Optional[str] = None  # Prevent repetition
    last_opening_used: Optional[str] = None  # Prevent repetition
    last_cards_shown: Optional[List[str]] = None  # Card types shown
    user_name: Optional[str] = None  # Cached for personalization
    detected_language: str = "en"  # ar/en
    
    # ═══════════════════════════════════════════════════════════════════
    # WORLD-CLASS CONVERSATIONAL AI: Context Continuity (NEW)
    # ═══════════════════════════════════════════════════════════════════
    
    # Conversation Memory (Last 10 turns)
    # Format: [{"role": "user"|"assistant", "content": str, "intent": str,
    #          "entities": dict, "timestamp": str}]
    conversation_history: List[Dict[str, Any]] = []
    
    # Active Entities (carry across turns)
    # Format: {"symbol": "COMI", "sector": "Banks", "market": "EGX", 
    #          "metric": "PE", "comparison_target": ["CIB"]}
    active_entities: Dict[str, Any] = {}
    
    # User Profile for Personalization
    # Format: {"name": str, "preferred_language": "ar"|"en", 
    #          "detail_level": "basic"|"professional"|"expert"}
    user_profile: Dict[str, Any] = {}
    
    # Pending Suggestions (from follow-up prompts)
    # Format: ["compare", "deep_dive", "financials"]
    # When user says "yes"/"ok", execute first pending suggestion
    pending_suggestions: List[str] = []
    
    # Last Response Sentiment (for consistency)
    last_response_sentiment: str = "neutral"  # bullish|bearish|neutral
    
    # Follow-up Tracking
    last_followup_type: Optional[str] = None  # confirmation|expansion|topic_shift|pronoun
    is_in_followup_chain: bool = False  # Track multi-turn follow-up sequences
    
    # ═══════════════════════════════════════════════════════════════════
    # RECOMMENDATION B: Thesis Persistence (financial-services-plugins)
    # ═══════════════════════════════════════════════════════════════════
    #
    # Stores active investment theses so the bot can check milestone
    # status across turns in the same session.
    #
    # Schema per thesis:
    # {
    #   "symbol":       "COMI",
    #   "thesis_text":  "Buy on CBE rate cuts + loan growth >15%",
    #   "milestones": [
    #       {"label": "CBE Rate Cut", "status": "PENDING"},
    #       {"label": "Loan Growth >15%", "status": "CONFIRMED"},
    #       {"label": "NPL < 3%", "status": "PENDING"},
    #   ],
    #   "added_at":   "2026-03-03T00:38:00",
    #   "expires_at": "2026-06-03T00:00:00",  # 90-day TTL
    # }
    #
    # Activation: User says "track this thesis" / "تابع هذه الأطروحة"
    # Check:      When user asks about tracked symbol, bot surfaces thesis status
    tracked_thesis: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Active investment theses tracked across session turns"
    )
