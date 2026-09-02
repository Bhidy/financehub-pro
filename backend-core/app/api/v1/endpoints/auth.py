from fastapi import APIRouter, Depends, HTTPException, status, Header, Request, Response, Cookie
from asyncpg.exceptions import UniqueViolationError
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, validator
from datetime import timedelta, datetime
from typing import Annotated, Optional
from jose import JWTError, jwt
import re

from app.db.session import db
from app.core.security import verify_password, create_access_token, get_password_hash, create_refresh_token
from app.core.config import settings
from app.core.rate_limit import SlidingWindowLimiter, client_key, enforce
from app.core.identity import normalize_email

router = APIRouter()

# ── Abuse control ────────────────────────────────────────────────────────
# Neither endpoint had ANY throttle: account creation and password grinding
# were both free.
#
# THE PER-IP BUDGET IS ONLY AS GOOD AS THE CLIENT IP. Traffic arrives through
# the Next.js proxy on Vercel, which calls this API server-side — so unless the
# proxy forwards the visitor's address, every signup on the site shares ONE
# bucket. It did, briefly, and a 5/hour per-IP budget became 5/hour for the
# whole site (caught in production QA: the third unrelated request got a 429).
# The proxy now sends the visitor's address as the first X-Forwarded-For entry,
# which is what client_key() reads.
#
# Because that header is caller-supplied, the per-IP budget is best-effort
# abuse control, NOT a security boundary. The control that actually matters is
# _LOGIN_ACCOUNT_LIMITER: it is keyed on the email being attacked, so a
# distributed credential-stuffing run against one victim is throttled no matter
# how many addresses it comes from, and it cannot be spoofed away.
_SIGNUP_IP_LIMITER = SlidingWindowLimiter(limit=10, window_seconds=3600)
_LOGIN_IP_LIMITER = SlidingWindowLimiter(limit=30, window_seconds=900)
_LOGIN_ACCOUNT_LIMITER = SlidingWindowLimiter(limit=10, window_seconds=900)

# Backstop against a flood that rotates (or forges) addresses. Deliberately set
# FAR above real signup volume — its job is to bound a runaway, never to be the
# thing a normal day hits. If this ever fires in normal use, raise it; do not
# lower it, because everything behind it is a real person who cannot register.
_SIGNUP_GLOBAL_LIMITER = SlidingWindowLimiter(limit=300, window_seconds=3600)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token", auto_error=False)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ============================================================
# SCHEMAS
# ============================================================

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    email: str | None = None

class User(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    phone: str | None = None
    role: str
    is_active: bool
    subscription_status: str | None = None
    subscription_plan: str | None = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    phone: str | None = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class GuestUsageResponse(BaseModel):
    question_count: int
    can_ask: bool
    remaining: int


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None

# ============================================================
# HELPER FUNCTIONS
# ============================================================

async def get_user_by_email(email: str):
    """
    Look a user up case-insensitively.

    LOWER(email) rather than a plain match so accounts created BEFORE
    normalisation shipped stay reachable. Add the matching functional index
    when the table outgrows a sequential scan:
        CREATE UNIQUE INDEX CONCURRENTLY users_email_lower_key
            ON users (LOWER(email));
    That index is also what will make the duplicate rows impossible rather than
    merely unlikely — see the signup handler's unique-violation branch.
    """
    query = "SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id LIMIT 1"
    user = await db.fetch_one(query, email.strip())
    return dict(user) if user else None

async def get_current_user_optional(token: Annotated[str | None, Depends(oauth2_scheme)]):
    """Get current user if authenticated, None otherwise"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    
    user = await get_user_by_email(email)
    return user

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_email(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: Annotated[dict, Depends(get_current_user)]):
    if not current_user['is_active']:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def require_admin(current_user: Annotated[dict, Depends(get_current_active_user)]):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Set refresh cookie for cross-origin frontend usage.
    samesite=None is required because frontend and backend are on different domains.
    """
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

# ============================================================
# AUTH ENDPOINTS
# ============================================================

@router.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
):
    # Two budgets: one per source address (stops a single host grinding many
    # accounts) and one per account (stops a distributed grind on one victim).
    # The per-IP budget is checked first so a botnet cannot exhaust a victim's
    # per-account budget cheaply from one machine.
    email = normalize_email(form_data.username)
    enforce(_LOGIN_IP_LIMITER, client_key(request), "Too many sign-in attempts. Please try again later.")
    enforce(_LOGIN_ACCOUNT_LIMITER, f"acct:{email}", "Too many sign-in attempts. Please try again later.")

    user = await get_user_by_email(email)
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    await db.execute("UPDATE users SET last_login = $1 WHERE id = $2", datetime.utcnow(), user['id'])
    
    access_token = create_access_token(
        data={"sub": user['email'], "role": user['role']}
    )
    refresh_token = create_refresh_token(
        data={"sub": user['email'], "role": user['role']}
    )
    
    _set_refresh_cookie(response, refresh_token)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user.get('full_name'),
            "phone": user.get('phone'),
            "role": user['role'],
            "subscription_status": user.get('subscription_status', 'none'),
            "subscription_plan": user.get('subscription_plan'),
        }
    }

@router.post("/login", response_model=Token)
async def login_json(request: Request, req: LoginRequest, response: Response):
    # Same budgets as /token — this is the JSON twin of the same grant and was
    # an unthrottled way around it.
    email = normalize_email(req.email)
    enforce(_LOGIN_IP_LIMITER, client_key(request), "Too many sign-in attempts. Please try again later.")
    enforce(_LOGIN_ACCOUNT_LIMITER, f"acct:{email}", "Too many sign-in attempts. Please try again later.")

    user = await get_user_by_email(email)
    if not user or not verify_password(req.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user['email'], "role": user['role']})
    refresh_token = create_refresh_token(data={"sub": user['email'], "role": user['role']})
    
    _set_refresh_cookie(response, refresh_token)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user.get('full_name'),
            "phone": user.get('phone'),
            "role": user['role'],
            "subscription_status": user.get('subscription_status', 'none'),
            "subscription_plan": user.get('subscription_plan')
        }
    }

@router.post("/register")
async def register_alias(request: Request, reg: RegisterRequest, response: Response):
    return await signup(request, reg, response)

@router.post("/signup")
async def signup(request: Request, reg: RegisterRequest, response: Response):
    """
    Create an account and sign the user straight in.

    Three defects fixed here (all reproduced against production):

    1. RAW DB ERRORS WERE PUBLIC. The old handler wrapped everything in
       `except Exception` and returned f"Signup Database Error: {e}" — verbatim
       Postgres text, i.e. table and column names, handed to anonymous callers.
       Errors are now logged server-side and answered generically.
    2. DUPLICATES UNDER A RACE. Existence was checked and then inserted with no
       handling for the window between them, so two concurrent signups for the
       same address produced a unique violation that fell into that same
       `except` and surfaced as a 500. It is now caught and answered 400, the
       same as the non-racing case.
    3. EMPTY NAMES. `full_name: ""` was accepted, producing accounts that
       render as a blank identity everywhere in the UI.
    """
    enforce(
        _SIGNUP_IP_LIMITER,
        client_key(request),
        "Too many accounts created from this address. Please try again later.",
    )
    enforce(
        _SIGNUP_GLOBAL_LIMITER,
        "global",
        "Sign-ups are temporarily rate limited. Please try again shortly.",
    )

    email = normalize_email(reg.email)
    full_name = (reg.full_name or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    phone = (reg.phone or "").strip() or None

    if await get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = get_password_hash(reg.password)
    query = """
        INSERT INTO users (email, hashed_password, full_name, phone, role, is_active, created_at)
        VALUES ($1, $2, $3, $4, 'user', TRUE, NOW())
        RETURNING id, email, full_name, phone, role, is_active
    """
    try:
        user = await db.fetch_one(query, email, hashed_pw, full_name, phone)
    except UniqueViolationError:
        # Lost the race against a concurrent signup for the same address.
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        print(f"Signup Error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Could not create the account")

    if not user:
        print("Signup Error: INSERT ... RETURNING produced no row")
        raise HTTPException(status_code=500, detail="Could not create the account")

    access_token = create_access_token(data={"sub": user['email'], "role": user['role']})
    refresh_token = create_refresh_token(data={"sub": user['email'], "role": user['role']})

    _set_refresh_cookie(response, refresh_token)

    return {
        "message": "Registration successful",
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        # Same shape /token and /login return. It used to omit the subscription
        # fields, so a just-registered user and a just-logged-in user handed the
        # frontend two different objects for the same person.
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user.get('full_name'),
            "phone": user.get('phone'),
            "role": user['role'],
            "is_active": user['is_active'],
            "subscription_status": "none",
            "subscription_plan": None,
        }
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    response: Response,
    payload: Optional[RefreshRequest] = None,
    refresh_token_cookie: str | None = Cookie(None, alias="refresh_token"),
):
    refresh_token = payload.refresh_token if payload and payload.refresh_token else refresh_token_cookie
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        token_type = payload.get("type")
        
        if not email or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        user = await get_user_by_email(email)
        if not user or not user.get('is_active', True):
            raise HTTPException(status_code=401, detail="Invalid user or inactive")
            
        access_token = create_access_token(data={"sub": user['email'], "role": user['role']})
        new_refresh_token = create_refresh_token(data={"sub": user['email'], "role": user['role']})
        _set_refresh_cookie(response, new_refresh_token)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": new_refresh_token,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "full_name": user.get('full_name'),
                "role": user['role'],
                "subscription_status": user.get('subscription_status', 'none'),
                "subscription_plan": user.get('subscription_plan')
            }
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


@router.post("/bootstrap-refresh", response_model=Token)
async def bootstrap_refresh_session(
    response: Response,
    current_user: Annotated[dict, Depends(get_current_active_user)],
):
    """
    Issue a fresh access+refresh token pair for already-authenticated users.
    This helps migrate older sessions that were created before refresh token
    persistence was added to the frontend local storage.
    """
    access_token = create_access_token(
        data={"sub": current_user['email'], "role": current_user['role']}
    )
    refresh_token = create_refresh_token(
        data={"sub": current_user['email'], "role": current_user['role']}
    )
    _set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": {
            "id": current_user['id'],
            "email": current_user['email'],
            "full_name": current_user.get('full_name'),
            "role": current_user['role'],
            "subscription_status": current_user.get('subscription_status', 'none'),
            "subscription_plan": current_user.get('subscription_plan')
        }
    }

@router.get("/me")
async def get_current_user_info(current_user: Annotated[dict, Depends(get_current_active_user)]):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "full_name": current_user.get('full_name'),
        "phone": current_user.get('phone'),
        "role": current_user['role'],
        "is_active": current_user['is_active'],
        "subscription_status": current_user.get('subscription_status', 'none'),
        "subscription_plan": current_user.get('subscription_plan')
    }

@router.put("/me")
async def update_current_user(
    update_data: UserUpdate,
    current_user: Annotated[dict, Depends(get_current_active_user)]
):
    """Update current user profile"""
    query = """
        UPDATE users 
        SET full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone)
        WHERE id = $3
        RETURNING id, email, full_name, phone, role, is_active
    """
    updated_user = await db.fetch_one(
        query, 
        update_data.full_name, 
        update_data.phone, 
        current_user['id']
    )
    
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return dict(updated_user)

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: Annotated[dict, Depends(get_current_active_user)]
):
    """Change current user password"""
    # Verify old password
    if not verify_password(password_data.old_password, current_user['hashed_password']):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    # Update with new password
    new_hash = get_password_hash(password_data.new_password)
    
    await db.execute(
        "UPDATE users SET hashed_password = $1 WHERE id = $2",
        new_hash,
        current_user['id']
    )
    
    return {"message": "Password updated successfully"}

# ============================================================
# GUEST USAGE TRACKING
# ============================================================

GUEST_QUESTION_LIMIT = 1

@router.get("/check-guest-usage", response_model=GuestUsageResponse)
async def check_guest_usage(
    x_device_fingerprint: str = Header(None, alias="X-Device-Fingerprint"),
    x_forwarded_for: str = Header(None, alias="X-Forwarded-For")
):
    """Check guest usage count for a device fingerprint"""
    if not x_device_fingerprint:
        return GuestUsageResponse(question_count=0, can_ask=True, remaining=GUEST_QUESTION_LIMIT)
    
    query = "SELECT question_count FROM guest_sessions WHERE device_fingerprint = $1"
    result = await db.fetch_one(query, x_device_fingerprint)
    
    if not result:
        return GuestUsageResponse(question_count=0, can_ask=True, remaining=GUEST_QUESTION_LIMIT)
    
    count = result['question_count']
    can_ask = count < GUEST_QUESTION_LIMIT
    remaining = max(0, GUEST_QUESTION_LIMIT - count)
    
    return GuestUsageResponse(question_count=count, can_ask=can_ask, remaining=remaining)

@router.post("/increment-guest-usage", response_model=GuestUsageResponse)
async def increment_guest_usage(
    x_device_fingerprint: str = Header(None, alias="X-Device-Fingerprint"),
    x_forwarded_for: str = Header(None, alias="X-Forwarded-For")
):
    """Increment guest usage count for a device fingerprint"""
    if not x_device_fingerprint:
        raise HTTPException(status_code=400, detail="Device fingerprint required")
    
    ip_address = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else None
    
    # Upsert guest session
    query = """
        INSERT INTO guest_sessions (device_fingerprint, ip_address, question_count, first_question_at, last_question_at)
        VALUES ($1, $2, 1, NOW(), NOW())
        ON CONFLICT (device_fingerprint) 
        DO UPDATE SET 
            question_count = guest_sessions.question_count + 1,
            last_question_at = NOW(),
            ip_address = COALESCE($2, guest_sessions.ip_address)
        RETURNING question_count
    """
    result = await db.fetch_one(query, x_device_fingerprint, ip_address)
    
    count = result['question_count'] if result else 1
    can_ask = count < GUEST_QUESTION_LIMIT
    remaining = max(0, GUEST_QUESTION_LIMIT - count)
    
    return GuestUsageResponse(question_count=count, can_ask=can_ask, remaining=remaining)

# ============================================================
# ADMIN ENDPOINTS
# ============================================================

@router.get("/users")
async def get_all_users(
    current_user: Annotated[dict, Depends(require_admin)],
    skip: int = 0,
    limit: int = 50,
    search: str = None
):
    """Get all registered users (admin only)"""
    if search:
        query = """
            SELECT id, email, full_name, phone, role, is_active, created_at, last_login
            FROM users 
            WHERE (email ILIKE $1 OR full_name ILIKE $1)
              AND email NOT ILIKE '%@example.com'
              AND email NOT ILIKE '%@test.com'
              AND email NOT ILIKE 'test_%'
              AND email NOT ILIKE 'qa_%'
              AND email NOT ILIKE 'browser\_test%'
              AND email != 'myadmin@financehub.pro'
            ORDER BY created_at DESC
            OFFSET $2 LIMIT $3
        """
        users = await db.fetch_all(query, f"%{search}%", skip, limit)
        
        count_query = """
            SELECT COUNT(*) FROM users 
            WHERE (email ILIKE $1 OR full_name ILIKE $1)
              AND email NOT ILIKE '%@example.com'
              AND email NOT ILIKE '%@test.com'
              AND email NOT ILIKE 'test_%'
              AND email NOT ILIKE 'qa_%'
              AND email NOT ILIKE 'browser\_test%'
              AND email != 'myadmin@financehub.pro'
        """
        total = await db.fetch_val(count_query, f"%{search}%")
    else:
        query = """
            SELECT id, email, full_name, phone, role, is_active, created_at, last_login
            FROM users 
            WHERE email NOT ILIKE '%@example.com'
              AND email NOT ILIKE '%@test.com'
              AND email NOT ILIKE 'test_%'
              AND email NOT ILIKE 'qa_%'
              AND email NOT ILIKE 'browser\_test%'
              AND email != 'myadmin@financehub.pro'
            ORDER BY created_at DESC
            OFFSET $1 LIMIT $2
        """
        users = await db.fetch_all(query, skip, limit)
        
        count_query = """
            SELECT COUNT(*) FROM users 
            WHERE email NOT ILIKE '%@example.com'
              AND email NOT ILIKE '%@test.com'
              AND email NOT ILIKE 'test_%'
              AND email NOT ILIKE 'qa_%'
              AND email NOT ILIKE 'browser\_test%'
              AND email != 'myadmin@financehub.pro'
        """
        total = await db.fetch_val(count_query)
    
    return {
        "users": users,
        "total": total or 0,
        "skip": skip,
        "limit": limit
    }

@router.get("/guest-sessions")
async def get_guest_sessions(
    current_user: Annotated[dict, Depends(require_admin)],
    skip: int = 0,
    limit: int = 50
):
    """Get guest session analytics (admin only)"""
    query = """
        SELECT id, device_fingerprint, ip_address, question_count, first_question_at, last_question_at, converted_user_id
        FROM guest_sessions 
        ORDER BY last_question_at DESC
        OFFSET $1 LIMIT $2
    """
    sessions = await db.fetch_all(query, skip, limit)
    
    stats_query = """
        SELECT 
            COUNT(*) as total_sessions,
            SUM(question_count) as total_questions,
            COUNT(CASE WHEN converted_user_id IS NOT NULL THEN 1 END) as conversions
        FROM guest_sessions
    """
    stats = await db.fetch_one(stats_query)
    
    return {
        "sessions": sessions,
        "stats": dict(stats) if stats else {}
    }

class AdminPasswordReset(BaseModel):
    user_id: int
    new_password: str

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

@router.post("/admin/reset-user-password")
async def admin_reset_user_password(
    reset_data: AdminPasswordReset,
    current_user: Annotated[dict, Depends(require_admin)]
):
    """Reset any user's password (Admin only)"""
    # Check if user exists
    user_query = "SELECT * FROM users WHERE id = $1"
    user = await db.fetch_one(user_query, reset_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Hash new password
    new_hash = get_password_hash(reset_data.new_password)
    
    # Update password
    await db.execute(
        "UPDATE users SET hashed_password = $1 WHERE id = $2",
        new_hash,
        reset_data.user_id
    )
    
    return {"message": f"Password for user {user['email']} has been reset successfully"}
