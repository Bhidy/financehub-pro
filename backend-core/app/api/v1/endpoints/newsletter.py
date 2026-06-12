"""
Newsletter Admin Endpoints
==========================
- POST /newsletter/trigger/weekly   — Manual trigger for Weekly Pulse
- POST /newsletter/trigger/monthly  — Manual trigger for Monthly Deep Dive
- GET  /newsletter/status           — System status
- GET  /newsletter/subscribers      — List subscribers
- GET  /newsletter/preview/weekly   — Preview weekly email HTML
- GET  /newsletter/unsubscribe      — One-click unsubscribe via JWT token
"""

from fastapi import APIRouter, BackgroundTasks, Query, HTTPException, Depends
from pydantic import BaseModel
from jose import jwt, JWTError, ExpiredSignatureError
import logging

from app.db.session import db
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter(prefix="/newsletter", tags=["newsletter"])
logger = logging.getLogger(__name__)

# --- Pydantic Models ---
class NewsletterPreferencesUpdate(BaseModel):
    weekly_pulse: bool = None
    monthly_dive: bool = None
    academy: bool = None
    flash_alerts: bool = None



@router.post("/trigger/weekly")
async def trigger_weekly_pulse(background_tasks: BackgroundTasks):
    """Manually trigger the Weekly Market Pulse email."""
    from app.services.newsletter_service import newsletter_service
    if newsletter_service.is_running:
        return {"status": "skipped", "reason": "Newsletter already in progress"}
    background_tasks.add_task(newsletter_service.send_weekly_pulse)
    return {"status": "triggered", "type": "weekly_pulse", "message": "Weekly Pulse queued. Check /newsletter/status for progress."}


@router.post("/trigger/monthly")
async def trigger_monthly_dive(background_tasks: BackgroundTasks):
    """Manually trigger the Monthly Deep Dive email."""
    from app.services.newsletter_service import newsletter_service
    if newsletter_service.is_running:
        return {"status": "skipped", "reason": "Newsletter already in progress"}
    background_tasks.add_task(newsletter_service.send_monthly_deep_dive)
    return {"status": "triggered", "type": "monthly_dive", "message": "Monthly Deep Dive queued. Check /newsletter/status for progress."}


@router.get("/status")
async def newsletter_status():
    """Get the current newsletter system status."""
    from app.services.newsletter_service import newsletter_service
    status = newsletter_service.get_status()
    persistent_status = await newsletter_service.get_persistent_status()
    status.update({
        "last_weekly_sent": persistent_status.get("last_weekly_sent") or status.get("last_weekly_sent"),
        "last_monthly_sent": persistent_status.get("last_monthly_sent") or status.get("last_monthly_sent"),
        "last_academy_sent": persistent_status.get("last_academy_sent") or status.get("last_academy_sent"),
        "last_flash_sent": persistent_status.get("last_flash_sent") or status.get("last_flash_sent"),
        "totals": persistent_status.get("totals", {}),
    })
    
    # Add subscriber count
    try:
        count = await db.fetch_one("SELECT COUNT(*) as cnt FROM newsletter_preferences WHERE unsubscribed = FALSE")
        status["subscriber_count"] = count['cnt'] if count else 0
    except Exception:
        status["subscriber_count"] = "unknown"
    
    return status


@router.get("/subscribers")
async def list_subscribers(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """List newsletter subscribers."""
    try:
        rows = await db.fetch_all("""
            SELECT np.email, np.full_name, np.weekly_pulse, np.monthly_dive, 
                   np.academy, np.flash_alerts, np.unsubscribed, np.last_sent_at, np.created_at
            FROM newsletter_preferences np
            ORDER BY np.created_at DESC
            LIMIT $1 OFFSET $2
        """, limit, offset)
        total = await db.fetch_one("SELECT COUNT(*) as cnt FROM newsletter_preferences")
        return {
            "subscribers": [dict(r) for r in rows] if rows else [],
            "total": total['cnt'] if total else 0,
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/preview/weekly")
async def preview_weekly_pulse():
    """Preview the Weekly Pulse email HTML (for testing design)."""
    from app.services.newsletter_service import newsletter_service
    from app.services.email_templates import build_weekly_pulse

    egx30 = await newsletter_service._get_egx30_data(7)
    gainers = await newsletter_service._get_top_movers("gainers", 5)
    losers = await newsletter_service._get_top_movers("losers", 5)
    trending = await newsletter_service._get_trending_stocks(7)

    from app.services.newsletter_service import FINANCE_TIPS
    from datetime import datetime
    tip = FINANCE_TIPS[datetime.now().isocalendar()[1] % len(FINANCE_TIPS)]

    html = build_weekly_pulse(
        user_name="Preview User",
        egx30_value=egx30['value'],
        egx30_change_pct=egx30['change_pct'],
        top_gainers=gainers,
        top_losers=losers,
        trending_stocks=trending,
        tip_of_week=tip,
        unsubscribe_url="#",
    )

    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/unsubscribe")
async def unsubscribe(token: str = Query(...)):
    """One-click unsubscribe via JWT token (CAN-SPAM compliant)."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        email = payload.get("email")
        
        if (not user_id and not email) or payload.get("action") != "unsubscribe":
            raise HTTPException(status_code=400, detail="Invalid token")

        if user_id:
            await db.execute("""
                UPDATE newsletter_preferences 
                SET unsubscribed = TRUE, updated_at = NOW() 
                WHERE user_id = $1
            """, user_id)
        else:
            await db.execute("""
                UPDATE newsletter_preferences 
                SET unsubscribed = TRUE, updated_at = NOW() 
                WHERE LOWER(email) = LOWER($1)
            """, email)

        # Return a friendly HTML page
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html><head><title>Unsubscribed — Starta Markets</title>
        <style>
            body {{ font-family: Inter, sans-serif; background: #F1F5F9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }}
            .card {{ background: white; border-radius: 16px; padding: 48px; text-align: center; max-width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }}
            h1 {{ color: #0B1121; font-size: 24px; margin-bottom: 12px; }}
            p {{ color: #64748B; font-size: 15px; line-height: 1.6; }}
            a {{ color: #13B8A6; text-decoration: none; font-weight: 600; }}
        </style>
        </head><body>
        <div class="card">
            <h1>✅ Successfully Unsubscribed</h1>
            <p>You will no longer receive newsletter emails from Starta Markets.</p>
            <p style="margin-top:24px;"><a href="https://startamarkets.com">← Back to Starta Markets</a></p>
        </div>
        </body></html>
        """)

    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")
    except Exception as e:
        logger.error(f"Unsubscribe error: {e}")
        raise HTTPException(status_code=500, detail="Internal error")


@router.post("/trigger/academy")
async def trigger_academy_lessons(background_tasks: BackgroundTasks):
    """Manually trigger the Academy Lessons email."""
    from app.services.newsletter_service import newsletter_service
    if newsletter_service.is_running:
        return {"status": "skipped", "reason": "Newsletter already in progress"}
    background_tasks.add_task(newsletter_service.send_academy_lessons)
    return {"status": "triggered", "type": "academy", "message": "Academy Lessons queued. Check /newsletter/status for progress."}


@router.post("/trigger/flash")
async def trigger_flash_alerts(background_tasks: BackgroundTasks):
    """Manually trigger the Flash Alerts check."""
    from app.services.newsletter_service import newsletter_service
    if newsletter_service.is_running:
        return {"status": "skipped", "reason": "Newsletter already in progress"}
    background_tasks.add_task(newsletter_service.check_and_send_flash_alerts)
    return {"status": "triggered", "type": "flash_alerts", "message": "Flash Alerts check queued."}


@router.get("/preview/academy")
async def preview_academy_lesson(lesson: int = Query(1, ge=1, le=8)):
    """Preview an Academy Lesson HTML (for testing design)."""
    from app.services.email_templates import build_academy_lesson
    from app.services.newsletter_service import ACADEMY_LESSONS

    lesson_data = ACADEMY_LESSONS[lesson - 1]
    next_teaser = ACADEMY_LESSONS[lesson]['title'] if lesson < 8 else ""

    html = build_academy_lesson(
        user_name="Preview User",
        lesson_number=lesson,
        lesson_title=lesson_data['title'],
        lesson_icon=lesson_data['icon'],
        lesson_intro=lesson_data['intro'],
        lesson_sections=lesson_data['sections'],
        try_it_prompt=lesson_data['try_it'],
        next_lesson_teaser=next_teaser,
        unsubscribe_url="#",
    )
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/preview/flash")
async def preview_flash_alert(type: str = Query("crash")):
    """Preview a Flash Alert HTML (for testing design)."""
    from app.services.newsletter_service import newsletter_service
    from app.services.email_templates import build_flash_alert

    affected = await newsletter_service._get_top_movers("losers" if type == "crash" else "gainers", 5)

    headline = "EGX30 Dropped 3.5% Today" if type == "crash" else "COMI Surged 12% Today"
    details = "the EGX30 index experienced a significant decline today." if type == "crash" else "COMI surged 12% today, closing at EGP 85.00."

    html = build_flash_alert(
        user_name="Preview User",
        alert_type=type,
        headline=headline,
        details=details,
        affected_stocks=affected,
        market_context="The market is experiencing high volatility due to macroeconomic factors.",
        unsubscribe_url="#",
    )
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/preferences", response_model=dict)
async def get_preferences(current_user: dict = Depends(get_current_active_user)):
    """Get the current user's newsletter preferences."""
    row = await db.fetch_one("""
        SELECT weekly_pulse, monthly_dive, academy, flash_alerts, unsubscribed
        FROM newsletter_preferences
        WHERE user_id = $1
    """, current_user['id'])
    
    if not row:
        # Default if not yet recorded
        return {
            "weekly_pulse": True,
            "monthly_dive": True,
            "academy": True,
            "flash_alerts": True,
            "unsubscribed": False,
        }
    return dict(row)


@router.put("/preferences", response_model=dict)
async def update_preferences(prefs: NewsletterPreferencesUpdate, current_user: dict = Depends(get_current_active_user)):
    """Update the current user's newsletter preferences."""
    from app.services.newsletter_service import newsletter_service
    
    # Exclude None values
    prefs_dict = {k: v for k, v in prefs.model_dump().items() if v is not None}
    
    if not prefs_dict:
        return {"status": "no_changes"}
        
    res = await newsletter_service.update_preferences(current_user['id'], prefs_dict)
    if res.get("status") == "updated":
        # Unmark unsubscribed if they enable anything
        if any(v is True for v in prefs_dict.values()):
            await db.execute("UPDATE newsletter_preferences SET unsubscribed = FALSE WHERE user_id = $1", current_user['id'])
            
    return res
