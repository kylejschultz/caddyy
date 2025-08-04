"""
Movie API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from backend.services.tmdb_service import tmdb_service

router = APIRouter()


@router.get("/{movie_id}")
async def get_movie_details(movie_id: int):
    """Get detailed information about a specific movie"""
    try:
        # For now, we'll use TMDB to get movie details
        # In the future, this could check our local database first
        movie_details = await tmdb_service.get_movie_details(movie_id)
        if not movie_details:
            raise HTTPException(status_code=404, detail="Movie not found")
        
        return movie_details
    except Exception as e:
        print(f"Error getting movie details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get movie details")


@router.post("/{movie_id}/add")
async def add_movie_to_collection(movie_id: int):
    """Add a movie to the collection for monitoring"""
    try:
        # This would add the movie to our database for monitoring
        # For now, just return success
        return {"message": f"Movie {movie_id} added to collection", "success": True}
    except Exception as e:
        print(f"Error adding movie to collection: {e}")
        raise HTTPException(status_code=500, detail="Failed to add movie to collection")


@router.delete("/{movie_id}")
async def remove_movie_from_collection(movie_id: int):
    """Remove a movie from the collection"""
    try:
        # This would remove the movie from our database
        # For now, just return success
        return {"message": f"Movie {movie_id} removed from collection", "success": True}
    except Exception as e:
        print(f"Error removing movie from collection: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove movie from collection")
