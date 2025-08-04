"""
Search API endpoints
"""

from fastapi import APIRouter, Query
from typing import List, Optional

from backend.services.tmdb_service import tmdb_service, MediaResult

router = APIRouter()


@router.get("/", response_model=List[MediaResult])
async def search_media(
    q: str = Query(..., description="Search query"),
    type: Optional[str] = Query(None, description="Filter by media type: 'movie' or 'tv'")
) -> List[MediaResult]:
    """Search for movies and TV shows"""
    if not q.strip():
        return []
    
    results = await tmdb_service.search(q.strip(), type)
    return results


@router.get("/movies", response_model=List[MediaResult])
async def search_movies(
    q: str = Query(..., description="Search query")
) -> List[MediaResult]:
    """Search for movies only"""
    if not q.strip():
        return []
    
    results = await tmdb_service.search(q.strip(), "movie")
    return results


@router.get("/tv", response_model=List[MediaResult])
async def search_tv(
    q: str = Query(..., description="Search query")
) -> List[MediaResult]:
    """Search for TV shows only"""
    if not q.strip():
        return []
    
    results = await tmdb_service.search(q.strip(), "tv")
    return results
