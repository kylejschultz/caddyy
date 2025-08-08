"""
API endpoints for managing the media collection (movies, TV shows, seasons, episodes)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.core.database import get_db
from backend.models.collection import Movie, TVShow, Season, Episode
from backend.services.collection import CollectionService
from backend.services.naming_service import naming_service

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
async def get_tv_shows(
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
    
    result = []
    for show in tv_shows:
        # Count downloaded episodes (episodes that exist in database and are marked as downloaded)
        downloaded_episodes = 0
        for season in show.seasons:
            for episode in season.episodes:
                if episode.downloaded:
                    downloaded_episodes += 1
        
        # Get TMDB total episodes by calling TMDB API
        # This ensures we always show the complete episode count from TMDB
        tmdb_total_episodes = 0
        try:
            # Import here to avoid circular imports
            from backend.services.tmdb_service import TMDBService
            tmdb_service = TMDBService()
            tmdb_data = await tmdb_service.get_tv_details(show.tmdb_id)
            tmdb_total_episodes = tmdb_data.get('number_of_episodes', 0) if tmdb_data else 0
        except Exception as e:
            print(f"Error fetching TMDB data for show {show.title}: {e}")
            # Fall back to stored value or DB count if API fails
            stored_tmdb_total = getattr(show, 'tmdb_total_episodes', None) or 0
            if stored_tmdb_total > 0:
                tmdb_total_episodes = stored_tmdb_total
            else:
                # Last resort: count episodes in database
                tmdb_total_episodes = sum(len(season.episodes) for season in show.seasons)
        
        actual_total = tmdb_total_episodes
        
        result.append({
            "id": show.id,
            "tmdb_id": show.tmdb_id,
            "title": show.title,
            "overview": show.overview,
            "poster_url": show.poster_url,
            "backdrop_url": show.backdrop_url,
            "rating": show.rating,
            "year": show.year,
            "monitored": show.monitored,
            "monitoring_option": show.monitoring_option,
            "seasons_count": len(show.seasons),
            "folder_path": show.folder_path,
            "total_size": show.total_size,
            "downloaded_episodes": downloaded_episodes,
            "total_episodes": actual_total  # Use calculated or stored TMDB count
        })
    
    return result

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
                "runtime": episode.runtime,
                "monitored": episode.monitored,
                "downloaded": episode.downloaded,
                "path": episode.path,
                "file_path": episode.file_path,
                "file_name": episode.file_name,
                "file_size": episode.file_size,
                "quality": episode.quality,
                "release_group": episode.release_group
            }
            for episode in season.episodes
        ]
        
        # Handle cases where TMDB fields might be missing
        season_tmdb_episodes = getattr(season, 'tmdb_episode_count', None) or 0
        
        seasons_data.append({
            "id": season.id,
            "tmdb_id": season.tmdb_id,
            "season_number": season.season_number,
            "title": season.title,
            "overview": season.overview,
            "poster_url": season.poster_url,
            "monitored": season.monitored,
            "episodes": episodes_data,
            "total_episodes": season_tmdb_episodes,  # Use stored TMDB count with fallback
            "downloaded_episodes": len([ep for ep in episodes_data if ep["downloaded"]])
        })
    
    # Count downloaded episodes
    downloaded_episodes = sum(1 for season in show.seasons for episode in season.episodes if episode.downloaded)
    
    # Handle cases where TMDB fields might be missing
    tmdb_total_episodes = getattr(show, 'tmdb_total_episodes', None) or 0
    
    # If TMDB total is 0 or missing, calculate from stored episodes
    # This handles imported shows that may not have TMDB totals set
    if tmdb_total_episodes == 0:
        # Count all episodes that exist in the database for this show
        total_episodes_in_db = sum(len(season.episodes) for season in show.seasons)
        # If we have episodes but no TMDB total, use the DB count
        # Otherwise, keep 0 to indicate unknown
        if total_episodes_in_db > 0:
            actual_total = total_episodes_in_db
        else:
            actual_total = tmdb_total_episodes
    else:
        actual_total = tmdb_total_episodes
    
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
        "monitoring_option": show.monitoring_option,
        "folder_path": show.folder_path,
        "total_size": show.total_size,
        "downloaded_episodes": downloaded_episodes,
        "total_episodes_count": actual_total,  # Use calculated or stored TMDB count
        "seasons": seasons_data
    }

@router.post("/tv")
async def add_tv_show_to_collection(
    tmdb_id: int, 
    library_path: str = None,
    create_folder: bool = True,
    monitoring: str = None,
    monitoring_option: str = None,
    monitoring_status: str = None,
    db: Session = Depends(get_db)
):
    """Add a TV show to the collection by TMDB ID with disk selection"""
    # Use the existing collection service (expects DB in constructor)
    collection_service = CollectionService(db)
    from backend.services.tmdb_service import TMDBService
    tmdb = TMDBService()
    
    try:
        # Get show details from TMDB first (for naming and season list)
        show_data = await tmdb.get_tv_details(tmdb_id)
        if not show_data:
            raise HTTPException(status_code=404, detail="TV show not found on TMDB")
        
        show_name = show_data.get("name", "Unknown")
        show_year = None
        if show_data.get("first_air_date"):
            try:
                show_year = int(show_data["first_air_date"].split("-")[0])
            except (ValueError, IndexError):
                pass
        
        # If library_path provided and create_folder is True, create folder structure
        folder_path = None
        if library_path and create_folder:
            # Validate library path
            path_validation = naming_service.validate_library_path(library_path)
            if not path_validation["valid"]:
                raise HTTPException(status_code=400, detail=f"Invalid library path: {path_validation['message']}")
            if not path_validation["writable"]:
                raise HTTPException(status_code=400, detail="Library path is not writable")
            
            # Get season numbers from TMDB to create season folders
            seasons = [s["season_number"] for s in show_data.get("seasons", []) if s.get("season_number", 0) > 0]
            
            # Create folder structure
            folder_result = naming_service.create_show_folder_structure(
                library_path=library_path,
                show_name=show_name,
                year=show_year,
                seasons=seasons
            )
            
            if not folder_result.success:
                raise HTTPException(status_code=500, detail=f"Failed to create folder structure: {folder_result.message}")
            
            folder_path = folder_result.folder_path
        
        # Add show to collection using the collection service, passing folder_path
        tv_show = await collection_service.add_tv_show(tmdb_id, folder_path=folder_path)
        
        if not tv_show:
            raise HTTPException(status_code=500, detail="Failed to add show to collection")
        
        # Set the monitoring option if provided
        monitoring_value = monitoring or monitoring_option or monitoring_status
        if monitoring_value:
            tv_show.monitoring_option = monitoring_value
            tv_show.monitored = monitoring_value != "None"
            db.commit()
            db.refresh(tv_show)
        
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
            "folder_path": tv_show.folder_path,
            "seasons_count": len(tv_show.seasons),
            "folder_created": bool(folder_path)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add show to collection: {str(e)}")

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

@router.patch("/tv/{show_id}/monitoring")
def update_monitoring_status(show_id: int, data: dict, db: Session = Depends(get_db)):
    """Update monitoring status for a TV show"""
    show = db.query(TVShow).filter(TVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found")
    
    # Get monitoring option from the request
    monitoring_option = data.get("monitoring")
    
    # Store the actual monitoring option
    show.monitoring_option = monitoring_option
    
    # Update the monitored boolean for backward compatibility
    show.monitored = monitoring_option != "None"
    
    db.commit()
    db.refresh(show)
    
    return {
        "id": show.id,
        "monitored": show.monitored,
        "monitoring_option": show.monitoring_option
    }

@router.post("/tv/{show_id}/refresh")
async def refresh_tv_show_episodes(show_id: int, db: Session = Depends(get_db)):
    """Refresh episode data for a TV show from TMDB"""
    show = db.query(TVShow).filter(TVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found")
    
    collection_service = CollectionService(db)
    
    try:
        await collection_service.refresh_tv_show_episodes(show)
        return {"message": f"Successfully refreshed episodes for {show.title}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh episodes: {str(e)}")

@router.delete("/tv/{show_id}")
def remove_tv_show(
    show_id: int, 
    delete_from_disk: bool = False,
    db: Session = Depends(get_db)
):
    """Remove a TV show from the collection"""
    show = db.query(TVShow).filter(TVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found")
    
    show_title = show.title  # Store title for response message
    folder_path = show.folder_path
    
    # Start a transaction
    try:
        # If deleting from disk, remove the actual files first
        if delete_from_disk and folder_path:
            import os
            import shutil
            try:
                if os.path.exists(folder_path):
                    shutil.rmtree(folder_path)
                    print(f"Deleted folder: {folder_path}")
            except Exception as e:
                print(f"Error deleting folder {folder_path}: {e}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to delete files from disk: {str(e)}"
                )
        
        # Use SQLAlchemy cascade deletion - this should automatically delete
        # all related seasons and episodes due to cascade="all, delete-orphan"
        db.delete(show)
        db.commit()
        
        # Verify the deletion worked by checking for orphaned records
        orphaned_seasons = db.query(Season).filter(Season.show_id == show_id).all()
        if orphaned_seasons:
            print(f"Warning: Found {len(orphaned_seasons)} orphaned seasons after deleting show {show_id}")
            # Clean up manually if cascade didn't work
            for season in orphaned_seasons:
                db.delete(season)
            
        orphaned_episodes = db.query(Episode).filter(
            Episode.season_id.in_(
                db.query(Season.id).filter(Season.show_id == show_id)
            )
        ).all()
        if orphaned_episodes:
            print(f"Warning: Found {len(orphaned_episodes)} orphaned episodes after deleting show {show_id}")
            # Clean up manually if cascade didn't work
            for episode in orphaned_episodes:
                db.delete(episode)
                
        # Final commit if we had to clean up orphans
        if orphaned_seasons or orphaned_episodes:
            db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting show {show_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove show from database: {str(e)}"
        )
    
    message = f"TV show '{show_title}' removed from collection"
    if delete_from_disk:
        message += " and files deleted from disk"
    
    return {"message": message}

# Library Management endpoints
@router.get("/library/tv/paths")
def get_tv_library_paths():
    """Get configured TV library paths"""
    try:
        paths = naming_service.get_library_paths()
        return {
            "paths": paths,
            "total": len(paths)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get library paths: {str(e)}")

@router.post("/library/paths/validate")
def validate_library_path(path: str):
    """Validate a library path for use"""
    try:
        validation = naming_service.validate_library_path(path)
        return validation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate path: {str(e)}")

@router.post("/cleanup/orphaned-records")
def cleanup_orphaned_records(db: Session = Depends(get_db)):
    """Clean up orphaned seasons and episodes that don't have valid parent records"""
    try:
        # Find orphaned seasons (seasons without valid shows)
        orphaned_seasons = db.query(Season).filter(
            ~Season.show_id.in_(db.query(TVShow.id))
        ).all()
        
        # Find orphaned episodes (episodes without valid seasons)
        orphaned_episodes = db.query(Episode).filter(
            ~Episode.season_id.in_(db.query(Season.id))
        ).all()
        
        # Delete orphaned episodes first
        orphaned_episode_count = len(orphaned_episodes)
        for episode in orphaned_episodes:
            db.delete(episode)
            
        # Delete orphaned seasons
        orphaned_season_count = len(orphaned_seasons)
        for season in orphaned_seasons:
            db.delete(season)
        
        db.commit()
        
        return {
            "message": "Cleanup completed successfully",
            "orphaned_episodes_removed": orphaned_episode_count,
            "orphaned_seasons_removed": orphaned_season_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cleanup orphaned records: {str(e)}"
        )
