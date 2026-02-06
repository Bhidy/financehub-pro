"""
Pydantic schemas for chat request/response.
Defines the strict contract between backend and frontend.
"""

from pydantic import BaseModel, Field
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
    
    # System
    HELP = "HELP"
    CLARIFY_SYMBOL = "CLARIFY_SYMBOL"
    FOLLOW_UP = "FOLLOW_UP"
    UNKNOWN = "UNKNOWN"
    BLOCKED = "BLOCKED"


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
    EDUCATIONAL = "educational"
    METHODOLOGY = "methodology"
    HIDDEN_GEMS = "hidden_gems"
    INDEX_COMPOSITION = "index_composition"
    DISCLAIMER = "disclaimer"


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
    score: int  # 0-100 undervaluation score
    metrics: Dict[str, str]  # e.g. {"P/B": "0.9x", "P/E": "5.5x", "ROE": "18.2%"}


class MacroFactor(BaseModel):
    """Single macro scoring factor."""
    name: str  # e.g. "GDP Growth"
    points: int  # Points achieved
    max_points: int  # Max possible
    status: Literal["positive", "neutral", "negative"]


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
    text: str = "This is market analysis for educational purposes, not personalized investment advice. Your decision should factor in your individual financial situation, risk tolerance, and investment timeline."


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


class ResponseMeta(BaseModel):
    """Response metadata."""
    intent: str
    confidence: float
    entities: Dict[str, Any] = Field(default_factory=dict)
    latency_ms: int = 0
    cached: bool = False
    as_of: Optional[datetime] = None
    backend_version: str = "3.0" # Incremented for Hybrid Chat


class ChatResponse(BaseModel):
    """Full chat response with structured components for premium UI."""
    # Core text layers
    message_text: str  # The "Robotic" fallback or title
    conversational_text: Optional[str] = None  # The "Human" voice (Starta)
    framework_text: Optional[str] = None  # NEW: Analytical framework section
    
    # Legacy compatibility
    fact_explanations: Optional[Dict[str, str]] = None
    
    # NEW: Structured Response Components (HTML Mockup Match)
    data_card: Optional[DataCard] = None  # Current position card
    bull_case: Optional[InsightCard] = None  # Green bull case card
    bear_case: Optional[InsightCard] = None  # Red bear case card
    insight_cards: List[InsightCard] = Field(default_factory=list)  # Additional insights
    stock_list: List[StockListItem] = Field(default_factory=list)  # Screener results
    macro_score: Optional[MacroScoreCard] = None  # Macro environment score
    comparison_table: Optional[ComparisonTable] = None  # Peer comparison
    educational_cards: List[EducationalCard] = Field(default_factory=list)  # Definitions/examples
    disclaimer_card: Optional[DisclaimerCard] = None  # Educational disclaimer
    
    # Existing structured components
    learning_section: Optional[Dict[str, Any]] = None  # {\"title\": \"...\", \"items\": [\"...\"]}
    follow_up_prompt: Optional[str] = None  # Soft follow-up suggestion
    
    # UI elements
    message_text_ar: Optional[str] = None
    language: Literal["ar", "en", "mixed"] = "en"
    cards: List[Card] = Field(default_factory=list)  # Legacy card system
    chart: Optional[ChartPayload] = None
    actions: List[Action] = Field(default_factory=list)
    disclaimer: Optional[str] = None  # Legacy text disclaimer
    meta: ResponseMeta



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
    
    # Phase 1: Enhanced Session State (NEW)
    turn_count: int = 0  # Message count in this session
    greeting_shown: bool = False  # Track if greeting was shown
    last_greeting_category: Optional[str] = None  # Prevent repetition
    last_opening_used: Optional[str] = None  # Prevent repetition
    last_cards_shown: Optional[List[str]] = None  # Card types shown
    user_name: Optional[str] = None  # Cached for personalization
    detected_language: str = "en"  # ar/en

