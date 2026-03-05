from app.schemas.base import APIModel


class RoleRead(APIModel):
    id: int
    name: str
