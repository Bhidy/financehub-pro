from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import threading
import os

# Imports from our new structure
from app.core.config import settings
from app.db.session import db
from app.api.v1.router import api_router
from app.services.scheduler import scheduler_service  # CRITICAL: Added missing import

import asyncio
import sys

# Global loop reference for threads
main_event_loop = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    
    # Non-blocking startup - catch ALL errors to ensure app starts
    try:
        await db.connect()
        
        # Create chatbot tables if they don't exist (idempotent)
        if db._pool:
            async with db._pool.acquire() as conn:
                # ============================================================
                # AUTH & MIGRATION TABLES (Added 2026-01-08)
                # ============================================================
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        hashed_password VARCHAR(255) NOT NULL,
                        full_name VARCHAR(255),
                        role VARCHAR(50) DEFAULT 'user',
                        is_active BOOLEAN DEFAULT TRUE,
                        phone VARCHAR(20),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        last_login TIMESTAMP WITH TIME ZONE,
                        email_verified BOOLEAN DEFAULT FALSE
                    )
                """)
                # Ensure columns exist if table already existed (idempotent ALTER)
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE")
                
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
                
                # Guest Sessions
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS guest_sessions (
                        id SERIAL PRIMARY KEY,
                        device_fingerprint VARCHAR(64) NOT NULL,
                        ip_address VARCHAR(45),
                        question_count INT DEFAULT 0,
                        first_question_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        last_question_at TIMESTAMP WITH TIME ZONE,
                        converted_user_id INT, 
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        UNIQUE(device_fingerprint),
                        FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL
                    )
                """)
                # Create default admin if not exists
                try:
                    await conn.execute("""
                        INSERT INTO users (email, hashed_password, full_name, role, is_active, created_at)
                        VALUES (
                            'admin@finhub.pro',
                            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4FVl.F1eHwE7LPnq',
                            'System Admin',
                            'admin',
                            TRUE,
                            NOW()
                        ) ON CONFLICT (email) DO NOTHING
                    """)
                except Exception as e:
                    print(f"Admin creation check failed/skipped: {e}")

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS fund_aliases (
                        id SERIAL PRIMARY KEY,
                        alias_text VARCHAR(255) NOT NULL,
                        alias_text_norm VARCHAR(255) NOT NULL,
                        fund_id VARCHAR(20) NOT NULL,
                        priority INT DEFAULT 1,
                        created_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE(alias_text_norm, fund_id)
                    )
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        session_id VARCHAR(64) PRIMARY KEY,
                        user_id VARCHAR(64),
                        last_symbol VARCHAR(20),
                        last_fund_id VARCHAR(20),
                        last_intent VARCHAR(50),
                        last_range VARCHAR(10),
                        last_market VARCHAR(10),
                        language VARCHAR(5) DEFAULT 'en',
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS chat_analytics (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(64),
                        message_text TEXT,
                        detected_intent VARCHAR(50),
                        confidence DECIMAL(5,4),
                        entities JSONB,
                        response_time_ms INT,
                        fallback_triggered BOOLEAN DEFAULT FALSE,
                        language VARCHAR(5),
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # ============================================================
                # ENTERPRISE ANALYTICS TABLES (Added 2026-01-13)
                # Chatbot Analytics Dashboard - ADDITIVE ONLY
                # ============================================================
                
                # Comprehensive interaction logging
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS chat_interactions (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(64),
                        user_id INT,
                        platform VARCHAR(20) DEFAULT 'web',
                        language_detected VARCHAR(5),
                        raw_text TEXT,
                        normalized_text TEXT,
                        detected_intent VARCHAR(50),
                        confidence DECIMAL(5,4),
                        entities_json JSONB,
                        resolved_symbol VARCHAR(20),
                        resolver_method VARCHAR(20),
                        scope_blocked_reason VARCHAR(50),
                        handler_name VARCHAR(50),
                        response_has_data BOOLEAN DEFAULT FALSE,
                        cards_count INT DEFAULT 0,
                        fallback_triggered BOOLEAN DEFAULT FALSE,
                        error_code VARCHAR(50),
                        latency_total_ms INT,
                        latency_nlu_ms INT,
                        latency_resolver_ms INT,
                        latency_db_ms INT,
                        actions_shown JSONB,
                        action_clicked VARCHAR(100),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_interactions_session ON chat_interactions(session_id)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_interactions_intent ON chat_interactions(detected_intent)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_interactions_created ON chat_interactions(created_at)")
                
                # Session-level analytics
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS chat_session_summary (
                        session_id VARCHAR(64) PRIMARY KEY,
                        user_id INT,
                        start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        end_at TIMESTAMP WITH TIME ZONE,
                        messages_count INT DEFAULT 0,
                        success_count INT DEFAULT 0,
                        failure_count INT DEFAULT 0,
                        last_intent VARCHAR(50),
                        last_symbol VARCHAR(20),
                        primary_language VARCHAR(5) DEFAULT 'en',
                        device_fingerprint VARCHAR(64)
                    )
                """)
                
                # Unresolved queries admin queue
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS unresolved_queries (
                        id SERIAL PRIMARY KEY,
                        interaction_id INT,
                        raw_text TEXT NOT NULL,
                        language VARCHAR(5),
                        detected_intent VARCHAR(50),
                        confidence DECIMAL(5,4),
                        failure_reason VARCHAR(50) NOT NULL,
                        admin_status VARCHAR(20) DEFAULT 'pending',
                        admin_notes TEXT,
                        resolved_by INT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        resolved_at TIMESTAMP WITH TIME ZONE
                    )
                """)
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_unresolved_status ON unresolved_queries(admin_status)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_unresolved_reason ON unresolved_queries(failure_reason)")
                
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_unresolved_reason ON unresolved_queries(failure_reason)")
                
                # Verification Codes (OTP) - Added 2026-01-13
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS verification_codes (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        code VARCHAR(10) NOT NULL,
                        type VARCHAR(50) DEFAULT 'PASSWORD_RESET',
                        expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                        used BOOLEAN DEFAULT FALSE,
                        attempts INTEGER DEFAULT 0
                    )
                """)
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_verification_code_lookup ON verification_codes(email, code, used, expires_at)")

                print("Enterprise Analytics tables verified/created.")
                print("Chatbot tables verified/created.")
    except Exception as e:
        print(f"DATABASE STARTUP ERROR (non-fatal): {e}")
    
    # Only start scheduler in LOCAL/development mode (not on Railway/HF Spaces/production)
    # HF Spaces sets SPACE_ID, Railway sets RAILWAY_ENVIRONMENT
    is_production = (
        os.environ.get("RAILWAY_ENVIRONMENT") is not None or 
        os.environ.get("RAILWAY_SERVICE_NAME") is not None or
        os.environ.get("SPACE_ID") is not None  # HF Spaces
    )
    
    if not is_production:
        try:
            from engine.scheduler import start_scheduler
            scheduler_thread = threading.Thread(target=start_scheduler, daemon=True)
            scheduler_thread.start()
            print("DEV MODE: Scheduler started.")
        except Exception as e:
            print(f"SCHEDULER STARTUP ERROR (non-fatal): {e}")
    else:
        print("PRODUCTION MODE: Scheduler disabled. Data extraction via GitHub Actions.")
    # The scheduler is now started via @app.on_event("startup")
    # This block is no longer needed here.
    is_production = (
        os.environ.get("RAILWAY_ENVIRONMENT") is not None or 
        os.environ.get("RAILWAY_SERVICE_NAME") is not None or
        os.environ.get("SPACE_ID") is not None  # HF Spaces
    )
    
    # if not is_production:
    #     try:
    # The previous conditional scheduler start is removed.
    # The scheduler is now started via scheduler_service.start() unconditionally.
    if is_production:
        print("PRODUCTION MODE: Scheduler logic unified via SchedulerService.")
        
    # Always start the robust scheduler service (checks its own schedule)
    try:
        scheduler_service.start()
        print("SCHEDULER SERVICE STARTED.")
    except Exception as e:
        print(f"SCHEDULER SERVICE START ERROR: {e}")
        
    # CHIEF EXPERT PROTOCOL: Async Seeder (Non-Blocking)
    # This ensures the API starts (200 OK) immediately, and data loads in background.
    try:
        if is_production:
            print("🚀 TRIGGERING ASYNC PRODUCTION SEEDER...")
            async def run_seeder_safe():
                try:
                    # Give the server 5 seconds to settle
                    await asyncio.sleep(5)
                    print("🔄 ASYNC SEEDER: Starting...")
                    # We run the seeder script as a subprocess to keep it isolated/clean
                    # Resolving script path relative to this file
                    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    # If this file is in app/ (hf-space/app/), scripts is in ../scripts
                    # Correct path logic:
                    script_path = os.path.join(base_dir, '..', 'scripts', 'prod_seeder.py')
                    if not os.path.exists(script_path):
                        # Try flat layout (hf-space root)
                        script_path = os.path.join(base_dir, '..', 'hf-space', 'scripts', 'prod_seeder.py')
                    
                    if not os.path.exists(script_path):
                        # Try fallback for local
                        script_path = os.path.join(os.getcwd(), 'scripts', 'prod_seeder.py')
                        
                    if os.path.exists(script_path):
                        proc = await asyncio.create_subprocess_exec(
                            sys.executable, script_path,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        stdout, stderr = await proc.communicate()
                        if proc.returncode == 0:
                            print(f"✅ ASYNC SEEDER COMPLETE:\n{stdout.decode()[:500]}...")
                        else:
                            print(f"❌ ASYNC SEEDER FAILED (Exit {proc.returncode}):\n{stderr.decode()}")
                    else:
                        print(f"⚠️ ASYNC SEEDER SKIPPED: Script not found at {script_path}")
                except Exception as ex:
                    print(f"❌ ASYNC SEEDER EXCEPTION: {ex}")
            
            asyncio.create_task(run_seeder_safe())
    except Exception as e:
        print(f"ASYNC SEEDER LAUNCH ERROR: {e}")
    
    yield
    # Shutdown
    try:
        await db.close()
    except Exception as e:
        print(f"DATABASE SHUTDOWN ERROR (non-fatal): {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.5",
    lifespan=lifespan
)
# Removed deprecated @app.on_event("startup") - handled in lifespan

# Set all CORS enabled origins - allow all for production
# Enterprise CORS Configuration - Strict & Secure
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://finhub-pro.vercel.app",        # Production
        "http://localhost:3000",                # Local Dev
        "http://localhost:3001",
        "https://huggingface.co",               # HF Spaces UI
    ],
    allow_credentials=True, # Critical for Auth Headers
    allow_methods=["*"],
    allow_headers=["*", "X-Market-Context", "X-Device-Fingerprint", "Authorization"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/debug/auth-check")
async def debug_auth_check():
    import traceback
    result = {"log": []}
    def log(msg): result["log"].append(str(msg))
    
    try:
        log("Importing security modules...")
        from app.core.security import get_password_hash, create_access_token, verify_password
        log("Imports successful.")
        
        log("Testing BCrypt hashing...")
        pw = "TestPass123"
        hashed = get_password_hash(pw)
        log(f"Hash created: {hashed[:10]}...")
        
        log("Testing Verify...")
        valid = verify_password(pw, hashed)
        log(f"Verify result: {valid}")
        
        log("Testing Token Creation...")
        token = create_access_token({"sub": "test@example.com"})
        log(f"Token created: {token[:10]}...")
        
        log("Testing DB Insert (Rollback)...")
        if db._pool:
            async with db._pool.acquire() as conn:
                async with conn.transaction():
                    # Try to insert a dummy user
                    email = f"debug_{os.urandom(4).hex()}@example.com"
                    try:
                        query = """
                            INSERT INTO users (email, hashed_password, full_name, role, is_active, created_at)
                            VALUES ($1, $2, 'Debug User', 'user', TRUE, NOW())
                            RETURNING id
                        """
                        # We don't include 'phone' to test if it's nullable or if default works, 
                        # OR include it if we want to test that column.
                        # Let's test basic insert first.
                        row = await conn.fetchrow(query, email, hashed)
                        log(f"User inserted with ID: {row['id']}")
                        raise Exception("Rollback for test") # Force rollback
                    except Exception as inner_e:
                        if str(inner_e) == "Rollback for test":
                            log("DB Transaction Rollback Successful.")
                        else:
                            log(f"DB Insert Failed: {inner_e}")
                            raise inner_e
        else:
            log("DB Pool not connected!")
            
    except Exception as e:
        log(f"CRITICAL ERROR: {e}")
        log(traceback.format_exc())
        
    return result

@app.get("/")
async def root():
    return {
        "status": "ok", 
        "version": app.version, 
        "build_timestamp": "2026-01-14 15:50:00 UTC",
        "db": "connected" if db._pool else "disconnected"
    }

@app.get("/debug/funds")
async def debug_funds_endpoint():
    import traceback
    result = {"log": []}
    def log(msg): result["log"].append(str(msg))
    
    try:
        log("Testing Fund Search...")
        if not db._pool: await db.connect()
        async with db._pool.acquire() as conn:
            from app.chat.handlers.fund_handler import handle_fund_search
            # Try simple execution
            try:
                # Mock result for simple select
                res = await handle_fund_search(conn)
                log(f"Success! Keys: {res.keys()}")
                log(f"Message: {res.get('message')[:50]}...")
            except Exception as e:
                log(f"Handler Error: {e}")
                log(traceback.format_exc())
                
    except Exception as e:
        log(f"Connection Error: {e}")
        log(traceback.format_exc())
        
    return result

@app.get("/debug/nlu")
async def debug_nlu_endpoint(text: str = "Hello"):
    import traceback
    result = {"text": text, "log": [], "prediction": None}
    
    try:
        from app.chat.intent_router import IntentRouter
        # Instantiate router (which loads NLU lazy or we can try importing Engine directly)
        from app.chat.nlu.engine import NLUEngine
        
        # Determine if we can re-use existing router or need new one
        # For debug, let's try new Engine
        nlu = NLUEngine()
        if nlu.enabled:
            intent, score = nlu.predict_intent(text)
            result["prediction"] = {"intent": intent, "score": score}
            result["log"].append("NLU Engine Enabled and Prediction Success")
        else:
            result["log"].append("NLU Engine Disabled (Import Failed?)")
            
    except Exception as e:
        result["log"].append(f"Error: {e}")
        result["log"].append(traceback.format_exc())
        
    return result

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway/load balancers."""
    db_status = "unknown"
    db_host = "unknown"
    ss_cols = []
    try:
        # Quick DB ping
        if db._pool:
            async with db._pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
                db_host = await conn.fetchval("SELECT current_setting('listen_addresses')") # Not very helpful
                # Better: get host from DSN
                db_status = "healthy"
                
                # Check columns of stock_statistics
                cols = await conn.fetch("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'stock_statistics'
                """)
                ss_cols = [r['column_name'] for r in cols]
        else:
            db_status = "not_connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "db_info": {"ss_cols": ss_cols},
        "version": app.version,
        "environment": "production"
    }
