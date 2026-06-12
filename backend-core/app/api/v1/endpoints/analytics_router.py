"""
Enterprise Analytics Router - Chatbot Analytics Dashboard
Admin-only endpoints for monitoring chatbot performance.

Added: 2026-01-13
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import hmac
import os
from jose import jwt, JWTError
from app.core.config import settings
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


class NewsletterFunnelStep(BaseModel):
    lesson: int
    count: int
    percentage: float

class NewsletterEmailTypeAnalytics(BaseModel):
    key: str
    label: str
    subscriber_count: int
    sent_total: int
    last_sent: Optional[datetime]
    last_dispatch_sent_count: int
    last_dispatch_error_count: int
    preview_available: bool

class NewsletterPreviewRecipient(BaseModel):
    email: str
    full_name: Optional[str]
    template_variant: Optional[str]
    lesson_number: Optional[int]
    sent_at: datetime

class NewsletterLatestPreview(BaseModel):
    email_type: str
    label: str
    total_sent: int
    last_dispatch_at: Optional[datetime]
    last_dispatch_sent_count: int
    last_dispatch_error_count: int
    preview_available: bool
    subject: Optional[str]
    html: Optional[str]
    template_variant: Optional[str]
    lesson_number: Optional[int]
    recipient_email: Optional[str]
    recipient_name: Optional[str]
    recipients: List[NewsletterPreviewRecipient]

class NewsletterAnalytics(BaseModel):
    """Newsletter subscription and engagement metrics"""
    total_subscribers: int
    active_subscribers: int
    unsubscribed_count: int
    retention_rate: float
    # Distribution
    weekly_pulse_count: int
    monthly_dive_count: int
    academy_count: int
    flash_alerts_count: int
    # Funnel
    academy_funnel: List[NewsletterFunnelStep]
    # Health
    last_weekly_sent: Optional[datetime]
    last_monthly_sent: Optional[datetime]
    last_academy_sent: Optional[datetime]
    last_flash_sent: Optional[datetime]
    is_scheduler_running: bool
    email_types: List[NewsletterEmailTypeAnalytics]


# ============================================================
# ADMIN AUTH DEPENDENCY
# ============================================================

async def require_admin(
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
):
    """Admin gate for the analytics surface. Until 2026-06-11 this was a
    documented NO-OP ("Allow access for now during development"), leaving all
    17 routes — including two mutating POSTs and endpoints that expose raw
    user-typed chat queries — publicly reachable. It now accepts EITHER:

      1. X-Admin-Token — the machine credential the crons/agents use (same
         fail-closed hmac.compare_digest pattern as admin.py's
         require_admin_token), OR
      2. a Bearer JWT belonging to an ACTIVE user with role='admin' — what the
         admin dashboard (frontend/app/admin/analytics) already sends. The
         role is re-checked against the users table on every call; neither the
         client-side check nor the JWT claim is trusted on its own.
    """
    expected = os.getenv("ADMIN_API_TOKEN")
    if expected and x_admin_token and hmac.compare_digest(str(x_admin_token), str(expected)):
        return True
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        email = None
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email = payload.get("sub")
        except JWTError:
            email = None
        if email:
            row = await db.fetch_one(
                "SELECT role, is_active FROM users WHERE email = $1", email
            )
            if row and row["role"] == "admin" and row["is_active"]:
                return True
    raise HTTPException(status_code=401, detail="Admin authentication required")


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

@router.get("/newsletter", response_model=NewsletterAnalytics)
async def get_newsletter_analytics(
    _admin: bool = Depends(require_admin)
):
    """
    Get detailed newsletter subscription and engagement analytics
    """
    try:
        async with db._pool.acquire() as conn:
            # Basic counts
            total = await conn.fetchval("SELECT COUNT(*) FROM newsletter_preferences")
            unsub = await conn.fetchval("SELECT COUNT(*) FROM newsletter_preferences WHERE unsubscribed = TRUE")
            active = await conn.fetchval("SELECT COUNT(*) FROM newsletter_preferences WHERE unsubscribed = FALSE")
            
            # Distribution (among active)
            weekly = await conn.fetchval("SELECT COUNT(*) FROM newsletter_preferences WHERE unsubscribed = FALSE AND weekly_pulse = TRUE")
            monthly = await conn.fetchval("SELECT COUNT(*) FROM newsletter_preferences WHERE unsubscribed = FALSE AND monthly_dive = TRUE")
            academy = await conn.fetchval("SELECT COUNT(*) FROM newsletter_preferences WHERE unsubscribed = FALSE AND academy = TRUE")
            flash = await conn.fetchval("SELECT COUNT(*) FROM newsletter_preferences WHERE unsubscribed = FALSE AND flash_alerts = TRUE")
            
            # Academy Funnel
            funnel_rows = await conn.fetch("SELECT COALESCE(academy_lesson, 0) as lesson_num, COUNT(*) as cnt FROM newsletter_preferences WHERE academy = TRUE GROUP BY lesson_num ORDER BY lesson_num")
            
            academy_total = sum(r['cnt'] for r in funnel_rows)
            funnel = []
            for i in range(9): # lessons 0 to 8
                count = next((r['cnt'] for r in funnel_rows if r['lesson_num'] == i), 0)
                funnel.append(NewsletterFunnelStep(
                    lesson=i,
                    count=count,
                    percentage=(count / academy_total) * 100 if academy_total > 0 else 0
                ))
            
            from app.services.scheduler import scheduler_service
            
            is_running = False
            if hasattr(scheduler_service, 'scheduler') and hasattr(scheduler_service.scheduler, 'running'):
                is_running = scheduler_service.scheduler.running

            dispatch_rows = await conn.fetch("""
                WITH totals AS (
                    SELECT email_type,
                           COALESCE(SUM(sent_count), 0) AS sent_total,
                           MAX(completed_at) FILTER (WHERE completed_at IS NOT NULL) AS last_sent
                    FROM newsletter_dispatches
                    GROUP BY email_type
                ),
                last_dispatch AS (
                    SELECT DISTINCT ON (email_type)
                           email_type,
                           sent_count AS last_dispatch_sent_count,
                           error_count AS last_dispatch_error_count,
                           completed_at
                    FROM newsletter_dispatches
                    WHERE completed_at IS NOT NULL
                    ORDER BY email_type, completed_at DESC, id DESC
                ),
                preview_rows AS (
                    SELECT DISTINCT ON (email_type)
                           email_type,
                           TRUE AS preview_available
                    FROM newsletter_delivery_logs
                    WHERE delivery_status = 'sent'
                      AND html_content IS NOT NULL
                      AND html_content != ''
                    ORDER BY email_type, created_at DESC, id DESC
                )
                SELECT base.email_type,
                       COALESCE(totals.sent_total, 0) AS sent_total,
                       totals.last_sent,
                       COALESCE(last_dispatch.last_dispatch_sent_count, 0) AS last_dispatch_sent_count,
                       COALESCE(last_dispatch.last_dispatch_error_count, 0) AS last_dispatch_error_count,
                       COALESCE(preview_rows.preview_available, FALSE) AS preview_available
                FROM (
                    VALUES
                        ('weekly_pulse'),
                        ('monthly_dive'),
                        ('academy'),
                        ('flash_alerts')
                ) AS base(email_type)
                LEFT JOIN totals ON totals.email_type = base.email_type
                LEFT JOIN last_dispatch ON last_dispatch.email_type = base.email_type
                LEFT JOIN preview_rows ON preview_rows.email_type = base.email_type
            """)

            subscriber_counts = {
                "weekly_pulse": weekly or 0,
                "monthly_dive": monthly or 0,
                "academy": academy or 0,
                "flash_alerts": flash or 0,
            }
            labels = {
                "weekly_pulse": "Weekly Pulse",
                "monthly_dive": "Monthly Deep Dive",
                "academy": "Starta Academy",
                "flash_alerts": "Flash Alerts",
            }

            dispatch_stats = {row["email_type"]: dict(row) for row in dispatch_rows}
            email_type_metrics = [
                NewsletterEmailTypeAnalytics(
                    key=email_type,
                    label=labels[email_type],
                    subscriber_count=subscriber_counts[email_type],
                    sent_total=int((dispatch_stats.get(email_type) or {}).get("sent_total") or 0),
                    last_sent=(dispatch_stats.get(email_type) or {}).get("last_sent"),
                    last_dispatch_sent_count=int((dispatch_stats.get(email_type) or {}).get("last_dispatch_sent_count") or 0),
                    last_dispatch_error_count=int((dispatch_stats.get(email_type) or {}).get("last_dispatch_error_count") or 0),
                    preview_available=bool((dispatch_stats.get(email_type) or {}).get("preview_available")),
                )
                for email_type in ("weekly_pulse", "monthly_dive", "academy", "flash_alerts")
            ]

            return NewsletterAnalytics(
                total_subscribers=total or 0,
                active_subscribers=active or 0,
                unsubscribed_count=unsub or 0,
                retention_rate=((active / total) * 100) if total and total > 0 else 0.0,
                weekly_pulse_count=weekly or 0,
                monthly_dive_count=monthly or 0,
                academy_count=academy or 0,
                flash_alerts_count=flash or 0,
                academy_funnel=funnel,
                last_weekly_sent=(dispatch_stats.get("weekly_pulse") or {}).get("last_sent"),
                last_monthly_sent=(dispatch_stats.get("monthly_dive") or {}).get("last_sent"),
                last_academy_sent=(dispatch_stats.get("academy") or {}).get("last_sent"),
                last_flash_sent=(dispatch_stats.get("flash_alerts") or {}).get("last_sent"),
                is_scheduler_running=is_running,
                email_types=email_type_metrics,
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/newsletter/preview", response_model=NewsletterLatestPreview)
async def get_newsletter_latest_preview(
    email_type: str = Query(..., regex="^(weekly_pulse|monthly_dive|academy|flash_alerts)$"),
    _admin: bool = Depends(require_admin)
):
    labels = {
        "weekly_pulse": "Weekly Pulse",
        "monthly_dive": "Monthly Deep Dive",
        "academy": "Starta Academy",
        "flash_alerts": "Flash Alerts",
    }

    try:
        async with db._pool.acquire() as conn:
            total_sent = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM newsletter_delivery_logs
                WHERE email_type = $1
                  AND delivery_status = 'sent'
                """,
                email_type,
            ) or 0

            latest_delivery = await conn.fetchrow(
                """
                SELECT l.dispatch_id,
                       l.subject,
                       l.html_content,
                       l.template_variant,
                       l.lesson_number,
                       l.recipient_email,
                       l.recipient_name,
                       l.created_at AS sent_at,
                       d.completed_at AS last_dispatch_at,
                       d.sent_count AS last_dispatch_sent_count,
                       d.error_count AS last_dispatch_error_count
                FROM newsletter_delivery_logs l
                JOIN newsletter_dispatches d ON d.id = l.dispatch_id
                WHERE l.email_type = $1
                  AND l.delivery_status = 'sent'
                ORDER BY l.created_at DESC, l.id DESC
                LIMIT 1
                """,
                email_type,
            )

            if not latest_delivery:
                return NewsletterLatestPreview(
                    email_type=email_type,
                    label=labels[email_type],
                    total_sent=int(total_sent),
                    last_dispatch_at=None,
                    last_dispatch_sent_count=0,
                    last_dispatch_error_count=0,
                    preview_available=False,
                    subject=None,
                    html=None,
                    template_variant=None,
                    lesson_number=None,
                    recipient_email=None,
                    recipient_name=None,
                    recipients=[],
                )

            recipient_rows = await conn.fetch(
                """
                SELECT recipient_email,
                       recipient_name,
                       template_variant,
                       lesson_number,
                       created_at
                FROM newsletter_delivery_logs
                WHERE dispatch_id = $1
                  AND delivery_status = 'sent'
                ORDER BY created_at DESC, id DESC
                """,
                latest_delivery["dispatch_id"],
            )

            return NewsletterLatestPreview(
                email_type=email_type,
                label=labels[email_type],
                total_sent=int(total_sent),
                last_dispatch_at=latest_delivery["last_dispatch_at"],
                last_dispatch_sent_count=int(latest_delivery["last_dispatch_sent_count"] or 0),
                last_dispatch_error_count=int(latest_delivery["last_dispatch_error_count"] or 0),
                preview_available=bool(latest_delivery["html_content"]),
                subject=latest_delivery["subject"],
                html=latest_delivery["html_content"],
                template_variant=latest_delivery["template_variant"],
                lesson_number=latest_delivery["lesson_number"],
                recipient_email=latest_delivery["recipient_email"],
                recipient_name=latest_delivery["recipient_name"],
                recipients=[
                    NewsletterPreviewRecipient(
                        email=row["recipient_email"],
                        full_name=row["recipient_name"],
                        template_variant=row["template_variant"],
                        lesson_number=row["lesson_number"],
                        sent_at=row["created_at"],
                    )
                    for row in recipient_rows
                ],
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


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

            guest_sessions = 0
            # Correct logic: if user_type is 'all' or not specified, we need to calculate guest sessions (user_id IS NULL)
            # if user_type is 'guest', guest_sessions IS total_chats
            # if user_type is 'user', guest_sessions is 0
            if not user_type or user_type == "all":
                 guest_filter, guest_params = build_filter_clause(start, end, "guest", language, 1)
                 guest_sessions = await get_distinct_count(guest_filter, guest_params, "session_id")
            elif user_type == "guest":
                 guest_sessions = total_chats
            
            # Refined Success/Failure logic:
            # A query is a failure if:
            # 1. Fallback triggered (UNKNOWN intent)
            # 2. Handler error
            # 3. No data returned
            # 4. Confidence is low (< 0.5) - matches unresolved_queries logic
            failure_cond = """
                (fallback_triggered = TRUE 
                 OR error_code IS NOT NULL 
                 OR response_has_data = FALSE)
            """
            
            success_count = await get_count(curr_filter, curr_params, 
                f"AND NOT {failure_cond}")
            
            failure_count = await get_count(curr_filter, curr_params, 
                f"AND {failure_cond}")

            out_of_scope = await get_count(curr_filter, curr_params, "AND scope_blocked_reason IS NOT NULL")
            
            # --- PREVIOUS PERIOD (For Trends) ---
            prev_total_msgs = await get_count(prev_filter, prev_params)
            prev_total_chats = await get_distinct_count(prev_filter, prev_params, "session_id")
            prev_unique_users = await get_distinct_count(prev_filter, prev_params, "user_id")
            
            prev_success = await get_count(prev_filter, prev_params,
                f"AND NOT {failure_cond}")
            prev_failure = await get_count(prev_filter, prev_params,
                f"AND {failure_cond}")
            
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

class ChatFeedbackReport(BaseModel):
    id: int
    session_id: str
    user_id: str
    message_id: str
    feedback_type: str
    report_text: Optional[str]
    created_at: datetime
    raw_query: Optional[str]

@router.get("/feedback", response_model=List[ChatFeedbackReport])
async def get_chat_feedback(
    limit: int = Query(50, ge=1, le=200),
    _admin: bool = Depends(require_admin)
):
    """
    Get user feedback reports
    """
    try:
        if not db._pool:
            return []
            
        async with db._pool.acquire() as conn:
            query = """
                SELECT f.id, f.session_id, f.user_id, f.message_id, f.feedback_type, f.report_text, f.created_at,
                       (SELECT raw_text FROM chat_interactions i WHERE i.session_id = f.session_id ORDER BY i.created_at DESC LIMIT 1) as raw_query
                FROM chat_feedback f
                ORDER BY f.created_at DESC
                LIMIT $1
            """
            rows = await conn.fetch(query, limit)
            
            return [
                ChatFeedbackReport(
                    id=row['id'],
                    session_id=row['session_id'],
                    user_id=row['user_id'] or 'guest',
                    message_id=row['message_id'],
                    feedback_type=row['feedback_type'],
                    report_text=row['report_text'],
                    created_at=row['created_at'],
                    raw_query=row['raw_query']
                ) for row in rows
            ]
    except Exception as e:
        print(f"Feedback Report Error: {e}")
        return []


# ============================================================
# GEO DISTRIBUTION ENDPOINT
# ============================================================

class GeoEntry(BaseModel):
    """Country geo distribution entry"""
    country_code: str
    country_name: str
    users: int
    messages: int
    percentage: float

# Country code to name mapping (most common ones)
COUNTRY_NAMES = {
    "EG": "Egypt", "SA": "Saudi Arabia", "AE": "UAE", "KW": "Kuwait",
    "QA": "Qatar", "BH": "Bahrain", "OM": "Oman", "JO": "Jordan",
    "LB": "Lebanon", "IQ": "Iraq", "MA": "Morocco", "TN": "Tunisia",
    "DZ": "Algeria", "LY": "Libya", "SD": "Sudan", "SY": "Syria",
    "PS": "Palestine", "YE": "Yemen",
    "US": "United States", "GB": "United Kingdom", "DE": "Germany",
    "FR": "France", "CA": "Canada", "AU": "Australia", "IN": "India",
    "PK": "Pakistan", "TR": "Turkey", "NL": "Netherlands", "SE": "Sweden",
    "IT": "Italy", "ES": "Spain", "BR": "Brazil", "JP": "Japan",
    "KR": "South Korea", "CN": "China", "SG": "Singapore", "MY": "Malaysia",
    "ID": "Indonesia", "TH": "Thailand", "PH": "Philippines", "NG": "Nigeria",
    "KE": "Kenya", "ZA": "South Africa", "GH": "Ghana", "RU": "Russia",
    "UA": "Ukraine", "PL": "Poland", "CZ": "Czech Republic", "RO": "Romania",
    "HU": "Hungary", "AT": "Austria", "CH": "Switzerland", "BE": "Belgium",
    "PT": "Portugal", "IE": "Ireland", "NO": "Norway", "DK": "Denmark",
    "FI": "Finland", "NZ": "New Zealand", "MX": "Mexico", "CO": "Colombia",
    "AR": "Argentina", "CL": "Chile", "PE": "Peru", "VE": "Venezuela",
}

@router.get("/geo", response_model=List[GeoEntry])
async def get_geo_distribution(
    period: str = Query("30d", regex="^(today|7d|30d|90d)$"),
    _admin: bool = Depends(require_admin)
):
    """
    User Geography Distribution
    Returns country-level breakdown of chatbot usage (ALL users: registered + guest).
    Data comes from chat_analytics.country_code which is resolved from IP on every message.
    """
    start, end = get_date_range(period)
    
    try:
        async with db._pool.acquire() as conn:
            total = await conn.fetchval("""
                SELECT COUNT(*) FROM chat_analytics 
                WHERE created_at >= $1 AND created_at <= $2 AND country_code IS NOT NULL
            """, start, end) or 1
            
            rows = await conn.fetch("""
                SELECT 
                    country_code,
                    COUNT(DISTINCT session_id) as unique_users,
                    COUNT(*) as message_count
                FROM chat_analytics 
                WHERE created_at >= $1 AND created_at <= $2 AND country_code IS NOT NULL
                GROUP BY country_code
                ORDER BY message_count DESC
                LIMIT 20
            """, start, end)
            
            return [
                GeoEntry(
                    country_code=row['country_code'],
                    country_name=COUNTRY_NAMES.get(row['country_code'], row['country_code']),
                    users=row['unique_users'],
                    messages=row['message_count'],
                    percentage=round(row['message_count'] / total * 100, 1)
                )
                for row in rows
            ]
    except Exception as e:
        print(f"Geo Distribution Error: {e}")
        return []
