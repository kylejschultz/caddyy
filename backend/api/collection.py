"""
API endpoints for managing the media collection (movies, TV shows, seasons, episodes)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.core.database import get_db
from backend.models.collection import Movie, TVShow, Season, Episode
from backend.services.collection import CollectionService

router = APIRouter(prefix="/collection", tags=["collection"])

# Movies endpoints
@router.get("/movies", response_model=List[dict])
def get_movies(
    skip: int = 0,
    limit: int = 100,
    monitored: Optional[bool] = None,
    downloaded: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get movies from the collection with optional filtering"""
    query = db.query(Movie)
    
    if monitored is not None:
        query = query.filter(Movie.monitored == monitored)
    if downloaded is not None:
        query = query.filter(Movie.downloaded == downloaded)
    
    movies = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": movie.id,
            "tmdb_id": movie.tmdb_id,
            "title": movie.title,
            "overview": movie.overview,
            "poster_url": movie.poster_url,
            "backdrop_url": movie.backdrop_url,
            "rating": movie.rating,
            "year": movie.year,
            "runtime": movie.runtime,
            "monitored": movie.monitored,
            "downloaded": movie.downloaded,
            "path": movie.path
        }
        for movie in movies
    ]

@router.get("/movies/{movie_id}")
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    """Get a specific movie by ID"""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    return {
        "id": movie.id,
        "tmdb_id": movie.tmdb_id,
        "title": movie.title,
        "overview": movie.overview,
        "poster_url": movie.poster_url,
        "backdrop_url": movie.backdrop_url,
        "rating": movie.rating,
        "year": movie.year,
        "runtime": movie.runtime,
        "monitored": movie.monitored,
        "downloaded": movie.downloaded,
        "path": movie.path
    }

@router.post("/movies")
def add_movie_to_collection(tmdb_id: int, db: Session = Depends(get_db)):
    """Add a movie to the collection by TMDB ID"""
    collection_service = CollectionService(db)
    
    try:
        movie = collection_service.add_movie(tmdb_id)
        return {
            "id": movie.id,
            "tmdb_id": movie.tmdb_id,
            "title": movie.title,
            "overview": movie.overview,
            "poster_url": movie.poster_url,
            "backdrop_url": movie.backdrop_url,
            "rating": movie.rating,
            "year": movie.year,
            "runtime": movie.runtime,
            "monitored": movie.monitored,
            "downloaded": movie.downloaded,
            "path": movie.path
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/movies/{movie_id}")
def update_movie(movie_id: int, update_data: dict, db: Session = Depends(get_db)):
    """Update a movie in the collection"""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Update allowed fields
    allowed_fields = ["monitored", "downloaded", "path"]
    for field, value in update_data.items():
        if field in allowed_fields and hasattr(movie, field):
            setattr(movie, field, value)
    
    db.commit()
    db.refresh(movie)
    
    return {
        "id": movie.id,
        "tmdb_id": movie.tmdb_id,
        "title": movie.title,
        "overview": movie.overview,
        "poster_url": movie.poster_url,
        "backdrop_url": movie.backdrop_url,
        "rating": movie.rating,
        "year": movie.year,
        "runtime": movie.runtime,
        "monitored": movie.monitored,
        "downloaded": movie.downloaded,
        "path": movie.path
    }

@router.delete("/movies/{movie_id}")
def remove_movie(movie_id: int, db: Session = Depends(get_db)):
    """Remove a movie from the collection"""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    db.delete(movie)
    db.commit()
    return {"message": "Movie removed from collection"}

# TV Shows endpoints
@router.get("/tv", response_model=List[dict])
def get_tv_shows(
    skip: int = 0,
    limit: int = 100,
    monitored: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get TV shows from the collection with optional filtering"""
    query = db.query(TVShow)
    
    if monitored is not None:
        query = query.filter(TVShow.monitored == monitored)
    
    tv_shows = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": show.id,
            "tmdb_id": show.tmdb_id,
            "title": show.title,
            "overview": show.overview,
            "poster_url": show.poster_url,
            "backdrop_url": show.backdrop_url,
            "rating": show.rating,
            "year": show.year,
            "monitored": show.monitored,
            "seasons_count": len(show.seasons)
        }
        for show in tv_shows
    ]

@router.get("/tv/{show_id}")
def get_tv_show(show_id: int, db: Session = Depends(get_db)):
    """Get a specific TV show by ID with seasons and episodes"""
    show = db.query(TVShow).filter(TVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found")
    
    seasons_data = []
    for season in show.seasons:
        episodes_data = [
            {
                "id": episode.id,
                "tmdb_id": episode.tmdb_id,
                "episode_number": episode.episode_number,
                "title": episode.title,
                "overview": episode.overview,
                "air_date": episode.air_date,
                "monitored": episode.monitored,
                "downloaded": episode.downloaded,
                "path": episode.path
            }
            for episode in season.episodes
        ]
        
        seasons_data.append({
            "id": season.id,
            "tmdb_id": season.tmdb_id,
            "season_number": season.season_number,
            "title": season.title,
            "overview": season.overview,
            "poster_url": season.poster_url,
            "monitored": season.monitored,
            "episodes": episodes_data
        })
    
    return {
        "id": show.id,
        "tmdb_id": show.tmdb_id,
        "title": show.title,
        "overview": show.overview,
        "poster_url": show.poster_url,
        "backdrop_url": show.backdrop_url,
        "rating": show.rating,
        "year": show.year,
        "monitored": show.monitored,
        "seasons": seasons_data
    }

@router.post("/tv")
def add_tv_show_to_collection(tmdb_id: int, db: Session = Depends(get_db)):
    """Add a TV show to the collection by TMDB ID"""
    collection_service = CollectionService(db)
    
    try:
        tv_show = collection_service.add_tv_show(tmdb_id)
        return {
            "id": tv_show.id,
            "tmdb_id": tv_show.tmdb_id,
            "title": tv_show.title,
            "overview": tv_show.overview,
            "poster_url": tv_show.poster_url,
            "backdrop_url": tv_show.backdrop_url,
            "rating": tv_show.rating,
            "year": tv_show.year,
            "monitored": tv_show.monitored,
            "seasons_count": len(tv_show.seasons)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/tv/{show_id}")
def update_tv_show(show_id: int, update_data: dict, db: Session = Depends(get_db)):
    """Update a TV show in the collection"""
    show = db.query(TVShow).filter(TVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found")
    
    # Update allowed fields
    allowed_fields = ["monitored"]
    for field, value in update_data.items():
        if field in allowed_fields and hasattr(show, field):
            setattr(show, field, value)
    
    db.commit()
    db.refresh(show)
    
    return {
        "id": show.id,
        "tmdb_id": show.tmdb_id,
        "title": show.title,
        "overview": show.overview,
        "poster_url": show.poster_url,
        "backdrop_url": show.backdrop_url,
        "rating": show.rating,
        "year": show.year,
        "monitored": show.monitored,
        "seasons_count": len(show.seasons)
    }

@router.delete("/tv/{show_id}")
def remove_tv_show(show_id: int, db: Session = Depends(get_db)):
    """Remove a TV show from the collection"""
    show = db.query(TVShow).filter(TVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found")
    
    db.delete(show)
    db.commit()
    return {"message": "TV show removed from collection"}
