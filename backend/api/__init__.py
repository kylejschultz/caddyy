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
from backend.api.collection import router as collection_router
from backend.routers.config.movies import router as movies_config_router
from backend.routers.config.tv import router as tv_config_router

router = APIRouter()

router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(settings_router, prefix="/settings", tags=["settings"])
router.include_router(search_router, prefix="/search", tags=["search"])
router.include_router(movies_router, prefix="/movies", tags=["movies"])
router.include_router(tv_router, prefix="/tv", tags=["tv"])
router.include_router(filesystem_router, prefix="/filesystem", tags=["filesystem"])
router.include_router(media_paths_router, prefix="/media-paths", tags=["media-paths"])
router.include_router(collection_router, tags=["collection"])
router.include_router(movies_config_router, prefix="/config/movies", tags=["movies-config"])
router.include_router(tv_config_router, prefix="/config/tv", tags=["tv-config"])
