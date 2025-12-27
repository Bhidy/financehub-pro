import json
from openai import AsyncOpenAI
from app.db.session import db
from app.core.config import settings
from typing import List, Dict, Any, Optional
import re

# Initialize Groq Client (OpenAI-compatible API)
# Groq uses llama-3.3-70b-versatile or mixtral-8x7b-32768
# Initialize Groq Client (OpenAI-compatible API)
client = None
if settings.GROQ_API_KEY:
    client = AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )

# Model to use (OpenAI OSS model with better tool calling)
GROQ_MODEL = "openai/gpt-oss-120b"



# SYSTEM PROMPT: Enhanced with STRICT Tool Usage Rules
SYSTEM_PROMPT = """
You are the FinanceHub Analyst AI — a **Senior Financial Analyst** for Tadawul (Saudi Stock Exchange).
You have access to 21 data tools covering 3.12 million data points. Use them strategically.

═══════════════════════════════════════════════════════════════════
🚨 ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════════════════════════════════════
1. NEVER answer financial questions without calling tools FIRST
2. NEVER say "I don't have access" — YOU HAVE 21 TOOLS, USE THEM
3. NEVER guess, estimate, or approximate. ALL numbers from tools only.
4. If tool returns None → say "Data not currently available for [symbol]"

═══════════════════════════════════════════════════════════════════
🧠 MULTI-TOOL STRATEGY (For Complex Queries)
═══════════════════════════════════════════════════════════════════
For "Should I buy X?" or "Tell me about X" or "Full analysis of X":
Call MULTIPLE tools in a single response:
1. get_stock_price → Current price & momentum
2. get_fundamentals → Valuation check
3. get_technical_analysis → RSI/SMA signals
4. get_analyst_consensus → Professional ratings
5. get_insider_trades → Smart money signals

For "Compare X vs Y":
1. get_stock_price for both → Price comparison
2. get_fundamentals for both → Valuation comparison
3. get_peer_comparison → Sector context

═══════════════════════════════════════════════════════════════════
📊 TOOL CATEGORIES (Use the Right Tool)
═══════════════════════════════════════════════════════════════════
MARKET DATA:
• get_stock_price → Live price, change, volume
• get_price_history → Historical OHLC (1m/3m/6m/1y/3y)
• get_market_summary → Market overview, sectors
• get_top_movers → Biggest movers today

FUNDAMENTALS:
• get_fundamentals → P/E, P/B, margins, yield
• get_income_statement → Revenue, net income, EPS
• get_balance_sheet → Assets, liabilities, equity

RESEARCH:
• get_technical_analysis → RSI, SMA, buy/sell signals
• get_analyst_consensus → Ratings, price targets
• get_insider_trades → Net buying/selling signal
• get_major_holders → Top shareholders

EVENTS:
• get_corporate_actions → Past dividends/splits
• get_dividend_calendar → Upcoming dividends
• get_earnings_calendar → Upcoming earnings

FUNDS:
• get_fund_details → Fund info, NAV
• get_fund_performance → Returns, history

ECONOMIC:
• get_economic_indicator → Oil, FX, SAMA rates

═══════════════════════════════════════════════════════════════════
💡 PROACTIVE INSIGHTS (Add Value)
═══════════════════════════════════════════════════════════════════
After fetching data, ADD unprompted observations:
• If RSI > 70 → "⚠️ RSI indicates overbought conditions"
• If insider net_activity = "NET_BUYING" → "📈 Insiders are accumulating"
• If P/E < sector avg → "💰 Trading at discount to sector"
• If dividend_yield > 4% → "🎯 Attractive income opportunity"

═══════════════════════════════════════════════════════════════════
🔄 CONVERSATION CONTEXT
═══════════════════════════════════════════════════════════════════
Track symbols mentioned in conversation:
• "What about its dividends?" → Use last mentioned symbol
• "Compare it with Aramco" → Use last stock + 2222
• "Show the chart" → get_price_history for last symbol

═══════════════════════════════════════════════════════════════════
📝 RESPONSE FORMAT
═══════════════════════════════════════════════════════════════════
1. LEAD with KEY DATA: "Al Rajhi (1120) is trading at SAR 97.10 (+2.2%)"
2. ADD CONTEXT: "Volume is 2M shares, above 30-day average"
3. GIVE INSIGHT: "RSI at 65 suggests neutral momentum"
4. IF OPINION: Add "Note: This is analysis, not investment advice."

CURRENCY: Always SAR (Saudi Riyal)
SYMBOL FORMAT: 4-digit (1120, 2222, 2010)
LANGUAGE: English, professional tone

═══════════════════════════════════════════════════════════════════
🔒 PHASE 4: ZERO-HALLUCINATION + CITATIONS
═══════════════════════════════════════════════════════════════════
ABSOLUTE REQUIREMENTS:
1. EVERY number you state MUST come from tool output (never from training data)
2. Tool outputs include _citation metadata - USE IT when explaining data source
3. If you cannot verify a fact via tools → DON'T STATE IT
4. Clearly distinguish between DATA (from tools) and ANALYSIS (your interpretation)

CITATION FORMAT (when precision matters):
• "Last price: SAR 97.10 [Source: market_tickers, LIVE]"
• "P/E ratio: 18.5x [Source: market_tickers, CALCULATED]"
• "Insider activity: NET_BUYING [Source: insider_trading, REPORTED]"

DATA QUALITY INDICATORS (from _citation):
• LIVE → Real-time market data
• CALCULATED → Computed ratios/aggregates
• QUARTERLY → Financial statement data (may be 0-90 days old)
• REPORTED → Regulatory filings (may be delayed)
• ANALYST_OPINION → Third-party research (subjective)

FORBIDDEN BEHAVIORS:
❌ "I think the price is around..." (NO guessing)
❌ "Based on my knowledge..." (NO training data)
❌ "Typically, this stock..." (NO assumptions)
❌ "The company usually..." (NO generalizations)

═══════════════════════════════════════════════════════════════════
REMEMBER: You are a SENIOR ANALYST. Be thorough, precise, and insightful.
Your source of truth is the database. CALL TOOLS FIRST, SYNTHESIZE SECOND.
Every number cited. Every fact verified. Zero hallucinations.
═══════════════════════════════════════════════════════════════════
"""

# Intent Detection Keywords for Forced Tool Calling
# These are SINGLE-INTENT questions where we can confidently force one tool
INTENT_PATTERNS = {
    # === EXISTING TOOLS ===
    "get_stock_price": [
        "price", "trading at", "cost", "worth", "quote", "how much", 
        "current value", "share price", "stock price"
    ],
    "get_technical_analysis": [
        "overbought", "oversold", "rsi", "technical analysis", 
        "momentum indicator", "sma", "moving average", "buy signal", "sell signal"
    ],
    "get_fundamentals": [
        "pe ratio", "p/e", "pb ratio", "p/b", "valuation metrics", "fundamental analysis",
        "earnings ratio", "profit margin", "dividend yield", "roe"
    ],
    "get_peer_comparison": [
        "compare", "vs ", "versus", "peers", "competitors", "sector comparison",
        "similar stocks", "benchmark"
    ],
    "get_corporate_actions": [
        "dividend history", "stock split", "bonus shares", "rights issue", "corporate action"
    ],
    "get_news_summary": [
        "news", "headlines", "latest news", "announcement", "what happened"
    ],
    "get_market_summary": [
        "market today", "how is the market", "market summary", "market overview",
        "tadawul today", "index", "tasi", "sectors", "market performance"
    ],
    "get_top_movers": [
        "top movers", "biggest movers", "most active", "highest movement",
        "top gainers", "top losers", "volume leaders"
    ],
    # === NEW PHASE 1 TOOLS ===
    "get_price_history": [
        "chart", "historical price", "price history", "ohlc", "candlestick",
        "3 year", "1 year chart", "past prices", "performance"
    ],
    "get_income_statement": [
        "income statement", "revenue", "net income", "eps", "earnings per share",
        "ebitda", "gross profit", "operating income", "profitability"
    ],
    "get_balance_sheet": [
        "balance sheet", "assets", "liabilities", "equity", "debt", "cash position"
    ],
    "get_insider_trades": [
        "insider", "insider trading", "insider buying", "insider selling",
        "management buying", "executive trades"
    ],
    "get_analyst_consensus": [
        "analyst", "rating", "target price", "price target", "buy rating",
        "sell rating", "hold rating", "consensus", "recommendation"
    ],
    "get_major_holders": [
        "shareholders", "ownership", "major holders", "who owns", "institutional"
    ],
    "get_fund_details": [
        "mutual fund", "fund manager", "fund type", "nav fund"
    ],
    "get_fund_performance": [
        "fund performance", "fund returns", "fund nav history"
    ],
    "get_economic_indicator": [
        "oil price", "brent", "wti", "exchange rate", "sar usd", "interest rate",
        "sama rate", "treasury", "macro", "economic"
    ],
    "get_earnings_calendar": [
        "earnings calendar", "upcoming earnings", "earnings date", "when earnings"
    ],
    "get_dividend_calendar": [
        "dividend calendar", "upcoming dividend", "ex-date", "when dividend"
    ]
}

# ---------------------------------------------------------
# PHASE 2: ConversationContext - Track symbols across turns
# ---------------------------------------------------------
class ConversationContext:
    """Track entities, preferences, and history across conversation turns."""
    
    def __init__(self):
        self.mentioned_symbols: List[str] = []
        self.last_topics: List[str] = []
        self.comparison_mode: bool = False
    
    def extract_symbols_from_history(self, history: List[Dict]) -> None:
        """Extract symbols mentioned in conversation history."""
        symbol_pattern = re.compile(r'\b(\d{4})\b')  # 4-digit symbols
        company_names = {
            "rajhi": "1120", "al rajhi": "1120", "alrajhi": "1120",
            "aramco": "2222", "saudi aramco": "2222",
            "sabic": "2010", "saudi basic": "2010",
            "stc": "7010", "saudi telecom": "7010",
            "ncb": "1180", "alahli": "1180", "al ahli": "1180",
            "maaden": "1211", "saudi arabian mining": "1211",
            "mobily": "7020", "etihad etisalat": "7020",
            "almarai": "2280",
            "jarir": "4190",
        }
        
        for msg in history:
            content = msg.get("content", "").lower()
            # Extract 4-digit symbols
            matches = symbol_pattern.findall(content)
            for match in matches:
                if match not in self.mentioned_symbols:
                    self.mentioned_symbols.append(match)
            # Match company names
            for name, symbol in company_names.items():
                if name in content and symbol not in self.mentioned_symbols:
                    self.mentioned_symbols.append(symbol)
    
    def resolve_pronoun(self, message: str) -> str:
        """
        Replace pronouns with the last mentioned symbol.
        'What about its dividends?' → 'What about 1120 dividends?'
        """
        pronouns = ["it", "its", "the stock", "this stock", "that stock", "the company"]
        if self.mentioned_symbols:
            last_symbol = self.mentioned_symbols[-1]
            msg_lower = message.lower()
            for pronoun in pronouns:
                if pronoun in msg_lower:
                    # Keep original case but inform the context
                    return f"{message} [Context: Symbol {last_symbol}]"
        return message
    
    def get_last_symbol(self) -> Optional[str]:
        """Get the most recently mentioned symbol."""
        return self.mentioned_symbols[-1] if self.mentioned_symbols else None

# Instance for conversation context (per-session in production)
conversation_context = ConversationContext()

# Complex questions that need MULTIPLE tools - let AI decide which
# EXPANDED for Phase 2: More patterns that trigger multi-tool responses
COMPLEX_PATTERNS = [
    # Investment decisions
    "should i buy", "should i sell", "good investment", "buy or sell",
    "is it a good time", "recommend", "what do you think",
    # Full analysis requests
    "tell me about", "give me details", "full analysis", "comprehensive analysis",
    "deep dive", "everything about", "all information", "complete overview",
    # Comparison requests
    "compare", "versus", "vs ", "better than", "which is better", "difference between",
    # Opinion/advice requests
    "what's your opinion", "your thoughts", "advise", "advice", "suggest",
    # Multi-aspect queries
    "analysis and recommendation", "price and fundamentals", "technicals and news",
]

def detect_intent(message: str) -> Optional[str]:
    """
    Detect user intent and return the appropriate tool to force.
    Returns None for complex questions that need multiple tools.
    """
    msg_lower = message.lower()
    
    # First, check if this is a COMPLEX question (needs multiple tools)
    for pattern in COMPLEX_PATTERNS:
        if pattern in msg_lower:
            print(f"[AI] Complex question detected - letting AI decide tools")
            return None  # Let AI orchestrate multiple tools
    
    # For SIMPLE questions, force the appropriate single tool
    for tool_name, keywords in INTENT_PATTERNS.items():
        for keyword in keywords:
            if keyword in msg_lower:
                return tool_name
    
    return None  # No specific intent detected, let AI decide


# ... (Previous imports and helper functions remain same)

# ---------------------------------------------------------
# 0. HELPER: Symbol Resolution
# ---------------------------------------------------------
async def resolve_symbol(query: str) -> Optional[str]:
    """
    Attempt to resolve a company name or partial symbol to a 4-digit ticker.
    This is a simple SQL LIKE search.
    """
    # If it looks like a 4-digit number, return it
    if re.fullmatch(r"\d{4}", query.strip()):
        return query.strip()
        
    # Search by name (English or Arabic)
    sql = """
        SELECT symbol FROM market_tickers 
        WHERE name_en ILIKE $1 OR name_ar ILIKE $1 
        LIMIT 1
    """
    # Try exact match first
    row = await db.fetch_one(sql, query)
    if row: return row['symbol']
    
    # Try partial match
    row = await db.fetch_one(sql, f"%{query}%")
    if row: return row['symbol']
    
    return None


# ---------------------------------------------------------
# 1. THE TOOLS (SQL Executors)
# ---------------------------------------------------------

async def get_stock_price(symbol: str):
    """Fetch live price, change, and volume for a symbol. Phase 3: Includes citation metadata."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    query = """
        SELECT symbol, name_en, last_price, change_percent, volume, last_updated 
        FROM market_tickers 
        WHERE symbol = $1
    """
    row = await db.fetch_one(query, resolved)
    if not row: return None
    
    result = dict(row)
    # PHASE 3: Add citation metadata for transparency
    result["_citation"] = {
        "source_table": "market_tickers",
        "fields": ["last_price", "change_percent", "volume"],
        "last_updated": str(result.get("last_updated", "")),
        "data_quality": "LIVE" if result.get("last_updated") else "STALE"
    }
    return result

async def get_fundamentals(symbol: str):
    """Fetch valuation ratios (PE, PB, Yield, Margins). Phase 3: Includes citation metadata."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None

    query = """
        SELECT pe_ratio_ttm as pe_ratio, pb_ratio, dividend_yield, net_profit_margin as net_margin
        FROM market_tickers 
        WHERE symbol = $1
    """
    try:
        row = await db.fetch_one(query, resolved)
        if not row: return None
        result = dict(row)
        # PHASE 3: Add citation metadata
        result["_citation"] = {
            "source_table": "market_tickers",
            "fields": ["pe_ratio_ttm", "pb_ratio", "dividend_yield", "net_profit_margin"],
            "data_quality": "CALCULATED"
        }
        return result
    except Exception as e:
        print(f"Error fetching fundamentals: {e}")
        return None

async def get_corporate_actions(symbol: str):
    """Fetch upcoming or recent dividends/splits"""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None

    query = """
        SELECT action_type, ex_date, dividend_amount, split_ratio, description 
        FROM corporate_actions 
        WHERE symbol = $1 
        ORDER BY ex_date DESC LIMIT 3
    """
    rows = await db.fetch_all(query, resolved)
    return [dict(r) for r in rows]

async def get_news_summary(symbol: str):
    """Fetch last 3 news headlines for context"""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None

    query = """
        SELECT headline, source, published_at 
        FROM market_news 
        WHERE symbol = $1 
        ORDER BY published_at DESC LIMIT 3
    """
    rows = await db.fetch_all(query, resolved)
    return [dict(r) for r in rows]

async def get_technical_analysis(symbol: str):
    """Fetch history and calculate RSI, Trend, and Signals."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    # Fetch last 365 days of history for valid calculations
    query = """
        SELECT time, close 
        FROM ohlc_history 
        WHERE symbol = $1 
        ORDER BY time ASC
        LIMIT 365
    """
    rows = await db.fetch_all(query, resolved)
    if not rows: return None
    
    # Convert asyncpg records to dicts
    history = [dict(r) for r in rows]
    
    # Lazy import to prevent startup crash if pandas is missing
    try:
        from app.services.technical_analysis import TechnicalAnalysis
        ta = TechnicalAnalysis(history)
        return ta.get_summary()
    except ImportError as e:
        print(f"Error importing TechnicalAnalysis: {e}")
        return None

async def get_peer_comparison(symbol: str):
    """Get peers in the same sector and their basic stats."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    # First get sector
    sector_query = "SELECT sector_name FROM market_tickers WHERE symbol = $1"
    sector_row = await db.fetch_one(sector_query, resolved)
    if not sector_row: return None
    sector = sector_row['sector_name']
    
    # Get top 5 peers by volume (using only available columns)
    peers_query = """
        SELECT symbol, name_en, last_price, change_percent, volume
        FROM market_tickers 
        WHERE sector_name = $1 AND symbol != $2
        ORDER BY volume DESC LIMIT 5
    """
    rows = await db.fetch_all(peers_query, sector, resolved)
    return {
        "sector": sector,
        "peers": [dict(r) for r in rows]
    }

async def get_market_summary():
    """Get overall market summary - sectors, top gainers/losers, volume leaders."""
    try:
        # Get sector breakdown
        sector_query = """
            SELECT sector_name, 
                   COUNT(*) as stock_count,
                   AVG(change_percent) as avg_change
            FROM market_tickers 
            WHERE sector_name IS NOT NULL
            GROUP BY sector_name
            ORDER BY avg_change DESC
        """
        sectors = await db.fetch_all(sector_query)
        
        # Get top 5 gainers
        gainers_query = """
            SELECT symbol, name_en, last_price, change_percent
            FROM market_tickers 
            ORDER BY change_percent DESC LIMIT 5
        """
        gainers = await db.fetch_all(gainers_query)
        
        # Get top 5 losers
        losers_query = """
            SELECT symbol, name_en, last_price, change_percent
            FROM market_tickers 
            ORDER BY change_percent ASC LIMIT 5
        """
        losers = await db.fetch_all(losers_query)
        
        # Get volume leaders
        volume_query = """
            SELECT symbol, name_en, last_price, volume
            FROM market_tickers 
            ORDER BY volume DESC LIMIT 5
        """
        volume_leaders = await db.fetch_all(volume_query)
        
        return {
            "sectors": [dict(s) for s in sectors],
            "top_gainers": [dict(g) for g in gainers],
            "top_losers": [dict(l) for l in losers],
            "volume_leaders": [dict(v) for v in volume_leaders]
        }
    except Exception as e:
        print(f"Error in get_market_summary: {e}")
        return None

async def get_top_movers():
    """Get stocks with highest absolute price movement today."""
    try:
        query = """
            SELECT symbol, name_en, last_price, change_percent, volume
            FROM market_tickers 
            ORDER BY ABS(change_percent) DESC LIMIT 10
        """
        rows = await db.fetch_all(query)
        return {"movers": [dict(r) for r in rows]}
    except Exception as e:
        print(f"Error in get_top_movers: {e}")
        return None

# ---------------------------------------------------------
# NEW TOOLS: Phase 1 Data Access Expansion
# ---------------------------------------------------------

async def get_price_history(symbol: str, period: str = "1y"):
    """Fetch OHLC price history for charting and analysis."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    # Map period to days
    period_map = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095, "max": 9999}
    days = period_map.get(period.lower(), 365)
    
    query = """
        SELECT time as date, open, high, low, close, volume 
        FROM ohlc_history 
        WHERE symbol = $1 
        ORDER BY time DESC
        LIMIT $2
    """
    try:
        rows = await db.fetch_all(query, resolved, days)
        if not rows: return None
        return {
            "symbol": resolved,
            "period": period,
            "data_points": len(rows),
            "history": [dict(r) for r in rows[:50]]  # Limit response size
        }
    except Exception as e:
        print(f"Error in get_price_history: {e}")
        return None

async def get_income_statement(symbol: str):
    """Fetch income statement data (revenue, net income, EPS)."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    query = """
        SELECT fiscal_year, fiscal_period, revenue, net_income, eps, 
               gross_profit, operating_income, ebitda
        FROM financial_statements 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC, fiscal_period DESC
        LIMIT 8
    """
    try:
        rows = await db.fetch_all(query, resolved)
        if not rows: return None
        return {
            "symbol": resolved, 
            "statements": [dict(r) for r in rows],
            "_citation": {
                "source_table": "financial_statements",
                "fields": ["revenue", "net_income", "eps", "ebitda"],
                "data_quality": "QUARTERLY"
            }
        }
    except Exception as e:
        print(f"Error in get_income_statement: {e}")
        return None

async def get_balance_sheet(symbol: str):
    """Fetch balance sheet data (assets, liabilities, equity)."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    query = """
        SELECT fiscal_year, fiscal_period, total_assets, total_liabilities, 
               total_equity, cash_and_equivalents, total_debt
        FROM financial_statements 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC
        LIMIT 4
    """
    try:
        rows = await db.fetch_all(query, resolved)
        if not rows: return None
        return {
            "symbol": resolved, 
            "balance_sheets": [dict(r) for r in rows],
            "_citation": {
                "source_table": "financial_statements",
                "fields": ["total_assets", "total_liabilities", "total_equity"],
                "data_quality": "QUARTERLY"
            }
        }
    except Exception as e:
        print(f"Error in get_balance_sheet: {e}")
        return None

async def get_insider_trades(symbol: str):
    """Fetch recent insider trading activity."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    query = """
        SELECT insider_name, insider_title, transaction_type, shares, 
               price, total_value, transaction_date
        FROM insider_trading 
        WHERE symbol = $1 
        ORDER BY transaction_date DESC
        LIMIT 10
    """
    try:
        rows = await db.fetch_all(query, resolved)
        if not rows: return {"symbol": resolved, "trades": [], "message": "No insider trades found"}
        
        # Calculate net buying/selling
        buys = sum(r.get('shares', 0) for r in rows if r.get('transaction_type') == 'BUY')
        sells = sum(r.get('shares', 0) for r in rows if r.get('transaction_type') == 'SELL')
        
        return {
            "symbol": resolved,
            "trades": [dict(r) for r in rows],
            "net_activity": "NET_BUYING" if buys > sells else "NET_SELLING",
            "buy_shares": buys,
            "sell_shares": sells,
            "_citation": {
                "source_table": "insider_trading",
                "fields": ["transaction_type", "shares", "price"],
                "data_quality": "REPORTED"
            }
        }
    except Exception as e:
        print(f"Error in get_insider_trades: {e}")
        return None

async def get_analyst_consensus(symbol: str):
    """Fetch analyst ratings and price targets."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    query = """
        SELECT analyst_firm, rating, target_price, rating_date
        FROM analyst_ratings 
        WHERE symbol = $1 
        ORDER BY rating_date DESC
        LIMIT 10
    """
    try:
        rows = await db.fetch_all(query, resolved)
        if not rows: return {"symbol": resolved, "ratings": [], "message": "No analyst ratings found"}
        
        # Calculate consensus
        ratings_list = [dict(r) for r in rows]
        rating_counts = {}
        target_prices = []
        for r in ratings_list:
            rating = r.get('rating', 'HOLD')
            rating_counts[rating] = rating_counts.get(rating, 0) + 1
            if r.get('target_price'):
                target_prices.append(float(r['target_price']))
        
        consensus = max(rating_counts, key=rating_counts.get) if rating_counts else "HOLD"
        avg_target = sum(target_prices) / len(target_prices) if target_prices else None
        
        return {
            "symbol": resolved,
            "ratings": ratings_list,
            "consensus_rating": consensus,
            "avg_target_price": round(avg_target, 2) if avg_target else None,
            "rating_distribution": rating_counts,
            "_citation": {
                "source_table": "analyst_ratings",
                "fields": ["rating", "target_price"],
                "data_quality": "ANALYST_OPINION"
            }
        }
    except Exception as e:
        print(f"Error in get_analyst_consensus: {e}")
        return None

async def get_major_holders(symbol: str):
    """Fetch major shareholders for a stock."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    query = """
        SELECT holder_name, holder_type, shares_held, ownership_percent, 
               change_percent, report_date
        FROM major_shareholders 
        WHERE symbol = $1 
        ORDER BY ownership_percent DESC
        LIMIT 10
    """
    try:
        rows = await db.fetch_all(query, resolved)
        if not rows: return {"symbol": resolved, "holders": [], "message": "No shareholder data found"}
        return {"symbol": resolved, "holders": [dict(r) for r in rows]}
    except Exception as e:
        print(f"Error in get_major_holders: {e}")
        return None

async def get_fund_details(fund_name: str):
    """Fetch mutual fund details and performance."""
    query = """
        SELECT id, fund_name, fund_manager, fund_type, currency, 
               inception_date, min_subscription
        FROM mutual_funds 
        WHERE fund_name ILIKE $1
        LIMIT 1
    """
    try:
        row = await db.fetch_one(query, f"%{fund_name}%")
        if not row: return None
        
        fund_id = row['id']
        
        # Get latest NAV and performance
        nav_query = """
            SELECT nav, date 
            FROM nav_history 
            WHERE fund_id = $1 
            ORDER BY date DESC 
            LIMIT 1
        """
        nav_row = await db.fetch_one(nav_query, fund_id)
        
        result = dict(row)
        if nav_row:
            result["latest_nav"] = float(nav_row['nav'])
            result["nav_date"] = str(nav_row['date'])
        
        return result
    except Exception as e:
        print(f"Error in get_fund_details: {e}")
        return None

async def get_fund_performance(fund_name: str, period: str = "1y"):
    """Fetch NAV history for a mutual fund."""
    # First find the fund
    fund_query = "SELECT id, fund_name FROM mutual_funds WHERE fund_name ILIKE $1 LIMIT 1"
    try:
        fund_row = await db.fetch_one(fund_query, f"%{fund_name}%")
        if not fund_row: return None
        
        fund_id = fund_row['id']
        period_map = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095}
        days = period_map.get(period.lower(), 365)
        
        nav_query = """
            SELECT date, nav 
            FROM nav_history 
            WHERE fund_id = $1 
            ORDER BY date DESC
            LIMIT $2
        """
        rows = await db.fetch_all(nav_query, fund_id, days)
        if not rows: return None
        
        # Calculate returns
        navs = [float(r['nav']) for r in rows]
        if len(navs) >= 2:
            period_return = ((navs[0] - navs[-1]) / navs[-1]) * 100
        else:
            period_return = 0
        
        return {
            "fund_name": fund_row['fund_name'],
            "period": period,
            "data_points": len(rows),
            "latest_nav": navs[0] if navs else None,
            "period_return_pct": round(period_return, 2),
            "history": [dict(r) for r in rows[:30]]  # Limit response
        }
    except Exception as e:
        print(f"Error in get_fund_performance: {e}")
        return None

async def get_economic_indicator(indicator: str):
    """Fetch economic indicator data (oil, FX, rates)."""
    # Map common names to indicator codes
    indicator_map = {
        "oil": "OIL_BRENT",
        "brent": "OIL_BRENT", 
        "wti": "OIL_WTI",
        "sar": "SARUSD",
        "usd": "SARUSD",
        "fx": "SARUSD",
        "rate": "SAMA_RATE",
        "interest": "SAMA_RATE",
        "treasury": "US_10Y",
        "tasi": "TASI_INDEX",
        "index": "TASI_INDEX"
    }
    
    # Try to match indicator
    indicator_code = indicator_map.get(indicator.lower(), indicator.upper())
    
    query = """
        SELECT indicator_name, value, date, unit, source
        FROM economic_indicators 
        WHERE indicator_name ILIKE $1 
        ORDER BY date DESC
        LIMIT 30
    """
    try:
        rows = await db.fetch_all(query, f"%{indicator_code}%")
        if not rows: return {"indicator": indicator, "data": [], "message": "Indicator not found"}
        
        latest = rows[0]
        return {
            "indicator": latest['indicator_name'],
            "latest_value": float(latest['value']),
            "latest_date": str(latest['date']),
            "unit": latest.get('unit', ''),
            "history": [{"date": str(r['date']), "value": float(r['value'])} for r in rows]
        }
    except Exception as e:
        print(f"Error in get_economic_indicator: {e}")
        return None

async def get_earnings_calendar(days_ahead: int = 30):
    """Fetch upcoming earnings announcements."""
    query = """
        SELECT symbol, company_name, earnings_date, fiscal_quarter, 
               eps_estimate, revenue_estimate
        FROM earnings_calendar 
        WHERE earnings_date >= CURRENT_DATE 
          AND earnings_date <= CURRENT_DATE + $1
        ORDER BY earnings_date ASC
        LIMIT 20
    """
    try:
        rows = await db.fetch_all(query, days_ahead)
        return {"upcoming_earnings": [dict(r) for r in rows], "days_ahead": days_ahead}
    except Exception as e:
        print(f"Error in get_earnings_calendar: {e}")
        return None

async def get_dividend_calendar(days_ahead: int = 60):
    """Fetch upcoming dividend payments."""
    query = """
        SELECT symbol, action_type, ex_date, dividend_amount, 
               payment_date, description
        FROM corporate_actions 
        WHERE action_type ILIKE '%dividend%'
          AND ex_date >= CURRENT_DATE 
          AND ex_date <= CURRENT_DATE + $1
        ORDER BY ex_date ASC
        LIMIT 20
    """
    try:
        rows = await db.fetch_all(query, days_ahead)
        return {"upcoming_dividends": [dict(r) for r in rows], "days_ahead": days_ahead}
    except Exception as e:
        print(f"Error in get_dividend_calendar: {e}")
        return None

# Tool Definitions for OpenAI
TOOLS_SCHEMA = [
    # === EXISTING MARKET TOOLS ===
    {
        "type": "function",
        "function": {
            "name": "get_stock_price",
            "description": "Get live price, volume, and daily change for a Saudi stock symbol or company name (e.g., '1120', 'Al Rajhi').",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_fundamentals",
            "description": "Get fundamental valuation ratios like P/E, P/B, Net Margin.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_technical_analysis",
            "description": "Get technical indicators (RSI, SMA, Trend) and buy/sell signals.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_peer_comparison",
            "description": "Compare the stock with top peers in the same sector.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_corporate_actions",
            "description": "Get dividends, splits, or capital changes.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_news_summary",
            "description": "Get recent news headlines and sentiment.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_summary",
            "description": "Get overall Tadawul market summary including sector performance, top gainers, top losers, and volume leaders. Use this for 'how is the market today' questions.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_movers",
            "description": "Get the top 10 stocks with highest price movement (up or down) today.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    # === NEW PHASE 1 TOOLS ===
    {
        "type": "function",
        "function": {
            "name": "get_price_history",
            "description": "Get historical OHLC price data for charting. Supports periods: 1m, 3m, 6m, 1y, 3y, max.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker or Company Name"},
                    "period": {"type": "string", "description": "Time period (1m, 3m, 6m, 1y, 3y, max)", "default": "1y"}
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_income_statement",
            "description": "Get income statement data: revenue, net income, EPS, EBITDA, and profit margins for last 8 quarters.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_balance_sheet",
            "description": "Get balance sheet data: assets, liabilities, equity, cash, and debt.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_insider_trades",
            "description": "Get recent insider trading activity with net buying/selling signal.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_analyst_consensus",
            "description": "Get analyst ratings, consensus rating, and average price target.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_major_holders",
            "description": "Get major shareholders and ownership percentages.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker or Company Name"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_fund_details",
            "description": "Get mutual fund details: manager, type, NAV, inception date.",
            "parameters": {
                "type": "object",
                "properties": {"fund_name": {"type": "string", "description": "Fund name or partial name"}},
                "required": ["fund_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_fund_performance",
            "description": "Get mutual fund NAV history and period returns.",
            "parameters": {
                "type": "object",
                "properties": {
                    "fund_name": {"type": "string", "description": "Fund name or partial name"},
                    "period": {"type": "string", "description": "Time period (1m, 3m, 6m, 1y, 3y)", "default": "1y"}
                },
                "required": ["fund_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_economic_indicator",
            "description": "Get economic indicator data: oil prices, FX rates (SAR/USD), interest rates (SAMA), TASI index.",
            "parameters": {
                "type": "object",
                "properties": {"indicator": {"type": "string", "description": "Indicator name: oil, brent, wti, sar, usd, rate, interest, treasury, tasi"}},
                "required": ["indicator"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_earnings_calendar",
            "description": "Get upcoming earnings announcements for the next N days.",
            "parameters": {
                "type": "object",
                "properties": {"days_ahead": {"type": "integer", "description": "Number of days to look ahead", "default": 30}},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_dividend_calendar",
            "description": "Get upcoming dividend ex-dates and payments for the next N days.",
            "parameters": {
                "type": "object",
                "properties": {"days_ahead": {"type": "integer", "description": "Number of days to look ahead", "default": 60}},
                "required": []
            }
        }
    }
]

# ---------------------------------------------------------
# 2. THE BRAIN (Agent Logic) - Real OpenAI Integration
# ---------------------------------------------------------

async def chat_with_analyst(message: str, history: List[Dict], max_retries: int = 2) -> Dict[str, Any]:
    """
    Main entry point for AI Analyst.
    Uses Groq API with FORCED tool calling based on intent detection.
    Phase 2: Now includes conversation context tracking and pronoun resolution.
    """
    # Validate API Key & Client
    if not client or not settings.GROQ_API_KEY:
        return {
            "reply": "⚠️ AI Analyst service is not configured. Please set GROQ_API_KEY.",
            "data": None,
            "error": "AI_SERVICE_UNAVAILABLE"
        }
    
    # PHASE 2: Extract symbols from conversation history for context
    conversation_context.extract_symbols_from_history(history)
    
    # PHASE 2: Resolve pronouns like "it", "its", "the stock" to last mentioned symbol
    enhanced_message = conversation_context.resolve_pronoun(message)
    
    # Also extract symbols from current message
    conversation_context.extract_symbols_from_history([{"content": message}])
    
    # Prepare messages with enhanced system prompt
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] 
    for msg in history[-10:]:
        if msg.get("role") in ["user", "assistant"]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": enhanced_message})
    
    # Intent Detection: Force appropriate tool call
    detected_tool = detect_intent(enhanced_message)
    
    if detected_tool:
        # Force this specific tool to be called
        tool_choice = {"type": "function", "function": {"name": detected_tool}}
        print(f"[AI] Intent detected: Forcing {detected_tool}")
    else:
        # Let AI decide (but enhanced prompt should guide it)
        tool_choice = "auto"
    
    # Retry logic for robustness
    last_error = None
    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=TOOLS_SCHEMA,
                tool_choice=tool_choice,
                temperature=0.2 
            )
        
            response_msg = response.choices[0].message
            tool_calls = response_msg.tool_calls
            
            data_payload = {}
            
            if tool_calls:
                messages.append(response_msg)
                for tool_call in tool_calls:
                    fn_name = tool_call.function.name
                    try:
                        args = json.loads(tool_call.function.arguments)
                    except:
                        args = {}
                    symbol = args.get("symbol")
                    
                    tool_result = None
                    # === EXISTING TOOLS ===
                    if fn_name == "get_stock_price":
                        tool_result = await get_stock_price(symbol)
                        if tool_result: data_payload["price_data"] = tool_result
                    elif fn_name == "get_fundamentals":
                        tool_result = await get_fundamentals(symbol)
                        if tool_result: data_payload["fundamentals"] = tool_result
                    elif fn_name == "get_technical_analysis":
                        tool_result = await get_technical_analysis(symbol)
                        if tool_result: data_payload["technical_analysis"] = tool_result
                    elif fn_name == "get_peer_comparison":
                        tool_result = await get_peer_comparison(symbol)
                        if tool_result: data_payload["peers"] = tool_result
                    elif fn_name == "get_corporate_actions":
                        tool_result = await get_corporate_actions(symbol)
                        if tool_result: data_payload["events"] = tool_result
                    elif fn_name == "get_news_summary":
                        tool_result = await get_news_summary(symbol)
                        if tool_result: data_payload["news"] = tool_result
                    elif fn_name == "get_market_summary":
                        tool_result = await get_market_summary()
                        if tool_result: data_payload["market_summary"] = tool_result
                    elif fn_name == "get_top_movers":
                        tool_result = await get_top_movers()
                        if tool_result: data_payload["top_movers"] = tool_result
                    # === NEW PHASE 1 TOOLS ===
                    elif fn_name == "get_price_history":
                        period = args.get("period", "1y")
                        tool_result = await get_price_history(symbol, period)
                        if tool_result: data_payload["price_history"] = tool_result
                    elif fn_name == "get_income_statement":
                        tool_result = await get_income_statement(symbol)
                        if tool_result: data_payload["income_statement"] = tool_result
                    elif fn_name == "get_balance_sheet":
                        tool_result = await get_balance_sheet(symbol)
                        if tool_result: data_payload["balance_sheet"] = tool_result
                    elif fn_name == "get_insider_trades":
                        tool_result = await get_insider_trades(symbol)
                        if tool_result: data_payload["insider_trades"] = tool_result
                    elif fn_name == "get_analyst_consensus":
                        tool_result = await get_analyst_consensus(symbol)
                        if tool_result: data_payload["analyst_consensus"] = tool_result
                    elif fn_name == "get_major_holders":
                        tool_result = await get_major_holders(symbol)
                        if tool_result: data_payload["major_holders"] = tool_result
                    elif fn_name == "get_fund_details":
                        fund_name = args.get("fund_name", "")
                        tool_result = await get_fund_details(fund_name)
                        if tool_result: data_payload["fund_details"] = tool_result
                    elif fn_name == "get_fund_performance":
                        fund_name = args.get("fund_name", "")
                        period = args.get("period", "1y")
                        tool_result = await get_fund_performance(fund_name, period)
                        if tool_result: data_payload["fund_performance"] = tool_result
                    elif fn_name == "get_economic_indicator":
                        indicator = args.get("indicator", "oil")
                        tool_result = await get_economic_indicator(indicator)
                        if tool_result: data_payload["economic_indicator"] = tool_result
                    elif fn_name == "get_earnings_calendar":
                        days_ahead = args.get("days_ahead", 30)
                        tool_result = await get_earnings_calendar(days_ahead)
                        if tool_result: data_payload["earnings_calendar"] = tool_result
                    elif fn_name == "get_dividend_calendar":
                        days_ahead = args.get("days_ahead", 60)
                        tool_result = await get_dividend_calendar(days_ahead)
                        if tool_result: data_payload["dividend_calendar"] = tool_result
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": fn_name,
                        "content": json.dumps(tool_result, default=str) if tool_result else "No data found."
                    })
                    
                final_response = await client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=messages,
                    temperature=0.5
                )
                return {
                    "reply": final_response.choices[0].message.content,
                    "data": data_payload,
                    "tools_used": [tc.function.name for tc in tool_calls]
                }
            else:
                # No tools called - this might be a general question
                return {
                    "reply": response_msg.content,
                    "data": {},
                    "tools_used": []
                }
                
        except Exception as e:
            last_error = e
            print(f"[AI] Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                # On retry, fall back to auto tool choice (less strict)
                tool_choice = "auto"
                continue  # Retry
            
    # All retries exhausted
    print(f"[AI] All retries failed. Last error: {last_error}")
    return {
        "reply": "I apologize, but I'm encountering a temporary issue. Please try again in a moment.",
        "data": None,
        "error": str(last_error) if last_error else "Unknown error"
    }
