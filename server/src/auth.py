from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import os
import uuid
from appwrite.query import Query

# Replaced SQL imports with Appwrite Service
from .appwrite_service import get_db_client, DATABASE_ID, USERS_COLLECTION_ID
from .database import verify_password, get_password_hash # Keeping utils from database.py for hashing

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days for Chrome extension

security = HTTPBearer()
databases = get_db_client()

# --- Pydantic Schemas ---

class UserSignup(BaseModel):
    """Schema for user registration."""
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str

class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: dict

class TokenData(BaseModel):
    """Schema for decoded token data."""
    user_id: str
    email: str

# --- JWT Helper Functions ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> TokenData:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(user_id=user_id, email=email)
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# --- Dependency to Get Current User ---

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict: # Returned user is now a dict (JSON), not a SQL Model
    """Dependency to get the current authenticated user."""
    token = credentials.credentials
    token_data = verify_token(token)
    
    # Appwrite Query
    result = databases.list_documents(
        DATABASE_ID, 
        USERS_COLLECTION_ID, 
        queries=[Query.equal("email", token_data.email)]
    )
    
    if result['total'] == 0:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = result['documents'][0]
    
    if not user.get('is_active', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    
    return user

# --- Authentication Endpoints ---

def signup_user(signup_data: UserSignup) -> Token:
    """Register a new user."""
    # Check if user already exists
    result = databases.list_documents(
        DATABASE_ID, 
        USERS_COLLECTION_ID, 
        queries=[Query.equal("email", signup_data.email)]
    )

    if result['total'] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(signup_data.password)
    user_id = str(uuid.uuid4())
    
    new_user_data = {
        "email": signup_data.email,
        "full_name": signup_data.full_name,
        "hashed_password": hashed_password,
        "subscription_tier": "free",
        "idea_credits": 5,
        "is_active": True
    }
    
    user_doc = databases.create_document(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        new_user_data
    )
    
    # Create access token
    access_token = create_access_token(
        data={"user_id": user_doc['$id'], "email": user_doc['email']}
    )
    
    return Token(
        access_token=access_token,
        user={
            "user_id": user_doc['$id'],
            "email": user_doc['email'],
            "full_name": user_doc['full_name'],
            "subscription_tier": user_doc['subscription_tier'],
            "idea_credits": user_doc['idea_credits']
        }
    )

def login_user(login_data: UserLogin) -> Token:
    """Authenticate and login a user."""
    # Find user by email
    result = databases.list_documents(
        DATABASE_ID, 
        USERS_COLLECTION_ID, 
        queries=[Query.equal("email", login_data.email)]
    )
    
    if result['total'] == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user = result['documents'][0]
    
    # Verify password
    if not verify_password(login_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.get('is_active', True):
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"user_id": user['$id'], "email": user['email']}
    )
    
    return Token(
        access_token=access_token,
        user={
            "user_id": user['$id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "subscription_tier": user['subscription_tier'],
            "idea_credits": user['idea_credits']
        }
    )
