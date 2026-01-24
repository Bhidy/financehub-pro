"""
AI Chat Endpoint - Deterministic DB-Powered Chatbot

This replaces the previous Groq/OpenAI-based implementation with
a fully deterministic, rule-based system.

Authentication Integration:
- Authenticated users: unlimited access (no tracking)
- Guest users: tracked via device fingerprint (5-question limit)
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from jose import JWTError, jwt
import time
import json
from datetime import datetime
from app.db.session import db
from app.chat.chat_service import process_message
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

GUEST_QUESTION_LIMIT = 5


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    market: Optional[str] = None
    history: List[Dict[str, Any]] = []


async def verify_access(
    authorization: Optional[str] = Header(None),
    x_device_fingerprint: Optional[str] = Header(None, alias="X-Device-Fingerprint")
) -> dict:
    """
    Verify user access for chat:
    - If authenticated: returns {"authenticated": True, "user_email": ...}
    - If guest with remaining questions: returns {"authenticated": False, "can_ask": True}
    - If guest limit exceeded: returns {"authenticated": False, "can_ask": False}
    
    CRITICAL: Authenticated users ALWAYS have unlimited access (can_ask: True)
    Guest users are tracked by device fingerprint with 5-question limit
    """
    # =========================================================================
    # AUTHENTICATION CHECK - DETAILED LOGGING FOR DEBUGGING
    # =========================================================================
    auth_debug = {"has_auth_header": bool(authorization), "token_valid": False, "error": None}
    
    
    if authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                email = payload.get("sub")
                if email:
                    # =====================================================
                    # AUTHENTICATED USER - ALWAYS UNLIMITED ACCESS
                    # =====================================================
                    print(f"[AI Chat] ✅ Authenticated user: {email}")
                    return {
                        "authenticated": True, 
                        "user_email": email, 
                        "can_ask": True,  # ALWAYS TRUE FOR AUTH USERS
                        "unlimited": True
                    }
                else:
                    auth_debug["error"] = "Token valid but no 'sub' claim"
                    print(f"[AI Chat] ⚠️ JWT valid but missing 'sub': {payload}")
                    # CRITICAL: Do NOT fallback to guest if token is presented but invalid structure
                    return {"authenticated": False, "can_ask": False, "error": "INVALID_TOKEN", "auth_debug": auth_debug}
            except JWTError as e:
                # Log the specific JWT error for debugging
                auth_debug["error"] = str(e)
                print(f"[AI Chat] ⚠️ JWT validation failed: {str(e)}")
                # CRITICAL: Token was attempted but failed. Report this back so frontend can logout.
                return {"authenticated": False, "can_ask": False, "error": "TOKEN_EXPIRED", "auth_debug": auth_debug}
            except Exception as e:
                auth_debug["error"] = f"Unexpected: {str(e)}"
                print(f"[AI Chat] ⚠️ Unexpected auth error: {str(e)}")
                return {"authenticated": False, "can_ask": False, "error": "AUTH_ERROR", "auth_debug": auth_debug}
        else:
            auth_debug["error"] = "Invalid Authorization format (expected 'Bearer <token>')"
            print(f"[AI Chat] ⚠️ Invalid auth header format")
            return {"authenticated": False, "can_ask": False, "error": "INVALID_AUTH_HEADER", "auth_debug": auth_debug}
    
    # =========================================================================
    # GUEST USER PATH - Only reached if authentication failed/missing
    # =========================================================================
    print(f"[AI Chat] 👤 Guest user (auth_debug: {auth_debug})")
    
    # No fingerprint = allow but don't track (legacy/compatibility)
    if not x_device_fingerprint:
        print(f"[AI Chat] 👤 Guest without fingerprint - allowing without tracking")
        return {"authenticated": False, "can_ask": True, "no_tracking": True, "auth_debug": auth_debug}
    
    # Check current usage from database
    try:
        query = "SELECT question_count FROM guest_sessions WHERE device_fingerprint = $1"
        result = await db.fetch_one(query, x_device_fingerprint)
        
        if not result:
            print(f"[AI Chat] 👤 New guest session: {x_device_fingerprint[:8]}...")
            return {"authenticated": False, "can_ask": True, "question_count": 0, "auth_debug": auth_debug}
        
        count = result['question_count']
        can_ask = count < GUEST_QUESTION_LIMIT
        
        print(f"[AI Chat] 👤 Guest {x_device_fingerprint[:8]}... - Questions: {count}/{GUEST_QUESTION_LIMIT}, can_ask: {can_ask}")
        return {"authenticated": False, "can_ask": can_ask, "question_count": count, "auth_debug": auth_debug}
    except Exception as e:
        # Database error - fail open for guests (allow the question)
        print(f"[AI Chat] ⚠️ Guest tracking DB error: {e} - allowing question")
        return {"authenticated": False, "can_ask": True, "question_count": 0, "db_error": str(e)}


@router.post("/chat")
async def ai_chat_endpoint(
    req: ChatRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
    x_device_fingerprint: Optional[str] = Header(None, alias="X-Device-Fingerprint"),
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For")
):
    """
    Process a chat message using deterministic intent routing.
    
    Authentication flow:
    - Authenticated users: unlimited access
    - Guest users: tracked via device fingerprint (5-question limit)
    """
    start_time = time.time()
    session_id = req.session_id or f"sess_{int(time.time()*1000)}" # Fallback session ID

    try:
        if not db._pool:
            return {
                "message_text": "Database connection not available. Please try again later.",
                "message_text_ar": "الاتصال بقاعدة البيانات غير متاح. يرجى المحاولة لاحقاً.",
                "language": "en",
                "cards": [],
                "chart": None,
                "actions": [],
                "disclaimer": None,
                "meta": {"intent": "ERROR", "confidence": 0, "entities": {}, "latency_ms": 0, "error": "Database pool not initialized"}
            }
        
        # Verify access (authenticated or guest with remaining questions)
        access = await verify_access(authorization, x_device_fingerprint)
        
        if access.get("error"):
            # CRITICAL: If auth failed explicitly (invalid token), do NOT fallback to guest
            # Return 401 to trigger frontend logout
            print(f"[AI Chat] ⛔ Auth error: {access.get('error')}")
            raise HTTPException(status_code=401, detail=access.get("error"))

        if not access.get("can_ask"):
            # Log this case for debugging - this should ONLY happen for guests
            print(f"[AI Chat] ⛔ Rate limit triggered - access: {access}")
            return {
                "message_text": "You've used your 5 free questions! Register for unlimited access.",
                "message_text_ar": "لقد استخدمت أسئلتك الخمسة المجانية! سجل للحصول على وصول غير محدود.",
                "language": "en",
                "cards": [],
                "chart": None,
                "actions": [
                    {"label": "Register Now", "label_ar": "سجل الآن", "action_type": "navigate", "payload": "/register"},
                    {"label": "Login", "label_ar": "تسجيل الدخول", "action_type": "navigate", "payload": "/login"}
                ],
                "disclaimer": None,
                "meta": {
                    "intent": "USAGE_LIMIT_REACHED",
                    "confidence": 1.0,
                    "entities": {"limit_reached": True, "question_count": access.get("question_count", 0)},
                    "latency_ms": 0,
                    "authenticated": access.get("authenticated", False),
                    "auth_debug": access.get("auth_debug")  # Include debug info for troubleshooting
                }
            }
        
        # Increment guest usage if not authenticated
        if not access.get("authenticated") and x_device_fingerprint:
            ip_address = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else None
            increment_query = """
                INSERT INTO guest_sessions (device_fingerprint, ip_address, question_count, first_question_at, last_question_at)
                VALUES ($1, $2, 1, NOW(), NOW())
                ON CONFLICT (device_fingerprint) 
                DO UPDATE SET 
                    question_count = guest_sessions.question_count + 1,
                    last_question_at = NOW(),
                    ip_address = COALESCE($2, guest_sessions.ip_address)
            """
            await db.execute(increment_query, x_device_fingerprint, ip_address)
        
        # ENTERPRISE FIX: Check X-Market-Context Header first
        market_header = request.headers.get('X-Market-Context')
        final_market = market_header if market_header else req.market

        # Debug Logging for Market Context
        print(f"DEBUG: Chat Request - SessionID: {session_id} | Header: {market_header} | Body: {req.market}")
        
        async with db._pool.acquire() as conn:
            # Get user context if authenticated
            user_id = access.get("user_email") if access.get("authenticated") else None
            
            # Ensure session exists and is linked to user
            if user_id:
                # Update or create session
                # If title is null and it's a new session, we'll set it later
                await conn.execute("""
                    INSERT INTO chat_sessions (session_id, user_id, last_market, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (session_id) DO UPDATE SET 
                        user_id = EXCLUDED.user_id,
                        last_market = EXCLUDED.last_market,
                        updated_at = NOW()
                """, session_id, user_id, final_market)

            # Process Message
            response = await process_message(
                conn=conn,
                message=req.message,
                session_id=session_id,
                market=final_market,
                history=req.history,
                user_id=user_id # Pass persistent user ID for analytics
            )
            
            # === HISTORY PERSISTENCE ===
            if user_id:
                # 1. Save USER message
                await conn.execute("""
                    INSERT INTO chat_messages (session_id, role, content, created_at)
                    VALUES ($1, 'user', $2, NOW())
                """, session_id, req.message)

                # 2. Save ASSISTANT response
                # Store rich content (cards, actions) in 'meta'
                # Convert Pydantic objects to dicts manually or using .dict()
                # Actions and Cards are lists of objects, need to serialize them properly
                meta_data = {
                    "cards": [c.dict() for c in response.cards] if response.cards else [],
                    "actions": [a.dict() for a in response.actions] if response.actions else [],
                    "chart": response.chart.dict() if response.chart else None,
                    "intent": response.meta.intent,
                    "confidence": response.meta.confidence
                }
                
                # Careful with JSON serialization of datetime objects etc in meta
                # Using strings for safey
                await conn.execute("""
                    INSERT INTO chat_messages (session_id, role, content, meta, created_at)
                    VALUES ($1, 'assistant', $2, $3, NOW())
                """, session_id, response.message_text, json.dumps(meta_data, default=str))

                # 3. Update Session Title if needed (First message) and updated_at
                # Check if title is null
                existing_title = await conn.fetchval("SELECT title FROM chat_sessions WHERE session_id = $1", session_id)
                if not existing_title:
                    # Generate simple title from user message
                    # Split max 5 words
                    words = req.message.split()
                    new_title = " ".join(words[:5])
                    if len(words) > 5:
                        new_title += "..."
                    if not new_title.strip():
                        new_title = "New Chat"
                        
                    await conn.execute("""
                        UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE session_id = $2
                    """, new_title, session_id)
                else:
                     await conn.execute("""
                        UPDATE chat_sessions SET updated_at = NOW() WHERE session_id = $1
                    """, session_id)


            # Log to Analytics (Legacy)
            try:
                await conn.execute("""
                    INSERT INTO chat_analytics (session_id, message_text, detected_intent, confidence, entities, response_time_ms, language)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, 
                session_id, 
                req.message, 
                response.meta.intent, 
                response.meta.confidence, 
                json.dumps(response.meta.entities),
                int((time.time() - start_time) * 1000),
                response.language)
            except Exception as le:
                print(f"Logging Error: {le}")
            
            # Inject session_id into response meta for client tracking
            response_dict = response.dict()
            response_dict['session_id'] = session_id 
            
            return response_dict

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"CHAT ERROR: {str(e)}")
        print(error_trace)
        
        # Return structured error
        return {
            "message_text": "I encountered a system error. Please try again.",
            "message_text_ar": "عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.",
            "language": "en",
            "cards": [{
                "type": "error", 
                "title": "System Error", 
                "data": {"error": f"BACKEND_ERROR: {repr(e)}"}
            }],
            "chart": None,
            "actions": [],
            "disclaimer": None,
            "meta": {
                "intent": "ERROR",
                "confidence": 0,
                "entities": {},
                "latency_ms": 0,
                "error": str(e)
            }
        }


@router.get("/history", response_model=List[dict])
async def get_chat_history_sessions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's chat sessions history.
    Returns list of sessions sorted by last update.
    """
    if not db._pool:
        # Graceful fallback if db invalid (shouldn't happen)
        return []

    # Safe checking of tables
    query = """
        SELECT session_id, title, created_at, updated_at, last_market
        FROM chat_sessions
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT $2
    """
    try:
        rows = await db.fetch_all(query, current_user['email'], limit)
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"History verification error: {e}")
        return []


@router.get("/history/{session_id}", response_model=List[dict])
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get full message history for a specific session.
    Verifies ownership.
    """
    if not db._pool:
         return []

    try:
        # 1. Verify ownership
        query = "SELECT user_id FROM chat_sessions WHERE session_id = $1"
        owner = await db.fetch_val(query, session_id)
        
        if not owner or owner != current_user['email']:
             # Return empty (or 404/403)
             return []
             
        # 2. Fetch messages
        msg_query = """
            SELECT id, role, content, meta, created_at
            FROM chat_messages
            WHERE session_id = $1
            ORDER BY created_at ASC
        """
        rows = await db.fetch_all(msg_query, session_id)
        
        # Process rows
        result = []
        for r in rows:
            item = dict(r)
            if item.get('meta') and isinstance(item['meta'], str):
                 try:
                     item['meta'] = json.loads(item['meta'])
                 except:
                     pass
            result.append(item)
            
        return result
    except Exception as e:
        print(f"Fetch messages error: {e}")
        return []


@router.get("/briefing")
async def get_ai_briefing():
    """Get AI-generated market briefing (placeholder)."""
    return {
        "themes": ["Market Volatility", "Oil Prices", "Banking Sector"],
        "sentiment": "NEUTRAL",
        "score": 50,
        "summary": "Market is consolidating with focus on oil price movements."
    }


@router.get("/intents")
async def list_supported_intents():
    """List all supported chat intents."""
    return {
        "intents": [
            {"id": "STOCK_PRICE", "description": "Get current stock price", "examples": ["What is the price of COMI?", "كم سعر أرامكو؟"]},
            {"id": "STOCK_SNAPSHOT", "description": "Get stock overview with stats", "examples": ["Tell me about SWDY", "ملخص سهم سويدي"]},
            {"id": "STOCK_CHART", "description": "Show price chart", "examples": ["Show COMI chart", "شارت TMGH"]},
            {"id": "STOCK_STAT", "description": "Get specific metrics (PE, market cap)", "examples": ["What is the PE of 2222?", "مضاعف الربحية"]},
            {"id": "FINANCIALS", "description": "Show financial statements", "examples": ["COMI financials", "القوائم المالية"]},
            {"id": "DIVIDENDS", "description": "Show dividend history", "examples": ["Dividend history for COMI", "توزيعات الأرباح"]},
            {"id": "COMPARE_STOCKS", "description": "Compare two stocks", "examples": ["Compare COMI vs SWDY", "قارن بين"]},
            {"id": "TOP_GAINERS", "description": "Show top gaining stocks", "examples": ["Top gainers today", "الأكثر ارتفاعاً"]},
            {"id": "TOP_LOSERS", "description": "Show top losing stocks", "examples": ["Top losers", "الأكثر انخفاضاً"]},
            {"id": "SECTOR_STOCKS", "description": "Show stocks by sector", "examples": ["Banking sector stocks", "أسهم البنوك"]},
            {"id": "DIVIDEND_LEADERS", "description": "Show highest dividend yields", "examples": ["Highest dividend stocks", "أعلى توزيعات"]},
            {"id": "HELP", "description": "Show help and examples", "examples": ["Help", "مساعدة"]},
        ]
    }


class UpdateSessionRequest(BaseModel):
    title: str


@router.patch("/history/{session_id}")
async def update_session(
    session_id: str,
    update_data: UpdateSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update chat session (e.g. rename title)."""
    if not db._pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Verify ownership
    query = "SELECT user_id FROM chat_sessions WHERE session_id = $1"
    owner = await db.fetch_val(query, session_id)
    
    if not owner or owner != current_user['email']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Update
    await db.execute(
        "UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE session_id = $2",
        update_data.title, session_id
    )
    return {"success": True, "session_id": session_id, "title": update_data.title}


@router.delete("/history/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a chat session."""
    if not db._pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
        
    # Verify ownership
    query = "SELECT user_id FROM chat_sessions WHERE session_id = $1"
    owner = await db.fetch_val(query, session_id)
    
    # IDEMPOTENCY FIX: If session is already gone, consider it a success.
    # This prevents UI from showing errors if the user double-clicks or if it was partially deleted.
    if not owner:
        return {"success": True, "session_id": session_id, "message": "Session already deleted"}
    
    # Allow admin or owner
    if not owner or (owner != current_user['email'] and current_user.get('role') != 'admin'):
        # Just in case user_id is integer in DB (some mixed schemas)
        if str(owner) != str(current_user.get('id')) and str(owner) != str(current_user['email']):
             raise HTTPException(status_code=403, detail="Not authorized to delete this session")
        
    # Delete - ROBUST Approach (No Transaction - Independent Deletes)
    # ===================================================================
    # PostgreSQL transactions abort entirely if ANY error occurs inside them,
    # even if caught. Since we're doing cleanup (not atomic business logic),
    # we execute each delete independently. This is safe because:
    # 1. Failing to delete from a non-existent table is harmless.
    # 2. If parent session delete succeeds, cleanup is complete.
    # 3. If parent session fails, we return an error.
    # ===================================================================
    try:
        if not db._pool:
             raise HTTPException(status_code=503, detail="Database unavailable")

        async with db._pool.acquire() as conn:
            # 1. Delete from child tables (order: children first)
            # Execute each independently - no transaction wrapper
            child_tables = [
                'chat_messages', 
                'chat_analytics', 
                'chat_interactions', 
                'chat_session_summary',
            ]
            
            for table in child_tables:
                try:
                    await conn.execute(f"DELETE FROM {table} WHERE session_id = $1", session_id)
                except Exception as e:
                    # Silently skip if table doesn't exist or column missing
                    err_str = str(e).lower()
                    if "does not exist" not in err_str and "column" not in err_str:
                        print(f"[DeleteSession] Warning cleaning {table}: {e}")
            
            # 2. Delete the parent session (this is the critical operation)
            await conn.execute("DELETE FROM chat_sessions WHERE session_id = $1", session_id)
                 
    except Exception as e:
        print(f"Delete Session Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during deletion: {str(e)}")
        
    return {"success": True, "session_id": session_id, "message": "Chat session deleted permanently"}
