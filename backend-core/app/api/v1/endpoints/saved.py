"""
SAVED ITEMS — one store behind every "keep this" on the site
============================================================

WHY ONE TABLE AND NOT FIVE
--------------------------
The registration strategy's whole argument is that people register for LEVERAGE
over an answer, not for the answer. Leverage is almost always the same verb:
keep this. Keep this fund, this article, this company, the risk profile I just
worked out, the plan I just modelled.

Building a bespoke table and endpoint per noun would mean five migrations, five
routes and five chances for them to disagree about what "saved" means. It would
also make the sixth thing expensive, which is how a product ends up with a
"save" button on funds and nothing anywhere else.

So: one row shape. `kind` says what it is, `ref_id` says which one, and `payload`
carries a snapshot for the kinds that need one — a risk profile and a calculator
plan are values, not pointers, and a saved plan that silently changed when the
inputs changed would be worse than not saving it.

WHAT THIS IS NOT
----------------
Not a cache of public data. `ref_id` is a pointer to something the site already
publishes for free, and `payload` only ever holds what the USER supplied or the
site computed FOR them. Nothing here is gated content; the fund page, the
article and the company page all stay open to everyone. See
REGISTRATION_STRATEGY.md.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.v1.endpoints.auth import get_current_active_user
from app.db.session import db

router = APIRouter()
logger = logging.getLogger(__name__)

# The nouns the site can keep. A closed set on purpose: an open `kind` becomes a
# junk drawer, and the frontend needs to know what it may ask for.
KINDS = {"fund", "article", "company", "risk_profile", "plan"}

# A saved payload is a snapshot, not a document store. Anything larger than this
# is a sign something is being kept that should have been a pointer.
MAX_PAYLOAD_BYTES = 8_000


class SavedItemIn(BaseModel):
    kind: str = Field(..., description="One of: fund, article, company, risk_profile, plan")
    ref_id: str = Field(..., max_length=128)
    payload: Optional[Dict[str, Any]] = None


async def ensure_schema() -> None:
    """Idempotent. Called at startup, alongside the other table checks."""
    statements = [
        """
        CREATE TABLE IF NOT EXISTS saved_items (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind VARCHAR(24) NOT NULL,
            ref_id VARCHAR(128) NOT NULL,
            payload JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (user_id, kind, ref_id)
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_saved_items_user_kind ON saved_items(user_id, kind)",
    ]
    for statement in statements:
        try:
            await db.execute(statement)
        except Exception as exc:  # pragma: no cover - startup resilience
            logger.error("[saved] schema statement failed: %s", exc)
            return
    logger.info("[saved] schema ensured")


@router.get("/saved", response_model=List[dict])
async def list_saved(
    kind: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user),
):
    """Everything this user has kept, newest first, optionally one kind."""
    if kind and kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"Unknown kind: {kind}")

    if kind:
        rows = await db.fetch_all(
            "SELECT kind, ref_id, payload, created_at FROM saved_items "
            "WHERE user_id = $1 AND kind = $2 ORDER BY created_at DESC",
            current_user["id"], kind,
        )
    else:
        rows = await db.fetch_all(
            "SELECT kind, ref_id, payload, created_at FROM saved_items "
            "WHERE user_id = $1 ORDER BY created_at DESC",
            current_user["id"],
        )
    # asyncpg hands JSONB back as a string; decode it so callers get an object.
    for row in rows:
        if isinstance(row.get("payload"), str):
            try:
                row["payload"] = json.loads(row["payload"])
            except Exception:
                row["payload"] = None
    return rows


@router.post("/saved", response_model=dict)
async def save_item(item: SavedItemIn, current_user: dict = Depends(get_current_active_user)):
    """
    Keep something. Idempotent: saving the same thing twice updates the snapshot
    rather than erroring, because the button that calls this is a toggle and a
    double-tap must not be a failure the reader has to understand.
    """
    if item.kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"Unknown kind: {item.kind}")

    payload_json = None
    if item.payload is not None:
        payload_json = json.dumps(item.payload, ensure_ascii=False)
        if len(payload_json.encode("utf-8")) > MAX_PAYLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Saved payload is too large")

    row = await db.fetch_one(
        """
        INSERT INTO saved_items (user_id, kind, ref_id, payload)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (user_id, kind, ref_id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
        RETURNING kind, ref_id, created_at
        """,
        current_user["id"], item.kind, item.ref_id, payload_json,
    )
    return dict(row) if row else {"status": "saved"}


@router.delete("/saved/{kind}/{ref_id}")
async def unsave_item(kind: str, ref_id: str, current_user: dict = Depends(get_current_active_user)):
    """
    Forget something. Never fails when it was not saved — a toggle that errors
    on the way back out strands the reader on a state they cannot leave.
    """
    if kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"Unknown kind: {kind}")
    await db.execute(
        "DELETE FROM saved_items WHERE user_id = $1 AND kind = $2 AND ref_id = $3",
        current_user["id"], kind, ref_id,
    )
    return {"status": "removed"}
