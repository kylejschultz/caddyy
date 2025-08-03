"""
API routes module
"""

from fastapi import APIRouter

from caddyy.api.health import router as health_router
from caddyy.api.settings import router as settings_router

router = APIRouter()

router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(settings_router, prefix="/settings", tags=["settings"])
