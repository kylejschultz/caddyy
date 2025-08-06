"""
Collection service for managing movies and TV shows in the local database
"""

import httpx
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from backend.core.config import settings
from backend.models.collection import Movie, TVShow, Season, Episode


class CollectionService:
    """Service for managing the local media collection"""
    
    def __init__(self, db: Session):
        self.db = db
        self.tmdb_base_url = "https://api.themoviedb.org/3"
    
    async def _fetch_tmdb_data(self, endpoint: str) -> Optional[Dict[Any, Any]]:
        """Fetch data from TMDB API"""
        if not settings.TMDB_API_KEY:
            raise ValueError("TMDB API key is not configured")
        
        url = f"{self.tmdb_base_url}{endpoint}"
        params = {"api_key": settings.TMDB_API_KEY}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                raise Exception(f"Failed to fetch TMDB data: {e}")
    
    def add_movie(self, tmdb_id: int) -> Movie:
        """Add a movie to the collection by TMDB ID"""
        # Check if movie already exists
        existing = self.db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
        if existing:
            raise ValueError(f"Movie with TMDB ID {tmdb_id} already exists in collection")
        
        # For now, create a placeholder movie
        # In a real implementation, you'd fetch from TMDB API
        movie = Movie(
            tmdb_id=tmdb_id,
            title=f"Movie {tmdb_id}",
            overview="Movie added to collection (TMDB data pending)",
            poster_url="",
            backdrop_url="",
            rating=0.0,
            year=2023,
            runtime=0,
            monitored=True,
            downloaded=False,
            path=""
        )
        
        self.db.add(movie)
        self.db.commit()
        self.db.refresh(movie)
        
        return movie
    
    def add_tv_show(self, tmdb_id: int) -> TVShow:
        """Add a TV show to the collection by TMDB ID"""
        # Check if TV show already exists
        existing = self.db.query(TVShow).filter(TVShow.tmdb_id == tmdb_id).first()
        if existing:
            raise ValueError(f"TV show with TMDB ID {tmdb_id} already exists in collection")
        
        # For now, create a placeholder TV show
        # In a real implementation, you'd fetch from TMDB API
        tv_show = TVShow(
            tmdb_id=tmdb_id,
            title=f"TV Show {tmdb_id}",
            overview="TV show added to collection (TMDB data pending)",
            poster_url="",
            backdrop_url="",
            rating=0.0,
            year=2023,
            monitored=True
        )
        
        self.db.add(tv_show)
        self.db.commit()
        self.db.refresh(tv_show)
        
        return tv_show
    
    def get_movies(self, skip: int = 0, limit: int = 100) -> List[Movie]:
        """Get movies from the collection"""
        return self.db.query(Movie).offset(skip).limit(limit).all()
    
    def get_tv_shows(self, skip: int = 0, limit: int = 100) -> List[TVShow]:
        """Get TV shows from the collection"""
        return self.db.query(TVShow).offset(skip).limit(limit).all()
    
    def get_movie_by_id(self, movie_id: int) -> Optional[Movie]:
        """Get a specific movie by ID"""
        return self.db.query(Movie).filter(Movie.id == movie_id).first()
    
    def get_tv_show_by_id(self, show_id: int) -> Optional[TVShow]:
        """Get a specific TV show by ID"""
        return self.db.query(TVShow).filter(TVShow.id == show_id).first()
    
    def update_movie(self, movie_id: int, **kwargs) -> Optional[Movie]:
        """Update a movie in the collection"""
        movie = self.get_movie_by_id(movie_id)
        if not movie:
            return None
        
        for field, value in kwargs.items():
            if hasattr(movie, field):
                setattr(movie, field, value)
        
        self.db.commit()
        self.db.refresh(movie)
        return movie
    
    def update_tv_show(self, show_id: int, **kwargs) -> Optional[TVShow]:
        """Update a TV show in the collection"""
        show = self.get_tv_show_by_id(show_id)
        if not show:
            return None
        
        for field, value in kwargs.items():
            if hasattr(show, field):
                setattr(show, field, value)
        
        self.db.commit()
        self.db.refresh(show)
        return show
    
    def remove_movie(self, movie_id: int) -> bool:
        """Remove a movie from the collection"""
        movie = self.get_movie_by_id(movie_id)
        if not movie:
            return False
        
        self.db.delete(movie)
        self.db.commit()
        return True
    
    def remove_tv_show(self, show_id: int) -> bool:
        """Remove a TV show from the collection"""
        show = self.get_tv_show_by_id(show_id)
        if not show:
            return False
        
        self.db.delete(show)
        self.db.commit()
        return True
