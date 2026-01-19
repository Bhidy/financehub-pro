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
    """Full chat response."""
    message_text: str  # The "Robotic" fallback or title
    conversational_text: Optional[str] = None # The "Human" voice (Starta)
    fact_explanations: Optional[Dict[str, str]] = None # Contextual definitions
    message_text_ar: Optional[str] = None
    language: Literal["ar", "en", "mixed"] = "en"
    cards: List[Card] = Field(default_factory=list)
    chart: Optional[ChartPayload] = None
    actions: List[Action] = Field(default_factory=list)
    disclaimer: Optional[str] = None
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
    """Stored conversation context."""
    session_id: str
    last_symbol: Optional[str] = None
    last_market: Optional[str] = None
    last_intent: Optional[str] = None
    last_range: Optional[str] = None
    compare_symbols: Optional[List[str]] = None
    expires_at: datetime
