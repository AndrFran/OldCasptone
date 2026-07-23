# Authentication utilities for login feature
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from shared.models import User

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(user_id: int, user_type: str) -> str:
    """Create JWT token"""
    payload = {
        "sub": user_id,
        "type": user_type,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_user_from_token(token: str, db: Session) -> Optional[User]:
    """Get user object from token"""
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    return db.query(User).filter(User.id == user_id).first() if user_id else None


def get_current_user(authorization: str = None, db: Session = None) -> Optional[User]:
    """Dependency to get current user from auth header"""
    if not authorization or not db:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        return get_user_from_token(token, db)
    except (ValueError, AttributeError):
        return None
