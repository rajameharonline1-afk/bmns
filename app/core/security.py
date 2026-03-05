from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _create_token(subject: str | int, token_type: str, expires_delta: timedelta) -> str:
    expire = datetime.utcnow() + expires_delta
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": uuid4().hex,
        "token_type": token_type,
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str | int, expires_delta: timedelta | None = None) -> str:
    return _create_token(
        subject=subject,
        token_type="access",
        expires_delta=expires_delta or timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(subject: str | int, expires_delta: timedelta | None = None) -> str:
    return _create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=expires_delta or timedelta(minutes=settings.refresh_token_expire_minutes),
    )
