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
    """Executive health KPIs with Trends"""
    total_chats: int
    trend_chats: float  # Percentage change
    total_messages: int
    trend_messages: float
    unique_users: int
    trend_users: float
    guest_sessions: int
    success_rate: float
    trend_success: float
    failure_rate: float
    trend_failure: float
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


class DemandInsight(BaseModel):
    """Emerging demand or trending query"""
    query_text: str
    volume: int
    growth_rate: float  # vs previous period
    intent: str
    is_new: bool


class ProductHealthSummary(BaseModel):
    """Auto-generated executive summary"""
    status: str  # 'Healthy', 'At Risk', 'Critical'
    improvements: List[str]
    degradations: List[str]
    top_issues: List[str]
    decision_needed: bool


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
        start = now - timedelta(days=30)
    return start, now


def get_prev_date_range(start: datetime, end: datetime) -> tuple:
    """Get previous period for trend calculation"""
    duration = end - start
    prev_end = start
    prev_start = prev_end - duration
    return prev_start, prev_end


def build_filter_clause(
    start: datetime, 
    end: datetime, 
    user_type: Optional[str] = None, 
    language: Optional[str] = None,
    param_offset: int = 1
) -> tuple:
    """
    Build universal SQL filter clause
    Returns: (where_clause, params_list)
    """
    clauses = [f"created_at >= ${param_offset}", f"created_at <= ${param_offset + 1}"]
    params = [start, end]
    current_idx = param_offset + 2
    
    if user_type == "guest":
        clauses.append("user_id IS NULL")
    elif user_type == "user":
        clauses.append("user_id IS NOT NULL")
        
    if language and language != "all":
        clauses.append(f"language_detected = ${current_idx}")
        params.append(language)
        current_idx += 1
        
    return " AND ".join(clauses), params


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/health", response_model=HealthKPIs)
async def get_health_kpis(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Executive Health KPIs with Trends
    """
    start, end = get_date_range(period)
    prev_start, prev_end = get_prev_date_range(start, end)
    
    # Filter clauses
    curr_filter, curr_params = build_filter_clause(start, end, user_type, language, 1)
    prev_filter, prev_params = build_filter_clause(prev_start, prev_end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            # Helper to fetch count
            async def get_count(filter_sql, params, extra_cond=""):
                sql = f"SELECT COUNT(*) FROM chat_interactions WHERE {filter_sql} {extra_cond}"
                return await conn.fetchval(sql, *params) or 0

            async def get_distinct_count(filter_sql, params, col):
                sql = f"SELECT COUNT(DISTINCT {col}) FROM chat_interactions WHERE {filter_sql}"
                return await conn.fetchval(sql, *params) or 0
            
            # --- CURRENT PERIOD ---
            total_msgs = await get_count(curr_filter, curr_params)
            total_chats = await get_distinct_count(curr_filter, curr_params, "session_id")
            
            # Registered Users (approximate based on active in period)
            # Apply filters if possible, but users table is separate
            # For simplicity, we stick to interaction-based user count if filters are applied
            unique_users = await get_distinct_count(curr_filter, curr_params, "user_id")

            guest_sessions = await get_distinct_count(curr_filter, curr_params + [], "session_id") # Simplify logic
            # Re-query specifically for guests if no user filter
            if not user_type:
                 guest_filter, guest_params = build_filter_clause(start, end, "guest", language, 1)
                 guest_sessions = await get_distinct_count(guest_filter, guest_params, "session_id")
            
            success_count = await get_count(curr_filter, curr_params, 
                "AND response_has_data = TRUE AND fallback_triggered = FALSE AND error_code IS NULL")
            
            failure_count = await get_count(curr_filter, curr_params, 
                "AND (fallback_triggered = TRUE OR error_code IS NOT NULL OR response_has_data = FALSE)")

            out_of_scope = await get_count(curr_filter, curr_params, "AND scope_blocked_reason IS NOT NULL")
            
            # --- PREVIOUS PERIOD (For Trends) ---
            prev_total_msgs = await get_count(prev_filter, prev_params)
            prev_total_chats = await get_distinct_count(prev_filter, prev_params, "session_id")
            prev_unique_users = await get_distinct_count(prev_filter, prev_params, "user_id")
            
            prev_success = await get_count(prev_filter, prev_params,
                "AND response_has_data = TRUE AND fallback_triggered = FALSE AND error_code IS NULL")
            prev_failure = await get_count(prev_filter, prev_params,
                "AND (fallback_triggered = TRUE OR error_code IS NOT NULL OR response_has_data = FALSE)")
            
            # Calculations
            success_rate = (success_count / total_msgs * 100) if total_msgs > 0 else 0.0
            failure_rate = (failure_count / total_msgs * 100) if total_msgs > 0 else 0.0
            avg_msg = (total_msgs / total_chats) if total_chats > 0 else 0.0
            
            prev_success_rate = (prev_success / prev_total_msgs * 100) if prev_total_msgs > 0 else 0.0
            prev_failure_rate = (prev_failure / prev_total_msgs * 100) if prev_total_msgs > 0 else 0.0
            
            def calc_trend(curr, prev):
                if prev == 0: return 100.0 if curr > 0 else 0.0
                return round(((curr - prev) / prev) * 100, 1)

            # NOTE: For rates (%), trend is absolute difference or relative? 
            # Standard is usually absolute diff for percentages, but let's stick to relative for consistency OR simple diff.
            # Let's use simple difference for rates: (Current % - Prev %)
            # And relative (%) for counts.
            
            trend_success_diff = round(success_rate - prev_success_rate, 1)
            trend_failure_diff = round(failure_rate - prev_failure_rate, 1)

            return HealthKPIs(
                total_chats=total_chats,
                trend_chats=calc_trend(total_chats, prev_total_chats),
                total_messages=total_msgs,
                trend_messages=calc_trend(total_msgs, prev_total_msgs),
                unique_users=unique_users,
                trend_users=calc_trend(unique_users, prev_unique_users),
                guest_sessions=guest_sessions,
                success_rate=round(success_rate, 2),
                trend_success=trend_success_diff,
                failure_rate=round(failure_rate, 2),
                trend_failure=trend_failure_diff,
                out_of_scope_count=out_of_scope,
                avg_messages_per_session=round(float(avg_msg), 2),
                period=period
            )
            
    except Exception as e:
        print(f"Health KPI Error: {e}")
        return HealthKPIs(
            total_chats=0, trend_chats=0,
            total_messages=0, trend_messages=0,
            unique_users=0, trend_users=0,
            guest_sessions=0,
            success_rate=0.0, trend_success=0,
            failure_rate=0.0, trend_failure=0,
            out_of_scope_count=0,
            avg_messages_per_session=0.0,
            period=period
        )


@router.get("/questions", response_model=List[TopQuestion])
async def get_top_questions(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    limit: int = Query(20, ge=1, le=100),
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Top Questions Leaderboard
    Returns most asked questions ranked by frequency
    """
    start, end = get_date_range(period)
    filter_sql, params = build_filter_clause(start, end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            # Get total count for percentage
            total = await conn.fetchval(f"""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE {filter_sql}
            """, *params) or 1
            
            # Param usage: params contains [start, end, ...filters]
            # Need to append limit to params
            sql_params = params + [limit]
            limit_idx = len(sql_params)
            
            rows = await conn.fetch(f"""
                SELECT 
                    LOWER(TRIM(normalized_text)) as normalized,
                    COUNT(*) as count,
                    MODE() WITHIN GROUP (ORDER BY detected_intent) as top_intent,
                    AVG(CASE WHEN response_has_data THEN 1.0 ELSE 0.0 END) * 100 as success_rate
                FROM chat_interactions 
                WHERE {filter_sql} AND normalized_text IS NOT NULL
                GROUP BY LOWER(TRIM(normalized_text))
                ORDER BY count DESC
                LIMIT ${limit_idx}
            """, *sql_params)
            
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
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Unanswered / No-Data Inbox
    Returns queries that failed to return data
    """
    try:
        async with db._pool.acquire() as conn:
            # Note: unresolved_queries does not have session_id linked directly in this table?
            # It has 'language' (from schema in step 849 viewing).
            # It might not have user_id. 
            # Looking at schema in step 849 view: 
            # SELECT id, raw_text, language, detected_intent, confidence, failure_reason, admin_status, created_at
            # It does not seem to have user_id or session_id in the SELECT.
            # I will filter by language matches. user_type might be harder if column not present.
            # Assuming for now we only filter by language if available.
            
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
                
            if language and language != "all":
                query += f" AND language = ${param_idx}"
                params.append(language)
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
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Intent Demand & Accuracy
    Returns performance metrics per intent
    """
    start, end = get_date_range(period)
    filter_sql, params = build_filter_clause(start, end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            rows = await conn.fetch(f"""
                SELECT 
                    detected_intent as intent,
                    COUNT(*) as volume,
                    AVG(CASE WHEN response_has_data THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
                    AVG(confidence) as avg_confidence,
                    AVG(latency_total_ms) as avg_latency,
                    AVG(CASE WHEN fallback_triggered OR error_code IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as failure_rate
                FROM chat_interactions 
                WHERE {filter_sql} AND detected_intent IS NOT NULL
                GROUP BY detected_intent
                ORDER BY volume DESC
            """, *params)
            
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
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Symbol Resolver Performance
    Returns breakdown by resolution method
    """
    start, end = get_date_range(period)
    filter_sql, params = build_filter_clause(start, end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            total = await conn.fetchval(f"""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE {filter_sql} AND resolver_method IS NOT NULL
            """, *params) or 1
            
            rows = await conn.fetch(f"""
                SELECT 
                    resolver_method as method,
                    COUNT(*) as count
                FROM chat_interactions 
                WHERE {filter_sql} AND resolver_method IS NOT NULL
                GROUP BY resolver_method
                ORDER BY count DESC
            """, *params)
            
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
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Conversation Funnel
    Returns drop-off at each step
    """
    start, end = get_date_range(period)
    filter_sql, params = build_filter_clause(start, end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            # Helper for clean counts
            async def get_count_distinct(extra_cond=""):
                sql = f"SELECT COUNT(DISTINCT session_id) FROM chat_interactions WHERE {filter_sql} {extra_cond}"
                return await conn.fetchval(sql, *params) or 0
                
            async def get_follow_up_count():
                sql = f"""
                    SELECT COUNT(*) FROM (
                        SELECT session_id FROM chat_interactions 
                        WHERE {filter_sql}
                        GROUP BY session_id HAVING COUNT(*) > 1
                    ) sub
                """
                return await conn.fetchval(sql, *params) or 0
                
            total_sessions = await get_count_distinct()
            first_question = await get_count_distinct() # Effectively same as start for now if interactions exist
            successful = await get_count_distinct("AND response_has_data = TRUE")
            action_clicked = await get_count_distinct("AND action_clicked IS NOT NULL")
            follow_up = await get_follow_up_count()
            
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
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Action Button Usage
    Returns click-through rates for action buttons
    """
    start, end = get_date_range(period)
    filter_sql, params = build_filter_clause(start, end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            # Total interactions with actions
            total_with_actions = await conn.fetchval(f"""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE {filter_sql} AND actions_shown IS NOT NULL
            """, *params) or 1
            
            rows = await conn.fetch(f"""
                SELECT 
                    action_clicked as action,
                    COUNT(*) as clicks
                FROM chat_interactions 
                WHERE {filter_sql} AND action_clicked IS NOT NULL
                GROUP BY action_clicked
                ORDER BY clicks DESC
            """, *params)
            
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
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Performance & Reliability
    Returns latency and error metrics
    """
    start, end = get_date_range(period)
    filter_sql, params = build_filter_clause(start, end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            row = await conn.fetchrow(f"""
                SELECT 
                    AVG(latency_total_ms) as avg_latency,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_total_ms) as p95_latency,
                    AVG(CASE WHEN error_code IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as error_rate,
                    COUNT(*) FILTER (WHERE latency_total_ms > 10000) as timeout_count
                FROM chat_interactions 
                WHERE {filter_sql}
            """, *params)
            
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
    user_type: Optional[str] = Query(None, regex="^(all|guest|user)$"),
    language: Optional[str] = Query(None, regex="^(all|en|ar)$"),
    _admin: bool = Depends(require_admin)
):
    """
    Language Analytics
    Returns language distribution and failure rates
    """
    start, end = get_date_range(period)
    filter_sql, params = build_filter_clause(start, end, user_type, language, 1)
    
    try:
        async with db._pool.acquire() as conn:
            total = await conn.fetchval(f"""
                SELECT COUNT(*) FROM chat_interactions 
                WHERE {filter_sql}
            """, *params) or 1
            
            rows = await conn.fetch(f"""
                SELECT 
                    COALESCE(language_detected, 'unknown') as language,
                    COUNT(*) as count,
                    AVG(CASE WHEN fallback_triggered OR error_code IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as failure_rate
                FROM chat_interactions 
                WHERE {filter_sql}
                GROUP BY COALESCE(language_detected, 'unknown')
                ORDER BY count DESC
            """, *params)
            
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


@router.get("/demand/trending", response_model=List[DemandInsight])
async def get_demand_intelligence(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    limit: int = 10,
    _admin: bool = Depends(require_admin)
):
    """
    Demand Intelligence: Rising queries and topics
    Compares current period vs previous period volume
    """
    start, end = get_date_range(period)
    prev_start, prev_end = get_prev_date_range(start, end)
    
    try:
        async with db._pool.acquire() as conn:
            # Get current top normalized queries
            # Use CTEs to compare periods
            query = """
                WITH current_stats AS (
                    SELECT 
                        LOWER(TRIM(normalized_text)) as query_text,
                        COUNT(*) as vol,
                        MODE() WITHIN GROUP (ORDER BY detected_intent) as intent
                    FROM chat_interactions 
                    WHERE created_at >= $1 AND created_at <= $2 AND normalized_text IS NOT NULL
                    GROUP BY 1
                    HAVING COUNT(*) > 2
                ),
                prev_stats AS (
                    SELECT 
                        LOWER(TRIM(normalized_text)) as query_text,
                        COUNT(*) as vol
                    FROM chat_interactions 
                    WHERE created_at >= $3 AND created_at <= $4 AND normalized_text IS NOT NULL
                    GROUP BY 1
                )
                SELECT 
                    c.query_text,
                    c.vol as current_vol,
                    COALESCE(p.vol, 0) as prev_vol,
                    c.intent
                FROM current_stats c
                LEFT JOIN prev_stats p ON c.query_text = p.query_text
                ORDER BY (c.vol - COALESCE(p.vol, 0)) DESC
                LIMIT $5
            """
            
            rows = await conn.fetch(query, start, end, prev_start, prev_end, limit)
            
            results = []
            for row in rows:
                curr = row['current_vol']
                prev = row['prev_vol']
                growth = ((curr - prev) / prev * 100) if prev > 0 else 100.0
                is_new = prev == 0
                
                results.append(DemandInsight(
                    query_text=row['query_text'],
                    volume=curr,
                    growth_rate=round(growth, 1),
                    intent=row['intent'] or 'mixed',
                    is_new=is_new
                ))
            return results
    except Exception as e:
        print(f"Demand Error: {e}")
        return []


@router.get("/health/summary", response_model=ProductHealthSummary)
async def get_product_health_summary(
    period: str = Query("30d"),
    _admin: bool = Depends(require_admin)
):
    """
    Auto-generated Executive Summary
    """
    # Simply reuse the health KPIs logic internally or re-calculate
    # For speed, we'll do a quick specialized check or call the internal function
    # Let's do a quick calculation
    
    try:
        # Get KPIs implicitly
        kpis = await get_health_kpis(period=period, user_type="all", language="all", _admin=True)
        
        status = "Healthy"
        improvements = []
        degradations = []
        issues = []
        decision = False
        
        # Analyze Trends
        if kpis.trend_success > 0:
            improvements.append(f"Success Rate improved by {kpis.trend_success}%")
        elif kpis.trend_success < -2.0:
            degradations.append(f"Success Rate dropped by {abs(kpis.trend_success)}%")
            status = "At Risk"
            
        if kpis.trend_chats > 10:
            improvements.append(f"Chat volume grew by {kpis.trend_chats}%")
        
        if kpis.trend_failure > 5.0:
            degradations.append(f"Failure rate spiked by {kpis.trend_failure}%")
            status = "Critical"
            decision = True
            
        # Analyze issues
        if kpis.out_of_scope_count > (kpis.total_messages * 0.1):
            issues.append("High volume of out-of-scope queries (Data Gap)")
            
        if kpis.success_rate < 50.0:
            issues.append("Overall success rate below 50% threshold")
            status = "Critical"
            decision = True
            
        if not improvements and not degradations:
            improvements.append("Metrics are stable")
            
        return ProductHealthSummary(
            status=status,
            improvements=improvements[:3],
            degradations=degradations[:3],
            top_issues=issues[:3],
            decision_needed=decision
        )
    except Exception as e:
        return ProductHealthSummary(status="Unknown", improvements=[], degradations=[], top_issues=[str(e)], decision_needed=False)


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
