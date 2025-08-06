"""
TV configuration API routes
"""

from fastapi import APIRouter, HTTPException
from typing import List
from backend.core.yaml_config import config_manager, MediaDirectory, TVConfig
from pydantic import BaseModel

router = APIRouter(tags=["TV Config"])


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


@router.get("/", response_model=TVConfig)
async def get_tv_config():
    """Get current TV configuration"""
    config = config_manager.get_config()
    return config.tv


@router.put("/", response_model=TVConfig)
async def update_tv_config(tv_config: TVConfig):
    """Update the entire TV configuration."""
    config = config_manager.get_config()
    config.tv = tv_config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    return config.tv


@router.get("/library-paths", response_model=List[MediaDirectory])
async def get_library_paths():
    """Get all library paths for TV shows"""
    config = config_manager.get_config()
    return config.tv.library_paths


@router.post("/library-paths", response_model=MediaDirectory)
async def add_library_path(directory: MediaDirectoryCreate):
    """Add a new library path for TV shows"""
    config = config_manager.get_config()
    new_directory = MediaDirectory(**directory.dict())
    
    # Add to library paths
    config.tv.library_paths.append(new_directory)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return new_directory


@router.put("/library-paths/{index}", response_model=MediaDirectory)
async def update_library_path(index: int, directory: MediaDirectoryUpdate):
    """Update a library path by index"""
    config = config_manager.get_config()
    
    if index < 0 or index >= len(config.tv.library_paths):
        raise HTTPException(status_code=404, detail="Library path not found")
    
    # Update the directory
    current_dir = config.tv.library_paths[index]
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
    
    if index < 0 or index >= len(config.tv.library_paths):
        raise HTTPException(status_code=404, detail="Library path not found")
    
    # Remove the directory
    removed_dir = config.tv.library_paths.pop(index)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return {"message": f"Library path '{removed_dir.name}' deleted successfully"}




@router.put("/settings")
async def update_tv_settings(settings: dict):
    """Update general TV settings"""
    config = config_manager.get_config()
    
    # Update allowed settings
    allowed_fields = ['quality_profiles', 'auto_search', 'season_folder_format']
    for field, value in settings.items():
        if field in allowed_fields:
            setattr(config.tv, field, value)
    
    # Save the updated config
    config_manager.save_config(config)
    config_manager._config = config  # Update cache
    
    return {"message": "TV settings updated successfully"}
