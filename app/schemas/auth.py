from app.schemas.base import APIModel


class Token(APIModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class TokenPayload(APIModel):
    sub: str
    exp: int
    token_type: str = "access"
    jti: str | None = None


class RefreshTokenRequest(APIModel):
    refresh_token: str
