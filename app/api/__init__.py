from fastapi import APIRouter

from app.api.routes import api_router

router = APIRouter()
router.include_router(api_router)
