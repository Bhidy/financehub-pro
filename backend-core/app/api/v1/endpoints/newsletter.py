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

from fastapi import APIRouter, BackgroundTasks, Query, HTTPException
from jose import jwt, JWTError, ExpiredSignatureError
import logging

from app.db.session import db
from app.core.config import settings

router = APIRouter(prefix="/newsletter", tags=["newsletter"])
logger = logging.getLogger(__name__)


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
    
    # Add subscriber count
    try:
        count = await db.fetch_one("SELECT COUNT(*) as cnt FROM newsletter_preferences WHERE unsubscribed = FALSE")
        status["subscriber_count"] = count['cnt'] if count else 0
    except:
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
        
        if not user_id or payload.get("action") != "unsubscribe":
            raise HTTPException(status_code=400, detail="Invalid token")

        await db.execute("""
            UPDATE newsletter_preferences 
            SET unsubscribed = TRUE, updated_at = NOW() 
            WHERE user_id = $1
        """, user_id)

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
