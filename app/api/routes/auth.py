from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.crud.user import get as get_user
from app.crud.user import get_by_email, get_by_username
from app.schemas.auth import RefreshTokenRequest, Token, TokenPayload

router = APIRouter()


@router.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    identity = form_data.username.strip()
    user = get_by_username(db, identity)
    if not user and "@" in identity:
        user = get_by_email(db, identity)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> Token:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        decoded = jwt.decode(
            payload.refresh_token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        token_data = TokenPayload(**decoded)
    except (JWTError, ValueError):
        raise credentials_exception

    if token_data.token_type != "refresh":
        raise credentials_exception

    user = get_user(db, int(token_data.sub))
    if not user or not user.is_active:
        raise credentials_exception

    return Token(
        access_token=create_access_token(subject=user.id),
        refresh_token=create_refresh_token(subject=user.id),
    )
