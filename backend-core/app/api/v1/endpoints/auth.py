from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, validator
from datetime import timedelta, datetime
from typing import Annotated, Optional
from jose import JWTError, jwt
import re

from app.db.session import db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token", auto_error=False)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

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

class TokenData(BaseModel):
    email: str | None = None

class User(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    phone: str | None = None
    role: str
    is_active: bool

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    phone: str | None = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
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
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v

class GuestUsageResponse(BaseModel):
    question_count: int
    can_ask: bool
    remaining: int

# ============================================================
# HELPER FUNCTIONS
# ============================================================

async def get_user_by_email(email: str):
    query = "SELECT * FROM users WHERE email = $1"
    user = await db.fetch_one(query, email)
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

# ============================================================
# AUTH ENDPOINTS
# ============================================================

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    await db.execute("UPDATE users SET last_login = $1 WHERE id = $2", datetime.utcnow(), user['id'])
    
    access_token_expires = timedelta(hours=24)  # Extended to 24 hours
    access_token = create_access_token(
        data={"sub": user['email'], "role": user['role']},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user.get('full_name'),
            "phone": user.get('phone'),
            "role": user['role']
        }
    }

@router.post("/login", response_model=Token)
async def login_json(req: LoginRequest):
    user = await get_user_by_email(req.email)
    if not user or not verify_password(req.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user['email'], "role": user['role']})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user.get('full_name'),
            "role": user['role']
        }
    }

@router.post("/register")
async def register_alias(reg: RegisterRequest):
    return await signup(reg)

@router.post("/signup")
async def signup(reg: RegisterRequest):
    existing = await get_user_by_email(reg.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
         
    hashed_pw = get_password_hash(reg.password)
    try:
        query = """
            INSERT INTO users (email, hashed_password, full_name, phone, role, is_active, created_at)
            VALUES ($1, $2, $3, $4, 'user', TRUE, NOW())
            RETURNING id, email, full_name, phone, role, is_active
        """
        user = await db.fetch_one(query, reg.email, hashed_pw, reg.full_name, reg.phone)
        
        if not user:
            raise HTTPException(status_code=500, detail="Failed to create user (DB returned None)")
        
        # Auto-generate token for immediate login
        access_token = create_access_token(
            data={"sub": user['email'], "role": user['role']},
            expires_delta=timedelta(hours=24)
        )
        
        return {
            "message": "Registration successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": dict(user)
        }
    except Exception as e:
        print(f"Signup Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Signup Database Error: {str(e)}")

@router.get("/me")
async def get_current_user_info(current_user: Annotated[dict, Depends(get_current_active_user)]):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "full_name": current_user.get('full_name'),
        "phone": current_user.get('phone'),
        "role": current_user['role'],
        "is_active": current_user['is_active']
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

GUEST_QUESTION_LIMIT = 5

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
            WHERE email ILIKE $1 OR full_name ILIKE $1
            ORDER BY created_at DESC
            OFFSET $2 LIMIT $3
        """
        users = await db.fetch_all(query, f"%{search}%", skip, limit)
        
        count_query = "SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR full_name ILIKE $1"
        total = await db.fetch_val(count_query, f"%{search}%")
    else:
        query = """
            SELECT id, email, full_name, phone, role, is_active, created_at, last_login
            FROM users 
            ORDER BY created_at DESC
            OFFSET $1 LIMIT $2
        """
        users = await db.fetch_all(query, skip, limit)
        
        count_query = "SELECT COUNT(*) FROM users"
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
