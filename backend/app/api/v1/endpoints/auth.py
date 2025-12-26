from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import timedelta
from typing import Annotated
from jose import JWTError, jwt

from app.db.session import db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class User(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    role: str
    is_active: bool

async def get_user_by_email(email: str):
    query = "SELECT * FROM users WHERE email = $1"
    user = await db.fetch_one(query, email)
    return dict(user) if user else None

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
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

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email'], "role": user['role']},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    
@router.post("/signup")
async def signup(reg: RegisterRequest):
    existing = await get_user_by_email(reg.email)
    if existing:
         raise HTTPException(status_code=400, detail="Email already registered")
         
    hashed_pw = get_password_hash(reg.password)
    query = """
        INSERT INTO users (email, hashed_password, full_name, role, is_active)
        VALUES ($1, $2, $3, 'user', TRUE)
        RETURNING id, email, full_name, role
    """
    user = await db.fetch_one(query, reg.email, hashed_pw, reg.full_name)
    return dict(user)
