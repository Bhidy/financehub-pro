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
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Analytics router for Chatbot Analytics Dashboard
from app.api.v1.endpoints import analytics_router
api_router.include_router(analytics_router.router, prefix="/admin/analytics", tags=["analytics"])

api_router.include_router(egx.router, tags=["egx"])  # EGX endpoints at root (/egx/...)

from app.api.v1.endpoints import company
api_router.include_router(company.router, prefix="/company", tags=["company"])
api_router.include_router(egx.router, tags=["egx"])  # EGX endpoints at root (/egx/...)

from app.api.v1.endpoints import yahoo
api_router.include_router(yahoo.router, prefix="/yahoo", tags=["yahoo"])

# Enterprise Portfolio Management
from app.api.v1.endpoints import portfolio
api_router.include_router(portfolio.router, tags=["portfolio"])
