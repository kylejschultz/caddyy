"""
Settings API endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

from backend.core.yaml_config import config_manager, AppConfig, GeneralConfig, MediaDirectory

router = APIRouter()


@router.get("/", response_model=GeneralConfig)
async def get_settings() -> GeneralConfig:
    """Get current general settings"""
    config = config_manager.get_config()
    return config.general


@router.put("/", response_model=GeneralConfig)
async def update_settings(updates: Dict[str, Any]) -> GeneralConfig:
    """Update general settings"""
    current_config = config_manager.get_config()
    
    # Update only the general section
    general_data = current_config.general.dict()
    general_data.update(updates)
    
    # Create updated config
    updated_config = current_config.copy(deep=True)
    updated_config.general = GeneralConfig(**general_data)
    
    # Save full config
    config_manager.save_config(updated_config)
    config_manager._config = updated_config
    
    return updated_config.general


# Download Paths endpoints
@router.get("/download-paths", response_model=List[MediaDirectory])
async def get_download_paths() -> List[MediaDirectory]:
    """Get all download paths"""
    config = config_manager.get_config()
    return config.general.download_paths


@router.post("/download-paths", response_model=MediaDirectory)
async def add_download_path(directory: MediaDirectory) -> MediaDirectory:
    """Add a new download path"""
    config = config_manager.get_config()
    config.general.download_paths.append(directory)
    config_manager.save_config(config)
    config_manager._config = config
    return directory


@router.put("/download-paths/{index}", response_model=MediaDirectory)
async def update_download_path(index: int, directory: MediaDirectory) -> MediaDirectory:
    """Update download path at specific index"""
    config = config_manager.get_config()
    
    if index < 0 or index >= len(config.general.download_paths):
        raise HTTPException(status_code=404, detail="Download path not found")
    
    config.general.download_paths[index] = directory
    config_manager.save_config(config)
    config_manager._config = config
    return directory


@router.delete("/download-paths/{index}")
async def delete_download_path(index: int):
    """Delete download path at specific index"""
    config = config_manager.get_config()
    
    if index < 0 or index >= len(config.general.download_paths):
        raise HTTPException(status_code=404, detail="Download path not found")
    
    deleted_path = config.general.download_paths.pop(index)
    config_manager.save_config(config)
    config_manager._config = config
    return {"message": f"Download path '{deleted_path.name}' deleted successfully"}
