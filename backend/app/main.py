from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import threading

# Imports from our new structure
from app.core.config import settings
from app.db.session import db
from app.api.v1.router import api_router
from engine.scheduler import start_scheduler

import asyncio

# Global loop reference for threads
main_event_loop = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    
    await db.connect()
    
    # Phase 9: Start Automation Engine
    scheduler_thread = threading.Thread(target=start_scheduler, daemon=True)
    scheduler_thread.start()
    
    yield
    # Shutdown
    await db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "https://*.vercel.app",
        "https://financehub.pro",
        "https://www.financehub.pro",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"status": "ok", "version": "v1", "db": "connected" if db._pool else "disconnected"}

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway/load balancers."""
    try:
        # Quick DB ping
        if db._pool:
            async with db._pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            db_status = "healthy"
        else:
            db_status = "not_connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "version": "1.0.0",
        "environment": "production"
    }
