from app.schemas.base import APIModel
from app.schemas.role import RoleRead


class UserBase(APIModel):
    email: str
    username: str
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    is_superuser: bool
    roles: list[RoleRead] = []
