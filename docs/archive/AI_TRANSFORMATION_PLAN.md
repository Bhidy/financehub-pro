# 🧠 FINANCEHUB PRO: AI INTELLIGENCE TRANSFORMATION
## Strategic Blueprint for the "Zero-Hallucination" Saudi Market Oracle

**Document Version:** 1.0  
**Date:** December 26, 2024  
**Architect:** Principal Software Architect & AI Lead  
**Classification:** Confidential Strategic Roadmap

---

# 1. 🚀 EXECUTIVE VISION: "THE SAUDI MARKET ORACLE"

We are not just building a chatbot. We are building the **Saudi Market Oracle**—the world's first **Deterministic Financial Intelligence Agent** for Tadawul.

Most financial AI bots fail because they "guess" (hallucinate). Our competitive advantage is the **"Anti-Habd" Protocol** (Zero-Hallucination). We will treat our robust PostgreSQL database not just as storage, but as the **Ground Truth Knowledge Graph**.

Our AI will act as a **Senior Financial Analyst** sitting next to the user. It won't just say "Al Rajhi is up." It will say: *"Al Rajhi (1120) is trading at 95.50 SAR (+0.79%), volume is 15% above the 30-day average, and it just announced a 2.50 SAR dividend. Based on its P/E of 18.5 vs the Banking Sector avg of 22.0, it appears undervalued relative to peers."*

**The Goal:** To replace static dashboards with **Conversational Intelligence**.

---

# 2. 🔍 DEEP SYSTEM ANALYSIS: AI ARCHITECTURE

## 2.1 The "SQL-Agent" Pattern vs. RAG
We will use an **Agentic SQL Pattern** rather than standard Vector RAG.
- **Why?** Financial data (prices, ratios) is rigorous and structured. Vector search is fuzzy. We cannot afford "fuzzy" prices.
- **How?** The LLM (GPT-4) will act as a **Router and Tool User**. It will *not* calculate P/E ratios itself; it will generate the SQL query (via tool calls) to fetch the exact number from `financial_ratios_extended`.

## 2.2 Capabilities Matrix

| Functionality | Implementation Method | Source of Truth (DB Table) | Reliability |
|---------------|-----------------------|----------------------------|-------------|
| **Real-time Price** | `get_stock_price(symbol)` | `market_tickers` | 100% Deterministic |
| **Valuation Check** | `get_fundamentals(symbol)` | `financial_ratios_extended` | 100% Deterministic |
| **News Summary** | `get_news_summary(symbol)` | `market_news` | Deterministic Retrieval + GenAI Summary |
| **Income Check** | `get_corporate_actions` | `corporate_actions` | 100% Deterministic |
| **Technical Check** | `get_technicals(symbol)` | `ohlc_data` + `technical_levels` | 100% Deterministic |

---

# 3. 📊 SWOT ANALYSIS: AI TRANSFORMATION

## STRENGTHS 💪
1.  **Rich Structured Data:** We already have 22 tables of clean, relational data. The AI has a "perfect memory."
2.  **Async Architecture:** FastAPI + `asyncpg` allows high-concurrency tool execution (Agent won't block).
3.  **Domain Focus:** Restricting scope to "Saudi Market Only" significantly reduces perplexity and error rates.

## WEAKNESSES 🔴
1.  **Latency:** LLM + SQL Roundtrip + LLM Response = Potential 2-5s delay. Requires optimistic UI updates.
2.  **Context Window:** We cannot feed *all* market news into the context. We must summarize intelligently.
3.  **Token Cost:** Detailed financial conversations can be verbose.

## OPPORTUNITIES 🚀
1.  **"Chat with your Portfolio":** "How would a 10% drop in Aramco affect my holdings?" (Scenario Analysis).
2.  **Automated Morning Briefing:** Personalized audio/text summary generated at 9:50 AM.
3.  **Arabic NLP Leadership:** Fine-tuning on Saudi Financial Dialect (`Tadawul-GPT`).

## THREATS ⚡
1.  **Hallucination Risk:** Even with tools, LLMs can misinterpret "Net Income" vs "Gross Profit" if schema is unclear.
2.  **Prompt Injection:** Users trying to trick the bot into revealing system instructions.
3.  **Data Scalability:** As news grows to millions of rows, `get_news_summary` performance will degrade without vector search adjunct.

---

# 4. 🛠️ TECHNICAL IMPLEMENTATION PLAN

## Step 1: The Backend Logic (`backend/ai_service.py`)

This module implements the **Function Calling** loop. It defines "Tools" that the LLM can invoke.

**Zero-Hallucination Enforcement:**
1.  **System Prompt:** "You are a data retrieval interface. You DO NOT answer from training data. You answer ONLY from Tool Outputs."
2.  **Fallback:** If `tool_output` is Empty/None -> "I do not have that data."

### Code Preview: `backend/ai_service.py`

```python
import os
import json
from openai import AsyncOpenAI
from database import db  # Reuse existing pool
from typing import List, Dict, Any

# Initialize OpenAI Client (Async)
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
"""

# ---------------------------------------------------------
# 1. THE TOOLS (SQL Executors)
# ---------------------------------------------------------

async def get_stock_price(symbol: str):
    """Fetch live price, change, and volume for a symbol."""
    query = """
        SELECT symbol, name_en, last_price, change_percent, volume, last_updated 
        FROM market_tickers 
        WHERE symbol = $1
    """
    row = await db.fetch_one(query, symbol)
    if not row: return None
    return dict(row)

async def get_fundamentals(symbol: str):
    """Fetch valuation ratios (PE, PB, Yield, Margins)"""
    query = """
        SELECT pe_ratio, pb_ratio, k_yield as dividend_yield, net_margin, roe 
        FROM financial_ratios_extended 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC LIMIT 1
    """
    row = await db.fetch_one(query, symbol)
    if not row: return None
    return dict(row)

async def get_corporate_actions(symbol: str):
    """Fetch upcoming or recent dividends/splits"""
    query = """
        SELECT action_type, ex_date, dividend_amount, split_ratio, description 
        FROM corporate_actions 
        WHERE symbol = $1 AND ex_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY ex_date DESC LIMIT 3
    """
    rows = await db.fetch_all(query, symbol)
    return [dict(r) for r in rows]

async def get_news_summary(symbol: str):
    """Fetch last 3 news headlines for context"""
    query = """
        SELECT headline, source, published_at, sentiment_score 
        FROM market_news 
        WHERE symbol = $1 
        ORDER BY published_at DESC LIMIT 3
    """
    rows = await db.fetch_all(query, symbol)
    return [dict(r) for r in rows]

# Tool Definitions for OpenAI
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_price",
            "description": "Get live price, volume, and daily change for a Saudi stock symbol (e.g., 1120).",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "4-digit market ticker"}},
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_fundamentals",
            "description": "Get fundamental valuation ratios like P/E, P/B, Dividend Yield.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "4-digit market ticker"}},
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
                "properties": {"symbol": {"type": "string", "description": "4-digit market ticker"}},
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
                "properties": {"symbol": {"type": "string", "description": "4-digit market ticker"}},
                "required": ["symbol"]
            }
        }
    }
]

# ---------------------------------------------------------
# 2. THE BRAIN (Agent Logic)
# ---------------------------------------------------------

async def chat_with_analyst(message: str, history: List[Dict]):
    """
    Main entry point.
    1. Sends user message + Tools to LLM.
    2. If LLM calls tool -> Executes SQL -> Feeds result back to LLM.
    3. Returns final natural language response.
    """
    
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history + [{"role": "user", "content": message}]
    
    # First Pass: Intent Detection
    response = await client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=messages,
        tools=TOOLS_SCHEMA,
        tool_choice="auto",
        temperature=0.2 # Low temperature for precision
    )
    
    response_msg = response.choices[0].message
    tool_calls = response_msg.tool_calls
    
    # Payload to send back to frontend (for UI visualization)
    data_payload = {}
    
    if tool_calls:
        # Agent decided to use data!
        messages.append(response_msg) # Extend conversation with assistant's intent
        
        for tool_call in tool_calls:
            fn_name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)
            symbol = args.get("symbol")
            
            # Execute SQL Tool
            tool_result = None
            if fn_name == "get_stock_price":
                tool_result = await get_stock_price(symbol)
                data_payload["price_data"] = tool_result
            elif fn_name == "get_fundamentals":
                tool_result = await get_fundamentals(symbol)
                data_payload["fundamentals"] = tool_result
            elif fn_name == "get_corporate_actions":
                tool_result = await get_corporate_actions(symbol)
                data_payload["events"] = tool_result
            elif fn_name == "get_news_summary":
                tool_result = await get_news_summary(symbol)
                data_payload["news"] = tool_result
            
            # Feed result back to LLM
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": fn_name,
                "content": json.dumps(tool_result, default=str)
            })
            
        # Second Pass: Final Synthesis
        final_response = await client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            temperature=0.5 # Slightly higher for fluent summary
        )
        return {
            "reply": final_response.choices[0].message.content,
            "data": data_payload
        }
    
    else:
        # No tools needed (Chat/Greeting)
        return {
            "reply": response_msg.content,
            "data": None
        }
```

## Step 2: API Endpoint Integration (`backend/api.py`)

New endpoint to expose the service.

```python
# Add to backend/api.py

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = [] # Optional past context

@app.post("/ai/chat")
async def ai_chat_endpoint(req: ChatRequest):
    try:
        from ai_service import chat_with_analyst
        result = await chat_with_analyst(req.message, req.history)
        return result
    except Exception as e:
        # Graceful degradation
        return {"reply": "I'm having trouble accessing the market feed right now. Please try again.", "data": None, "error": str(e)}
```

## Step 3: Frontend Widget (`AIChatWidget.tsx`)

A floating action button (FAB) that expands into a modern chat interface.
- **State:** `messages` array.
- **Visuals:** Glassmorphism, user bubbles (blue), AI bubbles (gray), "Thinking..." indicator.
- **Charts:** If `response.data` contains `price_data`, render a mini sparkline or price card *inside* the chat stream.

---

# 5. 💡 RECOMMENDATIONS FOR "WORLD-CLASS" STATUS

## 5.1 The "Evidence Card" UI
Don't just show text. If the AI says "Al Rajhi P/E is 18.5", the chat bubble should have an expandable **"View Source"** tag. Clicking it shows the raw JSON row from the database. This builds immense trust ("Zero-Hallucination" proof).

## 5.2 Symbol Resolution Middleware
Users will type "Rajhi", "Alrajhi", "1120", "The bank".
**Recommendation:** Add a lightweight fuzzy matching layer *before* the LLM sees the prompt.
`"What is Rajhi price?"` -> `[System: Context Resolved: "Al Rajhi Bank (1120)"]` -> LLM.

## 5.3 Streaming Responses
Waiting 3 seconds for a full paragraph feels slow.
**Recommendation:** Use Server-Sent Events (SSE) to stream the text token-by-token while the data payload arrives in parallel.

## 5.4 "Proactive" Intelligence
If the user asks "How is Al Rajhi?", the AI should check:
1.  Price (Up/Down?)
2.  **AND** recent meaningful news (Sentiment?)
3.  **AND** upcoming dividends.
It should synthesize: *"Al Rajhi is slightly down (-0.5%), likely due to the mixed earnings report released yesterday, despite the attractive 2.5% yield."* -> This is true intelligence.

---

**Status:** Plan Ready.
**Next Action:** Awaiting confirmation to execute Step 1 (Create `backend/ai_service.py`).
