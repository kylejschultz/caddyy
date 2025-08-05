"""
Search API endpoints
"""

from fastapi import APIRouter, Query, HTTPException
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
    
    # Check if TMDB API key is configured
    if not tmdb_service._is_configured():
        raise HTTPException(
            status_code=400,
            detail={
                "message": "TMDB API key is not configured. Please add your TMDB API key to enable search functionality.",
                "link": "/settings/general",
                "linkText": "Go to General Settings"
            }
        )
    
    results = await tmdb_service.search(q.strip(), type)
    return results


@router.get("/movies", response_model=List[MediaResult])
async def search_movies(
    q: str = Query(..., description="Search query")
) -> List[MediaResult]:
    """Search for movies only"""
    if not q.strip():
        return []
    
    # Check if TMDB API key is configured
    if not tmdb_service._is_configured():
        raise HTTPException(
            status_code=400,
            detail={
                "message": "TMDB API key is not configured. Please add your TMDB API key to enable search functionality.",
                "link": "/settings/general",
                "linkText": "Go to General Settings"
            }
        )
    
    results = await tmdb_service.search(q.strip(), "movie")
    return results


@router.get("/tv", response_model=List[MediaResult])
async def search_tv(
    q: str = Query(..., description="Search query")
) -> List[MediaResult]:
    """Search for TV shows only"""
    if not q.strip():
        return []
    
    # Check if TMDB API key is configured
    if not tmdb_service._is_configured():
        raise HTTPException(
            status_code=400,
            detail={
                "message": "TMDB API key is not configured. Please add your TMDB API key to enable search functionality.",
                "link": "/settings/general",
                "linkText": "Go to General Settings"
            }
        )
    
    results = await tmdb_service.search(q.strip(), "tv")
    return results
