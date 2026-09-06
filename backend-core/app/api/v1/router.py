from fastapi import APIRouter
from app.api.v1.endpoints import auth, market, trading, ai, user, admin, egx, otp_auth, google_auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(otp_auth.router, prefix="/auth", tags=["otp_auth"])
api_router.include_router(google_auth.router, prefix="/auth", tags=["google_auth"])

api_router.include_router(market.router, tags=["market"]) # Market endpoints usually root or /market? Legacy was root for many.
# Per legacy api.py:
# /tickers -> root
# /auth/token -> /auth/token

# To maintain compatibility with frontend, we might need tricky prefixing.
# Frontend calls:
# /tickers -> /api/v1/tickers (if we mount api_router at /api/v1)
# /auth/token -> /api/v1/auth/token

# Let's check frontend/lib/api.ts later. Ideally we mount everything under /api/v1 and update frontend.
# For now, let's structure it cleanly.

api_router.include_router(trading.router, tags=["trading"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
from app.api.v1.endpoints import websockets
api_router.include_router(websockets.router, tags=["websockets"])
api_router.include_router(user.router, prefix="/user", tags=["user"])
# "Keep this" for every noun on the site — funds, articles, companies, a risk
# profile, a modelled plan. Mounted under /user because it is per-account state,
# and every route inside requires a session.
try:
    from app.api.v1.endpoints import saved as _saved
    api_router.include_router(_saved.router, prefix="/user", tags=["saved"])
except Exception as _saved_error:  # pragma: no cover - never take the API down for one router
    import logging
    logging.getLogger(__name__).error(f"saved router not mounted: {_saved_error}")
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Analytics router for Chatbot Analytics Dashboard
from app.api.v1.endpoints import analytics_router
api_router.include_router(analytics_router.router, prefix="/admin/analytics", tags=["analytics"])

api_router.include_router(egx.router, tags=["egx"])  # EGX endpoints at root (/egx/...)

from app.api.v1.endpoints import company
api_router.include_router(company.router, prefix="/company", tags=["company"])
# (duplicate egx.router mount removed 2026-06-11 — it was registered twice)

from app.api.v1.endpoints import yahoo
api_router.include_router(yahoo.router, prefix="/yahoo", tags=["yahoo"])

# Enterprise Portfolio Management
from app.api.v1.endpoints import portfolio
api_router.include_router(portfolio.router, tags=["portfolio"])

# Financial Statements Excel Export
from app.api.v1.endpoints import financials_export
api_router.include_router(financials_export.router, tags=["financials"])

# Newsletter System
from app.api.v1.endpoints import newsletter
api_router.include_router(newsletter.router, tags=["newsletter"])

# Stripe Subscriptions
from app.api.v1.endpoints import subscriptions, stripe_webhooks
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(stripe_webhooks.router, prefix="/stripe", tags=["stripe"])

# Fund feedback ("was this helpful?") — router carries its own /funds prefix →
# final path /api/v1/funds/{id}/feedback (matches the frontend /api/proxy call).
from app.api.v1.endpoints import funds
api_router.include_router(funds.router, tags=["funds"])

