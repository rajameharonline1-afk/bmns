from typing import Any

from fastapi import APIRouter, Depends

from app.core.deps import CurrentUser
from app.models.user import User

router = APIRouter()


@router.get("/me")
def read_me(current_user: CurrentUser) -> dict[str, Any]:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "roles": [role.name for role in current_user.roles],
    }
