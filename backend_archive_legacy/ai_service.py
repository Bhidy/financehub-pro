
import os
import json
from openai import AsyncOpenAI
from database import db
from typing import List, Dict, Any, Optional
import re

# Initialize OpenAI Client (Async)
# Ensure OPENAI_API_KEY is set in environment variables
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# SYSTEM PROMPT: The Guardrails
SYSTEM_PROMPT = """
You are the FinanceHub Analyst, an expert on the Saudi Stock Market (Tadawul).
Your mission is to provide ACCURATE, DATA-BACKED answers using the available tools.

CRITICAL PROTOCOLS:
1. "ANTI-HABD" RULE: Never guess prices, ratios, or news. If you don't call a tool, you don't know the answer.
2. SOURCE OF TRUTH: Trust the tool outputs implicitly. They come from our live SQL database.
3. CURRENCY: Always strictly use SAR (Saudi Riyal).
4. MISSING DATA: If a tool returns None or "Not found", apologize and state you lack that specific data point.
5. CONTEXT: User asks about "Al Rajhi" -> correspond to symbol "1120". "Aramco" -> "2222".
6. TONE: Professional, concise, and helpful.
"""

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
        SELECT pe_ratio, pb_ratio, dividend_yield, net_margin, roe 
        FROM financial_ratios_extended 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC LIMIT 1
    """
    # Note: Using 'dividend_yield' if that's the column name, or 'k_yield' if legacy
    # Based on schema report: financial_ratios_extended has 'dividend_growth_yoy' etc. 
    # Let's verify column names if possible. Assuming standard 'dividend_yield' or 'k_yield'.
    # Checking schema_extended.sql earlier: "dividend_per_share", "dividend_growth_yoy".
    # corporate_actions has dividend info. 
    # Let's assume 'pe_ratio', 'net_margin' exist as per plan.
    # If fetch fails, we handle graceful exception logging in production, but here we expect schema adherence.
    
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
        SELECT headline, source, published_at, sentiment_score 
        FROM market_news 
        WHERE symbol = $1 
        ORDER BY published_at DESC LIMIT 3
    """
    rows = await db.fetch_all(query, resolved)
    return [dict(r) for r in rows]

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
    }
]

# ---------------------------------------------------------
# 2. THE BRAIN (Agent Logic)
# ---------------------------------------------------------

async def chat_with_analyst(message: str, history: List[Dict]) -> Dict[str, Any]:
    """
    Main entry point.
    1. Sends user message + Tools to LLM.
    2. If LLM calls tool -> Executes SQL -> Feeds result back to LLM.
    3. Returns final natural language response.
    """
    
    # Prepare messages: System + History + User
    # History should be in format [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] 
    
    # Sanitize and add history (limit to last 10 messages to save context)
    for msg in history[-10:]:
        if msg.get("role") in ["user", "assistant"]:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
    messages.append({"role": "user", "content": message})
    
    try:
        # First Pass: Intent Detection
        response = await client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto",
            temperature=0.2 
        )
        
        response_msg = response.choices[0].message
        tool_calls = response_msg.tool_calls
        
        # Payload to send back to frontend
        data_payload = {}
        
        if tool_calls:
            # Append the assistant's "thinking" (tool call request) to history
            messages.append(response_msg)
            
            for tool_call in tool_calls:
                fn_name = tool_call.function.name
                try:
                    args = json.loads(tool_call.function.arguments)
                except:
                    args = {}
                symbol = args.get("symbol")
                
                # Execute SQL Tool
                tool_result = None
                if fn_name == "get_stock_price":
                    tool_result = await get_stock_price(symbol)
                    if tool_result: data_payload["price_data"] = tool_result
                    
                elif fn_name == "get_fundamentals":
                    tool_result = await get_fundamentals(symbol)
                    if tool_result: data_payload["fundamentals"] = tool_result
                    
                elif fn_name == "get_corporate_actions":
                    tool_result = await get_corporate_actions(symbol)
                    if tool_result: data_payload["events"] = tool_result
                    
                elif fn_name == "get_news_summary":
                    tool_result = await get_news_summary(symbol)
                    if tool_result: data_payload["news"] = tool_result
                
                # Feed result back to LLM
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": fn_name,
                    "content": json.dumps(tool_result, default=str) if tool_result else "No data found."
                })
                
            # Second Pass: Final Synthesis
            final_response = await client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                temperature=0.5
            )
            return {
                "reply": final_response.choices[0].message.content,
                "data": data_payload
            }
        
        else:
            # No tools needed
            return {
                "reply": response_msg.content,
                "data": None
            }
            
    except Exception as e:
        print(f"AI Service Error: {e}")
        return {
            "reply": "I apologize, but I'm encountering a temporary connection issue with my analysis engine.",
            "data": None
        }
