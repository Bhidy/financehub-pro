"""
Fund feedback endpoints
=======================
Public "Was this helpful?" capture for the fund-profile pages. Writes go through the
backend's asyncpg pool (the proven write path), never the frontend's read connection.

Design mirrors the rest of the app:
  * open (no auth) — anyone reading a fund page can vote, like the competitor;
  * self-migrating companion table (idempotent DDL, ensured once per process);
  * best-effort — a write failure returns {"status":"skipped"} with 200, never a 500,
    so a mid-deploy or read-only DB can never surface an error in the widget;
  * light dedupe context (fingerprint / UA) stored for later abuse filtering.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
import logging

from app.db.session import db

router = APIRouter(prefix="/funds", tags=["funds"])
logger = logging.getLogger(__name__)

_ensured = False

_DDL = """
CREATE TABLE IF NOT EXISTS fund_feedback (
    id          BIGSERIAL PRIMARY KEY,
    fund_id     TEXT NOT NULL,
    helpful     BOOLEAN NOT NULL,
    comment     TEXT,
    fingerprint TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fund_feedback_fund ON fund_feedback (fund_id);
"""


class FeedbackIn(BaseModel):
    helpful: bool
    comment: str | None = None


async def _ensure_table() -> None:
    """Create the companion table on first use (idempotent). Best-effort: if the DB is
    read-only during a Supabase incident, we simply skip and retry next request."""
    global _ensured
    if _ensured:
        return
    try:
        await db.execute(_DDL)
        _ensured = True
    except Exception as e:  # noqa: BLE001 - never let DDL break a public POST
        logger.warning(f"fund_feedback DDL skipped: {e}")


@router.post("/{fund_id}/feedback")
async def submit_feedback(fund_id: str, payload: FeedbackIn, request: Request):
    """Record a helpful / not-helpful vote (+ optional comment) for a fund page. Public."""
    await _ensure_table()
    fid = str(fund_id)[:50]
    fp = ((request.headers.get("x-device-fingerprint") or
           (request.client.host if request.client else "") or "")[:120]) or None
    ua = (request.headers.get("user-agent") or "")[:300]
    comment = (payload.comment or "").strip()[:500] or None
    helpful = bool(payload.helpful)
    try:
        # De-dupe the two-phase flow (vote, then optional comment) into ONE row per
        # visitor+fund: the comment submit UPDATES the existing vote instead of inserting
        # again, so feedback_summary never double-counts. Anonymous rows (no fingerprint)
        # can't be matched, so they insert (rare, acceptable).
        existing = None
        if fp:
            existing = await db.fetch_one(
                "SELECT id FROM fund_feedback WHERE fund_id = $1 AND fingerprint = $2 "
                "AND created_at > NOW() - INTERVAL '2 days' ORDER BY created_at DESC LIMIT 1",
                fid, fp,
            )
        if existing:
            await db.execute(
                "UPDATE fund_feedback SET helpful = $2, comment = COALESCE($3, comment), "
                "created_at = NOW() WHERE id = $1",
                existing["id"], helpful, comment,
            )
        else:
            await db.execute(
                "INSERT INTO fund_feedback (fund_id, helpful, comment, fingerprint, user_agent) "
                "VALUES ($1, $2, $3, $4, $5)",
                fid, helpful, comment, fp, ua,
            )
        return {"status": "ok"}
    except Exception as e:  # noqa: BLE001 - widget UX is best-effort; never 500
        logger.warning(f"fund_feedback write failed for {fund_id}: {e}")
        return {"status": "skipped"}


@router.get("/{fund_id}/feedback/summary")
async def feedback_summary(fund_id: str):
    """Aggregate votes for a fund (admin / future insight use). Public, read-only."""
    try:
        row = await db.fetch_one(
            "SELECT COUNT(*) AS total, "
            "COUNT(*) FILTER (WHERE helpful) AS helpful, "
            "COUNT(*) FILTER (WHERE NOT helpful) AS not_helpful "
            "FROM fund_feedback WHERE fund_id = $1",
            str(fund_id)[:50],
        )
        if not row:
            return {"total": 0, "helpful": 0, "not_helpful": 0}
        return {"total": row["total"], "helpful": row["helpful"], "not_helpful": row["not_helpful"]}
    except Exception:  # noqa: BLE001
        return {"total": 0, "helpful": 0, "not_helpful": 0}
