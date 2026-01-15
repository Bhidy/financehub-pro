"""
Enterprise Analytics Router - Chatbot Analytics Dashboard
Admin-only endpoints for monitoring chatbot performance.

Added: 2026-01-13
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.db.session import db

router = APIRouter()


# ============================================================
# PYDANTIC MODELS
# ============================================================

class HealthKPIs(BaseModel):
    """Executive health KPIs"""
    total_chats: int
    total_messages: int
    unique_users: int
    guest_sessions: int
    success_rate: float
    failure_rate: float
    out_of_scope_count: int
    avg_messages_per_session: float
    period: str


class TopQuestion(BaseModel):
    """Top question entry"""
    normalized_text: str
    count: int
    percentage: float
    top_intent: str
    success_rate: float


class UnresolvedQuery(BaseModel):
    """Unresolved query entry"""
    id: int
    raw_text: str
    language: str
    detected_intent: str
    confidence: float
    failure_reason: str
    admin_status: str
    created_at: datetime


class IntentPerformance(BaseModel):
    """Intent performance metrics"""
    intent: str
    volume: int
    success_rate: float
    avg_confidence: float
    avg_latency_ms: float
    failure_rate: float


class ResolverStats(BaseModel):
    """Symbol resolver statistics"""
    method: str
    count: int
    percentage: float


class SessionFunnel(BaseModel):
    """Session funnel step"""
    step: str
    count: int
    percentage: float


class ActionUsage(BaseModel):
    """Action button usage"""
    action: str
    clicks: int
    click_rate: float


class PerformanceMetrics(BaseModel):
    """System performance metrics"""
    avg_latency_ms: float
    p95_latency_ms: float
    error_rate: float
    timeout_count: int


class LanguageStats(BaseModel):
    """Language distribution"""
    language: str
    count: int
    percentage: float
    failure_rate: float


# ============================================================
# ADMIN AUTH DEPENDENCY
# ============================================================

async def require_admin(authorization: str = None):
    """Verify admin access - placeholder for auth check"""
    # TODO: Integrate with actual auth system
    # For now, we'll check if admin endpoints are being accessed
    # In production, this would verify JWT token and role
    if not authorization:
        # Allow access for now during development
        # In production: raise HTTPException(status_code=401, detail="Not authenticated")
        pass
    return True


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_date_range(period: str) -> tuple:
    """Get start/end dates for given period"""
    now = datetime.utcnow()
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    else:
        start = now - timedelta(days=30)  # Default to 30 days
    return start, now


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/health", response_model=HealthKPIs)
async def get_health_kpis(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Executive Health KPIs
    Returns total chats, messages, users, success/failure rates
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            # Total messages
            total_messages = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
            """, start, end) or 0
            
            # Unique sessions (chats)
            total_chats = await conn.fetchval("""
                SELECT COUNT(DISTINCT session_id) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
            """, start, end) or 0
            
            # Registered Users (Authenticated)
            registered_users = await conn.fetchval("""
                SELECT COUNT(DISTINCT user_id) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND user_id IS NOT NULL
            """, start, end) or 0
            
            # Guest Sessions (Unauthenticated)
            guest_sessions = await conn.fetchval("""
                SELECT COUNT(DISTINCT session_id) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND user_id IS NULL
            """, start, end) or 0
            
            # Success rate calculation
            success_count = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 
                AND response_has_data = TRUE 
                AND fallback_triggered = FALSE 
                AND error_code IS NULL
                AND scope_blocked_reason IS NULL
            """, start, end) or 0
            
            # Failure rate calculation
            failure_count = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 
                AND (
                    fallback_triggered = TRUE 
                    OR error_code IS NOT NULL 
                    OR response_has_data = FALSE
                    OR scope_blocked_reason IS NOT NULL
                )
            """, start, end) or 0
            
            # Out of scope
            out_of_scope = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND scope_blocked_reason IS NOT NULL
            """, start, end) or 0
            
            # Avg messages per session
            avg_msg = await conn.fetchval("""
                SELECT AVG(msg_count) FROM (
                    SELECT session_id, COUNT(*) as msg_count FROM chat_interactions 
                    WHERE created_at >= $1 AND created_at <= $2
                    GROUP BY session_id
                ) sub
            """, start, end) or 0.0
            
            if total_messages > 0:
                success_rate = (success_count / total_messages * 100)
                failure_rate = (failure_count / total_messages * 100)
            else:
                success_rate = 0.0
                failure_rate = 0.0
            
            # NOTE: We map 'unique_users' to 'registered_users' to match Admin expectations.
            return HealthKPIs(
                total_chats=total_chats,
                total_messages=total_messages,
                unique_users=registered_users,
                guest_sessions=guest_sessions,
                success_rate=round(success_rate, 2),
                failure_rate=round(failure_rate, 2),
                out_of_scope_count=out_of_scope,
                avg_messages_per_session=round(float(avg_msg), 2),
                period=period
            )
    except Exception as e:
        # Return zeros if tables don't exist yet
        return HealthKPIs(
            total_chats=0,
            total_messages=0,
            unique_users=0,
            success_rate=0.0,
            failure_rate=0.0,
            out_of_scope_count=0,
            avg_messages_per_session=0.0,
            period=period
        )


@router.get("/questions", response_model=List[TopQuestion])
async def get_top_questions(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    limit: int = Query(20, ge=1, le=100),
    _admin: bool = Depends(require_admin)
):
    """
    Top Questions Leaderboard
    Returns most asked questions ranked by frequency
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            # Get total count for percentage
            total = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
            """, start, end) or 1
            
            rows = await conn.fetch("""
                SELECT 
                    LOWER(TRIM(normalized_text)) as normalized,
                    COUNT(*) as count,
                    MODE() WITHIN GROUP (ORDER BY detected_intent) as top_intent,
                    AVG(CASE WHEN response_has_data THEN 1.0 ELSE 0.0 END) * 100 as success_rate
                FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND normalized_text IS NOT NULL
                GROUP BY LOWER(TRIM(normalized_text))
                ORDER BY count DESC
                LIMIT $3
            """, start, end, limit)
            
            return [
                TopQuestion(
                    normalized_text=row['normalized'] or '',
                    count=row['count'],
                    percentage=round(row['count'] / total * 100, 2),
                    top_intent=row['top_intent'] or 'UNKNOWN',
                    success_rate=round(row['success_rate'] or 0.0, 2)
                )
                for row in rows
            ]
    except Exception:
        return []


@router.get("/unresolved", response_model=List[UnresolvedQuery])
async def get_unresolved_queries(
    status: str = Query("pending", regex="^(pending|resolved|ignored|all)$"),
    reason: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    _admin: bool = Depends(require_admin)
):
    """
    Unanswered / No-Data Inbox
    Returns queries that failed to return data
    """
    try:
        async with db._pool.acquire() as conn:
            query = """
                SELECT id, raw_text, language, detected_intent, confidence, 
                       failure_reason, admin_status, created_at
                FROM unresolved_queries
                WHERE 1=1
            """
            params = []
            param_idx = 1
            
            if status != "all":
                query += f" AND admin_status = ${param_idx}"
                params.append(status)
                param_idx += 1
            
            if reason:
                query += f" AND failure_reason = ${param_idx}"
                params.append(reason)
                param_idx += 1
            
            query += f" ORDER BY created_at DESC LIMIT ${param_idx}"
            params.append(limit)
            
            rows = await conn.fetch(query, *params)
            
            return [
                UnresolvedQuery(
                    id=row['id'],
                    raw_text=row['raw_text'] or '',
                    language=row['language'] or 'en',
                    detected_intent=row['detected_intent'] or 'UNKNOWN',
                    confidence=float(row['confidence'] or 0),
                    failure_reason=row['failure_reason'],
                    admin_status=row['admin_status'],
                    created_at=row['created_at']
                )
                for row in rows
            ]
    except Exception:
        return []


@router.post("/unresolved/{query_id}/resolve")
async def resolve_query(
    query_id: int,
    status: str = Query(..., regex="^(resolved|ignored)$"),
    notes: Optional[str] = None,
    _admin: bool = Depends(require_admin)
):
    """
    Mark an unresolved query as resolved or ignored
    """
    try:
        async with db._pool.acquire() as conn:
            await conn.execute("""
                UPDATE unresolved_queries 
                SET admin_status = $1, admin_notes = $2, resolved_at = NOW()
                WHERE id = $3
            """, status, notes, query_id)
            return {"success": True, "id": query_id, "status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/intents", response_model=List[IntentPerformance])
async def get_intent_performance(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Intent Demand & Accuracy
    Returns performance metrics per intent
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    detected_intent as intent,
                    COUNT(*) as volume,
                    AVG(CASE WHEN response_has_data THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
                    AVG(confidence) as avg_confidence,
                    AVG(latency_total_ms) as avg_latency,
                    AVG(CASE WHEN fallback_triggered OR error_code IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as failure_rate
                FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND detected_intent IS NOT NULL
                GROUP BY detected_intent
                ORDER BY volume DESC
            """, start, end)
            
            return [
                IntentPerformance(
                    intent=row['intent'],
                    volume=row['volume'],
                    success_rate=round(row['success_rate'] or 0.0, 2),
                    avg_confidence=round(float(row['avg_confidence'] or 0), 4),
                    avg_latency_ms=round(float(row['avg_latency'] or 0), 2),
                    failure_rate=round(row['failure_rate'] or 0.0, 2)
                )
                for row in rows
            ]
    except Exception:
        return []


@router.get("/resolver", response_model=List[ResolverStats])
async def get_resolver_stats(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Symbol Resolver Performance
    Returns breakdown by resolution method
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            total = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND resolver_method IS NOT NULL
            """, start, end) or 1
            
            rows = await conn.fetch("""
                SELECT 
                    resolver_method as method,
                    COUNT(*) as count
                FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND resolver_method IS NOT NULL
                GROUP BY resolver_method
                ORDER BY count DESC
            """, start, end)
            
            return [
                ResolverStats(
                    method=row['method'],
                    count=row['count'],
                    percentage=round(row['count'] / total * 100, 2)
                )
                for row in rows
            ]
    except Exception:
        return []


@router.get("/sessions/funnel", response_model=List[SessionFunnel])
async def get_session_funnel(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Conversation Funnel
    Returns drop-off at each step
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            # Total sessions
            total_sessions = await conn.fetchval("""
                SELECT COUNT(DISTINCT session_id) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
            """, start, end) or 0
            
            # Sessions with at least one question
            first_question = await conn.fetchval("""
                SELECT COUNT(DISTINCT session_id) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
            """, start, end) or 0
            
            # Sessions with successful response
            successful = await conn.fetchval("""
                SELECT COUNT(DISTINCT session_id) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND response_has_data = TRUE
            """, start, end) or 0
            
            # Sessions with action clicked
            action_clicked = await conn.fetchval("""
                SELECT COUNT(DISTINCT session_id) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND action_clicked IS NOT NULL
            """, start, end) or 0
            
            # Sessions with follow-up
            follow_up = await conn.fetchval("""
                SELECT COUNT(*) FROM (
                    SELECT session_id FROM chat_interactions 
                    WHERE created_at >= $1 AND created_at <= $2
                    GROUP BY session_id HAVING COUNT(*) > 1
                ) sub
            """, start, end) or 0
            
            base = total_sessions or 1
            
            return [
                SessionFunnel(step="Session Start", count=total_sessions, percentage=100.0),
                SessionFunnel(step="First Question", count=first_question, percentage=round(first_question/base*100, 2)),
                SessionFunnel(step="Successful Response", count=successful, percentage=round(successful/base*100, 2)),
                SessionFunnel(step="Action Clicked", count=action_clicked, percentage=round(action_clicked/base*100, 2)),
                SessionFunnel(step="Follow-up Question", count=follow_up, percentage=round(follow_up/base*100, 2))
            ]
    except Exception:
        return []


@router.get("/actions", response_model=List[ActionUsage])
async def get_action_usage(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Action Button Usage
    Returns click-through rates for action buttons
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            # Total interactions with actions
            total_with_actions = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND actions_shown IS NOT NULL
            """, start, end) or 1
            
            rows = await conn.fetch("""
                SELECT 
                    action_clicked as action,
                    COUNT(*) as clicks
                FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2 AND action_clicked IS NOT NULL
                GROUP BY action_clicked
                ORDER BY clicks DESC
            """, start, end)
            
            return [
                ActionUsage(
                    action=row['action'],
                    clicks=row['clicks'],
                    click_rate=round(row['clicks'] / total_with_actions * 100, 2)
                )
                for row in rows
            ]
    except Exception:
        return []


@router.get("/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Performance & Reliability
    Returns latency and error metrics
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT 
                    AVG(latency_total_ms) as avg_latency,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_total_ms) as p95_latency,
                    AVG(CASE WHEN error_code IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as error_rate,
                    COUNT(*) FILTER (WHERE latency_total_ms > 10000) as timeout_count
                FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
            """, start, end)
            
            return PerformanceMetrics(
                avg_latency_ms=round(float(row['avg_latency'] or 0), 2),
                p95_latency_ms=round(float(row['p95_latency'] or 0), 2),
                error_rate=round(row['error_rate'] or 0.0, 2),
                timeout_count=row['timeout_count'] or 0
            )
    except Exception:
        return PerformanceMetrics(
            avg_latency_ms=0.0,
            p95_latency_ms=0.0,
            error_rate=0.0,
            timeout_count=0
        )


@router.get("/language", response_model=List[LanguageStats])
async def get_language_stats(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Language Analytics
    Returns language distribution and failure rates
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            total = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
            """, start, end) or 1
            
            rows = await conn.fetch("""
                SELECT 
                    COALESCE(language_detected, 'unknown') as language,
                    COUNT(*) as count,
                    AVG(CASE WHEN fallback_triggered OR error_code IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as failure_rate
                FROM chat_interactions 
                WHERE created_at >= $1 AND created_at <= $2
                GROUP BY COALESCE(language_detected, 'unknown')
                ORDER BY count DESC
            """, start, end)
            
            return [
                LanguageStats(
                    language=row['language'],
                    count=row['count'],
                    percentage=round(row['count'] / total * 100, 2),
                    failure_rate=round(row['failure_rate'] or 0.0, 2)
                )
                for row in rows
            ]
    except Exception:
        return []


@router.post("/aliases")
async def add_symbol_alias(
    symbol: str,
    alias: str,
    _admin: bool = Depends(require_admin)
):
    """
    Add a new symbol alias for the resolver
    """
    try:
        async with db._pool.acquire() as conn:
            # Check if we have a symbol_aliases table, if not use stock_aliases
            await conn.execute("""
                INSERT INTO stock_aliases (alias_text, alias_text_norm, symbol, priority, created_at)
                VALUES ($1, LOWER($1), $2, 10, NOW())
                ON CONFLICT (alias_text_norm, symbol) DO NOTHING
            """, alias, symbol.upper())
            return {"success": True, "symbol": symbol.upper(), "alias": alias}
    except Exception as e:
        # Try alternative table
        try:
            async with db._pool.acquire() as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS stock_aliases (
                        id SERIAL PRIMARY KEY,
                        alias_text VARCHAR(255) NOT NULL,
                        alias_text_norm VARCHAR(255) NOT NULL,
                        symbol VARCHAR(20) NOT NULL,
                        priority INT DEFAULT 1,
                        created_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE(alias_text_norm, symbol)
                    )
                """)
                await conn.execute("""
                    INSERT INTO stock_aliases (alias_text, alias_text_norm, symbol, priority, created_at)
                    VALUES ($1, LOWER($1), $2, 10, NOW())
                    ON CONFLICT (alias_text_norm, symbol) DO NOTHING
                """, alias, symbol.upper())
                return {"success": True, "symbol": symbol.upper(), "alias": alias}
        except Exception as inner_e:
            raise HTTPException(status_code=500, detail=str(inner_e))
