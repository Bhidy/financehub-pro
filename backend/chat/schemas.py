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
    STOCK_PRICE = "STOCK_PRICE"
    STOCK_SNAPSHOT = "STOCK_SNAPSHOT"
    STOCK_CHART = "STOCK_CHART"
    STOCK_STAT = "STOCK_STAT"
    COMPANY_PROFILE = "COMPANY_PROFILE"
    FINANCIALS = "FINANCIALS"
    REVENUE_TREND = "REVENUE_TREND"
    DIVIDENDS = "DIVIDENDS"
    COMPARE_STOCKS = "COMPARE_STOCKS"
    TOP_GAINERS = "TOP_GAINERS"
    TOP_LOSERS = "TOP_LOSERS"
    SECTOR_STOCKS = "SECTOR_STOCKS"
    DIVIDEND_LEADERS = "DIVIDEND_LEADERS"
    SCREENER_PE = "SCREENER_PE"
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
    DIVIDENDS_TABLE = "dividends_table"
    COMPARE_TABLE = "compare_table"
    MOVERS_TABLE = "movers_table"
    SECTOR_LIST = "sector_list"
    SCREENER_RESULTS = "screener_results"
    HELP = "help"
    ERROR = "error"
    SUGGESTIONS = "suggestions"


class ChartType(str, Enum):
    """Types of charts."""
    CANDLESTICK = "candlestick"
    LINE = "line"
    BAR = "bar"


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


class ChatResponse(BaseModel):
    """Full chat response."""
    message_text: str
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
    market_code: str
    confidence: float
    match_type: Literal["exact", "alias", "name", "fuzzy"]


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
