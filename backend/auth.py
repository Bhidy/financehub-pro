from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import timedelta
from typing import Annotated
from database import db
from security import verify_password, create_access_token, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from jose import JWTError, jwt
import os

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

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
        SECRET_KEY = os.getenv("SECRET_KEY")
        ALGORITHM = os.getenv("ALGORITHM", "HS256")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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

@router.post("/auth/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email'], "role": user['role']},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/register", status_code=201)
async def register_user(user: User):
    # Check if user exists
    existing = await get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Needs a password field in request, but for simplicity let's assume valid form validation
    # This is a basic example. In production we'd need a RegisterRequest model with password.
    pass

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    
@router.post("/auth/signup")
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
