"""
YAML configuration paths API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

from backend.core.yaml_config import config_manager, PathsConfig, MediaDirectory

router = APIRouter()


class MediaDirectoryResponse(BaseModel):
    """Response model for media directory"""
    name: str
    path: str
    media_type: str
    enabled: bool


class MediaDirectoryCreate(BaseModel):
    """Create model for media directory"""
    name: str
    path: str
    media_type: str
    enabled: bool = True


@router.get("/", response_model=PathsConfig)
async def get_paths_config() -> PathsConfig:
    """Get current paths configuration"""
    config = config_manager.get_config()
    return config.paths


@router.get("/media-directories", response_model=List[MediaDirectoryResponse])
async def get_media_directories() -> List[MediaDirectoryResponse]:
    """Get all media directories from YAML config"""
    config = config_manager.get_config()
    return [
        MediaDirectoryResponse(**directory.dict())
        for directory in config.paths.media_directories
    ]


@router.post("/media-directories", response_model=MediaDirectoryResponse)
async def add_media_directory(directory: MediaDirectoryCreate) -> MediaDirectoryResponse:
    """Add a new media directory to YAML config"""
    current_config = config_manager.get_config()
    
    # Check if path already exists
    existing = any(
        d.path == directory.path and d.media_type == directory.media_type
        for d in current_config.paths.media_directories
    )
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Media directory already exists for {directory.media_type}: {directory.path}"
        )
    
    # Add new directory
    new_directory = MediaDirectory(**directory.dict())
    updated_config = current_config.copy(deep=True)
    updated_config.paths.media_directories.append(new_directory)
    
    # Save config
    config_manager.save_config(updated_config)
    config_manager._config = updated_config
    
    return MediaDirectoryResponse(**new_directory.dict())


@router.delete("/media-directories/{index}")
async def remove_media_directory(index: int):
    """Remove a media directory by index"""
    current_config = config_manager.get_config()
    
    if index < 0 or index >= len(current_config.paths.media_directories):
        raise HTTPException(status_code=404, detail="Media directory not found")
    
    # Remove directory
    updated_config = current_config.copy(deep=True)
    removed_directory = updated_config.paths.media_directories.pop(index)
    
    # Save config
    config_manager.save_config(updated_config)
    config_manager._config = updated_config
    
    return {"message": f"Media directory '{removed_directory.name}' removed successfully"}


@router.put("/media-directories/{index}", response_model=MediaDirectoryResponse)
async def update_media_directory(index: int, directory: MediaDirectoryCreate) -> MediaDirectoryResponse:
    """Update a media directory by index"""
    current_config = config_manager.get_config()
    
    if index < 0 or index >= len(current_config.paths.media_directories):
        raise HTTPException(status_code=404, detail="Media directory not found")
    
    # Update directory
    updated_config = current_config.copy(deep=True)
    updated_config.paths.media_directories[index] = MediaDirectory(**directory.dict())
    
    # Save config
    config_manager.save_config(updated_config)
    config_manager._config = updated_config
    
    return MediaDirectoryResponse(**updated_config.paths.media_directories[index].dict())
