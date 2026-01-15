"""
Google OAuth Authentication Endpoints
Handles Google Sign-In for user registration and login
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import httpx

from app.db.session import db
from app.core.security import create_access_token, get_password_hash
from app.core.config import settings

router = APIRouter()

# ============================================================
# SCHEMAS
# ============================================================

class GoogleAuthRequest(BaseModel):
    """Request body for Google OAuth callback"""
    code: str
    redirect_uri: Optional[str] = None

class GoogleAuthResponse(BaseModel):
    """Response after successful Google authentication"""
    access_token: str
    token_type: str
    user: dict
    is_new_user: bool

class GoogleAuthUrlResponse(BaseModel):
    """Response containing Google OAuth URL"""
    auth_url: str

# ============================================================
# GOOGLE OAUTH HELPERS
# ============================================================

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

async def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange authorization code for access tokens"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            print(f"Google token exchange error: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to exchange code: {response.text}"
            )
        
        return response.json()

async def get_google_user_info(access_token: str) -> dict:
    """Get user info from Google using access token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        return response.json()

async def find_user_by_email(email: str) -> Optional[dict]:
    """Find user by email"""
    query = "SELECT * FROM users WHERE email = $1"
    user = await db.fetch_one(query, email)
    return dict(user) if user else None

async def find_user_by_oauth(provider: str, provider_id: str) -> Optional[dict]:
    """Find user by OAuth provider and ID"""
    query = "SELECT * FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2"
    user = await db.fetch_one(query, provider, provider_id)
    return dict(user) if user else None

async def create_oauth_user(
    email: str,
    full_name: str,
    oauth_provider: str,
    oauth_provider_id: str,
    avatar_url: Optional[str] = None
) -> dict:
    """Create a new user from OAuth data"""
    query = """
        INSERT INTO users (
            email, full_name, hashed_password, role, is_active, 
            oauth_provider, oauth_provider_id, avatar_url, email_verified,
            created_at
        )
        VALUES ($1, $2, $3, 'user', TRUE, $4, $5, $6, TRUE, NOW())
        RETURNING id, email, full_name, phone, role, is_active, avatar_url
    """
    # Generate a random password hash (user won't use it, but field is required)
    import secrets
    random_password = secrets.token_urlsafe(32)
    hashed_password = get_password_hash(random_password)
    
    user = await db.fetch_one(
        query, 
        email, 
        full_name, 
        hashed_password,
        oauth_provider,
        oauth_provider_id,
        avatar_url
    )
    return dict(user) if user else None

async def update_user_oauth(
    user_id: int,
    oauth_provider: str,
    oauth_provider_id: str,
    avatar_url: Optional[str] = None
) -> dict:
    """Link OAuth to existing user account"""
    query = """
        UPDATE users 
        SET oauth_provider = $1, 
            oauth_provider_id = $2, 
            avatar_url = COALESCE($3, avatar_url),
            email_verified = TRUE,
            last_login = NOW()
        WHERE id = $4
        RETURNING id, email, full_name, phone, role, is_active, avatar_url
    """
    user = await db.fetch_one(query, oauth_provider, oauth_provider_id, avatar_url, user_id)
    return dict(user) if user else None

# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/google/url", response_model=GoogleAuthUrlResponse)
async def get_google_auth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None):
    """
    Generate Google OAuth authorization URL
    The frontend will redirect users to this URL to start the OAuth flow
    
    Args:
        redirect_uri: Callback URL after OAuth completes
        state: State parameter to track mobile vs desktop flow
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    # Use provided redirect_uri or default
    callback_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    
    # Build OAuth URL with required scopes
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    
    # Add state parameter if provided (for mobile detection)
    if state:
        params["state"] = state
    
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    auth_url = f"{GOOGLE_AUTH_URL}?{query_string}"
    
    return {"auth_url": auth_url}


@router.post("/google/callback", response_model=GoogleAuthResponse)
async def google_callback(request: GoogleAuthRequest):
    """
    Handle Google OAuth callback
    - Exchange code for tokens
    - Get user info from Google
    - Create new user or login existing user
    - Return JWT token
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    # Use provided redirect_uri or default
    redirect_uri = request.redirect_uri or settings.GOOGLE_REDIRECT_URI
    
    # Exchange code for tokens
    tokens = await exchange_code_for_tokens(request.code, redirect_uri)
    google_access_token = tokens.get("access_token")
    
    if not google_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get access token from Google"
        )
    
    # Get user info from Google
    google_user = await get_google_user_info(google_access_token)
    
    google_id = google_user.get("id")
    email = google_user.get("email")
    name = google_user.get("name", "")
    picture = google_user.get("picture")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )
    
    is_new_user = False
    user = None
    
    # Check if user exists by OAuth ID
    user = await find_user_by_oauth("google", google_id)
    
    if not user:
        # Check if user exists by email
        existing_user = await find_user_by_email(email)
        
        if existing_user:
            # Link Google account to existing user
            user = await update_user_oauth(
                existing_user['id'],
                "google",
                google_id,
                picture
            )
        else:
            # Create new user
            user = await create_oauth_user(
                email=email,
                full_name=name,
                oauth_provider="google",
                oauth_provider_id=google_id,
                avatar_url=picture
            )
            is_new_user = True
    else:
        # Update last login
        await db.execute(
            "UPDATE users SET last_login = $1 WHERE id = $2",
            datetime.utcnow(),
            user['id']
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create or retrieve user"
        )
    
    # Generate JWT token
    access_token = create_access_token(
        data={"sub": user['email'], "role": user['role']},
        expires_delta=timedelta(hours=24)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user.get('full_name'),
            "phone": user.get('phone'),
            "role": user['role'],
            "avatar_url": user.get('avatar_url')
        },
        "is_new_user": is_new_user
    }
