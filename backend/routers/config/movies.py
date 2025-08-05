"""
Movies configuration API routes
"""

from fastapi import APIRouter, HTTPException
from typing import List
from backend.core.yaml_config import config_manager, MediaDirectory, MoviesConfig
from pydantic import BaseModel

router = APIRouter(tags=["Movies Config"])


class MediaDirectoryCreate(BaseModel):
    """Request model for creating a media directory"""
    name: str
    path: str
    enabled: bool = True


class MediaDirectoryUpdate(BaseModel):
    """Request model for updating a media directory"""
    name: str = None
    path: str = None
    enabled: bool = None


@router.get("/", response_model=MoviesConfig)
async def get_movies_config():
    """Get current movies configuration"""
    config = config_manager.get_config()
    return config.movies


@router.get("/library-paths", response_model=List[MediaDirectory])
async def get_library_paths():
    """Get all library paths for movies"""
    config = config_manager.get_config()
    return config.movies.library_paths


@router.post("/library-paths", response_model=MediaDirectory)
async def add_library_path(directory: MediaDirectoryCreate):
    """Add a new library path for movies"""
    config = config_manager.get_config()
    new_directory = MediaDirectory(**directory.dict())
    
    # Add to library paths
    config.movies.library_paths.append(new_directory)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return new_directory


@router.put("/library-paths/{index}", response_model=MediaDirectory)
async def update_library_path(index: int, directory: MediaDirectoryUpdate):
    """Update a library path by index"""
    config = config_manager.get_config()
    
    if index < 0 or index >= len(config.movies.library_paths):
        raise HTTPException(status_code=404, detail="Library path not found")
    
    # Update the directory
    current_dir = config.movies.library_paths[index]
    update_data = directory.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_dir, field, value)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return current_dir


@router.delete("/library-paths/{index}")
async def delete_library_path(index: int):
    """Delete a library path by index"""
    config = config_manager.get_config()
    
    if index < 0 or index >= len(config.movies.library_paths):
        raise HTTPException(status_code=404, detail="Library path not found")
    
    # Remove the directory
    removed_dir = config.movies.library_paths.pop(index)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return {"message": f"Library path '{removed_dir.name}' deleted successfully"}


@router.get("/download-paths", response_model=List[MediaDirectory])
async def get_download_paths():
    """Get all download paths for movies"""
    config = config_manager.get_config()
    return config.movies.download_paths


@router.post("/download-paths", response_model=MediaDirectory)
async def add_download_path(directory: MediaDirectoryCreate):
    """Add a new download path for movies"""
    config = config_manager.get_config()
    new_directory = MediaDirectory(**directory.dict())
    
    # Add to download paths
    config.movies.download_paths.append(new_directory)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return new_directory


@router.put("/download-paths/{index}", response_model=MediaDirectory)
async def update_download_path(index: int, directory: MediaDirectoryUpdate):
    """Update a download path by index"""
    config = config_manager.get_config()
    
    if index < 0 or index >= len(config.movies.download_paths):
        raise HTTPException(status_code=404, detail="Download path not found")
    
    # Update the directory
    current_dir = config.movies.download_paths[index]
    update_data = directory.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_dir, field, value)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return current_dir


@router.delete("/download-paths/{index}")
async def delete_download_path(index: int):
    """Delete a download path by index"""
    config = config_manager.get_config()
    
    if index < 0 or index >= len(config.movies.download_paths):
        raise HTTPException(status_code=404, detail="Download path not found")
    
    # Remove the directory
    removed_dir = config.movies.download_paths.pop(index)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return {"message": f"Download path '{removed_dir.name}' deleted successfully"}


@router.put("/settings")
async def update_movies_settings(settings: dict):
    """Update general movies settings"""
    config = config_manager.get_config()
    
    # Update allowed settings
    allowed_fields = ['quality_profiles', 'auto_search']
    for field, value in settings.items():
        if field in allowed_fields:
            setattr(config.movies, field, value)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return {"message": "Movies settings updated successfully"}
