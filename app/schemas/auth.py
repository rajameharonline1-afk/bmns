from app.schemas.base import APIModel


class Token(APIModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(APIModel):
    sub: str
    exp: int
