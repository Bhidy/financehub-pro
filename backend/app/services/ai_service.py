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

from app.services.technical_analysis import TechnicalAnalysis

# SYSTEM PROMPT: Enhanced with STRICT Tool Usage Rules
SYSTEM_PROMPT = """
You are the FinanceHub Analyst AI, a STRICT data-only assistant for Tadawul (Saudi Stock Exchange).

🚨 ABSOLUTE RULES - NEVER VIOLATE:
1. NEVER answer ANY financial question without calling a tool FIRST
2. NEVER say "I don't have access" or "I cannot find" - YOU HAVE TOOLS, USE THEM
3. NEVER guess, estimate, or approximate any numbers
4. If a tool returns None or empty → respond: "Data not currently available for [symbol]"

📊 MANDATORY TOOL MAPPING:
- Asked about PRICE/COST/TRADING/QUOTE → MUST call get_stock_price
- Asked about PE/PB/VALUATION/FUNDAMENTALS → MUST call get_fundamentals  
- Asked about RSI/OVERBOUGHT/OVERSOLD/TECHNICAL/MOMENTUM → MUST call get_technical_analysis
- Asked about COMPARE/VS/PEERS/SECTOR → MUST call get_peer_comparison
- Asked about DIVIDEND/SPLITS/ACTIONS → MUST call get_corporate_actions
- Asked about NEWS/HEADLINES → MUST call get_news_summary

💰 RESPONSE FORMAT:
1. Lead with the KEY DATA POINT (e.g., "Al Rajhi is trading at SAR 97.10")
2. Add brief CONTEXT (e.g., "up 2.2% today with volume of 2M shares")
3. If giving opinion, add: "Note: This is analysis, not investment advice."

🌍 STANDARDS:
- ALL prices in SAR (Saudi Riyal)
- Symbol format: 4-digit (e.g., 1120, 2222)
- Company names: Use English transliteration

REMEMBER: Your ONLY source of truth is the database. Call tools FIRST, respond SECOND.
"""

# Intent Detection Keywords for Forced Tool Calling
# These are SINGLE-INTENT questions where we can confidently force one tool
INTENT_PATTERNS = {
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
    ]
}

# Complex questions that need MULTIPLE tools - let AI decide which
COMPLEX_PATTERNS = [
    "should i buy", "should i sell", "good investment", "buy or sell",
    "is it a good time", "recommend", "analysis", "what do you think",
    "tell me about", "give me details", "full analysis"
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
    """Fetch live price, change, and volume for a symbol."""
    resolved = await resolve_symbol(symbol)
    if not resolved: return None
    
    query = """
        SELECT symbol, name_en, last_price, change_percent, volume, last_updated 
        FROM market_tickers 
        WHERE symbol = $1
    """
    row = await db.fetch_one(query, resolved)
    if not row: return None
    return dict(row)

async def get_fundamentals(symbol: str):
    """Fetch valuation ratios (PE, PB, Yield, Margins)"""
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
        return dict(row)
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
    
    ta = TechnicalAnalysis(history)
    return ta.get_summary()

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

# Tool Definitions for OpenAI
TOOLS_SCHEMA = [
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
    }
]

# ---------------------------------------------------------
# 2. THE BRAIN (Agent Logic) - Real OpenAI Integration
# ---------------------------------------------------------

async def chat_with_analyst(message: str, history: List[Dict], max_retries: int = 2) -> Dict[str, Any]:
    """
    Main entry point for AI Analyst.
    Uses Groq API with FORCED tool calling based on intent detection.
    """
    # Validate API Key
    # Validate API Key & Client
    if not client or not settings.GROQ_API_KEY:
        return {
            "reply": "⚠️ AI Analyst service is not configured. Please set GROQ_API_KEY.",
            "data": None,
            "error": "AI_SERVICE_UNAVAILABLE"
        }
    
    # Prepare messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] 
    for msg in history[-10:]:
        if msg.get("role") in ["user", "assistant"]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": message})
    
    # Intent Detection: Force appropriate tool call
    detected_tool = detect_intent(message)
    
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
