"""
API routes module
"""

from fastapi import APIRouter

from backend.api.health import router as health_router
from backend.api.settings import router as settings_router
from backend.api.search import router as search_router
from backend.api.movies import router as movies_router
from backend.api.tv import router as tv_router
from backend.api.filesystem import router as filesystem_router
from backend.api.media_paths import router as media_paths_router
from backend.api.config_paths import router as config_paths_router

router = APIRouter()

router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(settings_router, prefix="/settings", tags=["settings"])
router.include_router(search_router, prefix="/search", tags=["search"])
router.include_router(movies_router, prefix="/movies", tags=["movies"])
router.include_router(tv_router, prefix="/tv", tags=["tv"])
router.include_router(filesystem_router, prefix="/filesystem", tags=["filesystem"])
router.include_router(media_paths_router, prefix="/media-paths", tags=["media-paths"])
router.include_router(config_paths_router, prefix="/config/paths", tags=["config-paths"])
