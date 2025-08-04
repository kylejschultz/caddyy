"""
API routes module
"""

from fastapi import APIRouter

from caddyy.api.health import router as health_router
from caddyy.api.settings import router as settings_router
from caddyy.api.search import router as search_router
from caddyy.api.movies import router as movies_router
from caddyy.api.tv import router as tv_router
from caddyy.api.filesystem import router as filesystem_router

router = APIRouter()

router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(settings_router, prefix="/settings", tags=["settings"])
router.include_router(search_router, prefix="/search", tags=["search"])
router.include_router(movies_router, prefix="/movies", tags=["movies"])
router.include_router(tv_router, prefix="/tv", tags=["tv"])
router.include_router(filesystem_router, prefix="/filesystem", tags=["filesystem"])
